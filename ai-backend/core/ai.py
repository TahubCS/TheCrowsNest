import json
from google import genai
from google.genai import types
from .config import settings
from .vector_store import query_documents

# Initialize Gemini Client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_content_with_fallback(contents, config):
    models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-lite']
    last_error = None
    for model_name in models:
        try:
            return client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
        except Exception as e:
            print(f"Warning: Model {model_name} failed with error {e}. Trying fallback...")
            last_error = e
    print("CRITICAL: All fallback models failed.")
    raise last_error

def get_context_for_class(class_id: str, query: str = "Key concepts") -> str:
    """Retrieve context from the vector store."""
    return query_documents(class_id, query, n_results=5)

def generate_flashcards(class_id: str, topic: str, count: int, style: str) -> list[dict]:
    context = get_context_for_class(class_id, f"Flashcards for {topic}")
    
    prompt = f"""Generate precisely {count} flashcards for class {class_id}.
Context from class materials:
<context>
{context}
</context>

Topic: {topic}
Style: {style}

CRITICAL INSTRUCTION: Analyze the syllabus context carefully and extract the most important information.
RETURN ONLY A VALID JSON ARRAY. NO MARKDOWN, NO OTHER TEXT. 
Format exactly like this strictly:
[
  {{ "front": "question", "back": "answer" }}
]"""

    response = generate_content_with_fallback(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        )
    )
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return []

def generate_study_plan(class_id: str, timeframe: str) -> list[dict]:
    context = get_context_for_class(class_id, f"Study guide and syllabus schedule for {timeframe}")
    prompt = f"""Generate a structured weekly study plan for class {class_id}.
Timeframe: {timeframe}

Context from class materials:
<context>
{context}
</context>

The study plan should have exactly 5 important tasks extracted from the syllabus or course materials.
RETURN ONLY A VALID JSON ARRAY. NO MARKDOWN, NO OTHER TEXT. 
Format exactly like this strictly:
[
  {{ 
    "title": "Read Chapter 1", 
    "type": "Reading", 
    "status": "PLANNED" 
  }}
]"""

    response = generate_content_with_fallback(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4
        )
    )
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return []

def generate_practice_exam(class_id: str, topic: str, difficulty: str, count: int) -> dict:
    context = get_context_for_class(class_id, f"Practice questions for {topic}")
    prompt = f"""Generate a practice exam with {count} multiple-choice questions.
Class ID: {class_id}
Topic: {topic}
Difficulty: {difficulty}

Context from class materials:
<context>
{context}
</context>

RETURN ONLY A VALID JSON OBJECT. NO MARKDOWN.
Format exactly like this:
{{
  "title": "Practice Exam: {topic}",
  "questions": [
    {{
      "id": "q1",
      "text": "Question text here?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }}
  ]
}}"""

    response = generate_content_with_fallback(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2
        )
    )
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {"title": "Error generating exam", "questions": []}

def chat_with_tutor(class_id: str, messages: list[dict]) -> str:
    # Get context based on the user's latest message
    latest_user_message = next((msg["content"] for msg in reversed(messages) if msg["role"] == "user"), "Explain course concepts")
    context = get_context_for_class(class_id, latest_user_message)
    
    system_instruction = f"""You are an advanced AI Tutor for this specific class ({class_id}).
Use the following context from the class materials to inform your answers. If the information isn't in the context, use your general knowledge but clarify that it's not explicitly in the course materials.

Context:
<context>
{context}
</context>
"""
    
    # Format messages for Gemini
    formatted_messages = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        formatted_messages.append({"role": role, "parts": [{"text": msg["content"]}]})
        
    response = generate_content_with_fallback(
        contents=formatted_messages,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )
    )
    return response.text

def evaluate_material_against_syllabus(class_context: str, document_snippet: str) -> dict:
    prompt = f"""You are a university professor evaluating a document a student just uploaded for your class.
Your job is to determine if the uploaded document is a genuine, relevant study material (like a lecture slide, reading, past exam, or study guide) for this exact class, or if it is completely irrelevant spam.

Here is the official class information (Code, Name, Description, and optionally Syllabus):
<class_context>
{class_context}
</class_context>

Here is the first portion of the uploaded document (it may be cut off):
<document>
{document_snippet}
</document>

Provide your assessment as a strict JSON object.
- 'confidence': An integer from 0 to 100. 
  - 95-100: It is unmistakably relevant to the syllabus topics.
  - 50-94: It might be related, but it lacks specific context or seems generic.
  - 0-49: It is completely irrelevant, spam, a random recipe, profanity, or junk.
- 'reason': A short 1-sentence explanation of why you gave this score.

RETURN ONLY A VALID JSON OBJECT. Format exactly like this:
{{
  "confidence": 98,
  "reason": "The document extensively covers the algorithms mentioned in week 3 of the syllabus."
}}
"""

    response = generate_content_with_fallback(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )
    )
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {"confidence": 50, "reason": "Failed to parse AI evaluation JSON."}
