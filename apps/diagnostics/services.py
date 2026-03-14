from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.diagnostics.models import AttemptAnswer, ConceptMastery, Question, QuestionOption, TestAttempt
from apps.leaderboards.services import refresh_weekly_health_leaderboard
from apps.learning_health.models import LearningHealthSnapshot
from apps.streaks.models import StudentStreak
from apps.study_planner.services import rebuild_study_plan_for_student


def _to_decimal(value):
    return Decimal(str(round(float(value), 2)))


def _update_streak(student):
    today = timezone.localdate()
    streak, _ = StudentStreak.objects.get_or_create(student=student)

    if streak.last_activity_date == today:
        return streak

    yesterday = today - timedelta(days=1)
    if streak.last_activity_date == yesterday:
        streak.current_streak_days += 1
    else:
        streak.current_streak_days = 1

    if streak.current_streak_days > streak.best_streak_days:
        streak.best_streak_days = streak.current_streak_days

    streak.last_activity_date = today
    streak.save(update_fields=["current_streak_days", "best_streak_days", "last_activity_date", "updated_at"])
    return streak


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
        weighted_accuracy = (
            (float(mastery.accuracy_percent) * previous_total) + (accuracy * totals["total"])
        ) / combined_total
        mastery.accuracy_percent = _to_decimal(weighted_accuracy)
        mastery.mastery_score = _to_decimal(weighted_accuracy)
        mastery.attempts_count = combined_total
        mastery.last_assessed_at = timezone.now()
        mastery.save(
            update_fields=[
                "accuracy_percent",
                "mastery_score",
                "attempts_count",
                "last_assessed_at",
                "updated_at",
            ]
        )


def _update_learning_health(attempt, score_percent, streak):
    total_concepts = Question.objects.filter(subject=attempt.subject, status=Question.Status.ACTIVE).values(
        "concept_id"
    ).distinct().count()
    answered_concepts = attempt.answers.values("question__concept_id").distinct().count()
    coverage_score = (answered_concepts / total_concepts) * 100 if total_concepts else 0
    consistency_score = min(streak.current_streak_days * 15, 100)
    health_score = (score_percent + consistency_score + coverage_score) / 3

    snapshot, _ = LearningHealthSnapshot.objects.update_or_create(
        student=attempt.student,
        snapshot_date=timezone.localdate(),
        defaults={
            "health_score": _to_decimal(health_score),
            "consistency_score": _to_decimal(consistency_score),
            "accuracy_score": _to_decimal(score_percent),
            "coverage_score": _to_decimal(coverage_score),
        },
    )
    return snapshot


@transaction.atomic
def evaluate_attempt(attempt, answers_payload):
    if attempt.status not in [TestAttempt.Status.STARTED, TestAttempt.Status.SUBMITTED]:
        raise ValueError("This diagnostic attempt is not in a submittable state.")

    questions = {
        str(question.id): question
        for question in Question.objects.filter(subject=attempt.subject, status=Question.Status.ACTIVE).select_related(
            "concept"
        )
    }
    option_lookup = {
        str(option.id): option
        for option in QuestionOption.objects.filter(question__subject=attempt.subject).select_related("question")
    }

    correct_answers = 0
    concept_totals = {}
    total_time = 0

    for entry in answers_payload:
        question = questions.get(str(entry["question_id"]))
        if question is None:
            continue

        selected_option = None
        if entry.get("selected_option_id"):
            selected_option = option_lookup.get(str(entry["selected_option_id"]))
            if selected_option is None or selected_option.question_id != question.id:
                raise ValueError("Answer contains an invalid option for the given question.")

        answer_text = (entry.get("answer_text") or "").strip()
        is_correct = False
        if selected_option is not None:
            is_correct = selected_option.is_correct
        elif answer_text:
            is_correct = QuestionOption.objects.filter(
                question=question,
                is_correct=True,
                option_text__iexact=answer_text,
            ).exists()

        time_spent_seconds = max(int(entry.get("time_spent_seconds", 0) or 0), 0)
        total_time += time_spent_seconds

        AttemptAnswer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                "selected_option": selected_option,
                "answer_text": answer_text,
                "is_correct": is_correct,
                "time_spent_seconds": time_spent_seconds,
                "answered_at": timezone.now(),
            },
        )

        concept_stats = concept_totals.setdefault(str(question.concept_id), {"correct": 0, "total": 0})
        concept_stats["total"] += 1
        if is_correct:
            concept_stats["correct"] += 1
            correct_answers += 1

    total_questions = len(questions)
    score_percent = (correct_answers / total_questions) * 100 if total_questions else 0

    attempt.status = TestAttempt.Status.EVALUATED
    attempt.submitted_at = timezone.now()
    attempt.total_questions = total_questions
    attempt.correct_answers = correct_answers
    attempt.time_spent_seconds = total_time
    attempt.score_percent = _to_decimal(score_percent)
    attempt.save(
        update_fields=[
            "status",
            "submitted_at",
            "total_questions",
            "correct_answers",
            "time_spent_seconds",
            "score_percent",
        ]
    )

    _update_concept_mastery(attempt, concept_totals)
    streak = _update_streak(attempt.student)
    snapshot = _update_learning_health(attempt, score_percent, streak)
    plan = rebuild_study_plan_for_student(attempt.student)
    refresh_weekly_health_leaderboard()
    return {
        "attempt": attempt,
        "snapshot": snapshot,
        "streak": streak,
        "study_plan": plan,
    }
