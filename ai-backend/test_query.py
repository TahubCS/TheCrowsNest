import asyncio
from core.vector_store import query_documents, pool

def test():
    log = []
    try:
        log.append("Checking DB row count...")
        with pool.connection() as conn:
            count = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()['count']
            log.append(f"Total vectors in DB: {count}")
            
            if count > 0:
                sample = conn.execute("SELECT content FROM embeddings LIMIT 1").fetchone()['content']
                log.append(f"Sample content snippet: {sample[:100]}")
        
        log.append("\nTesting query_documents...")
        res = query_documents("csci1010", "operating systems")
        log.append(f"Query returned {len(res)} characters.")
        if res:
            log.append("SUCCESS! Found context.")
        else:
            log.append("FAIL! Context is empty.")
    except Exception as e:
        log.append(f"ERROR: {e}")
    finally:
        with open("result.txt", "w") as f:
            f.write("\n".join(log))

test()
