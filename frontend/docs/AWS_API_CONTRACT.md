# Future AWS REST API contract

This document describes the HTTPS boundary expected by the Milaan frontend. It does not prescribe the employee's internal AWS implementation or MySQL schema.

## Transport conventions

- Base URL is supplied through a public environment variable such as `EXPO_PUBLIC_API_BASE_URL`.
- All production traffic uses HTTPS.
- JSON uses UTF-8 and `camelCase` fields.
- Authenticated requests use `Authorization: Bearer <access-token>`.
- Mutating requests include `Idempotency-Key` and `X-Request-Id` headers.
- Server timestamps use ISO 8601 UTC.
- Cursor pagination uses `cursor` and `nextCursor`.
- The backend returns safe public error codes; it never returns SQL/provider traces.

Standard error response:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Check the highlighted information.",
    "retryable": false,
    "requestId": "req_01...",
    "fieldErrors": { "city": "Choose a supported city." }
  }
}
```

## Access and session

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/auth/challenges` | Request phone/email verification challenge |
| `POST` | `/v1/auth/challenges/{challengeId}/verify` | Verify code and establish session |
| `POST` | `/v1/auth/refresh` | Rotate access session |
| `POST` | `/v1/auth/logout` | Revoke current session |
| `GET` | `/v1/me/bootstrap` | Load member, onboarding, entitlements, privacy, and feature flags |

The frontend never validates OTP security locally in production. Social provider tokens are exchanged with the backend and are not treated as membership proof by the client.

## Member and onboarding

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/v1/me/profile` | Save profile fields |
| `POST` | `/v1/me/photos/uploads` | Request a short-lived media upload target |
| `POST` | `/v1/me/photos` | Confirm uploaded photo metadata |
| `DELETE` | `/v1/me/photos/{photoId}` | Remove profile photo |
| `POST` | `/v1/me/voice-intro/uploads` | Request voice upload target |
| `PUT` | `/v1/me/preferences` | Save vibes, intent, filters, and alignment |
| `PUT` | `/v1/me/privacy` | Save privacy and consent choices |
| `POST` | `/v1/me/deletion-requests` | Request account deletion |
| `GET` | `/v1/me/export` | Request or retrieve privacy-safe export status |

Upload targets must be short-lived and scoped to one member and media type. The frontend never receives storage credentials.

## Discovery and matching

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/discovery/daily-introductions` | Load server-curated introductions |
| `GET` | `/v1/discovery/pool-status` | Load availability and preference guidance |
| `POST` | `/v1/matches/{memberId}/decisions` | Record interest, pass, or thoughtful note |
| `POST` | `/v1/matches/{matchId}/feedback` | Record optional matching feedback |
| `POST` | `/v1/members/{memberId}/profile-views` | Record permitted profile view |
| `GET` | `/v1/likes` | Load acknowledged likes and matches |

Only the server can declare a mutual match or change entitlements/balances.

## Chat and relationships

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/conversations` | List authorized conversations |
| `GET` | `/v1/conversations/{id}/messages` | Page conversation messages |
| `POST` | `/v1/conversations/{id}/messages` | Send message |
| `PATCH` | `/v1/conversations/{id}/messages/{messageId}` | Edit permitted message |
| `DELETE` | `/v1/conversations/{id}/messages/{messageId}` | Delete permitted message |
| `PUT` | `/v1/conversations/{id}/settings` | Mute/privacy settings |
| `POST` | `/v1/conversations/{id}/date-proposals` | Create date proposal |
| `POST` | `/v1/conversations/{id}/relationship-events` | Record consented journey event |

Realtime delivery should expose an authenticated WebSocket endpoint or managed gateway. The frontend contract must remain provider-neutral.

## Couple mode

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/v1/me/experience-mode` | Select seeking/couple experience |
| `GET` | `/v1/couple/connection` | Load connection hub |
| `POST` | `/v1/couple/search` | Rate-limited exact-phone lookup |
| `POST` | `/v1/couple/requests` | Send partner request |
| `POST` | `/v1/couple/requests/{requestId}/response` | Accept or decline |
| `DELETE` | `/v1/couple/connection` | Disconnect with policy checks |

Phone values are never returned in partner search results.

## Safety and support

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/reports` | Submit member/content report |
| `POST` | `/v1/blocks` | Block member |
| `DELETE` | `/v1/matches/{matchId}` | Unmatch |
| `POST` | `/v1/date-safety/check-ins` | Record date check-in |
| `POST` | `/v1/support/tickets` | Create support request |
| `POST` | `/v1/moderation/appeals` | Submit eligible appeal |

The backend owns authorization, audit trails, rate limits, retention, and moderation queues.

## Marketplace and payments

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/marketplace/places` | Search approved inventory |
| `POST` | `/v1/marketplace/quotes` | Create server-priced quote |
| `POST` | `/v1/marketplace/orders` | Create order after consent |
| `POST` | `/v1/marketplace/orders/{id}/cancel` | Request cancellation |
| `POST` | `/v1/marketplace/orders/{id}/refunds` | Request refund review |
| `POST` | `/v1/billing/receipts` | Submit store receipt for server verification |
| `GET` | `/v1/me/entitlements` | Load server-verified membership and balances |

Prices, tax, availability, payment status, refunds, membership, and consumable balances are server authoritative. The Expo app must never contain private payment keys or grant an entitlement from client state alone.

## Notifications

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/v1/me/devices/{deviceId}/push-token` | Register rotated device token |
| `DELETE` | `/v1/me/devices/{deviceId}/push-token` | Revoke token |
| `GET` | `/v1/notifications` | Page member notifications |
| `POST` | `/v1/notifications/{id}/read` | Mark notification read |

## Employee implementation checklist

1. Confirm endpoint naming and versioning before building the adapter.
2. Generate shared request/response types from an OpenAPI document.
3. Map generated types into the narrow ports in `src/app/contracts/AppPorts.ts`.
4. Keep token storage behind a platform-secure session adapter.
5. Add request cancellation, timeout, retry, and offline handling.
6. Add contract tests against a staging environment.
7. Never import MySQL, AWS admin SDKs, provider secrets, or backend repositories into this frontend.
