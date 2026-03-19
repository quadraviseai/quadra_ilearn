from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.diagnostics.models import Chapter, Concept, Exam, Question, QuestionOption, Subject


QUESTION_VARIANTS = [
    {
        "prompt": lambda topic, subject: f"Which choice best represents strong understanding of {topic['label']} in {subject['name']}?",
        "correct": lambda topic: f"Applying {topic['concept']} with confidence",
        "distractors": [
            "Relying only on guesswork",
            "Skipping the concept and memorizing options",
            "Avoiding practice whenever the wording changes",
        ],
    },
    {
        "prompt": lambda topic, _subject: f"A student is weak in {topic['label']}. What is the most useful next step?",
        "correct": lambda topic: f"Focus on {topic['fix']}",
        "distractors": [
            "Start random tests without reviewing mistakes",
            "Ignore the topic and move to unrelated chapters",
            "Memorize final answers without checking method",
        ],
    },
    {
        "prompt": lambda topic, _subject: f"Which signal usually shows improvement in {topic['label']}?",
        "correct": lambda topic: f"You can {topic['signal']}",
        "distractors": [
            "You answer faster without reading the question",
            "You change methods every time without reason",
            "You depend fully on elimination instead of understanding",
        ],
    },
    {
        "prompt": lambda topic, _subject: f"When revising {topic['label']}, which approach is most reliable?",
        "correct": lambda topic: f"Link the idea to {topic['concept']}",
        "distractors": [
            "Read the topic once and avoid any worked examples",
            "Practice only solved answers and skip new questions",
            "Study the chapter without checking where mistakes happen",
        ],
    },
]


SEED_STRUCTURE = [
    {
        "name": "JEE Main",
        "subjects": [
            {
                "name": "Physics",
                "learning_content": "Physics weak-topic recovery should focus on force diagrams, graph reading, and direct formula application before retesting.",
                "topics": [
                    {"label": "Kinematics", "concept": "motion, displacement, and velocity relationships", "fix": "solve more graph-based motion questions", "signal": "convert motion statements into equations quickly"},
                    {"label": "Laws of Motion", "concept": "force balance and Newtonian reasoning", "fix": "draw force diagrams before calculation", "signal": "identify net force without trial and error"},
                    {"label": "Work and Energy", "concept": "energy conservation and work transfer", "fix": "track energy changes stage by stage", "signal": "choose the correct conservation equation directly"},
                    {"label": "Rotational Motion", "concept": "torque, angular acceleration, and inertia", "fix": "practice torque direction and pivot analysis", "signal": "map linear ideas to rotational analogies"},
                    {"label": "Electrostatics", "concept": "charge interaction and electric field behavior", "fix": "review field-line and potential comparisons", "signal": "judge electric influence without full computation"},
                    {"label": "Current Electricity", "concept": "circuit relationships and resistance logic", "fix": "rebuild circuit questions branch by branch", "signal": "simplify a circuit before substituting values"},
                    {"label": "Optics", "concept": "image formation and ray interpretation", "fix": "draw ray paths before using formulas", "signal": "predict image type from geometry alone"},
                    {"label": "Modern Physics", "concept": "atomic models and quantum behavior", "fix": "link formulas to the physical experiment behind them", "signal": "recognize where classical reasoning fails"},
                ],
            },
            {
                "name": "Mathematics",
                "learning_content": "Math recovery should focus on pattern recognition, choosing the right method first, and reducing careless method switches.",
                "topics": [
                    {"label": "Quadratic Equations", "concept": "roots, discriminant, and transformation patterns", "fix": "connect graph shape with root behavior", "signal": "spot the fastest solving method immediately"},
                    {"label": "Sequences and Series", "concept": "term patterns and summation structure", "fix": "rewrite the series before choosing a formula", "signal": "classify AP, GP, or mixed form early"},
                    {"label": "Functions", "concept": "domain, range, and composition logic", "fix": "test edge cases while finding domain restrictions", "signal": "read transformation effects without plotting fully"},
                    {"label": "Limits", "concept": "approach behavior and indeterminate forms", "fix": "factor or rationalize before substituting", "signal": "identify the simplification pattern quickly"},
                    {"label": "Derivatives", "concept": "rate of change and slope behavior", "fix": "differentiate stepwise before simplification", "signal": "match the derivative rule to the expression structure"},
                    {"label": "Integrals", "concept": "accumulation and reverse differentiation", "fix": "look for substitution before expansion", "signal": "recognize standard integral forms rapidly"},
                    {"label": "Coordinate Geometry", "concept": "line, circle, and conic relationships", "fix": "convert the question into a clean geometric condition", "signal": "see distance and slope constraints directly"},
                    {"label": "Probability", "concept": "counting favorable cases with clean sample spaces", "fix": "write the sample space before computing ratios", "signal": "separate dependent and independent events correctly"},
                ],
            },
        ],
    },
    {
        "name": "NEET",
        "subjects": [
            {
                "name": "Biology",
                "learning_content": "Biology recovery should connect terms to process flow and system-level understanding instead of isolated memorization.",
                "topics": [
                    {"label": "Cell Biology", "concept": "organelle function and structural coordination", "fix": "compare functions instead of memorizing isolated names", "signal": "map a process to the right organelle confidently"},
                    {"label": "Genetics", "concept": "inheritance patterns and trait prediction", "fix": "draw inheritance tables before deciding outcomes", "signal": "separate genotype from phenotype consistently"},
                    {"label": "Human Physiology", "concept": "system-level coordination in the body", "fix": "follow the process step by step through the body system", "signal": "link organ function with outcome under stress"},
                    {"label": "Plant Physiology", "concept": "transport, growth, and regulation in plants", "fix": "connect input condition with plant response", "signal": "trace transport movement without mixing pathways"},
                    {"label": "Ecology", "concept": "population, environment, and ecosystem balance", "fix": "read the ecological relationship before applying data", "signal": "identify the interaction type from a short scenario"},
                    {"label": "Evolution", "concept": "variation, selection, and adaptation", "fix": "relate evidence to the mechanism of change", "signal": "separate adaptation from random variation clearly"},
                    {"label": "Biotechnology", "concept": "applications of genetic and molecular tools", "fix": "tie the tool to its biological purpose", "signal": "choose the right technique for the stated outcome"},
                    {"label": "Reproduction", "concept": "human and plant reproductive processes", "fix": "sequence the stages instead of memorizing fragments", "signal": "place the event at the correct stage instantly"},
                ],
            },
            {
                "name": "Chemistry",
                "learning_content": "Chemistry recovery should connect each chapter to reaction logic, structure, and the condition that changes the outcome.",
                "topics": [
                    {"label": "Atomic Structure", "concept": "electronic arrangement and model limitations", "fix": "connect each rule to the model it belongs to", "signal": "choose the right atomic model from the evidence given"},
                    {"label": "Chemical Bonding", "concept": "bond formation, geometry, and polarity", "fix": "count electron regions before judging shape", "signal": "separate bond type from molecular polarity correctly"},
                    {"label": "Thermodynamics", "concept": "heat, work, and energy transfer in reactions", "fix": "track sign conventions before using formulas", "signal": "tell endothermic and exothermic changes apart quickly"},
                    {"label": "Equilibrium", "concept": "dynamic balance and shift conditions", "fix": "read the disturbance before predicting the shift", "signal": "apply Le Chatelier without overcomplicating the system"},
                    {"label": "Organic Reactions", "concept": "functional group behavior and reaction pathways", "fix": "identify the functional group before the reagent effect", "signal": "predict the product family from the reagent pattern"},
                    {"label": "Hydrocarbons", "concept": "structure, stability, and reaction preference", "fix": "relate structure to reactivity before elimination", "signal": "recognize saturation and substitution trends clearly"},
                    {"label": "Coordination Compounds", "concept": "ligands, geometry, and complex naming", "fix": "decode the complex one unit at a time", "signal": "link ligand count to geometry accurately"},
                    {"label": "Biomolecules", "concept": "structure and function of biological compounds", "fix": "group compounds by role before memorizing examples", "signal": "spot the biomolecule category from functional clues"},
                ],
            },
        ],
    },
    {
        "name": "CBSE Class 10",
        "subjects": [
            {
                "name": "Science",
                "learning_content": "Science recovery should focus on chapter logic, process order, and linking diagrams or observations to the correct principle.",
                "topics": [
                    {"label": "Light", "concept": "reflection, refraction, and image formation", "fix": "draw the path of light before choosing an answer", "signal": "separate mirror and lens behavior correctly"},
                    {"label": "Electricity", "concept": "current, potential difference, and resistance", "fix": "write circuit relationships before substituting values", "signal": "see series and parallel effects immediately"},
                    {"label": "Acids, Bases and Salts", "concept": "properties, reactions, and indicators", "fix": "connect reaction type with the expected observation", "signal": "classify substances from their behavior confidently"},
                    {"label": "Metals and Non-metals", "concept": "reactivity and material properties", "fix": "compare the property before naming the category", "signal": "predict likely reaction behavior from the material type"},
                    {"label": "Life Processes", "concept": "nutrition, respiration, and transport in organisms", "fix": "follow the process order instead of isolated facts", "signal": "identify the correct body system from a short description"},
                    {"label": "Control and Coordination", "concept": "nervous and hormonal regulation", "fix": "map the stimulus to the control pathway used", "signal": "distinguish fast neural response from hormonal response"},
                    {"label": "Heredity", "concept": "traits, inheritance, and variation", "fix": "track how the trait moves across generations", "signal": "link variation with inheritance accurately"},
                    {"label": "Our Environment", "concept": "ecosystem balance and resource relationships", "fix": "understand the interaction before reading the numbers", "signal": "spot the food-chain or resource-cycle logic quickly"},
                ],
            },
            {
                "name": "Mathematics",
                "learning_content": "Board-math recovery should focus on identifying question type early and applying one clean method without unnecessary branching.",
                "topics": [
                    {"label": "Real Numbers", "concept": "factorization and number relationships", "fix": "break the number structure before applying the theorem", "signal": "identify HCF-LCM relationships directly"},
                    {"label": "Polynomials", "concept": "zeros, factors, and graphical meaning", "fix": "test factor and zero relationships together", "signal": "move between equation and graph without hesitation"},
                    {"label": "Linear Equations", "concept": "pair of lines and their intersection logic", "fix": "compare coefficients before solving fully", "signal": "tell unique, infinite, and no-solution cases apart"},
                    {"label": "Triangles", "concept": "similarity and proportional relationships", "fix": "mark corresponding sides before calculating", "signal": "spot the similarity condition from the figure quickly"},
                    {"label": "Coordinate Geometry", "concept": "distance and section interpretation on the plane", "fix": "visualize the point movement before formula use", "signal": "pick the right coordinate formula from the question type"},
                    {"label": "Trigonometry", "concept": "ratio relationships and angle application", "fix": "write the known ratio set before manipulation", "signal": "link the angle scenario to the correct ratio quickly"},
                    {"label": "Surface Areas and Volumes", "concept": "solid geometry and measurement logic", "fix": "separate the visible surfaces from the full solid", "signal": "choose area vs volume without confusion"},
                    {"label": "Statistics", "concept": "data summary and central tendency", "fix": "organize the table before computing the measure", "signal": "pick mean, median, or mode based on the data shape"},
                ],
            },
        ],
    },
]


def build_options(topic, variant):
    return [
        (variant["correct"](topic), True),
        *[(option, False) for option in variant["distractors"]],
    ]


class Command(BaseCommand):
    help = "Seed active exams, subjects, concepts, and 30+ questions per subject for the new student mock-test flow."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing diagnostic exams, subjects, concepts, chapters, questions, and options before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Resetting diagnostics content...")
            QuestionOption.objects.all().delete()
            Question.objects.all().delete()
            Concept.objects.all().delete()
            Chapter.objects.all().delete()
            Subject.objects.all().delete()
            Exam.objects.all().delete()

        exam_count = 0
        subject_count = 0
        concept_count = 0
        question_count = 0

        for exam_data in SEED_STRUCTURE:
            exam_slug = slugify(exam_data["name"])
            exam, created = Exam.objects.get_or_create(
                slug=exam_slug,
                defaults={
                    "name": exam_data["name"],
                    "is_active": True,
                    "retest_price": Decimal("10.00"),
                },
            )
            if not created:
                exam.name = exam_data["name"]
                exam.is_active = True
                exam.retest_price = Decimal("10.00")
                exam.save(update_fields=["name", "is_active", "retest_price"])
            exam_count += 1

            for subject_data in exam_data["subjects"]:
                subject_slug = slugify(subject_data["name"])
                subject, created = Subject.objects.get_or_create(
                    slug=subject_slug,
                    defaults={
                        "name": subject_data["name"],
                        "is_active": True,
                        "learning_content": subject_data["learning_content"],
                    },
                )
                if not created:
                    subject.name = subject_data["name"]
                    subject.is_active = True
                    subject.learning_content = subject_data["learning_content"]
                    subject.save(update_fields=["name", "is_active", "learning_content"])
                subject.exams.add(exam)
                subject_count += 1

                chapter_slug = slugify(f"{exam_data['name']} {subject_data['name']} core")[:160]
                chapter, created = Chapter.objects.get_or_create(
                    subject=subject,
                    slug=chapter_slug,
                    defaults={
                        "name": f"{exam_data['name']} {subject_data['name']} Core",
                        "description": f"Core chapters for {exam_data['name']} {subject_data['name']}.",
                    },
                )
                if not created:
                    chapter.name = f"{exam_data['name']} {subject_data['name']} Core"
                    chapter.description = f"Core chapters for {exam_data['name']} {subject_data['name']}."
                    chapter.save(update_fields=["name", "description"])
                chapter.exams.add(exam)

                for topic in subject_data["topics"]:
                    concept_slug = slugify(topic["label"])
                    concept, created = Concept.objects.get_or_create(
                        subject=subject,
                        slug=concept_slug,
                        defaults={
                            "chapter": chapter,
                            "name": topic["label"],
                            "description": topic["concept"],
                            "difficulty_level": 1,
                        },
                    )
                    if not created:
                        concept.chapter = chapter
                        concept.name = topic["label"]
                        concept.description = topic["concept"]
                        concept.save(update_fields=["chapter", "name", "description"])
                    concept.exams.add(exam)
                    concept_count += 1

                    for variant_index, variant in enumerate(QUESTION_VARIANTS, start=1):
                        prompt = variant["prompt"](topic, subject_data)
                        question, created = Question.objects.get_or_create(
                            subject=subject,
                            concept=concept,
                            prompt=prompt,
                            defaults={
                                "question_type": Question.QuestionType.MCQ_SINGLE,
                                "status": Question.Status.ACTIVE,
                                "explanation": f"Use {topic['concept']} to solve this correctly.",
                                "difficulty_level": 1,
                                "exam_type": [exam_data["name"]],
                            },
                        )
                        if not created:
                            question.question_type = Question.QuestionType.MCQ_SINGLE
                            question.status = Question.Status.ACTIVE
                            question.explanation = f"Use {topic['concept']} to solve this correctly."
                            question.difficulty_level = 1
                            question.exam_type = [exam_data["name"]]
                            question.save(
                                update_fields=["question_type", "status", "explanation", "difficulty_level", "exam_type", "updated_at"]
                            )
                        question.exams.add(exam)
                        question_count += 1

                        for display_order, (option_text, is_correct) in enumerate(build_options(topic, variant), start=1):
                            option, created = QuestionOption.objects.get_or_create(
                                question=question,
                                display_order=display_order,
                                defaults={
                                    "option_text": option_text,
                                    "is_correct": is_correct,
                                },
                            )
                            if not created and (option.option_text != option_text or option.is_correct != is_correct):
                                option.option_text = option_text
                                option.is_correct = is_correct
                                option.save(update_fields=["option_text", "is_correct"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded demo data successfully: {exam_count} exams, {subject_count} exam-subject mappings, "
                f"{concept_count} concepts, {question_count} questions."
            )
        )
