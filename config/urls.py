from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/admin/", include("apps.internal_admin.urls")),
    path("api/students/", include("apps.students.urls")),
    path("api/guardian/", include("apps.guardians.urls")),
    path("api/diagnostic/", include("apps.diagnostics.urls")),
    path("api/leaderboards/", include("apps.leaderboards.urls")),
    path("api/study-planner/", include("apps.study_planner.urls")),
    path("api/", include("apps.learning_health.urls")),
]
