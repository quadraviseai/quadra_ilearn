from django.urls import path

from apps.study_planner.views import (
    StudyPlanRegenerateView,
    StudyPlanTaskStepStartView,
    StudyPlanTaskStartView,
    StudyPlanTaskUpdateView,
    StudyPlanView,
)


urlpatterns = [
    path("", StudyPlanView.as_view(), name="study-plan"),
    path("regenerate", StudyPlanRegenerateView.as_view(), name="study-plan-regenerate"),
    path("tasks/<uuid:task_id>", StudyPlanTaskUpdateView.as_view(), name="study-plan-task-update"),
    path("tasks/<uuid:task_id>/start", StudyPlanTaskStartView.as_view(), name="study-plan-task-start"),
    path("tasks/<uuid:task_id>/steps/<int:step_index>/start", StudyPlanTaskStepStartView.as_view(), name="study-plan-task-step-start"),
]
