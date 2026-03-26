import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

access_key = os.getenv("AWS_ACCESS_KEY_ID")
secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

print(f"Access Key ID: '{access_key}'")
print(f"Access Key Type: {type(access_key)}")
print(f"Secret Key format has quotes: {'\"' in secret_key if secret_key else False}")

import boto3
try:
    s3 = boto3.client('s3', region_name='us-east-1', aws_access_key_id=access_key, aws_secret_access_key=secret_key, aws_session_token=None)
    response = s3.head_object(Bucket="thecrowsnest", Key="test-upload.txt")
except Exception as e:
    print("Error:", e)
