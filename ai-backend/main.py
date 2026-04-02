from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from core.ingest import process_material
from core.ai import generate_flashcards, generate_study_plan, generate_practice_exam, chat_with_tutor
from core.vector_store import pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Server is starting up
    yield
    # Server is shutting down — close the DB connection pool gracefully
    pool.close()

app = FastAPI(title="The Crows Nest AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Allow local Next.js instance
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestReq(BaseModel):
    classId: str
    materialId: str
    storageKey: str
    fileName: str

@app.post("/ingest")
async def ingest_material(req: IngestReq):
    process_material(req.classId, req.materialId, req.storageKey, req.fileName)
    return {"success": True}

class EvalIngestReq(BaseModel):
    classId: str
    materialId: str
    storageKey: str
    fileName: str
    classContext: str

@app.post("/evaluate-and-ingest")
async def evaluate_and_ingest(req: EvalIngestReq, background_tasks: BackgroundTasks):
    from core.ingest import download_extract_and_evaluate
    from core.vector_store import add_documents
    
    result = download_extract_and_evaluate(
        req.classId, req.materialId, req.storageKey, req.fileName, req.classContext
    )
    
    if result.get("evaluation") == "APPROVED":
        texts = result.pop("texts", [])
        metadatas = result.pop("metadatas", [])
        # Decouple the embedding generation so Next.js doesn't time out waiting 60s for a giant PDF 
        background_tasks.add_task(add_documents, req.classId, req.materialId, texts, metadatas)
        
    return {"success": True, "data": result}

class FlashcardsReq(BaseModel):
    classId: str
    topic: str = "Key core concepts"
    count: int = 20
    style: str = "Concepts"

@app.post("/generate/flashcards")
async def flashcards(req: FlashcardsReq):
    cards = generate_flashcards(req.classId, req.topic, req.count, req.style)
    return {"success": True, "data": {"flashcards": cards}}

class StudyPlanReq(BaseModel):
    classId: str
    timeframe: str = "1 week"

@app.post("/generate/study-plan")
async def study_plan(req: StudyPlanReq):
    plan = generate_study_plan(req.classId, req.timeframe)
    return {"success": True, "data": {"studyPlan": plan}}

class PracticeExamReq(BaseModel):
    classId: str
    topic: str = "General"
    difficulty: str = "Medium"
    count: int = 10

@app.post("/generate/practice-exam")
async def practice_exam(req: PracticeExamReq):
    exam = generate_practice_exam(req.classId, req.topic, req.difficulty, req.count)
    return {"success": True, "data": {"practiceExam": exam}}

class ChatReq(BaseModel):
    classId: str
    messages: list[dict]

@app.post("/chat")
async def chat(req: ChatReq):
    reply = chat_with_tutor(req.classId, req.messages)
    return {"success": True, "reply": reply}

@app.delete("/materials/{material_id}")
async def delete_material_vectors(material_id: str):
    from core.vector_store import delete_documents
    delete_documents(material_id)
    return {"success": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
