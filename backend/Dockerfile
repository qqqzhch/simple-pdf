FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY main.py .

# 创建临时目录
RUN mkdir -p /tmp/simplepdf

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
