import os
import sys
from dotenv import load_dotenv
from pathlib import Path

# Load from root .env.local to share Next.js environment variables
# Path(__file__).parent points to ai-backend/core
# We go up two levels to get to the root directory
env_path = Path(__file__).parent.parent.parent / ".env.local"

if env_path.exists():
    print(f"Loading environment from {env_path}")
    load_dotenv(dotenv_path=env_path)
else:
    print(f"WARNING: .env.local not found at {env_path}", file=sys.stderr)
    # Try default .env as fallback
    load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")

settings = Settings()
