# Frontend architecture

## Dependency direction

```text
Expo entry
  -> app composition
     -> feature screens
        -> feature components
        -> shared UI
        -> pure domain models
        -> typed application ports
           <- local preview adapters
           <- future AWS adapters (separate integration project)
```

Dependencies point inward toward types and pure logic. Domain code cannot import React Native. Components cannot import concrete cloud or database clients. App composition is the only layer allowed to select an adapter.

## Feature ownership

| Feature | Owns |
| --- | --- |
| `launch` | Splash and welcome experience |
| `access` | Sign-in, OTP, and identity-check presentation |
| `onboarding` | Experience mode, profile setup, media, vibes, intent, alignment, couple connection presentation |
| `discovery` | Daily introductions, filters, likes, profile detail, mutual match, icebreaker |
| `relationship` | Chat, relationship journey, coaching, blueprint, couple tools |
| `marketplace` | Events, places, dates and reservation presentation |
| `trust` | Verification, reporting, blocking, safety, moderation preview, privacy controls |
| `account` | Profile, settings, pricing presentation, support, executive experience |

## State ownership

- Ephemeral component state stays inside its screen or component.
- Cross-screen session state belongs to app composition until a dedicated store is introduced.
- Preview persistence uses local storage only and is explicitly labeled as preview behavior.
- Server-authoritative state is returned through ports; the UI must not optimistically claim security, payment, membership, or moderation success without an acknowledged result.

## Ports and adapters

`src/app/contracts/AppPorts.ts` defines the frontend-facing interfaces. Screens receive callbacks or narrow feature ports rather than importing implementations.

The included preview adapter must:

- work offline;
- return deterministic fixtures;
- avoid real authentication, charges, messages, notifications, or uploads;
- clearly identify demo-only outcomes in UI copy.

The future AWS adapter should live in a separate integration package or deployment repository. It may translate port calls into HTTPS requests, but must not expose AWS credentials or database details to Expo.

## Error handling

Port operations return a discriminated `AsyncResult`. User-facing screens translate safe error codes into useful copy. Raw provider errors, SQL details, tokens, and internal identifiers must never be rendered or logged in production.

## Platform behavior

- Shared UI uses React Native primitives.
- Platform-specific files use `.native.tsx`, `.ios.tsx`, `.android.tsx`, or `.web.tsx` only when necessary.
- Layouts must be checked at compact mobile, standard phone, tablet, and desktop-web widths.
- Native permissions are requested only immediately before the related user action.

## Preview hosting boundary

`pnpm build:web` emits the Expo application into `dist/client/` and a tiny static asset router into `dist/server/`. The router exists only because the selected public host expects a Worker-compatible entry point. It has no authentication, API, database, payment, messaging or business logic and is not the future AWS backend.

## Definition of done for a migrated screen

1. The screen is exported from a named feature module.
2. It does not import concrete backend/provider code.
3. Its route remains represented by the central `Screen` type.
4. Original copy, hierarchy, actions, and responsive behavior are preserved.
5. Loading, empty, error, and preview states remain honest.
6. Typecheck, relevant tests, and production export pass.
