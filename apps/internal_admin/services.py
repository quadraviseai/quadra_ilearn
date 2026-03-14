import json
from urllib import error, request

from django.conf import settings


class QuestionGenerationError(Exception):
    pass


def generate_question_with_gemini(*, subject_name, concept_name, question_type, exam_type, prompt_seed):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise QuestionGenerationError("Gemini API key is not configured.")

    exam_scope = ", ".join(exam_type) if exam_type else "General"
    prompt = (
        "You are an expert question setter for Indian school and competitive exam prep. "
        "Generate exactly one question as strict JSON with keys: prompt, explanation, options. "
        "options must be an array. Each option must be an object with keys: option_text, is_correct, display_order. "
        "If question_type is numeric, options must be an empty array. "
        "If question_type is mcq_single, provide exactly 4 options with exactly 1 correct option. "
        "If question_type is mcq_multi, provide 4 to 5 options with at least 2 correct options. "
        "Keep the wording student-friendly and aligned to the requested exam scope.\n\n"
        f"Subject: {subject_name}\n"
        f"Concept: {concept_name}\n"
        f"Question type: {question_type}\n"
        f"Exam scope: {exam_scope}\n"
        f"Question brief: {prompt_seed}\n"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
            "responseMimeType": "application/json",
        },
    }

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    http_request = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=20) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise QuestionGenerationError(
            f"Gemini request failed with status {exc.code}: {detail or 'No response body.'}"
        ) from exc
    except error.URLError as exc:
        raise QuestionGenerationError("Gemini request could not be completed.") from exc
    except json.JSONDecodeError as exc:
        raise QuestionGenerationError("Gemini response was not valid JSON.") from exc

    parts = response_payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = "".join(part.get("text", "") for part in parts).strip()
    if not raw_text:
        raise QuestionGenerationError("Gemini did not return question content.")

    try:
        content = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise QuestionGenerationError("Gemini question content was not valid JSON.") from exc

    prompt_text = str(content.get("prompt", "")).strip()
    explanation = str(content.get("explanation", "")).strip()
    raw_options = content.get("options", [])

    options = []
    for index, option in enumerate(raw_options, start=1):
        if not isinstance(option, dict):
            continue
        option_text = str(option.get("option_text", "")).strip()
        if not option_text:
            continue
        options.append(
            {
                "option_text": option_text,
                "is_correct": bool(option.get("is_correct")),
                "display_order": int(option.get("display_order") or index),
            }
        )

    if not prompt_text:
        raise QuestionGenerationError("Gemini did not return a valid prompt.")

    return {
        "prompt": prompt_text,
        "explanation": explanation,
        "options": options,
    }
