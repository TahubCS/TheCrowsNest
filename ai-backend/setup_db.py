import psycopg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local", override=True)
url = os.getenv("DATABASE_URL")

try:
    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            with open("db_schema.sql", "r") as f:
                cur.execute(f.read())
            print("✅ Schema created!")
except Exception as e:
    print(f"❌ Error: {e}")
