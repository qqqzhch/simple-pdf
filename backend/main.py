from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import io
import subprocess

# PyPDF2 imports
from PyPDF2 import PdfReader, PdfWriter

app = FastAPI(title="SimplePDF API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境改具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 临时文件目录
TEMP_DIR = Path("/tmp/simplepdf")
TEMP_DIR.mkdir(exist_ok=True)

# 文件清理任务
async def cleanup_file(file_path: Path, delay: int = 300):
    """5分钟后自动清理文件"""
    await asyncio.sleep(delay)
    try:
        if file_path.exists():
            file_path.unlink()
            print(f"Cleaned up: {file_path}")
    except Exception as e:
        print(f"Cleanup error: {e}")

@app.post("/api/convert/pdf-to-word")
async def convert_pdf_to_word(file: UploadFile = File(...)):
    """PDF转Word"""
    # 验证文件类型
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are allowed")
    
    # 验证文件大小 (50MB)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 50MB allowed.")
    
    # 生成唯一ID
    file_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{file_id}.pdf"
    output_path = TEMP_DIR / f"{file_id}.docx"
    
    try:
        # 保存上传文件
        with open(input_path, "wb") as f:
            f.write(content)
        
        # 转换PDF到Word
        from pdf2docx import Converter
        cv = Converter(str(input_path))
        cv.convert(str(output_path), start=0, end=None)
        cv.close()
        
        # 启动清理任务
        asyncio.create_task(cleanup_file(input_path))
        asyncio.create_task(cleanup_file(output_path))
        
        return FileResponse(
            path=output_path,
            filename=file.filename.replace('.pdf', '.docx'),
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        # 清理临时文件
        if input_path.exists():
            input_path.unlink()
        if output_path.exists():
            output_path.unlink()
        raise HTTPException(500, f"Conversion failed: {str(e)}")

@app.post("/api/merge")
async def merge_pdfs(files: list[UploadFile] = File(...)):
    """合并多个PDF"""
    if len(files) < 2:
        raise HTTPException(400, "At least 2 files required")
    
    from PyPDF2 import PdfMerger
    
    file_id = str(uuid.uuid4())
    output_path = TEMP_DIR / f"merged_{file_id}.pdf"
    input_paths = []
    
    try:
        merger = PdfMerger()
        
        for file in files:
            if not file.filename.endswith('.pdf'):
                continue
            
            content = await file.read()
            input_path = TEMP_DIR / f"{uuid.uuid4()}.pdf"
            
            with open(input_path, "wb") as f:
                f.write(content)
            
            input_paths.append(input_path)
            merger.append(str(input_path))
        
        merger.write(str(output_path))
        merger.close()
        
        # 清理输入文件
        for path in input_paths:
            asyncio.create_task(cleanup_file(path, 0))
        asyncio.create_task(cleanup_file(output_path))
        
        return FileResponse(
            path=output_path,
            filename="merged.pdf",
            media_type='application/pdf'
        )
        
    except Exception as e:
        for path in input_paths:
            if path.exists():
                path.unlink()
        if output_path.exists():
            output_path.unlink()
        raise HTTPException(500, f"Merge failed: {str(e)}")

@app.post("/api/split")
async def split_pdf(
    file: UploadFile = File(...),
    pages: str = Form(...),  # 格式: "1,3,5-10" 或 "1-2,3-4,5-5"
):
    """拆分PDF - 返回ZIP压缩包"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files allowed")
    
    from PyPDF2 import PdfReader, PdfWriter
    import zipfile
    
    file_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{file_id}.pdf"
    output_dir = TEMP_DIR / f"split_{file_id}"
    output_dir.mkdir(exist_ok=True)
    
    try:
        content = await file.read()
        with open(input_path, "wb") as f:
            f.write(content)
        
        reader = PdfReader(str(input_path))
        
        # 解析页码范围
        print(f"Split request - Pages param: '{pages}', Total PDF pages: {len(reader.pages)}")
        
        if not pages or pages.strip() == '':
            raise HTTPException(400, f"No pages specified. Received: '{pages}'")
        
        # 解析每个分组
        groups = []  # 每个元素是一个元组 (group_name, [page_indices])
        group_index = 1
        
        for part in pages.split(','):
            part = part.strip()
            if not part:
                continue
            
            if '-' in part:
                # 范围格式: "1-2" -> 提取页面 0,1
                try:
                    start, end = map(int, part.split('-'))
                    if start < 1 or end < 1:
                        raise HTTPException(400, f"Page numbers must be >= 1: {part}")
                    if start > end:
                        raise HTTPException(400, f"Invalid range (start > end): {part}")
                    page_indices = list(range(start-1, end))
                    groups.append((f"pages_{start}-{end}", page_indices))
                except ValueError as e:
                    raise HTTPException(400, f"Invalid page range '{part}': {str(e)}")
            else:
                # 单页格式: "5" -> 提取页面 4
                try:
                    page_num = int(part)
                    if page_num < 1:
                        raise HTTPException(400, f"Page number must be >= 1: {part}")
                    groups.append((f"page_{page_num}", [page_num - 1]))
                except ValueError as e:
                    raise HTTPException(400, f"Invalid page number '{part}': {str(e)}")
        
        if not groups:
            raise HTTPException(400, "No valid pages to extract")
        
        print(f"Parsed {len(groups)} groups: {groups}")
        
        # 为每个组生成一个PDF
        generated_files = []
        for group_name, page_indices in groups:
            writer = PdfWriter()
            valid_pages = []
            
            for page_idx in page_indices:
                if 0 <= page_idx < len(reader.pages):
                    try:
                        writer.add_page(reader.pages[page_idx])
                        valid_pages.append(page_idx + 1)  # 转换为1-based页码
                    except Exception as e:
                        print(f"Error adding page {page_idx + 1}: {e}")
                else:
                    print(f"Warning: Page index {page_idx} out of range")
            
            if valid_pages:
                # 生成文件名
                if len(valid_pages) == 1:
                    output_filename = f"page_{valid_pages[0]}.pdf"
                else:
                    output_filename = f"pages_{valid_pages[0]}-{valid_pages[-1]}.pdf"
                
                output_path = output_dir / output_filename
                with open(output_path, "wb") as f:
                    writer.write(f)
                generated_files.append(output_path)
                print(f"Generated: {output_filename}")
        
        if not generated_files:
            raise HTTPException(400, "No pages could be extracted")
        
        # 打包成ZIP
        zip_path = TEMP_DIR / f"split_{file_id}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for pdf_file in generated_files:
                zipf.write(pdf_file, pdf_file.name)
        
        print(f"Created ZIP: {zip_path} with {len(generated_files)} files")
        
        # 清理临时文件
        asyncio.create_task(cleanup_file(input_path))
        for pdf_file in generated_files:
            asyncio.create_task(cleanup_file(pdf_file))
        asyncio.create_task(cleanup_file(zip_path))
        
        # 清理目录
        import shutil
        if output_dir.exists():
            shutil.rmtree(output_dir)
        
        return FileResponse(
            path=zip_path,
            filename=f"split_{file.filename.replace('.pdf', '.zip')}",
            media_type='application/zip'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # 清理临时文件
        if input_path.exists():
            input_path.unlink()
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        raise HTTPException(500, f"Split failed: {str(e)}")

def compress_with_ghostscript(input_path: str, output_path: str, level: str) -> bool:
    """使用 Ghostscript 压缩 PDF，返回是否成功"""
    import shutil
    
    # 检查 Ghostscript 是否可用
    if not shutil.which("gs"):
        return False
    
    quality_settings = {
        "low": "/printer",
        "medium": "/ebook",
        "high": "/screen"
    }
    
    pdf_settings = quality_settings.get(level, "/ebook")
    
    cmd = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={pdf_settings}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dColorImageDownsampleType=/Bicubic",
        "-dGrayImageDownsampleType=/Bicubic",
        "-dMonoImageDownsampleType=/Bicubic",
        f"-sOutputFile={output_path}",
        input_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return result.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        print(f"Ghostscript error: {e}")
        return False

def compress_with_pypdf2(input_path: str, output_path: str) -> bool:
    """使用 PyPDF2 作为回退压缩方案"""
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for page in reader.pages:
            writer.add_page(page)
        
        # 移除部分元数据以减少大小
        writer.add_metadata({"/Producer": "SimplePDF"})
        
        with open(output_path, "wb") as f:
            writer.write(f)
        
        return True
    except Exception as e:
        print(f"PyPDF2 compression error: {e}")
        return False

@app.post("/api/compress")
async def compress_pdf(
    file: UploadFile = File(...),
    level: str = Form("medium")  # low, medium, high
):
    """压缩PDF文件 - 优先使用 Ghostscript，回退到 PyPDF2"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files allowed")
    
    file_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{file_id}.pdf"
    output_path = TEMP_DIR / f"compressed_{file_id}.pdf"
    
    try:
        content = await file.read()
        original_size = len(content)
        
        with open(input_path, "wb") as f:
            f.write(content)
        
        # 优先尝试 Ghostscript
        gs_success = compress_with_ghostscript(str(input_path), str(output_path), level)
        
        if not gs_success:
            print("Ghostscript not available or failed, falling back to PyPDF2")
            pypdf_success = compress_with_pypdf2(str(input_path), str(output_path))
            
            if not pypdf_success:
                raise HTTPException(500, "Compression failed: both Ghostscript and PyPDF2 failed")
        
        compressed_size = output_path.stat().st_size
        compression_ratio = (1 - compressed_size / original_size) * 100
        
        method = "Ghostscript" if gs_success else "PyPDF2"
        print(f"{method} compression: {original_size} -> {compressed_size} ({compression_ratio:.1f}% reduction)")
        
        # 清理临时文件
        asyncio.create_task(cleanup_file(input_path))
        asyncio.create_task(cleanup_file(output_path))
        
        return FileResponse(
            path=output_path,
            filename=f"compressed_{file.filename}",
            media_type='application/pdf',
            headers={
                "X-Original-Size": str(original_size),
                "X-Compressed-Size": str(compressed_size),
                "X-Compression-Ratio": f"{compression_ratio:.1f}"
            }
        )
        
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        if output_path.exists():
            output_path.unlink()
        raise HTTPException(500, f"Compression failed: {str(e)}")

@app.post("/api/pdf-info")
async def get_pdf_info(file: UploadFile = File(...)):
    """获取PDF信息（页数等）"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files allowed")
    
    from PyPDF2 import PdfReader
    
    file_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{file_id}.pdf"
    
    try:
        content = await file.read()
        
        # 验证文件大小
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(400, "File too large. Max 50MB allowed.")
        
        with open(input_path, "wb") as f:
            f.write(content)
        
        reader = PdfReader(str(input_path))
        num_pages = len(reader.pages)
        
        # 立即清理临时文件
        if input_path.exists():
            input_path.unlink()
        
        return {
            "filename": file.filename,
            "pages": num_pages,
            "size": len(content)
        }
        
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(500, f"Failed to read PDF: {str(e)}")

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "service": "simplepdf-api"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
