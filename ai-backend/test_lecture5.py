from core.vector_store import pool

with pool.connection() as conn:
    count = conn.execute("SELECT COUNT(*) FROM embeddings WHERE content ILIKE '%lecture 5.pdf%'").fetchone()['count']
    print(f"Chunks containing 'lecture 5.pdf': {count}")
    
    all_count = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()['count']
    print(f"Total chunks in database: {all_count}")
    
    # Get a sample of the first few lines of the text chunks that DO contain lecture 5
    docs = conn.execute("SELECT content FROM embeddings WHERE content ILIKE '%lecture 5.pdf%' LIMIT 1").fetchall()
    if docs:
        print(f"Snippet:\n{docs[0]['content'][:200]}")
    else:
        print("No snippets found.")
