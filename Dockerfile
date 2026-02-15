FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ghostscript poppler-utils && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy code
COPY backend/ .

# Start with explicit host and port
CMD uvicorn main:app --host 0.0.0.0 --port 8000
