# Screen and preview inventory

The central source of truth is `src/app/navigation/types.ts`. Its automated test requires the exact 36-route inventory below, preventing a screen from disappearing silently during future refactors.

Sign-up is `welcome -> signup -> otp -> quickProfile`. Everything marked
optional below used to sit inside that path and now lives behind the profile
screen. Selfie and ID verification moved to `verifyHub`.

## Top-level destinations

| Route | Experience | Owning module |
| --- | --- | --- |
| `splash` | Branded launch | `features/launch` |
| `welcome` | Create an account or log in | `features/access` |
| `signup` | Mobile number, username and password | `features/access` |
| `otp` | One SMS code, for sign-up and for password reset | `features/access` |
| `login` | Username or mobile, plus password | `features/access` |
| `forgotPassword` | Ask for a reset code | `features/access` |
| `newPassword` | Choose a new password, always before the app opens | `features/access` |
| `quickProfile` | First name, age, gender and an optional photo | `features/access` |
| `modeSelect` | Seeking or Couple Mode selection (optional) | `features/onboarding` |
| `coupleSetup` | Partner connection setup | `features/onboarding` |
| `profileSetup` | Full profile, photos and voice introduction (optional) | `features/onboarding` |
| `vibes` | Values and vibe preferences (optional) | `features/onboarding` |
| `intent` | Relationship intent (optional) | `features/onboarding` |
| `alignment` | Long-term alignment questions (optional) | `features/onboarding` |
| `home` | Daily introductions or Couple Mode home | `features/discovery`, `features/relationship` |
| `explore` | Feature and experience hub | `features/discovery` |
| `circle` | Trusted circle | `features/trust` |
| `discovery` | Discovery filters and pool | `features/discovery` |
| `detail` | Full match profile and intent passport | `features/discovery` |
| `mutual` | Mutual-match celebration | `features/discovery` |
| `icebreaker` | Guided opening prompt | `features/discovery` |
| `chat` | Conversation, media, dates and relationship tools | `features/chat` |
| `datePlan` | Date-place and package planning | `features/dates` |
| `safety` | Safety center, privacy and account controls | `features/trust` |
| `likes` | Likes and acknowledged matches | `features/discovery` |
| `profile` | Member profile, settings and intent passport | `features/profile` |
| `pricing` | Membership and consumable presentation | `features/pricing` |
| `support` | Support and moderation appeal presentation | `features/support` |
| `coach` | Relationship coaching | `features/relationship` |
| `events` | Curated events marketplace | `features/marketplace` |
| `executive` | Executive-circle experience | `features/executive` |
| `verifyHub` | Verification and trust hub | `features/trust` |
| `readiness` | Relationship readiness | `features/relationship` |
| `community` | City community rooms | `features/community` |
| `blueprint` | Relationship blueprint | `features/relationship` |
| `journey` | Two-person relationship journey | `features/relationship` |
| `dateSafety` | Date-safety concierge | `features/trust` |
| `admin` | Local moderation/operations preview | `features/admin` |

## Deep preview states

These 32 states make otherwise nested sheets, dialogs and lifecycle states directly inspectable by product and QA:

| Area | States |
| --- | --- |
| Profile | `profile-settings`, `profile-referral` |
| Match detail | `match-safety` |
| Chat discovery/tools | `chat-search`, `chat-coach`, `chat-attachments`, `chat-document`, `chat-media`, `chat-voice`, `chat-recording`, `chat-emoji`, `chat-gif`, `chat-games`, `chat-snap`, `chat-face-emoji` |
| Chat calling/settings/safety | `chat-audio-call`, `chat-video-call`, `chat-settings`, `chat-options`, `chat-safety`, `chat-relationship-path` |
| Date lifecycle in chat | `chat-date-accepted`, `chat-date-cancelled`, `chat-date-no-show`, `chat-date-unresponsive` |
| Safety center | `safety-plan`, `safety-emergency`, `safety-privacy`, `safety-data`, `safety-delete` |

## Expected route behavior

- The first 11 routes are onboarding destinations and do not show the signed-in bottom navigation.
- `home` changes presentation according to the chosen seeking/couple experience.
- Nested tools preserve a safe back path to their owning destination.
- Preview query parameters are visual-QA helpers, not authentication or authorization.
- A new route is incomplete until its type, route composition, inventory test, documentation and mobile/desktop visual check all exist.
