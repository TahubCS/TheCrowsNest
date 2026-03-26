import sys
from core.vector_store import pool

with pool.connection() as conn:
    count = conn.execute("SELECT COUNT(*) FROM embeddings WHERE document_id = '9ed16d96-dcc5-4317-a7d5-7e86c6b6ac07'").fetchone()['count']
    print(f"Chunks for lecture 5.pdf: {count}")
