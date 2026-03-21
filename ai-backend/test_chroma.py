from core.vector_store import add_documents, query_documents

print("ChromaDB initialization successful!")

class_id = "test_class_1"
material_id = "test_mat_1"
texts = ["This is a test document explaining the core concepts of Python.", "Another document about advanced FastAPI routing."]
metadatas = [{"source": "test1.pdf", "page": 1}, {"source": "test1.pdf", "page": 2}]

print("Adding documents...")
add_documents(class_id, material_id, texts, metadatas)
print("Documents added successfully.")

print("Querying documents for 'Python'...")
results = query_documents(class_id, "Python", n_results=1)

print("Query Results:")
print(results)
