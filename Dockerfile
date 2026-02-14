FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend directory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code from backend directory
COPY backend/main.py .

# Create temp directory for file processing
RUN mkdir -p /tmp/simplepdf

# Expose the port
EXPOSE 8000

# Use Railway's PORT env var if available
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
