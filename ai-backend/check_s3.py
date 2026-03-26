import os
from dotenv import load_dotenv
import boto3

load_dotenv(dotenv_path="../.env.local")

s3 = boto3.client(
    's3',
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=os.getenv("AWS_SESSION_TOKEN") if os.getenv("AWS_SESSION_TOKEN") else None
)

bucket = "thecrowsnest"
key = "materials/csci1010/df426af6-6594-4868-ade8-8398df8df0ac.pdf"

print("Checking if object exists:", key)
try:
    s3.head_object(Bucket=bucket, Key=key)
    print("✅ Object EXISTS!")
except Exception as e:
    print("❌ Object check failed:", e)

print("\nListing objects in materials/csci1010/:")
try:
    res = s3.list_objects_v2(Bucket=bucket, Prefix="materials/csci1010/")
    for obj in res.get('Contents', []):
        print(" Found:", obj['Key'])
except Exception as e:
    print("❌ List objects failed:", e)
