from django.urls import path

from apps.students.views import (
    StudentAuditLogView,
    StudentDashboardSummaryView,
    StudentPushDeviceView,
    StudentPushTestNotificationView,
    StudentPrimaryExamSuggestionView,
    StudentProfileView,
    StudentTokenTopUpPurchaseView,
)


urlpatterns = [
    path("dashboard-summary", StudentDashboardSummaryView.as_view(), name="student-dashboard-summary"),
    path("profile", StudentProfileView.as_view(), name="student-profile"),
    path("profile/audit-log", StudentAuditLogView.as_view(), name="student-audit-log"),
    path("profile/push-device", StudentPushDeviceView.as_view(), name="student-push-device"),
    path("profile/test-notification", StudentPushTestNotificationView.as_view(), name="student-test-notification"),
    path("profile/token-topups", StudentTokenTopUpPurchaseView.as_view(), name="student-token-topup-purchase"),
    path(
        "profile/primary-exam-suggestion",
        StudentPrimaryExamSuggestionView.as_view(),
        name="student-primary-exam-suggestion",
    ),
]
