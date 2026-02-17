FROM python:3.11-slim

WORKDIR /app

# Cache buster - force rebuild on every deploy
ARG CACHEBUST=1

# Install system dependencies
RUN apt-get update && apt-get install -y ghostscript poppler-utils libmagic1 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy code
COPY backend/ .

# Use Railway's PORT environment variable, default to 8000
ENV PORT=8000
EXPOSE 8000

# Start the application
CMD ["python", "main.py"]
