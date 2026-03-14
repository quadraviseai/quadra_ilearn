from django.urls import path

from apps.internal_admin.views import (
    AdminExamDetailView,
    AdminExamListCreateView,
    AdminQuestionAiGenerateView,
    AdminQuestionBulkUploadView,
    AdminConceptDetailView,
    AdminConceptListCreateView,
    AdminDashboardView,
    AdminQuestionDetailView,
    AdminQuestionListCreateView,
    AdminSubjectDetailView,
    AdminSubjectListCreateView,
    AdminUserDetailView,
    AdminUserListCreateView,
)


urlpatterns = [
    path("dashboard", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("users", AdminUserListCreateView.as_view(), name="admin-users"),
    path("users/<uuid:user_id>", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("exams", AdminExamListCreateView.as_view(), name="admin-exams"),
    path("exams/<uuid:exam_id>", AdminExamDetailView.as_view(), name="admin-exam-detail"),
    path("subjects", AdminSubjectListCreateView.as_view(), name="admin-subjects"),
    path("subjects/<uuid:subject_id>", AdminSubjectDetailView.as_view(), name="admin-subject-detail"),
    path("concepts", AdminConceptListCreateView.as_view(), name="admin-concepts"),
    path("concepts/<uuid:concept_id>", AdminConceptDetailView.as_view(), name="admin-concept-detail"),
    path("questions", AdminQuestionListCreateView.as_view(), name="admin-questions"),
    path("questions/bulk-upload", AdminQuestionBulkUploadView.as_view(), name="admin-question-bulk-upload"),
    path("questions/generate-ai", AdminQuestionAiGenerateView.as_view(), name="admin-question-ai-generate"),
    path("questions/<uuid:question_id>", AdminQuestionDetailView.as_view(), name="admin-question-detail"),
]
