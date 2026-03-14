import json
from datetime import timedelta
from urllib import error, request

from django.conf import settings
from django.utils import timezone

from apps.study_planner.models import StudyPlan, StudyPlanTask


class StudyPlanContentError(Exception):
    pass


def get_task_target_exam(task, target_exam=None):
    profile = task.plan.student
    return target_exam or profile.primary_target_exam or profile.secondary_target_exam or "Not set"


def get_exam_subject_prompt(task, target_exam):
    subject_name = str(getattr(getattr(task, "concept", None), "subject", None) and task.concept.subject.name or "").strip().lower()
    exam_name = str(target_exam or "").strip().lower()

    if "jee main" in exam_name and subject_name == "mathematics":
        return (
            "For JEE Main Mathematics, prefer determinant method and algebraic solving as the primary strategy. "
            "Do not present graphical solving as the main tool; mention graph only as conceptual intuition when useful. "
            "For linear systems and consistency, explicitly prioritize coefficient comparison, determinant test, and parameter solving shortcuts."
        )

    if "neet" in exam_name and subject_name == "physics":
        return (
            "For NEET Physics, keep the explanation direct, formula-centered, and NCERT-aligned. "
            "Prefer short concept-to-formula-to-application flow over abstract derivations."
        )

    return ""


def rebuild_study_plan_for_student(student):
    weak_concepts = student.concept_mastery.select_related("concept").order_by("mastery_score", "updated_at")[:3]
    if not weak_concepts:
        return None

    today = timezone.localdate()
    plan, _ = StudyPlan.objects.update_or_create(
        student=student,
        status=StudyPlan.Status.ACTIVE,
        defaults={
            "title": "Weak Concept Recovery Plan",
            "start_date": today,
            "end_date": today + timedelta(days=max(len(weak_concepts) - 1, 0)),
        },
    )
    plan.tasks.all().delete()

    for offset, mastery in enumerate(weak_concepts):
        StudyPlanTask.objects.create(
            plan=plan,
            concept=mastery.concept,
            title=f"Revise {mastery.concept.name}",
            description=f"Focus on {mastery.concept.name} to improve mastery from {mastery.mastery_score} percent.",
            scheduled_date=today + timedelta(days=offset),
            estimated_minutes=20,
        )
    return plan


def generate_study_content_for_task(task, target_exam=None):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise StudyPlanContentError("Gemini API key is not configured.")

    profile = task.plan.student
    target_exam = get_task_target_exam(task, target_exam)
    subject_prompt = get_exam_subject_prompt(task, target_exam)
    prompt = (
        "You are an expert Indian exam coach. "
        "Create a short, student-friendly study starter for the given topic. "
        "Make it practical and tailored to the student's class, board, and target exam. "
        "Respond as strict JSON with keys: heading, overview, exam_focus, key_points, study_steps, quick_check. "
        "key_points and quick_check must be arrays of 3 to 5 short strings. "
        "study_steps must be an array of 3 to 4 objects, each with keys: title, detail, checkpoints. "
        "detail should be a deeper study explanation in 2 to 4 sentences. "
        "checkpoints must be an array of 2 to 4 short action items.\n\n"
        f"Class: {profile.class_name or 'Unknown'}\n"
        f"Board: {profile.board or 'Unknown'}\n"
        f"Primary exam: {profile.primary_target_exam or 'Unknown'}\n"
        f"Secondary exam: {profile.secondary_target_exam or 'Unknown'}\n"
        f"Preferred target exam for this session: {target_exam}\n"
        f"Topic: {task.concept.name if task.concept else task.title}\n"
        f"Task title: {task.title}\n"
        f"Task description: {task.description or 'Not provided'}\n"
        f"Study session duration: {task.estimated_minutes} minutes\n"
        f"Exam-specific teaching preference: {subject_prompt or 'No extra subject-specific constraint.'}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
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
        raise StudyPlanContentError(
            f"Gemini request failed with status {exc.code}: {detail or 'No response body.'}"
        ) from exc
    except error.URLError as exc:
        raise StudyPlanContentError("Gemini request could not be completed.") from exc
    except json.JSONDecodeError as exc:
        raise StudyPlanContentError("Gemini response was not valid JSON.") from exc

    parts = response_payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = "".join(part.get("text", "") for part in parts).strip()
    if not raw_text:
        raise StudyPlanContentError("Gemini did not return study content.")

    try:
        content = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise StudyPlanContentError("Gemini study content was not valid JSON.") from exc

    normalized = {
        "heading": str(content.get("heading", "")).strip() or task.title,
        "overview": str(content.get("overview", "")).strip(),
        "exam_focus": str(content.get("exam_focus", "")).strip(),
        "key_points": [str(item).strip() for item in content.get("key_points", []) if str(item).strip()],
        "quick_check": [str(item).strip() for item in content.get("quick_check", []) if str(item).strip()],
        "target_exam": target_exam,
    }

    study_steps = []
    for item in content.get("study_steps", []):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        detail = str(item.get("detail", "")).strip()
        checkpoints = [str(checkpoint).strip() for checkpoint in item.get("checkpoints", []) if str(checkpoint).strip()]
        if not title or not detail:
            continue
        study_steps.append(
            {
                "title": title,
                "detail": detail,
                "checkpoints": checkpoints,
            }
        )
    normalized["study_steps"] = study_steps

    if not normalized["overview"] or not normalized["study_steps"]:
        raise StudyPlanContentError("Gemini did not provide enough study content.")

    return normalized


def generate_step_study_content_for_task(task, step, target_exam=None):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise StudyPlanContentError("Gemini API key is not configured.")

    profile = task.plan.student
    target_exam = get_task_target_exam(task, target_exam)
    subject_prompt = get_exam_subject_prompt(task, target_exam)
    prompt = (
        "You are an expert Indian exam coach. "
        "Generate an in-depth but focused study note for exactly one study step. "
        "Use simple layman language first, then exam-focused guidance. "
        "Stay strictly within the target exam scope and do not introduce content beyond that exam. "
        "Respond as strict JSON with keys: heading, exam_scope_note, layman_explanation, exam_notes, master_guide, shortcut_guide, worked_ideas, practice_tasks. "
        "layman_explanation should be 3 to 5 sentences in simple student-friendly language. "
        "exam_notes must be an array of 3 to 5 short exam-focused notes. "
        "master_guide should be 3 to 5 sentences explaining the best way to crack this kind of question in the selected exam. "
        "shortcut_guide should be 2 to 4 sentences explaining the fastest valid shortcut or pattern for the selected exam only. "
        "worked_ideas and practice_tasks must be arrays of 2 to 4 short strings.\n\n"
        f"Class: {profile.class_name or 'Unknown'}\n"
        f"Board: {profile.board or 'Unknown'}\n"
        f"Target exam: {target_exam}\n"
        f"Topic: {task.concept.name if task.concept else task.title}\n"
        f"Task title: {task.title}\n"
        f"Step title: {step.get('title', 'Study step')}\n"
        f"Step summary: {step.get('detail', 'Not provided')}\n"
        f"Step checkpoints: {json.dumps(step.get('checkpoints', []))}\n"
        "Constraint: If the target exam is JEE Main, do not add JEE Advanced-only depth. "
        "If the target exam is CUET, do not add IIT-JEE style extensions. "
        "If the target exam is board-focused, stay board-level.\n"
        f"Exam-specific teaching preference: {subject_prompt or 'No extra subject-specific constraint.'}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
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
        raise StudyPlanContentError(
            f"Gemini request failed with status {exc.code}: {detail or 'No response body.'}"
        ) from exc
    except error.URLError as exc:
        raise StudyPlanContentError("Gemini request could not be completed.") from exc
    except json.JSONDecodeError as exc:
        raise StudyPlanContentError("Gemini response was not valid JSON.") from exc

    parts = response_payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = "".join(part.get("text", "") for part in parts).strip()
    if not raw_text:
        raise StudyPlanContentError("Gemini did not return step study content.")

    try:
        content = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise StudyPlanContentError("Gemini step study content was not valid JSON.") from exc

    normalized = {
        "heading": str(content.get("heading", "")).strip() or str(step.get("title", "Study step")).strip(),
        "exam_scope_note": str(content.get("exam_scope_note", "")).strip(),
        "layman_explanation": str(content.get("layman_explanation", "")).strip(),
        "master_guide": str(content.get("master_guide", "")).strip(),
        "shortcut_guide": str(content.get("shortcut_guide", "")).strip(),
        "exam_notes": [str(item).strip() for item in content.get("exam_notes", []) if str(item).strip()],
        "worked_ideas": [str(item).strip() for item in content.get("worked_ideas", []) if str(item).strip()],
        "practice_tasks": [str(item).strip() for item in content.get("practice_tasks", []) if str(item).strip()],
    }
    if not normalized["layman_explanation"] or not normalized["master_guide"]:
        raise StudyPlanContentError("Gemini did not provide enough step study content.")
    normalized["target_exam"] = target_exam
    return normalized
