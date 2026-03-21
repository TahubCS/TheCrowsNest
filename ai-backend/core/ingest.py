import os
import tempfile
import boto3
import fitz # PyMuPDF
from .config import settings
from .vector_store import add_documents

s3_client = boto3.client(
    's3',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

def download_and_extract_text(s3_key: str) -> list[str]:
    # bucket name is "thecrowsnest" based on Next.js api/materials/route.ts
    bucket = "thecrowsnest"
    
    # Use unqiue temp file to avoid collisions
    fd, local_path = tempfile.mkstemp(suffix=os.path.splitext(s3_key)[1] or ".pdf")
    os.close(fd)
    
    print(f"Downloading {s3_key} from {bucket} to {local_path}...")
    s3_client.download_file(bucket, s3_key, local_path)
    
    # Extract text
    texts = []
    if local_path.lower().endswith(".pdf"):
        doc = fitz.open(local_path)
        for page in doc:
            texts.append(page.get_text())
        doc.close()
    else:
        # text file fallback
        with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            texts = [content[i:i+2000] for i in range(0, len(content), 2000)]
            
    # Cleanup
    if os.path.exists(local_path):
        os.remove(local_path)
        
    return [t for t in texts if t.strip()]

def process_material(class_id: str, material_id: str, s3_key: str, file_name: str):
    print(f"Processing material: {file_name} for class: {class_id}")
    texts = download_and_extract_text(s3_key)
    metadatas = [{"source": file_name, "page": i+1} for i in range(len(texts))]
    add_documents(class_id, material_id, texts, metadatas)
    print("Added material to ChromaDB.")
