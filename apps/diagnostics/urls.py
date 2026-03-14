from django.urls import path

from apps.diagnostics.views import (
    DiagnosticAttemptDetailView,
    DiagnosticAttemptSubmitView,
    StartDiagnosticView,
    SubjectListView,
)


urlpatterns = [
    path("subjects", SubjectListView.as_view(), name="diagnostic-subjects"),
    path("start", StartDiagnosticView.as_view(), name="diagnostic-start"),
    path("attempts/<uuid:attempt_id>", DiagnosticAttemptDetailView.as_view(), name="diagnostic-attempt-detail"),
    path("attempts/<uuid:attempt_id>/submit", DiagnosticAttemptSubmitView.as_view(), name="diagnostic-attempt-submit"),
]
