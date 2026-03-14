# UI Behavior

## Product Surfaces
- Student app
- Guardian app
- Shared authentication screens
- Admin is out of MVP scope unless needed for internal content entry

## Global UX Rules
- Mobile-first responsive layout
- Clear progress states for any multi-step flow
- Primary CTA should be visible without scrolling on key screens
- Show loading, empty, success, and error states for every API-backed view
- Use plain, performance-focused UI over heavy animation for assessment screens
- Protect student privacy by limiting guardian views to approved linked accounts

## Navigation Structure

### Student Navigation
- Dashboard
- Diagnostic
- Learning Health
- Streaks
- Leaderboard
- Study Planner
- Profile

### Guardian Navigation
- Dashboard
- Linked Students
- Invite / Create Student
- Student Detail
- Profile

## Shared Authentication Flows

### 1. Register
Entry points:
- student sign up
- guardian sign up

Behavior:
- collect `name`, `email`, `password`, `role`
- validate email format and password minimum rules before submit
- submit to `POST /api/auth/register`
- on success:
  - if role is student, route to student onboarding
  - if role is guardian, route to guardian dashboard
- on conflict:
  - show inline error for existing email

States:
- default
- field validation error
- submitting
- success redirect
- API failure

### 2. Login
Behavior:
- collect `email` and `password`
- submit to `POST /api/auth/login`
- store JWT securely on client
- route user by role after successful login
- if login fails, show generic invalid credentials message

States:
- default
- invalid credentials
- submitting
- locked / inactive account if backend returns such status

## Student Experience

### 3. Student Onboarding
Purpose:
- complete student profile after registration

Fields:
- full name
- grade level
- board
- school name
- target exam

Behavior:
- show as a short guided form
- save profile before exposing core dashboard
- if partially completed, user returns to the last unfinished step

### 4. Student Dashboard
Purpose:
- show the current learning status at a glance

Widgets:
- learning health score card
- current streak card
- weak concepts list
- quick action to start diagnostic
- recent activity
- leaderboard preview

Behavior:
- if no diagnostic data exists, show empty state with CTA `Start your first diagnostic`
- if health data exists, show trend indicator versus last snapshot
- dashboard should prioritize weak areas and consistency over generic announcements

States:
- first-time empty dashboard
- populated dashboard
- partial failure where one widget fails but the page still renders

### 5. Start Diagnostic
Entry points:
- dashboard CTA
- subject-specific CTA

Behavior:
- student selects subject
- UI requests start session with `POST /api/diagnostic/start`
- after session creation, route to test interface
- show estimated question count and expected duration before entering the test

Empty/Error States:
- no subjects available
- failed to start test
- session expired

### 6. Diagnostic Test Interface
Layout:
- question area
- answer options
- question navigator or progress counter
- timer
- submit button

Behavior:
- one question visible at a time for mobile clarity
- autosave answer after selection if supported by API; otherwise save on next action
- show progress as `Question X of Y`
- confirm before final submit
- prevent accidental page exit with warning if test is in progress

Rules:
- disable submit until current question has a valid answer when required
- after submission, lock further edits
- if connectivity drops, preserve local progress and retry silently when possible

States:
- loading question
- active attempt
- autosave pending
- submission confirmation
- submitted success
- submission error with retry

### 7. Diagnostic Result View
Purpose:
- explain performance rather than only show marks

Content:
- overall score
- concept-wise strengths
- concept-wise weaknesses
- recommended next steps
- updated learning health summary

Behavior:
- highlight bottom concepts first
- allow student to jump from weak concepts into a study plan or next practice flow in later phases

### 8. Learning Health Screen
Purpose:
- detailed breakdown of the learning health score

Content:
- total score
- consistency component
- accuracy component
- coverage component
- historical chart
- explanatory text for score meaning

Behavior:
- fetch with `GET /api/learning-health`
- allow filtering by date range if backend supports it later
- if only one snapshot exists, show single-score state instead of empty graph

States:
- no data yet
- chart loaded
- API failure

### 9. Streaks Screen
Purpose:
- reinforce consistency

Content:
- current streak
- best streak
- activity calendar or daily completion list
- rule text explaining what counts as learning activity

Behavior:
- streak updates after qualifying completed activity
- if streak breaks, show informative message and restart CTA without punitive tone

### 10. Leaderboard Screen
Purpose:
- motivate through comparative progress

Content:
- weekly or monthly leaderboard tabs
- current user rank
- top performers list

Behavior:
- default to weekly leaderboard
- visually distinguish current user row
- if ranking data is unavailable, show placeholder state instead of blank list

### 11. Study Planner Screen
Purpose:
- convert diagnostic weakness into action

Content:
- active plan card
- daily tasks
- completion status
- estimated study time

Behavior:
- show upcoming tasks in chronological order
- allow marking task complete
- if no plan exists, show a CTA to generate plan in future phases

## Guardian Experience

### 12. Guardian Dashboard
Purpose:
- quick visibility into linked students

Content:
- linked students list
- each student’s latest learning health score
- streak summary
- recent diagnostic summary

Behavior:
- if no students are linked, show invite/create CTAs prominently
- if multiple students exist, each card routes to a dedicated student detail view

### 13. Invite Student
Behavior:
- guardian enters student email
- submit to `POST /api/guardian/invite`
- success state shows invite sent confirmation
- if student already linked, show specific message
- if email does not belong to an account, backend may still create a pending invite depending on business rule

States:
- default
- validation error
- sending
- invite sent
- invite failed

### 14. Create Student From Guardian Account
Behavior:
- guardian fills student profile basics
- submit to `POST /api/guardian/create-student`
- success creates linked student record and routes to student detail preview

Fields:
- student name
- student email
- grade level
- board
- target exam

Rules:
- guardian should see onboarding status if student has not yet logged in
- system should avoid exposing generated credentials directly in UI if reset-link flow exists

### 15. Guardian Student Detail
Purpose:
- detailed view of one linked student

Content:
- latest learning health score
- trend summary
- streak summary
- recent diagnostics
- weak concepts list

Behavior:
- read-only for academic metrics in MVP
- guardians cannot alter scores or answer records
- if link becomes inactive, block access and show link status message

## Reusable UI States

### Loading State
- use skeletons for dashboard cards
- use spinners only for compact inline actions

### Empty State
- always include an explanatory line and one next action
- examples:
  - no diagnostics yet
  - no linked students
  - no leaderboard data

### Error State
- show user-friendly message
- include retry action when request can be retried safely
- avoid exposing raw server errors

### Success Feedback
- use inline banners or toast notifications for completed actions like invite sent, profile saved, or test submitted

## Access Control Behavior
- unauthenticated users are redirected to login for protected routes
- students cannot access guardian routes
- guardians cannot access student self-test screens unless explicitly allowed later
- route guards should depend on both authentication and role

## MVP Screen Priority

### Phase 1
- register
- login
- student onboarding
- guardian dashboard
- invite student
- create student

### Phase 2
- student dashboard
- start diagnostic
- diagnostic interface
- diagnostic results
- learning health screen

### Phase 3
- streaks screen
- leaderboard screen

### Phase 4
- study planner screen
- advanced analytics screens

## Notes For Frontend Implementation
- Keep API integration isolated by feature module.
- Use optimistic UI only for low-risk actions like task completion, not for diagnostic submission.
- Assessment flows should favor reliability and recovery over visual complexity.
- Guardian and student dashboards should reuse card components but not share role-specific wording.
