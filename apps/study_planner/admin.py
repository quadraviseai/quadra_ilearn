from django.contrib import admin

from apps.study_planner.models import StudyPlan, StudyPlanTask


admin.site.register(StudyPlan)
admin.site.register(StudyPlanTask)
