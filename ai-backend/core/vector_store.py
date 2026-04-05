from google import genai
from google.genai import types
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
import time
from .config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Manage Postgres Connections
pool = ConnectionPool(
    conninfo=settings.DATABASE_URL,
    min_size=1,
    max_size=10,
    max_idle=300,
    check=ConnectionPool.check_connection,
    # Supabase transaction poolers can recycle backend sessions between statements.
    # Disable server-side prepared statements to avoid
    # "prepared statement ... does not exist" errors under PgBouncer.
    kwargs={
        "row_factory": dict_row,
        "autocommit": True,
        "prepare_threshold": None,
    }
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

def get_embedding_with_retry(text: str, max_retries: int = 5) -> list[float]:
    for attempt in range(max_retries):
        try:
            return get_embedding(text)
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            sleep_time = 2 ** attempt
            print(f"Embedding API limit reached or 503 Unavailable. Retrying in {sleep_time} seconds...")
            time.sleep(sleep_time)

MAX_CHUNKS_PER_MATERIAL = 800
MAX_EMBEDDING_RETRIES = 5


class ChunkCapExceededError(Exception):
    """Raised when a material exceeds the maximum allowed chunk count."""
    pass


class EmbeddingExhaustedError(Exception):
    """Raised when too many chunks fail embedding consecutively."""
    pass


def add_documents(class_id: str, material_id: str, texts: list[str], metadatas: list[dict]):
    """
    Add chunked texts to pgvector in PostgreSQL.
    Enforces chunk cap (EM-001) and tracks consecutive failures (EM-002).
    """
    if not texts:
        return

    # EM-001: Chunk cap
    if len(texts) > MAX_CHUNKS_PER_MATERIAL:
        raise ChunkCapExceededError(
            f"Material {material_id} has {len(texts)} chunks, exceeding the cap of {MAX_CHUNKS_PER_MATERIAL}."
        )

    consecutive_failures = 0
    max_consecutive_failures = 5
    embedded_count = 0

    with pool.connection() as conn:
        try:
            print(f"Starting background embedding for {len(texts)} chunks of material {material_id}...")

            # Ensure document exists to satisfy foreign key constraints
            conn.execute(
                "INSERT INTO documents (id, domain, status) VALUES (%s, 'general', 'PROCESSED') ON CONFLICT DO NOTHING",
                (material_id,)
            )

            for i, text in enumerate(texts):
                if i % 10 == 0 and i > 0:
                    print(f"Embedded {i}/{len(texts)} chunks...")

                # Enrich content with class_id and metadata to aid retrieval and LLM context
                metadata = metadatas[i] if metadatas and i < len(metadatas) else {}
                source_file = metadata.get('source', 'Unknown Document')
                page_num = metadata.get('page', '?')

                enriched_content = f"[Class: {class_id}] [File: {source_file}, Page: {page_num}]\n{text}"
                try:
                    embedding = get_embedding_with_retry(enriched_content)
                    conn.execute(
                        "INSERT INTO embeddings (document_id, content, embedding) VALUES (%s, %s, %s)",
                        (material_id, enriched_content, embedding)
                    )
                    # Pace limit internally to avoid triggering aggressive 503s on giant textbooks
                    time.sleep(0.5)
                    consecutive_failures = 0
                    embedded_count += 1
                except Exception as chunk_err:
                    consecutive_failures += 1
                    print(f"Skipping chunk {i} due to unrecoverable embedding error: {chunk_err}")
                    # EM-002: Too many consecutive failures → abort
                    if consecutive_failures >= max_consecutive_failures:
                        raise EmbeddingExhaustedError(
                            f"Embedding aborted after {max_consecutive_failures} consecutive failures at chunk {i}."
                        )
                    continue

            print(f"Successfully finished embedding {embedded_count}/{len(texts)} chunks for material {material_id} into pgvector!")

        except (ChunkCapExceededError, EmbeddingExhaustedError):
            raise  # propagate to caller
        except Exception as e:
            print(f"Database Insert Error: {e}")
            raise

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
