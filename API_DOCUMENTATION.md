# Apnajoda API Documentation

## Base URL
```
https://31.42.125.109:3000
```

## Authentication
All endpoints (except auth) require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /auth/signup
Register a new user.
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "age": 25,
  "gender": "M",
  "city": "Delhi"
}
```
**Response:** `{ ok: true, accessToken, userId }`

### POST /auth/login
Login user.
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
**Response:** `{ ok: true, accessToken }`

---

## Profile Endpoints

### GET /profile/me
Get current user's profile.
**Response:** `{ ok: true, profile: {...} }`

### PUT /profile/me
Update profile.
```json
{
  "firstName": "John",
  "age": 26,
  "about": "Love hiking and movies",
  "city": "Delhi"
}
```

### POST /profile/photo
Upload profile photo.
**Form Data:** `photo` (file)
**Response:** `{ ok: true, photoUrl }`

---

## Matching Endpoints

### GET /matches/search
Search profiles with filters.
**Query Params:**
- `minAge` (number)
- `maxAge` (number)
- `city` (string)
- `gender` (string)
- `verified` (boolean)
- `minKundliScore` (number)

**Response:** `{ ok: true, profiles: [...] }`

### GET /matches/recommendations
Get smart recommendations.
**Query Params:** `limit` (default: 10)
**Response:** `{ ok: true, profiles: [...] }`

### POST /matches/like
Like a user.
```json
{
  "userId": "target-user-id"
}
```

### POST /matches/unlike
Unlike a user.
```json
{
  "userId": "target-user-id"
}
```

---

## Chat Endpoints

### GET /chat/conversations
Get user's chat list.
**Response:** `{ ok: true, conversations: [...] }`

### POST /chat/send
Send a message.
```json
{
  "recipientId": "user-id",
  "message": "Hi there!",
  "type": "text"
}
```

### GET /chat/messages/:recipientId
Get chat history with user.
**Query Params:** `limit`, `offset`
**Response:** `{ ok: true, messages: [...] }`

---

## Subscription Endpoints

### GET /subscription/plans
Get available subscription plans.
**Response:** `{ ok: true, plans: [...] }`

### GET /subscription/my-subscription
Get user's current subscription.
**Response:** `{ ok: true, subscription: {...} }`

### POST /subscription/create
Create new subscription.
```json
{
  "planId": "plan-id",
  "paymentToken": "payment-token"
}
```

### GET /subscription/check-premium
Check if user has active premium.
**Response:** `{ ok: true, isPremium: boolean, expiresAt: date }`

---

## Referral Endpoints

### GET /referral/summary
Get referral stats.
**Response:** `{ ok: true, summary: { joined, boostsEarned, pending, monthlyCap } }`

### GET /referral/link
Get invite link.
**Response:** `{ ok: true, link, username }`

---

## Safety Endpoints

### POST /safety/block
Block a user.
```json
{
  "blockedId": "user-id"
}
```

### POST /safety/unblock
Unblock user.
```json
{
  "blockedId": "user-id"
}
```

### GET /safety/blocked
Get blocked users list.
**Response:** `{ ok: true, blockedUsers: [...] }`

### POST /safety/report
Report a user.
```json
{
  "reportedId": "user-id",
  "reason": "harassment|spam|fake|inappropriate",
  "description": "Details..."
}
```

---

## Notification Endpoints

### GET /push/settings
Get push notification settings.
**Response:** `{ ok: true, settings: {...} }`

### PUT /push/settings
Update notification settings.
```json
{
  "enabled": true,
  "likes": true,
  "matches": true,
  "messages": true,
  "chats": true
}
```

### POST /push/device
Register device for notifications.
```json
{
  "deviceToken": "device-token",
  "platform": "ios|android"
}
```

---

## Games Endpoints

### POST /games/start
Start a new game.
```json
{
  "partnerId": "user-id",
  "gameType": "this_or_that|would_you_rather|know_me|tic_tac_toe|never_have_i_ever|two_truths_lie|quick_fire"
}
```

### POST /games/:gameId/move
Make a move in game.
```json
{
  "move": "game-specific-data"
}
```

### GET /games/:gameId
Get game state.
**Response:** `{ ok: true, game: {...} }`

---

## Analytics Endpoints

### POST /analytics/event
Track app event.
```json
{
  "event": "profile_viewed",
  "screen": "discovery",
  "metadata": {}
}
```

### GET /analytics/metrics
Get user analytics.
**Response:** `{ ok: true, metrics: {...} }`

---

## Admin Endpoints

### GET /admin/dashboard/overview
Get dashboard overview.
**Response:** `{ ok: true, overview: {...} }`

### GET /admin/users
Get all users (paginated).
**Response:** `{ ok: true, users: [...], total }`

### POST /admin/users/:id/ban
Ban a user.

### POST /admin/users/:id/unban
Unban user.

### GET /admin/verifications
Get pending verifications.
**Response:** `{ ok: true, verifications: [...] }`

### POST /admin/verifications/:id/approve
Approve verification.

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Status Codes:**
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Server Error

---

## Rate Limiting

- **API Endpoints:** 1000 requests/minute
- **Auth Endpoints:** 5 attempts/15 minutes
- **User Actions:** Variable by action type

**Headers:** `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## WebSocket Events (Real-time)

### Chat
- `chat:message` - New message received
- `chat:typing` - User typing indicator
- `chat:read` - Message read

### Notifications
- `notification:like` - User liked you
- `notification:match` - New match
- `notification:message` - New message

---

## Examples

### Complete Login Flow
```bash
# 1. Login
curl -X POST https://31.42.125.109:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'

# 2. Get Profile
curl https://31.42.125.109:3000/profile/me \
  -H "Authorization: Bearer <token>"

# 3. Search Matches
curl "https://31.42.125.109:3000/matches/search?city=Delhi&minAge=20&maxAge=30" \
  -H "Authorization: Bearer <token>"
```

---

## Support

For issues or questions:
- Email: api@apnajoda.com
- Status: https://status.apnajoda.com
