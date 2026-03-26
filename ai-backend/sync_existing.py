import asyncio
import os
from core.ingest import s3_client, process_material

def sync_all():
    bucket = "thecrowsnest"
    print(f"Scanning S3 bucket {bucket} for existing materials to re-ingest into PostgreSQL...")
    
    try:
        res = s3_client.list_objects_v2(Bucket=bucket, Prefix="materials/")
        objects = res.get('Contents', [])
        print(f"Found {len(objects)} files.")
        for obj in objects:
            key = obj['Key']
            # key format: materials/classId/uuid.pdf
            parts = key.split('/')
            if len(parts) >= 3:
                class_id = parts[1]
                # For a seamless sync, material_id can just be the UUID prefix, or we extract it.
                # Let's derive it from the filename UUID.
                file_name = parts[-1]
                material_id = file_name.split('.')[0]
                print(f"Ingesting {file_name} for class {class_id}...")
                process_material(class_id, material_id, key, file_name)
        print("\n✅ Sync fully complete! Elements injected to Postgres.")
    except Exception as e:
        print(f"ERROR syncing: {e}")

sync_all()
