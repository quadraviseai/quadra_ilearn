from django.contrib import admin

from apps.guardians.models import GuardianProfile, GuardianStudentLink


@admin.register(GuardianProfile)
class GuardianProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "relationship_to_student", "created_at")
    search_fields = ("full_name", "user__email")


@admin.register(GuardianStudentLink)
class GuardianStudentLinkAdmin(admin.ModelAdmin):
    list_display = ("guardian", "student", "status", "invited_at", "accepted_at")
    list_filter = ("status",)
    search_fields = ("guardian__full_name", "student__full_name", "guardian__user__email", "student__user__email")
