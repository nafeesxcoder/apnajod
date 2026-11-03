# Milaan

Serious, verified dating for India. Expo / React Native app (iOS, Android, web)
with a Node.js + MySQL backend.

```
frontend/   Expo app — pnpm
backend/    Express API + MySQL — npm
scripts/    deploy and ops helpers
```

## Quick start

```bash
cd backend  && npm install && npm run migrate && npm run dev     # API on :4000
cd frontend && pnpm install && pnpm web                          # app on :8081
```

The backend needs a `.env`; see `backend/README.md`.

## What changed in this revision

**Sign-up went from eleven screens to four.** It now asks for a mobile number,
a username and a password, confirms one SMS code, and takes a first name, age
and gender. Selfie and ID verification moved into the Trust hub, and the long
profile, vibe, intent and alignment screens became optional profile work.

- **Username + password sign-in.** Members log in with either their username or
  their mobile number. Passwords need six characters and nothing else — the old
  rule wanted ten with mixed case and a digit, which locked people out.
- **Forgot password** sends an OTP to the registered mobile, then *always* shows
  the choose-a-new-password screen before the app opens. A reset signs out every
  other session.
- **India only.** Numbers are validated as 10-digit Indian mobiles, prices are in
  rupees, distances in kilometres, and the venue, city and event data is Indian.
- **Gift ordering and delivery is gone**, front to back, including the Stripe
  integration and courier tracking that supported it.
- **New identity.** Mukta (Ek Type) replaces Poppins and carries the Devanagari
  in the bilingual sign-up labels; the maroon-and-gold night palette is now
  indigo and brass on a limewash canvas.

## Checks

```bash
cd frontend && pnpm typecheck && pnpm test && pnpm build:web
cd backend  && npm test
```

Both suites pass clean: 213 frontend tests, 24 backend auth tests, and zero
TypeScript errors.
