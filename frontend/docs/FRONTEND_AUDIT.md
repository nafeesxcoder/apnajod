# Milaan frontend refactor audit

Audit date: 2026-08-07  
Original source: `/Users/shivay/Downloads/Milaan-Latest-2026-08-07/` (read-only)  
Refactored source: this folder

## What was audited

- Every file supplied in the original folder was inventoried (203 files).
- The original 9,817-line `App.tsx` was treated as the UI/workflow source of truth.
- All declared routes, screen states, preview states, assets, theme tokens, domain models and local interactions were retained.
- Generated outputs (`node_modules`, `dist*`, caches) are intentionally not delivery source.
- The original folder did not include the backend files referenced by 33 stale tests (database migrations, cloud functions, CI workflows and a second `frontend/` tree). Those non-runnable backend tests were removed from this frontend-only handoff; they were not application UI.

## Resulting ownership

| Area | Location |
| --- | --- |
| Expo entry and composition | `App.tsx`, `src/app/` |
| Provider-neutral AWS contracts | `src/app/contracts/AwsApiContracts.ts` |
| Network-free preview adapters | `src/app/adapters/` |
| Launch and access | `src/features/launch/`, `src/features/access/` |
| Onboarding | `src/features/onboarding/` |
| Discovery and matches | `src/features/discovery/` |
| Relationship and couple mode | `src/features/relationship/` |
| Chat | `src/features/chat/` |
| Dates and marketplace | `src/features/dates/`, `src/features/marketplace/` |
| Trust and safety | `src/features/trust/` |
| Profile, pricing, support | `src/features/profile/`, `src/features/pricing/`, `src/features/support/` |
| Admin/executive preview | `src/features/admin/`, `src/features/executive/` |
| Shared presentation | `src/components/`, `src/theme/` |
| Pure frontend rules | `src/domain/` |

## Boundary proof

- No database client, database schema, migration, query or credential is included.
- No concrete authentication provider is included.
- No concrete payment/store-billing implementation is included.
- No push-delivery, realtime signaling or WebRTC implementation is included.
- Feature modules cannot import `services`, payment implementations or database clients; an automated architecture test enforces this.
- `package.json` and `app.json` are automatically checked for removed provider dependencies.
- Preview adapters do not make network requests, authenticate users, charge money, grant real entitlements or send notifications.
- Future remote behavior is represented by `MilaanAwsApi` DTOs and ports only.

## Verification record

`docs/VERIFICATION.md` contains the fresh evidence for strict TypeScript, the complete 57-file / 235-test Vitest suite, Expo web/iOS/Android exports, route inventory, architecture/provider boundaries, mobile/desktop browser checks, live public hosting, and archive integrity.

All frontend handoff gates are complete. The future AWS backend, MySQL implementation and production integrations intentionally remain employee-owned projects outside this repository.
