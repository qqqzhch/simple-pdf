FROM python:3.11-slim

WORKDIR /app

# 使用阿里云 apt 源加速
RUN echo "deb http://mirrors.aliyun.com/debian/ bookworm main non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian-security/ bookworm-security main" >> /etc/apt/sources.list

# Install system dependencies including poppler for pdf2image
RUN apt-get update && \
    apt-get install -y \
        ghostscript \
        gcc \
        poppler-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies (使用清华源加速)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# Copy application code
COPY backend/ .

# Run the application
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
