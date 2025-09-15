#! backend/rag_core.py

import os
import logging
from dotenv import load_dotenv

from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    load_index_from_storage,
    Settings,
    SummaryIndex,
)
# --- NEW IMPORTS for the ReAct Agent ---
from llama_index.core.tools import QueryEngineTool
from llama_index.core.agent import ReActAgent
# --- END NEW IMPORTS ---

from llama_index.llms.gemini import Gemini
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_parse import LlamaParse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

LLAMAPARSE_API_KEY = os.getenv("LLAMAPARSE_API_KEY")
if not LLAMAPARSE_API_KEY:
    raise ValueError("LLAMAPARSE_API_KEY is not set in the .env file.")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY is not set in the environment variables.")

try:
    with open("system_prompt.md", "r") as f:
        SYSTEM_PROMPT = f.read().strip()
    logging.info("System prompt loaded successfully.")
except FileNotFoundError:
    SYSTEM_PROMPT = "You are a helpful Q&A assistant."
    logging.warning(f"system_prompt.md not found. Using default: '{SYSTEM_PROMPT}'")

def configure_global_settings():
    logging.info("Configuring global LlamaIndex settings for Gemini...")
    
    # Explicitly get the API key
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY is required for Gemini models")
    
    try:
        Settings.llm = Gemini(model="models/gemini-1.5-flash-latest", api_key=google_api_key)
        Settings.embed_model = GeminiEmbedding(model_name="models/text-embedding-004", api_key=google_api_key)
        logging.info("Global settings configured successfully with Gemini models.")
    except Exception as e:
        logging.error(f"Failed to configure Gemini models: {e}")
        raise

async def create_and_load_indexes(filepath: str, index_dir: str):
    """Parses document and creates/loads both a Vector and Summary Index."""
    if not os.path.exists(filepath):
        raise ValueError(f"Filepath does not exist: {filepath}")
        
    logging.info(f"Parsing document: {filepath} using LlamaParse...")
    parser = LlamaParse(
        api_key=LLAMAPARSE_API_KEY,
        base_url="https://api.cloud.eu.llamaindex.ai",
        result_type="markdown", verbose=True, language="en"
    )
    documents = await parser.aload_data(filepath)
    if not documents:
        raise ValueError("LlamaParse returned no documents.")
    logging.info(f"LlamaParse returned {len(documents)} documents.")
    
    vector_index_dir = os.path.join(index_dir, "vector_index")
    vector_index = VectorStoreIndex.from_documents(documents, embed_model=Settings.embed_model)
    vector_index.storage_context.persist(persist_dir=vector_index_dir)
    logging.info(f"Vector index created and persisted at: {vector_index_dir}")

    summary_index_dir = os.path.join(index_dir, "summary_index")
    summary_index = SummaryIndex.from_documents(documents, embed_model=Settings.embed_model)
    summary_index.storage_context.persist(persist_dir=summary_index_dir)
    logging.info(f"Summary index created and persisted at: {summary_index_dir}")

def get_chat_engine(index_dir: str):
    """Loads indexes and builds a robust ReAct Agent."""
    logging.info("Loading indexes and building ReAct agent.")

    vector_index = load_index_from_storage(StorageContext.from_defaults(persist_dir=os.path.join(index_dir, "vector_index")))
    summary_index = load_index_from_storage(StorageContext.from_defaults(persist_dir=os.path.join(index_dir, "summary_index")))

    # 1. Define the Query Engines for our two tools
    vector_query_engine = vector_index.as_query_engine(similarity_top_k=7)
    summary_query_engine = summary_index.as_query_engine(response_mode="tree_summarize")
    
    # 2. Define the tools for the Agent
    vector_tool = QueryEngineTool.from_defaults(
        query_engine=vector_query_engine,
        description="Useful for answering specific questions about the content of the lease agreement."
    )
    summary_tool = QueryEngineTool.from_defaults(
        query_engine=summary_query_engine,
        description="Useful for answering questions that require a high-level summary, an answer to the purpose of the document, or involve specific section references (like 'Paragraph 5b')."
    )
    
    # --- THE FINAL AND CORRECT IMPLEMENTATION IS HERE ---
    # 3. Create the ReActAgent.
    #    The ReActAgent is a powerful conversational agent that can reason about
    #    which tool to use and correctly applies a system prompt to its thinking process.
    chat_engine = ReActAgent.from_tools(
        tools=[vector_tool, summary_tool],
        system_prompt=SYSTEM_PROMPT,
        verbose=True
    )
    # --- END OF FIX ---

    return chat_engine