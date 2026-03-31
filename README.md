# 🏴‍☠️ The Crow's Nest: An ECU Student Hub

**The Crow's Nest** is a premium, AI-driven academic management platform built specifically for East Carolina University (ECU) students. Originally born out of a high-pressure ECU Hackathon, it has since evolved into a highly sophisticated dual-stack application featuring serverless AWS infrastructure and a dedicated continuous-learning AI microservice.

---

## 🏗️ Architecture Stack

The platform is split into two primary environments: a blisteringly fast React frontend/backend, and an autonomous Python AI engine.

### 1. The Core Application (`/src`)
- **Framework**: Next.js 16 (App Router) for hybrid rendering and optimized routing.
- **Styling**: Tailwind CSS 4.0 prioritizing a vibrant, glassmorphic ECU-purple and gold aesthetic.
- **Primary Database**: Amazon DynamoDB for ultra-low latency NoSQL storage of Users, Enrolled Classes, and Material Metadata.
- **File Storage**: AWS S3 for secure, massive-scale storage of student-uploaded textbooks, lecture slides, and images.
- **Authentication**: NextAuth.js v5 using custom JWT strategies.

### 2. The AI Engine (`/ai-backend`)
- **Framework**: Python FastAPI acting as an asynchronous internal microservice.
- **Vector Database**: PostgreSQL enhanced with the `pgvector` extension for permanent mathematical mapping of textual relationships.
- **LLM Integration**: Google Gemini (`google-genai`) for multi-modal parsing, embeddings, and content generation.

---

## 🧠 Key Features & Innovations

### 🛡️ Autonomous AI Material Gatekeeper 
To prevent spam, storage bloat, and irrelevant files, **every file uploaded by a student is intercepted and graded by an AI Administrator.**
- **Tri-State Logic**: Files are strictly graded against the official class syllabus. Highly accurate files (≥ 75% confidence) are instantly approved. Ambiguous files (50-74%) are heavily scrutinized and left for manual Admin dashboard review. Irrelevant files or spam (< 50%) are instantly rejected, and the raw file is permanently deleted from the S3 bucket to save costs.
- **Native Document Parsing**: Leveraging `PyMuPDF`, `python-pptx`, and `python-docx`, the backend natively reads inside massive PDFs, PowerPoints, and Word Documents.
- **Gemini Vision OCR**: Utilizing `Pillow` and Gemini Vision, the server natively reads text directly out of student-uploaded images and screenshots (`.webp`, `.jpg`, `.png`).

### 📚 RAG Pipeline (Vectorized Knowledge Base)
The Crow's Nest does not use "stuffed context windows" that forget data. It implements an industry-grade **RAG (Retrieval-Augmented Generation)** database.
When textbooks or hundreds of powerpoint slides are uploaded, the AI backend chops them into thousands of chunks, generates 768-dimensional vector embeddings with Google Gemini (utilizing exponential backoffs and strict API pacing), and saves them forever into PostgreSQL (`pgvector`). 

### 🤖 The AI Tutor Suite
Because every class has a permanent memory bank of uploaded materials, students can generate highly accurate resources instantly:
- **Flashcard Generation**: The AI pulls the top 5 most relevant paragraphs from the Vector Database and generates JSON flashcards.
- **Practice Exams**: Evaluates the entire matrix of a class's knowledge base to generate custom-tailored practice tests.
- **Chat Tutor**: Students can ask deep, contextual questions about their specific class, and the Tutor knows the answers based on the uploaded syllabus and files without needing to "re-read" the textbooks.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- Python (3.12+)
- Running PostgreSQL database compiled with `pgvector`
- AWS IAM Credentials (S3 + DynamoDB access)
- Google Gemini API Key

### Start the Next.js Frontend
```bash
npm install
npm run dev
```

### Start the AI Backend
```bash
cd ai-backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
py main.py
```

---
*Built for Pirates. Go ECU!* 🏴‍☠️
