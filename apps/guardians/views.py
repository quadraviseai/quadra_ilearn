from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.guardians.models import GuardianStudentLink
from apps.guardians.permissions import IsGuardian
from apps.guardians.serializers import (
    AcceptInviteSerializer,
    CreateStudentSerializer,
    GuardianStudentSummarySerializer,
    InviteStudentSerializer,
)
from apps.guardians.services import accept_invite_for_student
from apps.diagnostics.permissions import IsStudent


class InviteStudentView(APIView):
    permission_classes = [IsGuardian]

    def post(self, request):
        serializer = InviteStudentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        return Response(
            {
                "message": "Invite processed successfully.",
                **payload,
            },
            status=status.HTTP_201_CREATED,
        )


class CreateStudentView(APIView):
    permission_classes = [IsGuardian]

    def post(self, request):
        serializer = CreateStudentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        return Response(
            {
                "message": "Student created and linked successfully.",
                **payload,
            },
            status=status.HTTP_201_CREATED,
        )


class GuardianStudentListView(APIView):
    permission_classes = [IsGuardian]

    def get(self, request):
        links = GuardianStudentLink.objects.filter(guardian=request.user.guardian_profile).select_related(
            "student__user"
        )
        students = [link.student for link in links]
        serializer = GuardianStudentSummarySerializer(
            students,
            many=True,
            context={"link_map": {link.student_id: link for link in links}},
        )
        return Response(serializer.data)


class AcceptInviteView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        link = accept_invite_for_student(request.user.student_profile, serializer.validated_data["invite_token"])
        return Response(
            {
                "message": "Guardian invite accepted.",
                "guardian_name": link.guardian.full_name,
                "status": link.status,
                "accepted_at": link.accepted_at,
            }
        )
