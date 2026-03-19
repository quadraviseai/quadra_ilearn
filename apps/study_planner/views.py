from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.permissions import IsStudent
from apps.study_planner.models import StudyPlanTask
from apps.study_planner.serializers import StudyPlanSerializer, StudyPlanTaskSerializer, StudyPlanTaskUpdateSerializer
from apps.study_planner.services import (
    StudyPlanContentError,
    generate_step_study_content_for_task,
    generate_study_content_for_task,
    rebuild_study_plan_for_student,
)


def get_task_content_cache(task):
    content = task.ai_study_content or {}
    if not isinstance(content, dict):
        return {"selected_exam": "", "exam_content": {}}

    exam_content = content.get("exam_content")
    if isinstance(exam_content, dict):
        return {
            "selected_exam": str(content.get("selected_exam", "")).strip(),
            "exam_content": exam_content,
        }

    target_exam = str(content.get("target_exam", "")).strip()
    if target_exam:
        return {
            "selected_exam": target_exam,
            "exam_content": {
                target_exam: content,
            },
        }

    return {"selected_exam": "", "exam_content": {}}


def get_exam_specific_content(task, selected_exam):
    cache = get_task_content_cache(task)
    return cache["exam_content"].get(selected_exam, {})


def set_exam_specific_content(task, selected_exam, exam_content):
    cache = get_task_content_cache(task)
    cache["selected_exam"] = selected_exam
    cache["exam_content"][selected_exam] = exam_content
    task.ai_study_content = cache


def get_completed_step_indexes(exam_content):
    completed = exam_content.get("completed_step_indexes", [])
    if not isinstance(completed, list):
        return []
    return [index for index in completed if isinstance(index, int)]


def mark_step_completed(exam_content, step_index):
    completed = set(get_completed_step_indexes(exam_content))
    completed.add(step_index)
    exam_content["completed_step_indexes"] = sorted(completed)


def get_task_completion_status(task):
    cache = get_task_content_cache(task)
    selected_exam = cache["selected_exam"] or next(iter(cache["exam_content"]), "")
    exam_content = cache["exam_content"].get(selected_exam, {})
    study_steps = exam_content.get("study_steps", [])
    total_steps = len(study_steps) if isinstance(study_steps, list) else 0
    completed_steps = len(get_completed_step_indexes(exam_content))
    return {
        "selected_exam": selected_exam,
        "total_steps": total_steps,
        "completed_steps": min(completed_steps, total_steps),
    }


def has_structured_study_content(content):
    if not isinstance(content, dict):
        return False

    study_steps = content.get("study_steps")
    if not isinstance(study_steps, list) or not study_steps:
        return False

    for step in study_steps:
        if not isinstance(step, dict):
            return False
        if not str(step.get("title", "")).strip():
            return False
        if not str(step.get("detail", "")).strip():
            return False

    return True


def get_selected_target_exam(task, request):
    profile = task.plan.student
    selected_exam = str(request.data.get("target_exam", "")).strip()
    allowed_exams = [exam for exam in [profile.primary_target_exam, profile.secondary_target_exam] if exam]

    if selected_exam:
        if selected_exam not in allowed_exams:
            raise ValidationError({"detail": "Invalid target exam selection."})
        return selected_exam

    if allowed_exams:
        return allowed_exams[0]

    return ""


class StudyPlanView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        plan = request.user.student_profile.study_plans.prefetch_related("tasks__concept").filter(
            status="active"
        ).first()
        serializer = StudyPlanSerializer(plan)
        return Response(serializer.data if plan else None)


class StudyPlanRegenerateView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        plan = rebuild_study_plan_for_student(request.user.student_profile)
        serializer = StudyPlanSerializer(plan)
        return Response(serializer.data if plan else None, status=status.HTTP_201_CREATED)


class StudyPlanTaskUpdateView(APIView):
    permission_classes = [IsStudent]

    def patch(self, request, task_id):
        task = get_object_or_404(
            StudyPlanTask.objects.select_related("plan", "concept"),
            id=task_id,
            plan__student=request.user.student_profile,
            plan__status="active",
        )
        if request.data.get("status") == StudyPlanTask.Status.DONE:
            completion_status = get_task_completion_status(task)
            if completion_status["total_steps"] and completion_status["completed_steps"] < completion_status["total_steps"]:
                raise ValidationError(
                    {
                        "detail": (
                            f"Complete all study steps before marking this task done. "
                            f"{completion_status['completed_steps']} of {completion_status['total_steps']} covered."
                        )
                    }
                )
        serializer = StudyPlanTaskUpdateSerializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StudyPlanTaskSerializer(task).data)


class StudyPlanTaskStartView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, task_id):
        task = get_object_or_404(
            StudyPlanTask.objects.select_related("plan", "plan__student", "concept"),
            id=task_id,
            plan__student=request.user.student_profile,
            plan__status="active",
        )
        selected_exam = get_selected_target_exam(task, request)
        exam_content = get_exam_specific_content(task, selected_exam)
        if not has_structured_study_content(exam_content):
            try:
                exam_content = generate_study_content_for_task(task, selected_exam)
            except StudyPlanContentError as exc:
                message = str(exc)
                if "not configured" in message.lower():
                    raise ValidationError({"detail": message}) from exc
                api_exception = APIException(message)
                api_exception.status_code = status.HTTP_502_BAD_GATEWAY
                raise api_exception from exc
            set_exam_specific_content(task, selected_exam, exam_content)
            task.ai_study_content_generated_at = timezone.now()
        else:
            set_exam_specific_content(task, selected_exam, exam_content)

        if task.status in {StudyPlanTask.Status.PENDING, StudyPlanTask.Status.SKIPPED}:
            task.status = StudyPlanTask.Status.IN_PROGRESS

        task.save(update_fields=["status", "ai_study_content", "ai_study_content_generated_at"])
        return Response(StudyPlanTaskSerializer(task).data)


class StudyPlanTaskStepStartView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, task_id, step_index):
        task = get_object_or_404(
            StudyPlanTask.objects.select_related("plan", "plan__student", "concept"),
            id=task_id,
            plan__student=request.user.student_profile,
            plan__status="active",
        )
        selected_exam = get_selected_target_exam(task, request)
        exam_content = get_exam_specific_content(task, selected_exam)
        if not has_structured_study_content(exam_content):
            try:
                exam_content = generate_study_content_for_task(task, selected_exam)
                task.ai_study_content_generated_at = timezone.now()
            except StudyPlanContentError as exc:
                message = str(exc)
                if "not configured" in message.lower():
                    raise ValidationError({"detail": message}) from exc
                api_exception = APIException(message)
                api_exception.status_code = status.HTTP_502_BAD_GATEWAY
                raise api_exception from exc
            set_exam_specific_content(task, selected_exam, exam_content)

        steps = exam_content.get("study_steps", [])
        if step_index < 0 or step_index >= len(steps):
            raise ValidationError({"detail": "Invalid study step."})

        step = steps[step_index]
        if not isinstance(step, dict):
            raise ValidationError({"detail": "Invalid study step."})

        session_exam = str((step.get("session") or {}).get("target_exam", "")).strip()
        if not step.get("session") or session_exam != selected_exam:
            try:
                step["session"] = generate_step_study_content_for_task(task, step, selected_exam)
            except StudyPlanContentError as exc:
                message = str(exc)
                if "not configured" in message.lower():
                    raise ValidationError({"detail": message}) from exc
                api_exception = APIException(message)
                api_exception.status_code = status.HTTP_502_BAD_GATEWAY
                raise api_exception from exc

        if task.status in {StudyPlanTask.Status.PENDING, StudyPlanTask.Status.SKIPPED}:
            task.status = StudyPlanTask.Status.IN_PROGRESS

        exam_content["study_steps"] = steps
        mark_step_completed(exam_content, step_index)
        set_exam_specific_content(task, selected_exam, exam_content)
        task.save(update_fields=["status", "ai_study_content", "ai_study_content_generated_at"])
        return Response(StudyPlanTaskSerializer(task).data)
