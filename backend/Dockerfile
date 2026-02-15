FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PyMuPDF and Ghostscript
RUN apt-get update && \
    apt-get install -y \
        ghostscript \
        gcc \
        g++ \
        make \
        libffi-dev \
        libssl-dev \
        python3-dev \
        pkg-config \
        swig \
        libxml2-dev \
        libxslt1-dev \
        zlib1g-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Ghostscript installation
RUN gs --version

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
