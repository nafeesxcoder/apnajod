# Milaan frontend

Milaan is an Expo / React Native application targeting iOS, Android, and web. This repository is the frontend-only refactor of the complete original application—not a reduced redesign or a backend project.

Public web preview: [Milaan complete frontend](https://milaan-complete-frontend-20260807.shivay247.chatgpt.site/)

## Quick start

Requirements: Node.js 20+ and pnpm 11.20.0 (the pinned package manager version).

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm web
```

Native development:

```bash
pnpm ios
pnpm android
```

## Project boundaries

The frontend owns:

- screen rendering and navigation state;
- accessible reusable UI components;
- client-side form validation;
- local preview fixtures and deterministic preview behavior;
- frontend domain models;
- typed ports describing operations expected from the future AWS backend.

The frontend does **not** own:

- MySQL schemas, migrations, queries, or credentials;
- authentication-provider implementation;
- payment authorization, receipt verification, or webhooks;
- server-side matching or moderation decisions;
- private media storage or signed URL creation;
- notification delivery;
- server secrets or AWS infrastructure.

Those capabilities must be implemented in the employee-owned backend and exposed through the contracts documented in `docs/AWS_API_CONTRACT.md`.

## Source map

```text
App.tsx                         minimal Expo entry
src/app/                        application composition and navigation
src/app/contracts/              provider-neutral frontend ports
src/features/<feature>/         screens and feature-owned components
src/components/                 reusable, presentation-only components
src/domain/                     pure frontend business rules and models
src/data/                       preview fixtures and static catalogs
src/storage/                    local preview persistence
src/theme/                      tokens and component styles
docs/                           architecture, audit, API, and handoff guides
assets/                         bundled frontend media
```

## Rules for contributors

1. A screen belongs to one feature folder.
2. UI modules never import a database, Supabase, Stripe, AWS SDK, or server secret.
3. Remote behavior is invoked through a typed port supplied by app composition.
4. Preview adapters must be deterministic and must never make a real charge or impersonate production security.
5. Domain modules remain platform-independent and side-effect free where practical.
6. Shared components must not contain feature-specific network or persistence logic.
7. Run `pnpm typecheck`, `pnpm test`, and `pnpm build:web` before handoff.

## Handover status

The complete frontend refactor passes strict TypeScript, all 213 automated tests, and fresh Expo exports for web, iOS and Android. The exact screen list is in `docs/SCREEN_INVENTORY.md`; current verification evidence and the public-preview gate are in `docs/VERIFICATION.md`.
