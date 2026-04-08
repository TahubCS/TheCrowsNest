# 🏴‍☠️ The Crow's Nest: An ECU Student Hub

**The Crow's Nest** is a premium, AI-driven academic management platform built specifically for East Carolina University (ECU) students. Originally born out of a high-pressure ECU Hackathon, it has since evolved into a highly sophisticated dual-stack application featuring a Supabase-powered Postgres database, a dedicated continuous-learning AI microservice, and centralized observability.

---

## 🌟 What's New
- **Centralized Token Telemetry**: Automatically tracks input, output, and embedding API tokens collectively across all contributors via atomic Supabase PostgreSQL operations.
- **Unified Deletions**: Added seamless API and UI flows to manage and delete personal AI-generated flashcards, practice exams, and study plans.
- **Glassmorphic UI & Interactive Backgrounds**: Implemented dynamic `tsparticles`, `PseudoParticleSystem` backgrounds, custom form controls, and unified 6px `webkit-scrollbar` styling across all components.
- **Admin Quota Bypasses**: Integrated Stripe usage quotas that can be intelligently bypassed by platform administrators.

---

## 🏗️ Architecture Stack

The platform is split into two primary environments: a blisteringly fast React frontend/backend, and an autonomous Python AI engine.

### 1. The Core Application (`/src`)
- **Framework**: Next.js 16 (App Router) for hybrid rendering and optimized routing.
- **Styling**: Tailwind CSS 4.0 prioritizing a vibrant, glassmorphic ECU-purple and gold aesthetic. Features highly custom, consistent UI down to unified `webkit-scrollbar` styling and form controls.
- **Primary Database**: Supabase PostgreSQL for relational storage of Users, Enrolled Classes, Study Plans, and Material Metadata.
- **File Storage**: Supabase Storage for secure, massive-scale storage of student-uploaded textbooks, lecture slides, and images.
- **Authentication**: NextAuth.js v5 using custom JWT strategies.
- **Monetization & Quotas**: Stripe integration handles premium tier subscriptions, enforcing granular usage quotas on AI generations with admin-bypass capabilities.

### 2. The AI Engine (`/ai-backend`)
- **Framework**: Python FastAPI acting as an asynchronous internal microservice.
- **Vector & Telemetry Database**: Supabase (PostgreSQL) enhanced with the `pgvector` extension for permanent mathematical mapping of textual relationships, alongside robust telemetry tables.
- **LLM Integration**: Google Gemini (`google-genai` SDK) for multi-modal parsing, embeddings (`gemini-embedding-001`), and generative content.

---

## 🧠 Key Features & Innovations

### 🛡️ Autonomous AI Material Gatekeeper 
To prevent spam, storage bloat, and irrelevant files, **every file uploaded by a student is intercepted and graded by an AI Administrator.**
- **Tri-State Logic**: Files are strictly graded against the official class syllabus. Highly accurate files (≥ 75% confidence) are instantly approved. Ambiguous files (50-74%) are heavily scrutinized and left for manual Admin dashboard review. Irrelevant files or spam (< 50%) are instantly rejected, and the raw file is permanently deleted from Supabase Storage to save costs.
- **Native Document Parsing**: Leveraging `PyMuPDF`, `python-pptx`, and `python-docx`, the backend natively reads inside massive PDFs, PowerPoints, and Word Documents.
- **Gemini Vision OCR**: Utilizing `Pillow` and Gemini Vision, the server natively reads text directly out of student-uploaded images and screenshots (`.webp`, `.jpg`, `.png`).

### 📚 RAG Pipeline (Vectorized Knowledge Base)
The Crow's Nest does not use "stuffed context windows" that forget data. It implements an industry-grade **RAG (Retrieval-Augmented Generation)** database.
When textbooks or hundreds of powerpoint slides are uploaded, the AI backend chops them into thousands of chunks, generates 768-dimensional vector embeddings, and saves them forever into Supabase (`pgvector`). 

### 🤖 The AI Tutor Suite
Because every class has a permanent memory bank of uploaded materials, students can generate highly accurate resources instantly:
- **Personal & Shared Decks**: The AI pulls the most relevant paragraphs from the Vector Database and generates JSON flashcards. Students can generate custom-sized private decks or rely on community-shared decks.
- **Practice Exams**: Evaluates the entire matrix of a class's knowledge base to generate custom-tailored practice tests with varying difficulties.
- **Chat Tutor**: Students can ask deep, contextual questions about their specific class. The Tutor answers using a streaming generation path for instantaneous feedback.

### 📊 Centralized Observability & Token Telemetry
A dedicated, atomic token-tracking system operates silently across all AI operations:
- **Atomic Operations**: Resolves race conditions across multiple contributors using PostgreSQL `ON CONFLICT DO UPDATE` upserts via Supabase service roles.
- **Comprehensive Logging**: Automatically logs daily and lifetime total usage metrics (Input/Output/Embedding tokens) split distinctly by model name, ensuring precise cost-monitoring regardless of the endpoint utilized (streaming chat, bulk generation, or vector embedding).

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- Python (3.12+)
- Supabase Project URL, Anon Key, & Service Role Key (for Database, Storage, `pgvector`, and Telemetry)
- Google Gemini API Key
- Stripe API Keys (for Premium features)

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

### Database Migrations
Ensure you run any pending Supabase SQL migrations located in the `/supabase/migrations` folder via your Supabase SQL Editor.

---
*Built for Pirates. Go ECU!* 🏴‍☠️
