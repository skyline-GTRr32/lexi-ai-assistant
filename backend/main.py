#! backend/main.py

import os
import uuid
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

# --- NEW IMPORT FOR CORS ---
from fastapi.middleware.cors import CORSMiddleware
# --- END NEW IMPORT ---

from rag_core import configure_global_settings, create_and_load_indexes, get_chat_engine
from llama_index.core.callbacks import CallbackManager, LlamaDebugHandler
from llama_index.core import Settings

# --- Basic Server Setup & Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

llama_debug_handler = LlamaDebugHandler()
Settings.callback_manager = CallbackManager([llama_debug_handler])

try:
    configure_global_settings()
    logger.info("Global LlamaIndex settings configured successfully.")
except Exception as e:
    logger.critical(f"Failed to configure LlamaIndex settings: {e}", exc_info=True)

app = FastAPI(
    title="Legal RAG API",
    description="API for uploading legal documents and asking questions.",
    version="0.1.0",
)

# --- THE CORS FIX IS HERE ---
# This middleware allows your React frontend (running on localhost:3000)
# to make API requests to this backend (running on localhost:8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://lexi-ai-assistant.vercel.app/",  # We'll update this
        "https://*.vercel.app"  # Allows all Vercel subdomains
    ],  # The origin of your React app
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)
# --- END OF FIX ---

# This dictionary tracks the status of our background processing jobs.
job_status = {}

# Pydantic Models for a professional API experience
class UploadResponse(BaseModel):
    job_id: str
    message: str

class StatusResponse(BaseModel):
    job_id: str
    status: str
    
class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_id: str # This will be the job_id from the upload

class AskResponse(BaseModel):
    question: str
    answer: str

# Directory Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "storage", "uploads")
INDEXES_DIR = os.path.join(BASE_DIR, "storage", "indexes")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(INDEXES_DIR, exist_ok=True)

# This is the function that will run in the background
async def process_document_background(temp_filepath: str, document_id: str, index_path: str):
    """The long-running function to parse and index a document."""
    logger.info(f"Background task started for job_id: {document_id}")
    try:
        await create_and_load_indexes(temp_filepath, index_path)
        job_status[document_id] = "complete"
        logger.info(f"Background task complete for job_id: {document_id}")
    except Exception as e:
        logger.error(f"Background task failed for job_id: {document_id}: {e}", exc_info=True)
        job_status[document_id] = "failed"

# --- API Endpoints ---

@app.get("/", tags=["Health Check"])
async def read_root():
    return {"status": "ok"}

@app.post("/api/upload", response_model=UploadResponse, status_code=202, tags=["Document Processing"])
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")
    
    unique_id = str(uuid.uuid4())
    _, extension = os.path.splitext(file.filename)
    safe_filename = f"{unique_id}{extension}"
    temp_filepath = os.path.join(UPLOADS_DIR, safe_filename)

    with open(temp_filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    document_id = unique_id # The job_id is the document_id
    index_path = os.path.join(INDEXES_DIR, document_id)
    
    # Set the initial status and start the background task
    job_status[document_id] = "processing"
    background_tasks.add_task(process_document_background, temp_filepath, document_id, index_path)
    
    # Return immediately, so the user doesn't wait
    return UploadResponse(job_id=document_id, message="Document upload accepted and is being processed.")

@app.get("/api/status/{job_id}", response_model=StatusResponse, tags=["Document Processing"])
async def get_processing_status(job_id: str):
    """Allows the frontend to poll for the status of a document processing job."""
    status = job_status.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found.")
    return StatusResponse(job_id=job_id, status=status)

@app.post("/api/ask", response_model=AskResponse, tags=["Question & Answer"])
async def ask_question(request: AskRequest):
    document_id = request.document_id
    if job_status.get(document_id) != "complete":
        raise HTTPException(status_code=400, detail="Document is not ready for querying. Please check status.")

    try:
        index_path = os.path.join(INDEXES_DIR, document_id)
        chat_engine = get_chat_engine(index_path)
        
        response = chat_engine.chat(request.question)
        answer = str(response)

        # Your robust logging for debugging
        logger.info("--- DEEP DEBUGGING: AGENT RESPONSE ---")
        if hasattr(response, 'source_nodes') and response.source_nodes:
            for i, node in enumerate(response.source_nodes):
                score_str = f"{node.score:.4f}" if node.score is not None else "N/A"
                logger.info(f"--- Node {i+1} (Score: {score_str}) ---")
                logger.info(node.text[:250] + "...")
                logger.info("--------------------")
        else:
            logger.warning("No direct source_nodes found in the final agent response. This is normal for ReActAgent.")
        logger.info("--- END OF DEBUGGING ---")

        return AskResponse(question=request.question, answer=answer)
    except Exception as e:
        logger.error(f"Error during chat query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")