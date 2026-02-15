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
    pages: str = "",  # 格式: "1,3,5-10"
):
    """拆分PDF"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files allowed")
    
    from PyPDF2 import PdfReader, PdfWriter
    
    file_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{file_id}.pdf"
    
    try:
        content = await file.read()
        with open(input_path, "wb") as f:
            f.write(content)
        
        reader = PdfReader(str(input_path))
        writer = PdfWriter()
        
        # 解析页码
        if not pages or pages.strip() == '':
            raise HTTPException(400, "No pages specified")
        
        print(f"Split request - Pages param: {pages}, Total PDF pages: {len(reader.pages)}")
        
        page_numbers = []
        for part in pages.split(','):
            part = part.strip()
            if not part:
                continue
            if '-' in part:
                try:
                    start, end = map(int, part.split('-'))
                    if start < 1 or end < 1:
                        raise HTTPException(400, f"Page numbers must be >= 1: {part}")
                    if start > end:
                        raise HTTPException(400, f"Invalid range (start > end): {part}")
                    page_numbers.extend(range(start-1, end))
                except ValueError as e:
                    raise HTTPException(400, f"Invalid page range '{part}': {str(e)}")
            else:
                try:
                    num = int(part)
                    if num < 1:
                        raise HTTPException(400, f"Page number must be >= 1: {part}")
                    page_numbers.append(num - 1)
                except ValueError as e:
                    raise HTTPException(400, f"Invalid page number '{part}': {str(e)}")
        
        print(f"Parsed page indices: {page_numbers}")
        
        if not page_numbers:
            raise HTTPException(400, "No valid pages to extract")
        
        for page_num in page_numbers:
            if 0 <= page_num < len(reader.pages):
                writer.add_page(reader.pages[page_num])
            else:
                print(f"Warning: Page index {page_num} out of range (0-{len(reader.pages)-1})")
        
        output_path = TEMP_DIR / f"split_{file_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)
        
        asyncio.create_task(cleanup_file(input_path))
        asyncio.create_task(cleanup_file(output_path))
        
        return FileResponse(
            path=output_path,
            filename=f"split_{file.filename}",
            media_type='application/pdf'
        )
        
    except Exception as e:
        if input_path.exists():
            input_path.unlink()
        raise HTTPException(500, f"Split failed: {str(e)}")

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
