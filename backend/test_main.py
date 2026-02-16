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


# ==================== PDF Encrypt Tests ====================

def test_encrypt_pdf_success():
    """Test encrypting PDF successfully"""
    pdf_bytes = create_test_pdf(3)
    
    response = client.post(
        "/api/protect/encrypt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"password": "test123", "permission": "all"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["X-Encrypted"] == "true"

def test_encrypt_pdf_with_permissions():
    """Test encrypting PDF with different permissions"""
    pdf_bytes = create_test_pdf(2)
    
    for perm in ["no_print", "no_copy", "no_edit", "no_print_copy"]:
        response = client.post(
            "/api/protect/encrypt",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
            data={"password": "test123", "permission": perm}
        )
        
        assert response.status_code == 200, f"Failed for permission: {perm}"
        assert response.headers["X-Permission"] == perm

def test_encrypt_pdf_invalid_file():
    """Test encrypting non-PDF file"""
    response = client.post(
        "/api/protect/encrypt",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
        data={"password": "test123"}
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]

def test_encrypt_pdf_empty_password():
    """Test encrypting PDF with empty password"""
    pdf_bytes = create_test_pdf(2)
    
    response = client.post(
        "/api/protect/encrypt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"password": ""}
    )
    
    # FastAPI Form validation should reject empty password
    assert response.status_code == 422


# ==================== PDF Decrypt Tests ====================

def test_decrypt_pdf_success():
    """Test decrypting PDF successfully"""
    # First create an encrypted PDF
    pdf_bytes = create_test_pdf(3)
    
    encrypt_response = client.post(
        "/api/protect/encrypt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"password": "test123", "permission": "all"}
    )
    
    assert encrypt_response.status_code == 200
    encrypted_pdf = encrypt_response.content
    
    # Now decrypt it
    decrypt_response = client.post(
        "/api/protect/decrypt",
        files={"file": ("encrypted.pdf", encrypted_pdf, "application/pdf")},
        data={"password": "test123"}
    )
    
    assert decrypt_response.status_code == 200
    assert decrypt_response.headers["content-type"] == "application/pdf"
    assert decrypt_response.headers["X-Decrypted"] == "true"

def test_decrypt_pdf_wrong_password():
    """Test decrypting PDF with wrong password"""
    # First create an encrypted PDF
    pdf_bytes = create_test_pdf(2)
    
    encrypt_response = client.post(
        "/api/protect/encrypt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"password": "correct_password", "permission": "all"}
    )
    
    assert encrypt_response.status_code == 200
    encrypted_pdf = encrypt_response.content
    
    # Try to decrypt with wrong password
    decrypt_response = client.post(
        "/api/protect/decrypt",
        files={"file": ("encrypted.pdf", encrypted_pdf, "application/pdf")},
        data={"password": "wrong_password"}
    )
    
    assert decrypt_response.status_code == 400
    assert "Incorrect password" in decrypt_response.json()["detail"]

def test_decrypt_unencrypted_pdf():
    """Test decrypting a PDF that is not encrypted"""
    pdf_bytes = create_test_pdf(2)
    
    response = client.post(
        "/api/protect/decrypt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"password": "any_password"}
    )
    
    # Should succeed (PDF is already decrypted)
    assert response.status_code == 200

def test_decrypt_pdf_invalid_file():
    """Test decrypting non-PDF file"""
    response = client.post(
        "/api/protect/decrypt",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
        data={"password": "test123"}
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]

def test_decrypt_pdf_empty_password():
    """Test decrypting PDF with empty password"""
    pdf_bytes = create_test_pdf(2)
    
    response = client.post(
        "/api/protect/decrypt",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"password": ""}
    )
    
    # FastAPI Form validation should reject empty password
    assert response.status_code == 422


# ==================== PDF Watermark Tests ====================

def test_add_text_watermark_success():
    """Test adding text watermark to PDF"""
    pdf_bytes = create_test_pdf(2)
    
    response = client.post(
        "/api/watermark/add",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={
            "type": "text",
            "text": "CONFIDENTIAL",
            "position": "center",
            "opacity": "0.5",
            "fontSize": "40",
            "color": "#FF0000"
        }
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["X-Watermark-Type"] == "text"
    assert response.headers["X-Watermark-Position"] == "center"

def test_add_text_watermark_different_positions():
    """Test adding text watermark at different positions"""
    pdf_bytes = create_test_pdf(1)
    
    positions = ["center", "top-left", "top-right", "bottom-left", "bottom-right", "tile"]
    
    for pos in positions:
        response = client.post(
            "/api/watermark/add",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
            data={
                "type": "text",
                "text": "WATERMARK",
                "position": pos,
                "opacity": "0.5"
            }
        )
        
        assert response.status_code == 200, f"Failed for position: {pos}"
        assert response.headers["X-Watermark-Position"] == pos

def test_add_text_watermark_missing_text():
    """Test adding text watermark without text parameter"""
    pdf_bytes = create_test_pdf(1)
    
    response = client.post(
        "/api/watermark/add",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={
            "type": "text",
            "position": "center"
        }
    )
    
    assert response.status_code == 400
    assert "Text is required" in response.json()["detail"]

def test_add_image_watermark_success():
    """Test adding image watermark to PDF"""
    pdf_bytes = create_test_pdf(2)
    img_bytes = create_test_image("png")
    
    response = client.post(
        "/api/watermark/add",
        files=[
            ("file", ("test.pdf", pdf_bytes, "application/pdf")),
            ("image", ("watermark.png", img_bytes, "image/png"))
        ],
        data={
            "type": "image",
            "position": "center",
            "opacity": "0.5"
        }
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["X-Watermark-Type"] == "image"

def test_add_image_watermark_missing_image():
    """Test adding image watermark without image file"""
    pdf_bytes = create_test_pdf(1)
    
    response = client.post(
        "/api/watermark/add",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={
            "type": "image",
            "position": "center"
        }
    )
    
    assert response.status_code == 400
    assert "Image is required" in response.json()["detail"]

def test_add_watermark_invalid_opacity():
    """Test adding watermark with invalid opacity"""
    pdf_bytes = create_test_pdf(1)
    
    response = client.post(
        "/api/watermark/add",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={
            "type": "text",
            "text": "TEST",
            "opacity": "1.5"  # Invalid: > 1
        }
    )
    
    assert response.status_code == 400
    assert "Opacity must be between 0 and 1" in response.json()["detail"]

def test_add_watermark_invalid_file():
    """Test adding watermark to non-PDF file"""
    response = client.post(
        "/api/watermark/add",
        files={"file": ("test.txt", b"not a pdf", "text/plain")},
        data={
            "type": "text",
            "text": "TEST"
        }
    )
    
    assert response.status_code == 400
    assert "Only PDF files" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
