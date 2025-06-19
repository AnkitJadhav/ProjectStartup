#!/bin/bash

# Start Redis server in the background
redis-server --daemonize yes

# Start the worker process in the background
python worker.py &

# Start the FastAPI application
python pdf_rag_backend_api.py 