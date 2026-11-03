# Milaan developer handover

## What this delivery is

This folder is the complete frontend-only refactor of the supplied Milaan Expo / React Native application. It targets iOS, Android and web from one TypeScript codebase. The original project was used as the UI and workflow source of truth; it was not edited.

Delivery date: 2026-08-08

Original read-only source: `/Users/shivay/Downloads/Milaan-Latest-2026-08-07/`

Public preview: `https://milaan-complete-frontend-20260807.shivay247.chatgpt.site/`

This delivery contains 36 top-level destinations, 32 deep preview states, all bundled application assets, deterministic local preview behavior, automated tests, and provider-neutral AWS API contracts. Generated dependencies and exports are intentionally excluded from the employee ZIP because they are reproducible.

## Start here

Requirements:

- Node.js 20 or newer
- pnpm 11.20.0 (declared in `package.json`)
- Xcode for a native iOS simulator/device
- Android Studio and an Android SDK for a native Android emulator/device

Run:

```bash
pnpm install --frozen-lockfile
pnpm check:all
pnpm web
```

Native development:

```bash
pnpm ios
pnpm android
```

Production-style exports:

```bash
pnpm build:web
pnpm build:ios
pnpm build:android
```

Generated output appears in `dist/`, `dist-ios/`, and `dist-android/`. These folders are not source and must not be committed or copied into another project.

## Read in this order

1. `README.md` — fast orientation and boundaries.
2. `docs/EMPLOYEE_START_HERE.md` — day-one workflow and change guide.
3. `docs/ARCHITECTURE.md` — dependency direction and module ownership.
4. `docs/SCREEN_INVENTORY.md` — every preserved route and deep preview state.
5. `docs/AWS_API_CONTRACT.md` — future backend endpoints and authority rules.
6. `docs/VERIFICATION.md` — exact evidence gathered before delivery.
7. `docs/FRONTEND_AUDIT.md` — source audit, exclusions and completion gates.

## Source map

| Location | Responsibility |
| --- | --- |
| `App.tsx` | Seven-line Expo entry only |
| `src/app/MilaanApp.tsx` | Composition, route orchestration and cross-screen state |
| `src/app/navigation/` | Route and deep-preview inventory |
| `src/app/contracts/` | Provider-neutral frontend ports and AWS DTO boundary |
| `src/app/adapters/` | Offline, deterministic preview implementations |
| `src/features/` | Feature-owned screens, components, contracts and local adapters |
| `src/components/` | Reusable presentation-only UI |
| `src/domain/` | Pure models, validation and calculations with tests |
| `src/data/` | Static catalogs and preview fixtures |
| `src/storage/` | Local preview persistence only |
| `src/theme/` | Shared design tokens and styles |
| `assets/` | Bundled images, icons and media |
| `scripts/` | Reproducible web-export and static-hosting helpers |
| `docs/` | Architecture, API, audit, inventory and verification |
| `pnpm-workspace.yaml` | Explicit approval for the trusted `esbuild` install script |

## Frontend/backend boundary

This frontend deliberately has no concrete Supabase, MySQL, authentication-provider, Stripe, store-billing, push-delivery, realtime-signaling or WebRTC implementation. It also has no AWS SDK, cloud credentials, database schema, migration or query.

The generated `dist/server/index.js` is only a static asset router for public preview hosting. It contains no application API or business logic; the application itself remains a frontend-only bundle in `dist/client/`.

The employee's AWS/backend project should:

1. agree on the HTTPS contract in `docs/AWS_API_CONTRACT.md`;
2. implement authentication, authorization, MySQL, payments, moderation and messaging server-side;
3. generate or hand-write a narrow HTTPS client that implements `src/app/contracts/AwsApiContracts.ts`;
4. inject that adapter only at the app composition boundary;
5. keep credentials, private keys, receipt verification and server decisions outside Expo;
6. add staging contract tests before replacing any preview adapter.

Screens must never import a cloud SDK, database client or generic backend service directly. Architecture tests enforce the key parts of this rule.

## Preview safety

The supplied preview is intentionally deterministic and network-free. Preview actions may demonstrate a successful UI path, but they do not authenticate a real user, send a real message, charge money, create a reservation, issue an entitlement, perform identity verification or contact emergency services.

Web visual-QA routes use:

```text
?preview=<screen>&previewAccess=1
?preview=<screen>&previewState=<state>&previewAccess=1
```

Only values enumerated in `src/app/navigation/types.ts` are accepted.

## Employee change checklist

Before handing over any change:

1. Put the screen or component in its owning feature folder.
2. Keep remote operations behind a typed port.
3. Preserve loading, empty, error and honest preview states.
4. Update the route inventory test when adding a destination.
5. Update the AWS document before changing a remote contract.
6. Run `pnpm check:all`.
7. Visually check compact mobile and desktop web widths.
8. Do not include `node_modules`, `dist*`, `.expo`, caches or secrets in an archive.

## Single-source rule

Use this folder (or the final employee handoff ZIP made from it) as the only source. Do not merge it with older Milaan ZIPs, the original 9,817-line `App.tsx`, previous `node_modules`, old generated exports or prior preview projects.
