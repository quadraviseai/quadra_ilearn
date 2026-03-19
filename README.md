# QuadraILearn Backend

Initial Django backend scaffold for QuadraILearn using:
- Django
- Django REST Framework
- Simple JWT
- PostgreSQL

## Implemented so far
- modular Django project structure under `apps/`
- custom email-based user model with student and guardian roles
- student and guardian profile models
- guardian-student linking model
- diagnostics, learning health, streak, leaderboard, and study planner base models
- auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- guardian endpoints:
  - `POST /api/guardian/invite`
  - `POST /api/guardian/create-student`
- early feature endpoints:
  - `POST /api/diagnostic/start`
  - `GET /api/learning-health`

## Local setup
1. Create or update `.env` with your PostgreSQL credentials.
   - For forgot-password email, also set `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL`.
2. Activate the virtual environment:
   - PowerShell: `.\\.venv\\Scripts\\Activate.ps1`
3. Run migrations:
   - `python manage.py migrate`
4. Seed demo diagnostic data for local testing:
   - `python manage.py seed_demo_data`
5. Start the server:
   - `python manage.py runserver`

## Server deploy
- The server deploy script is `scripts/deploy_server.sh`.
- It is intended to run on the Linux host from `/var/www/quadrailearn/app`.
- Default behavior:
  - fetch `origin/main`
  - hard reset the app repo to the remote branch
  - clean untracked files while preserving `.env`, `.venv`, and `staticfiles`
  - run `pip install -r requirements.txt`
  - run Django migrations and `collectstatic`
  - rebuild `frontend/`
  - sync `frontend/dist/` into `/var/www/quadrailearn/site`
  - restart `quadrailearn.service`
- Usage:
  - `bash scripts/deploy_server.sh`
  - or `bash scripts/deploy_server.sh main`

## Current limitation
- The local `.env` defaults point to database `quadrailearn`, but the password is intentionally blank until you set the actual local PostgreSQL credentials.
- `DB_CONNECT_TIMEOUT=5` keeps failed local connections from hanging for a long time.
