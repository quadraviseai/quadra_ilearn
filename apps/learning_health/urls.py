from django.urls import path

from apps.learning_health.views import LearningHealthView


urlpatterns = [
    path("learning-health", LearningHealthView.as_view(), name="learning-health"),
]
