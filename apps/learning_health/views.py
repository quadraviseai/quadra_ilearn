from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.permissions import IsStudent
from apps.learning_health.serializers import LearningHealthSnapshotSerializer


class LearningHealthView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        snapshots = request.user.student_profile.learning_health_snapshots.all()[:10]
        serializer = LearningHealthSnapshotSerializer(snapshots, many=True)
        latest = serializer.data[0] if serializer.data else None
        return Response(
            {
                "latest": latest,
                "history": serializer.data,
            }
        )
