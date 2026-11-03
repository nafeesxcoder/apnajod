# Milaan Backend (Express + MySQL)

Username + password sign-in with mobile-OTP sign-up and password recovery, plus the
older OTP and Google / Apple / LinkedIn paths — all issuing your own JWT access +
refresh tokens, backed by MySQL.

India only: every phone number is validated and stored as `+91` followed by a
10-digit mobile starting 6, 7, 8 or 9.

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Fill in:
- `DB_*` — your MySQL connection
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any long random strings
- `TWILIO_*` — for phone OTP (leave blank in dev; codes print to the server console instead)
- `RESEND_*` — for email OTP (leave blank in dev; codes print to the server console instead)
- `GOOGLE_*`, `APPLE_*`, `LINKEDIN_*` — only the ones you want to enable

## 3. Create the database + tables

```bash
npm run db:create   # creates the DB named in .env, no mysql CLI needed
npm run migrate
```

`npm run db:create` uses the mysql2 driver the backend already depends on,
because the `mysql` client is often not on PATH on Windows even when the
server is running. It tells you which of the two things is wrong when it
cannot connect: the credentials, or nothing listening on the port.

`npm run db:check` replays the migration files and verifies each statement
only touches tables and columns that exist by that point. It runs as part of
`npm test`.

## 4. Run

```bash
npm run dev
```

Server runs at `http://localhost:4000`.

## Endpoints

| Method | Path                     | Purpose                              |
|--------|--------------------------|---------------------------------------|
| GET    | `/auth/username/available` | `?username=` → `{ available, reason }` |
| POST   | `/auth/register`         | `{ phone, username, password }` → sends the sign-up code |
| POST   | `/auth/register/verify`  | `{ phone, username, password, code }` → creates the account, returns user + tokens |
| POST   | `/auth/login`            | `{ identifier, password }` — identifier is a username *or* a mobile number |
| POST   | `/auth/password/forgot`  | `{ identifier }` → sends a reset code to the registered mobile |
| POST   | `/auth/password/reset`   | `{ identifier, code, password }` → sets the new password, returns tokens |
| POST   | `/auth/password/change`  | `{ currentPassword, password }`, requires `Authorization` |
| POST   | `/auth/otp/request`      | `{ channel: "phone"|"email", identifier }` → sends code |
| POST   | `/auth/otp/verify`       | `{ channel, identifier, code }` → returns user + tokens |
| POST   | `/auth/refresh`          | `{ refreshToken }` → new token pair   |
| POST   | `/auth/logout`           | Requires `Authorization: Bearer <accessToken>` |
| GET    | `/auth/me`               | Requires `Authorization: Bearer <accessToken>` |
| GET    | `/auth/google`           | Redirects to Google consent screen    |
| GET    | `/auth/google/callback`  | Google redirects here automatically   |
| GET    | `/auth/apple`            | Redirects to Apple sign-in            |
| POST   | `/auth/apple/callback`   | Apple redirects here automatically    |
| GET    | `/auth/linkedin`         | Redirects to LinkedIn consent screen  |
| GET    | `/auth/linkedin/callback`| LinkedIn redirects here automatically |

After a successful OAuth login, the server redirects to:
`${APP_URL}/auth/callback#accessToken=...&refreshToken=...`
Your Expo app should catch this deep link and pull the tokens out of the URL fragment.

## Dev mode without Twilio/Resend keys

If `TWILIO_ACCOUNT_SID` or `RESEND_API_KEY` are left blank and `NODE_ENV` is not
`production`, the OTP code is printed to the server console instead of being sent —
useful for testing the flow before wiring up real providers.

## Sign-up and recovery

Sign-up is two calls: `/auth/register` claims the mobile number and username and
sends one SMS code, then `/auth/register/verify` spends that code and creates the
account in a single step. Nothing is written until the code checks out.

Recovery is also two calls. `/auth/password/forgot` always answers the same way
whether or not the account exists, so the endpoint cannot be used to discover
which numbers are registered; when it does find one it includes a masked phone
number so the member can confirm they are resetting the right account.
`/auth/password/reset` takes the code *and* the new password together, which is
what lets the app show the choose-a-new-password screen before anyone gets in.
A reset revokes every existing refresh token.

OTP codes are scoped by purpose (`register`, `password_reset`, `login`), so a
sign-up code cannot be replayed as a password reset.

Wrong passwords are counted per account: eight failures lock sign-in for 15
minutes. The per-IP rate limiters sit on top of that and are skipped when
`NODE_ENV=test`.

## Tests

```bash
npm test
```

`test/auth.test.js` runs the real controllers over HTTP against an in-memory
stand-in for MySQL, covering sign-up, sign-in, lockout, recovery, code replay
and account restore.
