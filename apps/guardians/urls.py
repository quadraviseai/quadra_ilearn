from django.urls import path

from apps.guardians.views import AcceptInviteView, CreateStudentView, GuardianStudentListView, InviteStudentView


urlpatterns = [
    path("accept-invite", AcceptInviteView.as_view(), name="guardian-accept-invite"),
    path("invite", InviteStudentView.as_view(), name="guardian-invite"),
    path("create-student", CreateStudentView.as_view(), name="guardian-create-student"),
    path("students", GuardianStudentListView.as_view(), name="guardian-students"),
]
