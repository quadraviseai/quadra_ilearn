from django.urls import path

from apps.diagnostics.views import (
    ActiveAttemptView,
    AttemptAnswerSaveView,
    DiagnosticAttemptDetailView,
    DiagnosticAttemptSubmitView,
    EligibilityView,
    ExamListView,
    ExamSubjectListView,
    LatestReportView,
    PaymentUnlockView,
    ReportDetailView,
    ReportLearningView,
    ReportLearningAIView,
    StartDiagnosticView,
    SubjectListView,
)


urlpatterns = [
    path("exams", ExamListView.as_view(), name="diagnostic-exams"),
    path("exams/<uuid:exam_id>/subjects", ExamSubjectListView.as_view(), name="diagnostic-exam-subjects"),
    path("subjects", SubjectListView.as_view(), name="diagnostic-subjects"),
    path("eligibility", EligibilityView.as_view(), name="diagnostic-eligibility"),
    path("attempts/active", ActiveAttemptView.as_view(), name="diagnostic-active-attempt"),
    path("attempts/start", StartDiagnosticView.as_view(), name="diagnostic-start"),
    path("attempts/<uuid:attempt_id>", DiagnosticAttemptDetailView.as_view(), name="diagnostic-attempt-detail"),
    path("attempts/<uuid:attempt_id>/answers", AttemptAnswerSaveView.as_view(), name="diagnostic-attempt-answer-save"),
    path("attempts/<uuid:attempt_id>/submit", DiagnosticAttemptSubmitView.as_view(), name="diagnostic-attempt-submit"),
    path("reports/latest", LatestReportView.as_view(), name="diagnostic-report-latest"),
    path("reports/<uuid:attempt_id>", ReportDetailView.as_view(), name="diagnostic-report-detail"),
    path("reports/<uuid:attempt_id>/learning", ReportLearningView.as_view(), name="diagnostic-report-learning"),
    path("reports/<uuid:attempt_id>/learning/<uuid:concept_id>/ai", ReportLearningAIView.as_view(), name="diagnostic-report-learning-ai"),
    path("payments/unlock", PaymentUnlockView.as_view(), name="diagnostic-payment-unlock"),
    path("start", StartDiagnosticView.as_view(), name="diagnostic-start-legacy"),
]
