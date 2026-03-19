import json
from decimal import Decimal
from urllib import error, request

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.diagnostics.models import (
    AttemptAnswer,
    ConceptMastery,
    PaymentRecord,
    Question,
    QuestionOption,
    Subject,
    TestAttempt,
    TestAttemptQuestion,
    TestEntitlement,
)


QUESTION_LIMIT = 30


class WeakTopicAIReviewError(Exception):
    pass


def _to_decimal(value):
    return Decimal(str(round(float(value), 2)))


def get_or_create_entitlement(student, exam, subject):
    entitlement, _ = TestEntitlement.objects.get_or_create(student=student, exam=exam, subject=subject)
    return entitlement


def get_attempt_question_queryset(attempt):
    return Question.objects.filter(attempt_questions__attempt=attempt).distinct()


def get_available_question_count(exam, subject):
    return (
        Question.objects.filter(
            subject=subject,
            status=Question.Status.ACTIVE,
            exams=exam,
        )
        .distinct()
        .count()
    )


def get_eligibility(student, exam, subject):
    available_question_count = get_available_question_count(exam, subject)

    active_attempt = (
        TestAttempt.objects.filter(
            student=student,
            exam=exam,
            subject=subject,
            status=TestAttempt.Status.STARTED,
        )
        .order_by("-started_at")
        .first()
    )
    if active_attempt:
        return {
            "can_start": True,
            "payment_required": False,
            "free": active_attempt.access_mode == TestAttempt.AccessMode.FREE,
            "resume": True,
            "active_attempt": active_attempt,
            "message": "An in-progress test is available to resume.",
            "amount": exam.retest_price,
            "question_limit": max(1, min(QUESTION_LIMIT, available_question_count)) if available_question_count else 0,
        }

    entitlement = get_or_create_entitlement(student, exam, subject)
    if not entitlement.free_attempt_used:
        return {
            "can_start": True,
            "payment_required": False,
            "free": True,
            "resume": False,
            "active_attempt": None,
            "message": "Your first attempt for this exam and subject is free.",
            "amount": exam.retest_price,
            "question_limit": max(1, min(QUESTION_LIMIT, available_question_count)) if available_question_count else 0,
        }

    if entitlement.paid_attempt_credits > 0:
        return {
            "can_start": True,
            "payment_required": False,
            "free": False,
            "resume": False,
            "active_attempt": None,
            "message": f"{entitlement.paid_attempt_credits} paid retest credit available.",
            "amount": exam.retest_price,
            "question_limit": max(1, min(QUESTION_LIMIT, available_question_count)) if available_question_count else 0,
        }

    return {
        "can_start": False,
        "payment_required": True,
        "free": False,
        "resume": False,
        "active_attempt": None,
        "message": f"Your free attempt is used. Pay Rs. {exam.retest_price} to unlock the next test.",
        "amount": exam.retest_price,
        "question_limit": max(1, min(QUESTION_LIMIT, available_question_count)) if available_question_count else 0,
    }


def get_active_attempt(student, exam=None, subject=None):
    filters = {
        "student": student,
        "status": TestAttempt.Status.STARTED,
    }
    if exam is not None:
        filters["exam"] = exam
    if subject is not None:
        filters["subject"] = subject
    return (
        TestAttempt.objects.select_related("exam", "subject")
        .filter(**filters)
        .order_by("-started_at")
        .first()
    )


@transaction.atomic
def start_attempt(student, exam, subject):
    existing = get_active_attempt(student, exam=exam, subject=subject)
    if existing:
        return existing

    question_ids = list(
        Question.objects.filter(
            subject=subject,
            status=Question.Status.ACTIVE,
            exams=exam,
        )
        .values_list("id", flat=True)
        .distinct()
        .order_by("?")[:QUESTION_LIMIT]
    )
    if not question_ids:
        raise ValueError("No active questions are available for this subject yet.")

    entitlement = get_or_create_entitlement(student, exam, subject)
    access_mode = TestAttempt.AccessMode.FREE
    if entitlement.free_attempt_used:
        if entitlement.paid_attempt_credits <= 0:
            raise ValueError(f"Payment is required to unlock the next test for {subject.name}.")
        access_mode = TestAttempt.AccessMode.PAID
        entitlement.paid_attempt_credits -= 1
    else:
        entitlement.free_attempt_used = True

    entitlement.save(update_fields=["free_attempt_used", "paid_attempt_credits", "updated_at"])

    attempt = TestAttempt.objects.create(
        student=student,
        subject=subject,
        exam=exam,
        access_mode=access_mode,
        total_questions=len(question_ids),
    )
    TestAttemptQuestion.objects.bulk_create(
        [
            TestAttemptQuestion(attempt=attempt, question_id=question_id, display_order=index + 1)
            for index, question_id in enumerate(question_ids)
        ]
    )
    return attempt


@transaction.atomic
def save_attempt_answer(attempt, question_id, selected_option_id=None, answer_text="", time_spent_seconds=0):
    if attempt.status != TestAttempt.Status.STARTED:
        raise ValueError("This test session is no longer active.")

    attempt_question = (
        TestAttemptQuestion.objects.select_related("question")
        .filter(attempt=attempt, question_id=question_id)
        .first()
    )
    if not attempt_question:
        raise ValueError("This question is not part of the active test.")

    selected_option = None
    if selected_option_id:
        selected_option = QuestionOption.objects.filter(id=selected_option_id, question=attempt_question.question).first()
        if not selected_option:
            raise ValueError("Invalid option selected for this question.")

    answer, _ = AttemptAnswer.objects.update_or_create(
        attempt=attempt,
        question=attempt_question.question,
        defaults={
            "selected_option": selected_option,
            "answer_text": (answer_text or "").strip(),
            "time_spent_seconds": max(int(time_spent_seconds or 0), 0),
            "answered_at": timezone.now(),
        },
    )
    attempt.save(update_fields=["last_saved_at"])
    return answer


def _update_concept_mastery(attempt, concept_totals):
    for concept_id, totals in concept_totals.items():
        accuracy = (totals["correct"] / totals["total"]) * 100 if totals["total"] else 0
        mastery, created = ConceptMastery.objects.get_or_create(
            student=attempt.student,
            concept_id=concept_id,
            defaults={
                "mastery_score": _to_decimal(accuracy),
                "accuracy_percent": _to_decimal(accuracy),
                "attempts_count": totals["total"],
                "last_assessed_at": timezone.now(),
            },
        )
        if created:
            continue

        previous_total = mastery.attempts_count
        combined_total = previous_total + totals["total"]
        weighted_accuracy = ((float(mastery.accuracy_percent) * previous_total) + (accuracy * totals["total"])) / combined_total
        mastery.accuracy_percent = _to_decimal(weighted_accuracy)
        mastery.mastery_score = _to_decimal(weighted_accuracy)
        mastery.attempts_count = combined_total
        mastery.last_assessed_at = timezone.now()
        mastery.save(
            update_fields=["accuracy_percent", "mastery_score", "attempts_count", "last_assessed_at", "updated_at"]
        )


def build_weak_topic_summary(attempt):
    topic_totals = {}
    for answer in attempt.answers.select_related("question__concept").all():
        concept = answer.question.concept
        entry = topic_totals.setdefault(
            str(concept.id),
            {
                "concept_id": concept.id,
                "topic": concept.name,
                "description": concept.description,
                "misses": 0,
                "correct": 0,
                "chapter": concept.chapter.name if concept.chapter_id else "",
            },
        )
        if answer.is_correct:
            entry["correct"] += 1
        else:
            entry["misses"] += 1

    unanswered = (
        TestAttemptQuestion.objects.filter(attempt=attempt)
        .exclude(question_id__in=attempt.answers.values_list("question_id", flat=True))
        .select_related("question__concept", "question__concept__chapter")
    )
    for item in unanswered:
        concept = item.question.concept
        entry = topic_totals.setdefault(
            str(concept.id),
            {
                "concept_id": concept.id,
                "topic": concept.name,
                "description": concept.description,
                "misses": 0,
                "correct": 0,
                "chapter": concept.chapter.name if concept.chapter_id else "",
            },
        )
        entry["misses"] += 1

    ranked = sorted(topic_totals.values(), key=lambda item: (-item["misses"], item["topic"].lower()))
    return ranked[:5]


def _classify_mistake(answer, attempt_average_time):
    if not answer:
        return "time_pressure"
    if answer.time_spent_seconds and attempt_average_time and answer.time_spent_seconds > attempt_average_time * 1.35:
        return "calculation_mistake"
    if answer.time_spent_seconds and attempt_average_time and answer.time_spent_seconds < max(5, attempt_average_time * 0.45):
        return "concept_mistake"
    if not answer.selected_option_id and not answer.answer_text.strip():
        return "time_pressure"
    return "concept_mistake"


def build_mistake_analysis(attempt):
    attempt_questions = list(
        TestAttemptQuestion.objects.filter(attempt=attempt)
        .select_related("question__concept", "question__concept__chapter")
        .order_by("display_order")
    )
    answers_map = {answer.question_id: answer for answer in attempt.answers.select_related("selected_option").all()}
    answered_times = [answer.time_spent_seconds for answer in answers_map.values() if answer.time_spent_seconds]
    attempt_average_time = (sum(answered_times) / len(answered_times)) if answered_times else 0

    breakdown = {
        "concept_mistake": 0,
        "calculation_mistake": 0,
        "time_pressure": 0,
    }
    by_concept = {}

    for item in attempt_questions:
        answer = answers_map.get(item.question_id)
        if answer and answer.is_correct:
            continue
        category = _classify_mistake(answer, attempt_average_time)
        breakdown[category] += 1
        entry = by_concept.setdefault(
            str(item.question.concept_id),
            {
                "concept_id": item.question.concept_id,
                "topic": item.question.concept.name,
                "chapter": item.question.concept.chapter.name if item.question.concept.chapter_id else "",
                "primary_mistake": category,
                "count": 0,
            },
        )
        entry["count"] += 1

    ordered = sorted(
        by_concept.values(),
        key=lambda item: (-item["count"], item["topic"].lower()),
    )
    return {
        "breakdown": breakdown,
        "dominant": max(breakdown, key=breakdown.get) if any(breakdown.values()) else None,
        "by_concept": ordered[:5],
    }


def build_concept_tracking_summary(attempt):
    concept_ids = {
        *attempt.answers.values_list("question__concept_id", flat=True),
        *TestAttemptQuestion.objects.filter(attempt=attempt).values_list("question__concept_id", flat=True),
    }
    mastery_rows = ConceptMastery.objects.filter(
        student=attempt.student,
        concept_id__in=concept_ids,
    ).select_related("concept", "concept__chapter")

    summary = []
    for mastery in mastery_rows:
        score = float(mastery.mastery_score)
        if score < 30:
            band = "weak"
        elif score < 70:
            band = "okay"
        else:
            band = "strong"
        summary.append(
            {
                "concept_id": mastery.concept_id,
                "topic": mastery.concept.name,
                "chapter": mastery.concept.chapter.name if mastery.concept.chapter_id else "",
                "mastery_score": float(mastery.mastery_score),
                "accuracy_percent": float(mastery.accuracy_percent),
                "band": band,
                "attempts_count": mastery.attempts_count,
            }
        )
    summary.sort(key=lambda item: (item["mastery_score"], item["topic"].lower()))
    return summary


def build_adaptive_practice_plan(attempt):
    tracking = build_concept_tracking_summary(attempt)
    plan = []
    for item in tracking[:5]:
        if item["band"] == "weak":
            ladder = ["easy", "medium", "hard"]
            current_stage = "easy"
        elif item["band"] == "okay":
            ladder = ["medium", "hard"]
            current_stage = "medium"
        else:
            ladder = ["hard"]
            current_stage = "hard"
        plan.append(
            {
                "concept_id": item["concept_id"],
                "topic": item["topic"],
                "chapter": item["chapter"],
                "band": item["band"],
                "current_stage": current_stage,
                "ladder": ladder,
                "target": f"Fix {item['topic']} before the next mock instead of revising the full chapter.",
            }
        )
    return plan


def build_improvement_loop(attempt):
    analysis = build_mistake_analysis(attempt)
    adaptive = build_adaptive_practice_plan(attempt)
    next_focus = adaptive[0]["topic"] if adaptive else attempt.subject.name
    dominant = analysis["dominant"] or "concept_mistake"
    return [
        f"Review the report and identify why marks were lost, with focus on {dominant.replace('_', ' ')}.",
        f"Practice targeted questions for {next_focus} instead of revising the whole chapter.",
        "Move from easy to medium to hard if the concept is weak; jump directly to hard if it is already strong.",
        "Retake the mock and compare the next report to check whether the same mistake pattern is repeating.",
    ]


def generate_weak_topic_ai_review(attempt, concept_id):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise WeakTopicAIReviewError("Gemini API key is not configured.")

    attempt_question = (
        TestAttemptQuestion.objects.filter(attempt=attempt, question__concept_id=concept_id)
        .select_related("question__concept", "question__concept__chapter")
        .prefetch_related("question__options")
        .order_by("display_order")
        .first()
    )
    if not attempt_question:
        raise WeakTopicAIReviewError("No question found for this weak concept in the selected report.")

    question = attempt_question.question
    answer = (
        AttemptAnswer.objects.filter(attempt=attempt, question=question)
        .select_related("selected_option")
        .first()
    )
    correct_options = list(question.options.filter(is_correct=True).order_by("display_order"))
    wrong_options = list(question.options.filter(is_correct=False).order_by("display_order"))
    correct_answer_text = ", ".join(option.option_text for option in correct_options) or "Not available"
    student_answer_text = (
        answer.selected_option.option_text
        if answer and answer.selected_option_id
        else answer.answer_text.strip() if answer and answer.answer_text else "No answer submitted"
    )
    mistake_analysis = build_mistake_analysis(attempt)
    concept_mistake = next(
        (
            item
            for item in mistake_analysis["by_concept"]
            if str(item["concept_id"]) == str(concept_id)
        ),
        None,
    )

    prompt = (
        "You are an expert Indian exam teacher and AI concept coach. "
        "Explain one weak-topic question to a student in a teacher-like, encouraging, shortcut-focused way. "
        "Respond as strict JSON with keys: heading, layman_explanation, teacher_guide, shortcut_guide, common_trap, solve_steps, practice_tip. "
        "layman_explanation should be 3 to 5 sentences in simple language. "
        "teacher_guide should be 3 to 5 sentences teaching how to think through this type of question. "
        "shortcut_guide should be 2 to 4 sentences with a fast valid shortcut or recognition pattern. "
        "common_trap should be 1 to 2 sentences describing the likely mistake the student made. "
        "solve_steps must be an array of 3 to 5 short steps. "
        "practice_tip should be 1 to 2 sentences.\n\n"
        f"Exam: {attempt.exam.name if attempt.exam_id else 'General'}\n"
        f"Subject: {attempt.subject.name}\n"
        f"Chapter: {question.concept.chapter.name if question.concept.chapter_id else 'Unknown'}\n"
        f"Concept: {question.concept.name}\n"
        f"Student class: {attempt.student.class_name or 'Unknown'}\n"
        f"Question: {question.prompt}\n"
        f"Options: {json.dumps([option.option_text for option in question.options.order_by('display_order')])}\n"
        f"Student answer: {student_answer_text}\n"
        f"Correct answer: {correct_answer_text}\n"
        f"Question explanation: {question.explanation or 'Not available'}\n"
        f"Detected mistake pattern: {(concept_mistake or {}).get('primary_mistake', 'concept_mistake')}\n"
        f"Incorrect option examples: {json.dumps([option.option_text for option in wrong_options[:3]])}\n"
        "Constraint: stay focused on this question type and concept only. "
        "Do not mention AI policy or model limitations."
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
        raise WeakTopicAIReviewError(
            f"Gemini request failed with status {exc.code}: {detail or 'No response body.'}"
        ) from exc
    except error.URLError as exc:
        raise WeakTopicAIReviewError("Gemini request could not be completed.") from exc
    except json.JSONDecodeError as exc:
        raise WeakTopicAIReviewError("Gemini response was not valid JSON.") from exc

    parts = response_payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = "".join(part.get("text", "") for part in parts).strip()
    if not raw_text:
        raise WeakTopicAIReviewError("Gemini did not return weak-topic review content.")

    try:
        content = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise WeakTopicAIReviewError("Gemini weak-topic review content was not valid JSON.") from exc

    solve_steps = [str(item).strip() for item in content.get("solve_steps", []) if str(item).strip()]
    normalized = {
        "heading": str(content.get("heading", "")).strip() or question.concept.name,
        "layman_explanation": str(content.get("layman_explanation", "")).strip(),
        "teacher_guide": str(content.get("teacher_guide", "")).strip(),
        "shortcut_guide": str(content.get("shortcut_guide", "")).strip(),
        "common_trap": str(content.get("common_trap", "")).strip(),
        "solve_steps": solve_steps,
        "practice_tip": str(content.get("practice_tip", "")).strip(),
        "question_prompt": question.prompt,
        "student_answer": student_answer_text,
        "correct_answer": correct_answer_text,
    }
    if not normalized["layman_explanation"] or not normalized["teacher_guide"]:
        raise WeakTopicAIReviewError("Gemini did not provide enough weak-topic review content.")
    return normalized


@transaction.atomic
def submit_attempt(attempt):
    if attempt.status != TestAttempt.Status.STARTED:
        raise ValueError("This diagnostic attempt is not in a submittable state.")

    attempt_questions = list(
        TestAttemptQuestion.objects.filter(attempt=attempt)
        .select_related("question__concept", "question__concept__chapter")
        .order_by("display_order")
    )
    answers_map = {answer.question_id: answer for answer in attempt.answers.select_related("selected_option").all()}

    correct_answers = 0
    wrong_answers = 0
    unanswered_answers = 0
    total_time = 0
    concept_totals = {}

    for item in attempt_questions:
        question = item.question
        answer = answers_map.get(question.id)
        concept_stats = concept_totals.setdefault(str(question.concept_id), {"correct": 0, "total": 0})
        concept_stats["total"] += 1

        if not answer:
            unanswered_answers += 1
            continue

        is_correct = False
        if answer.selected_option_id:
            is_correct = bool(answer.selected_option and answer.selected_option.is_correct)
        elif answer.answer_text:
            is_correct = QuestionOption.objects.filter(
                question=question,
                is_correct=True,
                option_text__iexact=answer.answer_text.strip(),
            ).exists()

        if answer.is_correct != is_correct:
            answer.is_correct = is_correct
            answer.save(update_fields=["is_correct"])

        total_time += answer.time_spent_seconds
        if is_correct:
            correct_answers += 1
            concept_stats["correct"] += 1
        else:
            wrong_answers += 1

    total_questions = len(attempt_questions)
    score_percent = (correct_answers / total_questions) * 100 if total_questions else 0

    attempt.status = TestAttempt.Status.EVALUATED
    attempt.submitted_at = timezone.now()
    attempt.total_questions = total_questions
    attempt.correct_answers = correct_answers
    attempt.wrong_answers = wrong_answers
    attempt.unanswered_answers = unanswered_answers
    attempt.time_spent_seconds = total_time
    attempt.score_percent = _to_decimal(score_percent)
    attempt.save(
        update_fields=[
            "status",
            "submitted_at",
            "total_questions",
            "correct_answers",
            "wrong_answers",
            "unanswered_answers",
            "time_spent_seconds",
            "score_percent",
        ]
    )

    _update_concept_mastery(attempt, concept_totals)
    return attempt


@transaction.atomic
def unlock_paid_attempt(student, exam, subject, provider="manual", provider_reference=""):
    payment = PaymentRecord.objects.create(
        student=student,
        exam=exam,
        subject=subject,
        amount=exam.retest_price,
        status=PaymentRecord.Status.SUCCESS,
        provider=provider,
        provider_reference=provider_reference,
    )
    entitlement = get_or_create_entitlement(student, exam, subject)
    entitlement.paid_attempt_credits += 1
    entitlement.save(update_fields=["paid_attempt_credits", "updated_at"])
    return payment, entitlement
