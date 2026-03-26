import os
from dotenv import load_dotenv

# Load from ../.env.local to share Next.js environment variables
load_dotenv(dotenv_path="../.env.local", override=True)

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN") if os.getenv("AWS_SESSION_TOKEN") else None

settings = Settings()
