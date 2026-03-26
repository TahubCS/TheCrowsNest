from google import genai
from google.genai import types
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from .config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Manage Postgres Connections
pool = ConnectionPool(
    conninfo=settings.DATABASE_URL,
    min_size=1,
    max_size=10,
    kwargs={"row_factory": dict_row, "autocommit": True}
)

def get_embedding(text: str) -> list[float]:
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=768,
            task_type="RETRIEVAL_DOCUMENT"
        )
    )
    return response.embeddings[0].values

def add_documents(class_id: str, material_id: str, texts: list[str], metadatas: list[dict]):
    """
    Add chunked texts to pgvector in PostgreSQL.
    """
    if not texts:
        return

    with pool.connection() as conn:
        try:
            # Ensure document exists to satisfy foreign key constraints
            conn.execute(
                "INSERT INTO documents (id, domain, status) VALUES (%s, 'general', 'PROCESSED') ON CONFLICT DO NOTHING",
                (material_id,)
            )

            for i, text in enumerate(texts):
                # Enrich content with class_id and metadata to aid retrieval and LLM context
                metadata = metadatas[i] if metadatas and i < len(metadatas) else {}
                source_file = metadata.get('source', 'Unknown Document')
                page_num = metadata.get('page', '?')
                
                enriched_content = f"[Class: {class_id}] [File: {source_file}, Page: {page_num}]\n{text}"
                embedding = get_embedding(enriched_content)
                conn.execute(
                    "INSERT INTO embeddings (document_id, content, embedding) VALUES (%s, %s, %s)",
                    (material_id, enriched_content, embedding)
                )
        except Exception as e:
            print(f"Database Insert Error: {e}")

def delete_documents(material_id: str):
    """
    Delete complete document and cascade its embeddings from PostgreSQL.
    """
    with pool.connection() as conn:
        try:
            conn.execute("DELETE FROM documents WHERE id = %s", (material_id,))
        except Exception as e:
            print(f"Database Delete Error: {e}")

def query_documents(class_id: str, query: str, n_results: int = 15) -> str:
    """
    Query documents for a specific class ID using vector similarity (<=>).
    Returns a unified string of context.
    """
    query_embedding = get_embedding(query)
    
    with pool.connection() as conn:
        results = conn.execute(
            """
            SELECT content 
            FROM embeddings 
            WHERE content ILIKE %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (f"%[Class: {class_id}]%", query_embedding, n_results)
        ).fetchall()
        
        if not results:
            return ""
            
        documents = [row['content'] for row in results]
        return "\n\n---\n\n".join(documents)
