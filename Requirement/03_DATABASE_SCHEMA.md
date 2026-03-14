# Database Schema

Database: PostgreSQL
Backend ORM: Django ORM

## Design Principles
- Use UUID primary keys for all user-facing entities.
- Keep authentication identity in the `users` app and domain profiles in related tables.
- Separate diagnostic attempt data from concept-level performance data.
- Store derived metrics like learning health and streaks in dedicated summary tables for fast reads.

## Core Tables

### 1. users_user
Purpose: base authenticated account for students and guardians.

Fields:
- `id` UUID PK
- `email` VARCHAR(255) UNIQUE NOT NULL
- `phone` VARCHAR(20) NULL
- `password_hash` VARCHAR(255) NOT NULL
- `role` VARCHAR(20) NOT NULL
  - allowed values: `student`, `guardian`, `admin`
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `is_verified` BOOLEAN NOT NULL DEFAULT false
- `last_login_at` TIMESTAMP NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

Indexes:
- unique index on `email`
- index on `role`

### 2. students_studentprofile
Purpose: student-specific profile and academic metadata.

Fields:
- `id` UUID PK
- `user_id` UUID FK -> `users_user.id` UNIQUE NOT NULL
- `full_name` VARCHAR(150) NOT NULL
- `grade_level` VARCHAR(50) NOT NULL
- `board` VARCHAR(50) NULL
- `school_name` VARCHAR(150) NULL
- `target_exam` VARCHAR(100) NULL
- `timezone` VARCHAR(50) NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

Indexes:
- index on `grade_level`
- index on `target_exam`

### 3. guardians_guardianprofile
Purpose: guardian-specific profile details.

Fields:
- `id` UUID PK
- `user_id` UUID FK -> `users_user.id` UNIQUE NOT NULL
- `full_name` VARCHAR(150) NOT NULL
- `relationship_to_student` VARCHAR(50) NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

### 4. guardians_guardianstudentlink
Purpose: links guardians to students with invitation lifecycle.

Fields:
- `id` UUID PK
- `guardian_id` UUID FK -> `guardians_guardianprofile.id` NOT NULL
- `student_id` UUID FK -> `students_studentprofile.id` NOT NULL
- `status` VARCHAR(20) NOT NULL
  - allowed values: `invited`, `active`, `revoked`
- `invite_token` VARCHAR(255) UNIQUE NULL
- `invited_at` TIMESTAMP NULL
- `accepted_at` TIMESTAMP NULL
- `created_at` TIMESTAMP NOT NULL

Constraints:
- unique (`guardian_id`, `student_id`)

Indexes:
- index on `status`

## Academic Domain Tables

### 5. diagnostics_subject
Purpose: catalog of subjects used in diagnostics and analytics.

Fields:
- `id` UUID PK
- `name` VARCHAR(100) UNIQUE NOT NULL
- `slug` VARCHAR(120) UNIQUE NOT NULL
- `created_at` TIMESTAMP NOT NULL

### 6. diagnostics_concept
Purpose: concept or skill node inside a subject.

Fields:
- `id` UUID PK
- `subject_id` UUID FK -> `diagnostics_subject.id` NOT NULL
- `name` VARCHAR(150) NOT NULL
- `slug` VARCHAR(160) NOT NULL
- `description` TEXT NULL
- `difficulty_level` SMALLINT NOT NULL DEFAULT 1
- `created_at` TIMESTAMP NOT NULL

Constraints:
- unique (`subject_id`, `slug`)

Indexes:
- index on `subject_id`
- index on `difficulty_level`

### 7. diagnostics_question
Purpose: question bank entity for diagnostics.

Fields:
- `id` UUID PK
- `subject_id` UUID FK -> `diagnostics_subject.id` NOT NULL
- `concept_id` UUID FK -> `diagnostics_concept.id` NOT NULL
- `question_type` VARCHAR(30) NOT NULL
  - examples: `mcq_single`, `mcq_multi`, `numeric`
- `prompt` TEXT NOT NULL
- `explanation` TEXT NULL
- `difficulty_level` SMALLINT NOT NULL DEFAULT 1
- `status` VARCHAR(20) NOT NULL DEFAULT `active`
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

Indexes:
- index on `subject_id`
- index on `concept_id`
- index on `status`

### 8. diagnostics_questionoption
Purpose: answer options for multiple-choice questions.

Fields:
- `id` UUID PK
- `question_id` UUID FK -> `diagnostics_question.id` NOT NULL
- `option_text` TEXT NOT NULL
- `is_correct` BOOLEAN NOT NULL DEFAULT false
- `display_order` SMALLINT NOT NULL DEFAULT 1

Constraints:
- unique (`question_id`, `display_order`)

### 9. diagnostics_testattempt
Purpose: a student diagnostic session.

Fields:
- `id` UUID PK
- `student_id` UUID FK -> `students_studentprofile.id` NOT NULL
- `subject_id` UUID FK -> `diagnostics_subject.id` NOT NULL
- `status` VARCHAR(20) NOT NULL
  - allowed values: `started`, `submitted`, `evaluated`, `abandoned`
- `started_at` TIMESTAMP NOT NULL
- `submitted_at` TIMESTAMP NULL
- `score_percent` DECIMAL(5,2) NULL
- `total_questions` INTEGER NOT NULL DEFAULT 0
- `correct_answers` INTEGER NOT NULL DEFAULT 0
- `time_spent_seconds` INTEGER NOT NULL DEFAULT 0
- `created_at` TIMESTAMP NOT NULL

Indexes:
- index on `student_id`
- index on `subject_id`
- index on `status`
- index on `started_at`

### 10. diagnostics_attemptanswer
Purpose: per-question answer record within a test attempt.

Fields:
- `id` UUID PK
- `attempt_id` UUID FK -> `diagnostics_testattempt.id` NOT NULL
- `question_id` UUID FK -> `diagnostics_question.id` NOT NULL
- `selected_option_id` UUID FK -> `diagnostics_questionoption.id` NULL
- `answer_text` TEXT NULL
- `is_correct` BOOLEAN NULL
- `time_spent_seconds` INTEGER NOT NULL DEFAULT 0
- `answered_at` TIMESTAMP NULL

Constraints:
- unique (`attempt_id`, `question_id`)

Indexes:
- index on `attempt_id`
- index on `question_id`

### 11. diagnostics_conceptmastery
Purpose: stores latest concept-level performance for each student.

Fields:
- `id` UUID PK
- `student_id` UUID FK -> `students_studentprofile.id` NOT NULL
- `concept_id` UUID FK -> `diagnostics_concept.id` NOT NULL
- `mastery_score` DECIMAL(5,2) NOT NULL
- `accuracy_percent` DECIMAL(5,2) NOT NULL
- `attempts_count` INTEGER NOT NULL DEFAULT 0
- `last_assessed_at` TIMESTAMP NULL
- `updated_at` TIMESTAMP NOT NULL

Constraints:
- unique (`student_id`, `concept_id`)

Indexes:
- index on `student_id`
- index on `concept_id`
- index on `mastery_score`

## Learning Metrics Tables

### 12. learning_health_learninghealthsnapshot
Purpose: derived learning health score over time.

Fields:
- `id` UUID PK
- `student_id` UUID FK -> `students_studentprofile.id` NOT NULL
- `health_score` DECIMAL(5,2) NOT NULL
- `consistency_score` DECIMAL(5,2) NOT NULL
- `accuracy_score` DECIMAL(5,2) NOT NULL
- `coverage_score` DECIMAL(5,2) NOT NULL
- `snapshot_date` DATE NOT NULL
- `created_at` TIMESTAMP NOT NULL

Constraints:
- unique (`student_id`, `snapshot_date`)

Indexes:
- index on `student_id`
- index on `snapshot_date`

### 13. streaks_studentstreak
Purpose: current and best learning streak for a student.

Fields:
- `id` UUID PK
- `student_id` UUID FK -> `students_studentprofile.id` UNIQUE NOT NULL
- `current_streak_days` INTEGER NOT NULL DEFAULT 0
- `best_streak_days` INTEGER NOT NULL DEFAULT 0
- `last_activity_date` DATE NULL
- `updated_at` TIMESTAMP NOT NULL

### 14. leaderboards_leaderboardentry
Purpose: cached leaderboard ranking for a time window.

Fields:
- `id` UUID PK
- `student_id` UUID FK -> `students_studentprofile.id` NOT NULL
- `leaderboard_type` VARCHAR(30) NOT NULL
  - examples: `weekly_health`, `monthly_streak`
- `period_start` DATE NOT NULL
- `period_end` DATE NOT NULL
- `score_value` DECIMAL(7,2) NOT NULL
- `rank_position` INTEGER NOT NULL
- `created_at` TIMESTAMP NOT NULL

Constraints:
- unique (`student_id`, `leaderboard_type`, `period_start`, `period_end`)

Indexes:
- index on `leaderboard_type`
- index on `period_start`
- index on `rank_position`

### 15. study_planner_studyplan
Purpose: personalized study plan generated for a student.

Fields:
- `id` UUID PK
- `student_id` UUID FK -> `students_studentprofile.id` NOT NULL
- `title` VARCHAR(150) NOT NULL
- `status` VARCHAR(20) NOT NULL DEFAULT `active`
  - allowed values: `active`, `completed`, `archived`
- `start_date` DATE NOT NULL
- `end_date` DATE NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

Indexes:
- index on `student_id`
- index on `status`

### 16. study_planner_studyplantask
Purpose: actionable plan items tied to concepts.

Fields:
- `id` UUID PK
- `plan_id` UUID FK -> `study_planner_studyplan.id` NOT NULL
- `concept_id` UUID FK -> `diagnostics_concept.id` NULL
- `title` VARCHAR(150) NOT NULL
- `description` TEXT NULL
- `scheduled_date` DATE NOT NULL
- `status` VARCHAR(20) NOT NULL DEFAULT `pending`
  - allowed values: `pending`, `done`, `skipped`
- `estimated_minutes` INTEGER NOT NULL DEFAULT 15
- `created_at` TIMESTAMP NOT NULL

Indexes:
- index on `plan_id`
- index on `scheduled_date`
- index on `status`

## Relationships Summary
- One `users_user` can be one student profile or one guardian profile.
- One guardian can link to many students.
- One student can have many guardians if business rules allow it.
- One subject contains many concepts and questions.
- One diagnostic attempt belongs to one student and one subject.
- One attempt has many answers.
- One student has many learning health snapshots.
- One student has one current streak row.
- One student can appear in many leaderboard periods.
- One student can have many study plans and plan tasks.

## Suggested Django Model Mapping
- `users`: custom `User`
- `students`: `StudentProfile`
- `guardians`: `GuardianProfile`, `GuardianStudentLink`
- `diagnostics`: `Subject`, `Concept`, `Question`, `QuestionOption`, `TestAttempt`, `AttemptAnswer`, `ConceptMastery`
- `learning_health`: `LearningHealthSnapshot`
- `streaks`: `StudentStreak`
- `leaderboards`: `LeaderboardEntry`
- `study_planner`: `StudyPlan`, `StudyPlanTask`

## Notes For MVP
- MVP can launch without `leaderboards_leaderboardentry` and `study_planner_*` physical tables if phases 3 and 4 are deferred.
- `learning_health_learninghealthsnapshot` should be recalculated after each evaluated diagnostic attempt.
- If guardians create student accounts directly, store an onboarding-generated password reset flow rather than exposing raw credentials.
