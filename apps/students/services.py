import json
from urllib import error, request

from django.conf import settings


class PrimaryExamSuggestionError(Exception):
    pass


def suggest_primary_exam_with_gemini(*, class_name, date_of_birth=None, board="", school_name=""):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise PrimaryExamSuggestionError("Gemini API key is not configured.")

    prompt = (
        "You are an academic counsellor for Indian school students. "
        "Based on the given class, age/date of birth, board, and school context, "
        "suggest at least 2 primary target exam options for the student, ordered best first. "
        "Respond as strict JSON with key suggestions, where suggestions is an array of objects. "
        "Each object must contain: suggested_exam, reason, confidence. "
        "Keep each reason under 30 words. Confidence must be one of high, medium, low.\n\n"
        f"Class: {class_name or 'Unknown'}\n"
        f"Date of birth: {date_of_birth or 'Unknown'}\n"
        f"Board: {board or 'Unknown'}\n"
        f"School: {school_name or 'Unknown'}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
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
        with request.urlopen(http_request, timeout=15) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise PrimaryExamSuggestionError(
            f"Gemini request failed with status {exc.code}: {detail or 'No response body.'}"
        ) from exc
    except error.URLError as exc:
        raise PrimaryExamSuggestionError("Gemini request could not be completed.") from exc
    except json.JSONDecodeError as exc:
        raise PrimaryExamSuggestionError("Gemini response was not valid JSON.") from exc

    parts = response_payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = "".join(part.get("text", "") for part in parts).strip()
    if not raw_text:
        raise PrimaryExamSuggestionError("Gemini did not return a suggestion.")

    try:
        suggestion = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise PrimaryExamSuggestionError("Gemini suggestion was not valid JSON.") from exc

    suggestions = suggestion.get("suggestions")
    if not isinstance(suggestions, list):
        raise PrimaryExamSuggestionError("Gemini did not provide a valid suggestions list.")

    normalized_suggestions = []
    for item in suggestions:
        if not isinstance(item, dict):
            continue

        suggested_exam = str(item.get("suggested_exam", "")).strip()
        reason = str(item.get("reason", "")).strip()
        confidence = str(item.get("confidence", "")).strip().lower() or "medium"

        if not suggested_exam:
            continue
        if confidence not in {"high", "medium", "low"}:
            confidence = "medium"

        normalized_suggestions.append(
            {
                "suggested_exam": suggested_exam,
                "reason": reason,
                "confidence": confidence,
            }
        )

    if len(normalized_suggestions) < 2:
        raise PrimaryExamSuggestionError("Gemini did not provide at least two valid suggestions.")

    return {
        "suggestions": normalized_suggestions[:3],
    }
