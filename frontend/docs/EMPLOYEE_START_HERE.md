# Employee start here

This is the complete Milaan Expo frontend for iOS, Android and web. It is intentionally safe to run without AWS credentials.

Verified public preview: `https://milaan-complete-frontend-20260807.shivay247.chatgpt.site/`

## First 10 minutes

1. Install Node.js 20+ and pnpm.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm check:all`.
4. Run `pnpm web`, `pnpm ios`, or `pnpm android`.
5. Read `docs/ARCHITECTURE.md`, then `docs/AWS_API_CONTRACT.md`.

## Where to make changes

- Change one screen inside its `src/features/<feature>/` folder.
- Put reusable visual components in `src/components/`.
- Put platform-independent calculations in `src/domain/`.
- Add or change remote requirements in `src/app/contracts/AwsApiContracts.ts`.
- Implement the real AWS adapter in a separate integration/backend repository, then inject only its public client adapter at app composition.

## Non-negotiable boundaries

- Do not add database queries, migrations, private keys or AWS admin credentials here.
- Do not make screens import cloud SDKs or general service modules.
- Do not let preview actions claim a real payment, verification, message delivery or entitlement.
- Do not edit the original Downloads folder or combine this delivery with older ZIP files.

## Common task examples

- UI copy/layout: edit the owning feature screen and its style tokens.
- New AWS endpoint: update the typed contract and API document first; backend team implements it separately.
- New preview behavior: add a deterministic adapter in `src/app/adapters/` and test that it performs no network call.
- Navigation: update `src/app/navigation/types.ts`, composition routing and the route inventory test together.

## Definition of done

`pnpm check:all` must pass, architecture tests must remain green, documentation must match behavior, and no generated build output should be added to the handoff ZIP.
