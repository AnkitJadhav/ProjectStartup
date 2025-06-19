from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import uuid
from typing import Dict, Any
import redis
from rq import Queue
from rq.job import Job
import worker

# Initialize FastAPI app
app = FastAPI(title="PDF RAG API")

# Get environment variables
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,https://*.vercel.app').split(',')
PORT = int(os.getenv('PORT', 5000))
MAX_MEMORY_MB = int(os.getenv('MAX_MEMORY_MB', 512))

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Redis and RQ
redis_conn = redis.from_url(REDIS_URL)
queue = Queue(connection=redis_conn)

# Configure upload settings
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

class DeepSeekClient:
    def __init__(self):
        self.api_key = "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"
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "PDF RAG System"
        }

    def chat_completion(self, messages: list, temperature: float = 0.3, max_tokens: int = 1500) -> str:
        import requests
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            return result['choices'][0]['message']['content'] if 'choices' in result and result['choices'] else "Error: Invalid response from API"
        except requests.exceptions.RequestException as e:
            return f"API Error: {str(e)}"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload and process PDF file"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    
    try:
        # Generate unique filename
        filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save file
        with open(filepath, "wb") as buffer:
            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 16MB")
            buffer.write(contents)
        
        # Create job ID
        job_id = str(uuid.uuid4())
        
        # Queue processing job
        job = queue.enqueue(
            worker.process_pdf,
            args=(filepath, job_id),
            job_timeout='10m'
        )
        
        return {
            "success": True,
            "message": "PDF upload successful, processing started",
            "job_id": job_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
async def ask_question(request: Dict[str, str]) -> Dict[str, Any]:
    """Ask a question about the PDF"""
    try:
        question = request.get("question")
        job_id = request.get("job_id")
        
        if not question or not job_id:
            raise HTTPException(status_code=400, detail="Question and job_id are required")
        
        # Queue question answering job
        job = queue.enqueue(
            worker.answer_question,
            args=(question, job_id),
            job_timeout='30s'
        )
        
        # Wait for result (since it should be quick)
        result = job.result
        if not result:
            raise HTTPException(status_code=500, detail="Failed to get answer")
            
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{job_id}")
async def get_job_status(job_id: str) -> Dict[str, Any]:
    """Get the status of a processing job"""
    try:
        # Check if results exist in Redis
        if redis_conn.exists(f"pdf_data:{job_id}"):
            return {"status": "completed"}
            
        # Check if job is in queue
        job = Job.fetch(job_id, connection=redis_conn)
        return {"status": job.get_status()}
        
    except Exception:
        return {"status": "not_found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
