from sentence_transformers import SentenceTransformer
import numpy as np
import PyPDF2
import re
import os
import json
from typing import List, Dict, Any
import redis
from rq import Queue, Worker, Connection
import torch

# Get environment variables
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
MAX_MEMORY_MB = int(os.getenv('MAX_MEMORY_MB', 512))

# Initialize Redis connection
redis_conn = redis.from_url(REDIS_URL)
queue = Queue(connection=redis_conn)

def clear_gpu_memory():
    """Clear GPU memory if available"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def get_embedding_model():
    """Get the embedding model - load it only when needed"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    return model

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF file"""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text.strip():
                    text += f"\n\n=== PAGE {page_num + 1} ===\n\n{page_text}"
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")
    return text

def create_chunks(text: str, chunk_size: int = 800, overlap: int = 150) -> List[Dict]:
    """Create text chunks from PDF content"""
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    text = re.sub(r'\s+', ' ', text)
    chunks = []
    
    pages = re.split(r'=== PAGE \d+ ===', text)
    for page_num, page_content in enumerate(pages[1:], 1):
        if not page_content.strip():
            continue
        
        paragraphs = re.split(r'\n\s*\n', page_content)
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            if len(current_chunk + para) > chunk_size and current_chunk:
                chunks.append({
                    'text': current_chunk.strip(),
                    'page': page_num,
                    'chunk_id': len(chunks)
                })
                
                words = current_chunk.split()
                if len(words) > 20:
                    current_chunk = ' '.join(words[-20:]) + " " + para
                else:
                    current_chunk = para
            else:
                current_chunk += "\n\n" + para if current_chunk else para
                
        if current_chunk.strip():
            chunks.append({
                'text': current_chunk.strip(),
                'page': page_num,
                'chunk_id': len(chunks)
            })
            
    return chunks

def process_pdf(pdf_path: str, job_id: str) -> Dict[str, Any]:
    """Process PDF file and store results in Redis"""
    try:
        # Extract text
        text = extract_text_from_pdf(pdf_path)
        if not text.strip():
            return {"success": False, "error": "No text found in PDF"}

        # Create chunks
        chunks = create_chunks(text)
        
        # Generate embeddings
        model = get_embedding_model()
        embeddings = []
        
        for chunk in chunks:
            embedding = model.encode(chunk['text'], convert_to_numpy=True)
            embeddings.append(embedding.tolist())  # Convert to list for JSON serialization
        
        # Store results in Redis with 1 hour expiration
        result = {
            "chunks": chunks,
            "embeddings": embeddings,
            "pdf_name": os.path.basename(pdf_path)
        }
        redis_conn.setex(f"pdf_data:{job_id}", 3600, json.dumps(result))
        
        # Clear GPU memory
        clear_gpu_memory()
        
        return {
            "success": True,
            "message": f"PDF processed successfully",
            "chunks_created": len(chunks),
            "job_id": job_id
        }
        
    except Exception as e:
        return {"success": False, "error": f"Error processing PDF: {str(e)}"}

def answer_question(question: str, job_id: str) -> Dict[str, Any]:
    """Answer a question using the processed PDF data"""
    try:
        # Get stored data from Redis
        data = redis_conn.get(f"pdf_data:{job_id}")
        if not data:
            return {"success": False, "error": "PDF data not found or expired"}
            
        data = json.loads(data)
        chunks = data["chunks"]
        embeddings = [np.array(e) for e in data["embeddings"]]
        
        # Get question embedding
        model = get_embedding_model()
        question_embedding = model.encode(question, convert_to_numpy=True)
        
        # Find most relevant chunks
        similarities = [
            np.dot(question_embedding, chunk_embedding) / 
            (np.linalg.norm(question_embedding) * np.linalg.norm(chunk_embedding)) 
            for chunk_embedding in embeddings
        ]
        top_chunk_indices = np.argsort(similarities)[-3:][::-1]
        
        context = "\n\n".join([
            f"[Page {chunks[i]['page']}] {chunks[i]['text']}" 
            for i in top_chunk_indices
        ])
        
        # Use DeepSeek API for answer generation
        from pdf_rag_backend_api import DeepSeekClient
        messages = [
            {
                "role": "system", 
                "content": "You are a helpful AI assistant that answers questions about PDF documents. Use the provided context to answer questions accurately and concisely."
            },
            {
                "role": "user", 
                "content": f"Context from PDF '{data['pdf_name']}':\n\n{context}\n\nQuestion: {question}\n\nAnswer based on the context above:"
            }
        ]
        
        client = DeepSeekClient()
        answer = client.chat_completion(messages)
        
        # Clear GPU memory
        clear_gpu_memory()
        
        return {
            "success": True,
            "answer": answer,
            "context": context,
            "pages": [chunks[i]['page'] for i in top_chunk_indices]
        }
        
    except Exception as e:
        return {"success": False, "error": f"Error answering question: {str(e)}"}

if __name__ == "__main__":
    # Start worker
    with Connection(redis_conn):
        worker = Worker([queue])
        worker.work() 