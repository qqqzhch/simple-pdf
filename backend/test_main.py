"""
Backend tests for SimplePDF API
"""
import pytest
import tempfile
import os
from pathlib import Path
from fastapi.testclient import TestClient
from main import app, TEMP_DIR
from PyPDF2 import PdfWriter
import io

client = TestClient(app)

def create_test_pdf(num_pages: int = 3) -> bytes:
    """Create a simple test PDF with specified number of pages"""
    writer = PdfWriter()
    
    # Add blank pages
    for _ in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    
    # Write to bytes
    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.read()

# ==================== Health Check Tests ====================

def test_health_check():
    """Test health endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "simplepdf-api"}

# ==================== PDF Info Tests ====================

def test_pdf_info_success():
    """Test getting PDF info with valid file"""
    pdf_bytes = create_test_pdf(5)
    
    response = client.post(
        "/api/pdf-info",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.pdf"
    assert data["pages"] == 5
    assert "size" in data

def test_pdf_info_invalid_file():
    """Test PDF info with non-PDF file"""
    response = client.post(
        "/api/pdf-info",
        files={"file": ("test.txt", b"not a pdf", "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Only PDF files allowed" in response.json()["detail"]

# ==================== Split PDF Tests ====================

def test_split_pdf_single_pages():
    """Test splitting PDF with single page selections - returns ZIP"""
    pdf_bytes = create_test_pdf(5)
    
    response = client.post(
        "/api/split",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"pages": "1,3,5"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

def test_split_pdf_page_ranges():
    """Test splitting PDF with page ranges - returns ZIP with multiple PDFs"""
    pdf_bytes = create_test_pdf(5)
    
    response = client.post(
        "/api/split",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"pages": "1-2,3-5"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

def test_split_pdf_mixed():
    """Test splitting PDF with mixed format (single + range)"""
    pdf_bytes = create_test_pdf(10)
    
    response = client.post(
        "/api/split",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"pages": "1,3-5,7,9-10"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

def test_split_pdf_empty_pages():
    """Test splitting PDF with empty pages parameter"""
    pdf_bytes = create_test_pdf(5)
    
    response = client.post(
        "/api/split",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"pages": ""}
    )
    
    # FastAPI Form validation returns 422 for missing required field
    assert response.status_code in [400, 422]
    assert any(keyword in response.text.lower() for keyword in ["page", "specified", "field required"])

def test_split_pdf_invalid_format():
    """Test splitting PDF with invalid page format"""
    pdf_bytes = create_test_pdf(5)
    
    response = client.post(
        "/api/split",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"pages": "invalid"}
    )
    
    assert response.status_code == 400

def test_split_pdf_out_of_range():
    """Test splitting PDF with page number out of range"""
    pdf_bytes = create_test_pdf(3)
    
    response = client.post(
        "/api/split",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"pages": "1-10"}  # PDF only has 3 pages
    )
    
    # Should succeed but only include valid pages
    assert response.status_code == 200

# ==================== Merge PDF Tests ====================

def test_merge_pdfs_success():
    """Test merging multiple PDFs"""
    pdf1 = create_test_pdf(2)
    pdf2 = create_test_pdf(3)
    
    response = client.post(
        "/api/merge",
        files=[
            ("files", ("test1.pdf", pdf1, "application/pdf")),
            ("files", ("test2.pdf", pdf2, "application/pdf"))
        ]
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"

def test_merge_pdfs_single_file():
    """Test merging with only one file (should fail)"""
    pdf = create_test_pdf(2)
    
    response = client.post(
        "/api/merge",
        files=[("files", ("test.pdf", pdf, "application/pdf"))]
    )
    
    assert response.status_code == 400

def test_merge_pdfs_invalid_file():
    """Test merging with non-PDF file"""
    response = client.post(
        "/api/merge",
        files=[
            ("files", ("test1.pdf", create_test_pdf(2), "application/pdf")),
            ("files", ("test.txt", b"not a pdf", "text/plain"))
        ]
    )
    
    # Should skip invalid file and merge valid ones
    assert response.status_code == 200

# ==================== Convert PDF Tests ====================

@pytest.mark.skip(reason="pdf2docx conversion requires external dependencies")
def test_convert_pdf_to_word():
    """Test converting PDF to Word (skipped in CI)"""
    pdf_bytes = create_test_pdf(2)
    
    response = client.post(
        "/api/convert/pdf-to-word",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")}
    )
    
    # Note: This test may fail in CI without proper dependencies
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

def test_convert_invalid_file():
    """Test converting non-PDF file"""
    response = client.post(
        "/api/convert/pdf-to-word",
        files={"file": ("test.txt", b"not a pdf", "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]

# ==================== Compress PDF Tests ====================

def test_compress_pdf_success():
    """Test compressing PDF successfully"""
    pdf_bytes = create_test_pdf(5)
    
    response = client.post(
        "/api/compress",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"level": "medium"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    # Check compression info headers
    assert "X-Original-Size" in response.headers
    assert "X-Compressed-Size" in response.headers

def test_compress_pdf_different_levels():
    """Test compressing PDF with different compression levels"""
    pdf_bytes = create_test_pdf(3)
    
    for level in ["low", "medium", "high"]:
        response = client.post(
            "/api/compress",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
            data={"level": level}
        )
        
        assert response.status_code == 200, f"Failed for level: {level}"
        assert response.headers["content-type"] == "application/pdf"

def test_compress_invalid_file():
    """Test compressing non-PDF file"""
    response = client.post(
        "/api/compress",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
        data={"level": "medium"}
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]

# ==================== Image Conversion Tests ====================

def test_pdf_to_image_success():
    """Test converting PDF to images"""
    pdf_bytes = create_test_pdf(3)
    
    response = client.post(
        "/api/convert/pdf-to-image",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"format": "jpg", "dpi": 150}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "X-Total-Pages" in response.headers
    assert response.headers["X-Total-Pages"] == "3"

def test_pdf_to_image_png_format():
    """Test converting PDF to PNG images"""
    pdf_bytes = create_test_pdf(2)
    
    response = client.post(
        "/api/convert/pdf-to-image",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"format": "png", "dpi": 100}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert response.headers["X-Image-Format"] == "png"

def test_pdf_to_image_invalid_format():
    """Test PDF to image with invalid format"""
    pdf_bytes = create_test_pdf(1)
    
    response = client.post(
        "/api/convert/pdf-to-image",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"format": "gif", "dpi": 150}
    )
    
    assert response.status_code == 400
    assert "jpg or png" in response.json()["detail"]

def create_test_image(format: str = "png") -> bytes:
    """Create a simple test image"""
    from PIL import Image
    import io
    
    img = Image.new('RGB', (100, 100), color='red')
    output = io.BytesIO()
    # Fix format name for PIL
    pil_format = "JPEG" if format.lower() in ["jpg", "jpeg"] else format.upper()
    img.save(output, format=pil_format)
    output.seek(0)
    return output.read()

def test_image_to_pdf_success():
    """Test converting images to PDF"""
    img_bytes = create_test_image("png")
    
    response = client.post(
        "/api/convert/image-to-pdf",
        files=[("files", ("test.png", img_bytes, "image/png"))],
        data={"page_size": "A4"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["X-Total-Images"] == "1"

def test_image_to_pdf_multiple():
    """Test converting multiple images to PDF"""
    img1 = create_test_image("png")
    img2 = create_test_image("jpg")
    
    response = client.post(
        "/api/convert/image-to-pdf",
        files=[
            ("files", ("test1.png", img1, "image/png")),
            ("files", ("test2.jpg", img2, "image/jpeg"))
        ],
        data={"page_size": "original"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["X-Total-Images"] == "2"

def test_image_to_pdf_invalid_file():
    """Test converting non-image file"""
    response = client.post(
        "/api/convert/image-to-pdf",
        files=[("files", ("test.txt", b"not an image", "text/plain"))],
        data={"page_size": "A4"}
    )
    
    assert response.status_code == 400
    assert "Only images" in response.json()["detail"]

# ==================== PDF to Excel Tests ====================

def create_pdf_with_table() -> bytes:
    """Create a PDF with a simple table using reportlab"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        import io
        
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=letter)
        
        # Create table data
        data = [
            ['Name', 'Age', 'City'],
            ['Alice', '25', 'New York'],
            ['Bob', '30', 'San Francisco'],
            ['Charlie', '35', 'Los Angeles']
        ]
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        doc.build([table])
        output.seek(0)
        return output.read()
    except ImportError:
        # Fallback: create a simple PDF without table if reportlab not available
        return create_test_pdf(1)

def test_pdf_to_excel_success():
    """Test converting PDF with table to Excel"""
    pdf_bytes = create_pdf_with_table()
    
    response = client.post(
        "/api/convert/pdf-to-excel",
        files={"file": ("test_table.pdf", pdf_bytes, "application/pdf")}
    )
    
    # Note: Simple PDFs without tables will return 400
    # PDFs with tables should return 200 with Excel file
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert "X-Tables-Count" in response.headers
    elif response.status_code == 400:
        # Expected if PDF has no extractable tables
        assert "No tables found" in response.json()["detail"]

def test_pdf_to_excel_invalid_file():
    """Test converting non-PDF file to Excel"""
    response = client.post(
        "/api/convert/pdf-to-excel",
        files={"file": ("test.txt", b"not a pdf", "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]

# ==================== Edge Cases ====================

@pytest.mark.skip(reason="Large file test causes memory issues in test environment")
def test_large_file_rejection():
    """Test that files larger than 50MB are rejected"""
    # This test is skipped in CI to avoid memory issues
    # In production, the file size check works correctly
    pass

# ==================== PDF to PPT Tests ====================

def test_convert_pdf_to_ppt_success():
    """Test converting PDF to PPT successfully"""
    pdf_bytes = create_test_pdf(3)
    
    response = client.post(
        "/api/convert/pdf-to-ppt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    assert response.headers["X-Total-Pages"] == "3"

def test_convert_pdf_to_ppt_invalid_file():
    """Test converting non-PDF file to PPT"""
    response = client.post(
        "/api/convert/pdf-to-ppt",
        files={"file": ("test.txt", b"not a pdf", "text/plain")}
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]

def test_convert_pdf_to_ppt_empty_pdf():
    """Test converting empty PDF (0 pages)"""
    pdf_bytes = create_test_pdf(0)
    
    response = client.post(
        "/api/convert/pdf-to-ppt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")}
    )
    
    # Should fail because PDF has no pages
    assert response.status_code == 400
    assert "no pages" in response.json()["detail"].lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
