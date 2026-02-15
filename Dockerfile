FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
        ghostscript \
        gcc \
        poppler-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies with retry
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --retries 10 --timeout 60 -r requirements.txt || \
    (sleep 5 && pip install --no-cache-dir --retries 10 --timeout 60 -r requirements.txt)

# Copy application code
COPY backend/ .

# Run the application
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
