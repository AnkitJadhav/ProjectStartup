FROM python:3.11-slim

WORKDIR /app

# Install Redis
RUN apt-get update && \
    apt-get install -y redis-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Copy the startup script
COPY start.sh .
RUN chmod +x start.sh

# Start both Redis and the application
CMD ["./start.sh"] 