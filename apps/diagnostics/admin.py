from django.contrib import admin

from apps.diagnostics.models import AttemptAnswer, Concept, ConceptMastery, Question, QuestionOption, Subject, TestAttempt


admin.site.register(Subject)
admin.site.register(Concept)
admin.site.register(Question)
admin.site.register(QuestionOption)
admin.site.register(TestAttempt)
admin.site.register(AttemptAnswer)
admin.site.register(ConceptMastery)
