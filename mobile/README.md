# QuadraILearn Mobile

Expo-based mobile app for student users against the live backend.

## Setup

1. `cd mobile`
2. `npm install`
3. Create `.env` from `.env.example`
4. `npm run start`

## Current scope

- Email/password auth against the live backend
- Email verification and password reset by email
- Native Google auth
- Student app:
  - dashboard
  - exams
  - report
  - learn
  - leaderboard
  - profile
  - payment section
- Admin app:
  - dashboard
  - users
  - token rules

## Release setup

1. `eas login`
2. `eas build:configure`
3. Use the profiles in `eas.json`
4. Set production values in `.env`

## Remaining production work

- custom final icon/splash artwork
- push notifications
- crash reporting and analytics
- staged release env separation
