from django.contrib import admin

from apps.students.models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "class_name", "primary_target_exam", "created_at")
    search_fields = ("full_name", "user__email", "school_name", "primary_target_exam", "secondary_target_exam")
