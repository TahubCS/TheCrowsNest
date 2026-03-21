import os
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

from .config import settings

# Initialize ChromaDB in local persistence mode
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

# Use Chroma Client
chroma_client = chromadb.PersistentClient(path=DB_DIR)

# We can use Gemini embeddings or default sentence transformers
# To use Gemini, we would need to set up a custom embedding function if Chroma's isn't enough,
# but ChromaDB works reliably with its default `all-MiniLM-L6-v2` for simple text.
# However, to be fully "Gemini", let's use the google generative ai embedding function.
chroma_gemini_ef = embedding_functions.GoogleGenerativeAiEmbeddingFunction(api_key=settings.GEMINI_API_KEY)

# Get or create collection for course materials
collection = chroma_client.get_or_create_collection(
    name="course_materials",
    embedding_function=chroma_gemini_ef
)

def add_documents(class_id: str, material_id: str, texts: list[str], metadatas: list[dict]):
    """
    Add chunked texts to ChromaDB tagged with class_id.
    """
    if not texts:
        return
    
    # Generate unique IDs for chunks
    ids = [f"{material_id}_{i}" for i in range(len(texts))]
    
    # Add metadata to identify chunks by class_id and material_id
    for meta in metadatas:
        meta["class_id"] = class_id
        meta["material_id"] = material_id

    collection.add(
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )

def query_documents(class_id: str, query: str, n_results: int = 5) -> str:
    """
    Query documents for a specific class ID.
    Returns a unified string of context.
    """
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where={"class_id": class_id}
    )
    
    if not results or not results['documents'] or not results['documents'][0]:
        return ""
        
    documents = results['documents'][0]
    return "\n\n---\n\n".join(documents)
