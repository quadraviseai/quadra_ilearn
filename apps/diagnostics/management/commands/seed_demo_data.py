from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.diagnostics.models import Concept, Question, QuestionOption, Subject


SEED_DATA = [
    {
        "subject": "Mathematics",
        "concept": "Linear Equations",
        "questions": [
            {
                "prompt": "Solve for x: 2x + 3 = 11",
                "options": [("x = 3", False), ("x = 4", True), ("x = 5", False), ("x = 6", False)],
            },
            {
                "prompt": "If 5x = 25, what is x?",
                "options": [("3", False), ("4", False), ("5", True), ("6", False)],
            },
        ],
    },
    {
        "subject": "Science",
        "concept": "Force and Motion",
        "questions": [
            {
                "prompt": "What is the SI unit of force?",
                "options": [("Joule", False), ("Newton", True), ("Pascal", False), ("Watt", False)],
            },
            {
                "prompt": "An object at rest stays at rest because of which law?",
                "options": [
                    ("Newton's First Law", True),
                    ("Newton's Second Law", False),
                    ("Newton's Third Law", False),
                    ("Law of Gravitation", False),
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed demo subjects, concepts, and diagnostic questions for local development."

    def handle(self, *args, **options):
        for item in SEED_DATA:
            subject, _ = Subject.objects.get_or_create(
                slug=slugify(item["subject"]),
                defaults={"name": item["subject"]},
            )
            concept, _ = Concept.objects.get_or_create(
                subject=subject,
                slug=slugify(item["concept"]),
                defaults={"name": item["concept"]},
            )
            for question_data in item["questions"]:
                question, _ = Question.objects.get_or_create(
                    subject=subject,
                    concept=concept,
                    prompt=question_data["prompt"],
                    defaults={"question_type": Question.QuestionType.MCQ_SINGLE},
                )
                for index, (option_text, is_correct) in enumerate(question_data["options"], start=1):
                    QuestionOption.objects.get_or_create(
                        question=question,
                        display_order=index,
                        defaults={"option_text": option_text, "is_correct": is_correct},
                    )

        self.stdout.write(self.style.SUCCESS("Demo diagnostic data seeded successfully."))
