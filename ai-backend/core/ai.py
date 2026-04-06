import json
from google import genai
from google.genai import types
from .config import settings
from .vector_store import query_documents, query_documents_for_materials

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


def clamp_question_count(count: int | None, default: int = 15, minimum: int = 5, maximum: int = 30) -> int:
    try:
        value = int(count) if count is not None else default
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def suggest_practice_exam_question_count(
    class_id: str,
    topic: str = "Core class concepts",
    minimum: int = 5,
    default: int = 15,
    maximum: int = 30,
) -> int:
    context = get_context_for_class(class_id, f"Practice questions for {topic}")
    if not context.strip():
        return default

    word_count = len(context.split())
    if word_count < 250:
        suggested = minimum
    elif word_count < 600:
        suggested = 10
    elif word_count < 1200:
        suggested = 15
    elif word_count < 2000:
        suggested = 20
    elif word_count < 3000:
        suggested = 25
    else:
        suggested = maximum

    return clamp_question_count(suggested, default=default, minimum=minimum, maximum=maximum)

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


def _normalize_flashcards(cards: object) -> list[dict]:
    if not isinstance(cards, list):
        return []

    normalized: list[dict] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        front = str(card.get("front", "")).strip()
        back = str(card.get("back", "")).strip()
        if not front or not back:
            continue
        normalized.append({"front": front, "back": back})
    return normalized


def generate_shared_flashcards_from_materials(
    class_id: str,
    material_ids: list[str],
    count: int = 5,
) -> list[dict]:
    context = query_documents_for_materials(
        class_id,
        material_ids,
        query="Hard concepts, misconceptions, difficult exam points, prerequisite gaps",
        n_results=40,
    )

    if not context.strip():
        return []

    prompt = f"""You are generating shared class flashcards for class {class_id}.
You MUST analyze ONLY the provided context and pick the hardest/highest-yield concepts students struggle with.

Context from newly eligible class materials:
<context>
{context}
</context>

Rules:
1) Return EXACTLY {count} flashcards.
2) Each `front` MUST be a direct study question (not a label).
3) Each `back` MUST directly answer the question in 1-3 concise sentences.
4) Prioritize concepts that are difficult, foundational, or frequently misunderstood.
5) Avoid duplicates or trivial facts.

RETURN ONLY A VALID JSON ARRAY. NO MARKDOWN, NO EXTRA TEXT.
Format:
[
  {{"front": "Question?", "back": "Answer."}}
]"""

    response = generate_content_with_fallback(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        )
    )

    try:
        parsed = json.loads(response.text)
    except json.JSONDecodeError:
        return []

    normalized = _normalize_flashcards(parsed)
    return normalized[:count]

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

def _deterministic_relevance_check(class_context: str, document_snippet: str) -> dict | None:
    """
    Fast, no-AI overlap check (RL-001).
    Tokenizes class context and document, checks for minimum keyword overlap.
    Returns a rejection dict if there's zero overlap, or None to proceed to AI.
    """
    import re

    def tokenize(text: str) -> set[str]:
        words = re.findall(r'[a-zA-Z]{3,}', text.lower())
        # Filter out very common stop words
        stop = {'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was',
                'were', 'been', 'have', 'has', 'had', 'not', 'but', 'what', 'all',
                'can', 'her', 'his', 'one', 'our', 'out', 'you', 'which', 'their',
                'will', 'each', 'about', 'how', 'them', 'than', 'its', 'into'}
        return {w for w in words if w not in stop}

    class_tokens = tokenize(class_context)
    doc_tokens = tokenize(document_snippet[:5000])  # only check start of doc

    if not class_tokens or not doc_tokens:
        return None  # can't determine, let AI decide

    overlap = class_tokens & doc_tokens
    overlap_ratio = len(overlap) / min(len(class_tokens), len(doc_tokens))

    # If less than 3% token overlap AND fewer than 3 matching tokens → hard fail
    if overlap_ratio < 0.03 and len(overlap) < 3:
        return {
            "confidence": 0,
            "reason": f"No meaningful keyword overlap found between document and class context (overlap: {len(overlap)} tokens).",
            "reasonCode": "irrelevant_material",
        }

    return None  # passed, proceed to AI


def evaluate_material_against_syllabus(class_context: str, document_snippet: str) -> dict:
    # RL-001: Deterministic overlap check before spending AI tokens
    det_result = _deterministic_relevance_check(class_context, document_snippet)
    if det_result is not None:
        print(f"Deterministic check failed: {det_result['reasonCode']}")
        return det_result

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

def extract_text_from_image(image_path: str) -> str:
    """Uses Gemini to perform OCR and extract text from student-uploaded images."""
    try:
        from PIL import Image
        img = Image.open(image_path)
    except Exception as e:
        print(f"Failed to open image {image_path}: {e}")
        return ""
        
    prompt = "Extract all text from this image exactly as it appears. Do not add any conversational text, descriptions, or markdown blocks. If there is absolutely no text in the image, return an empty string."
    
    try:
        response = generate_content_with_fallback(
            contents=[prompt, img],
            config=types.GenerateContentConfig(
                temperature=0.0
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini OCR Failed: {e}")
        return ""
