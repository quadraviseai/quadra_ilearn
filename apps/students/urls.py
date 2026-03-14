from django.urls import path

from apps.students.views import (
    StudentDashboardSummaryView,
    StudentPrimaryExamSuggestionView,
    StudentProfileView,
)


urlpatterns = [
    path("dashboard-summary", StudentDashboardSummaryView.as_view(), name="student-dashboard-summary"),
    path("profile", StudentProfileView.as_view(), name="student-profile"),
    path(
        "profile/primary-exam-suggestion",
        StudentPrimaryExamSuggestionView.as_view(),
        name="student-primary-exam-suggestion",
    ),
]
