/**
 * Every top-level UI destination in the app.
 *
 * Apnajoda is a dating app: you make an account, you are shown people, you say
 * yes or no, and a conversation opens when you both said yes. The follow
 * graph sits alongside it so you can also find someone by name.
 *
 * The launch build is deliberately small. Date planning, events, the couple
 * experience, the relationship coach, blueprint, readiness and journey
 * screens, the executive circle, city community rooms, the trusted circle,
 * the date-safety concierge, referrals, support and membership all exist in
 * history and come back when there are enough people in one city for them to
 * mean anything. Every extra tab is one more place a young app looks empty.
 */
export type Screen =
  // Getting in: signup -> otp -> quickProfile, with recovery alongside.
  | "splash"
  | "welcome"
  | "signup"
  | "login"
  | "otp"
  | "forgotPassword"
  | "newPassword"
  | "quickProfile"
  // Building the profile, then saying what you are looking for.
  | "profileSetup"
  | "vibes"
  | "intent"
  | "alignment"
  // The dating product: the deck, the filters behind it, a profile in full,
  // the moment it is mutual, the first question, and who chose you.
  | "home"
  | "discovery"
  | "detail"
  | "mutual"
  | "icebreaker"
  | "likes"
  // Your threads, finding people, their page.
  | "chats"
  | "find"
  | "person"
  | "chat"
  // Your own account, and the two things that keep it safe.
  | "profile"
  | "premium"
  | "settings"
  | "safety"
  | "verifyHub";

/** Deep-linkable modal or state used by visual QA and product previews. */
export type PreviewState =
  | "profile-settings"
  | "match-safety"
  | "chat-search"
  | "chat-coach"
  | "chat-attachments"
  | "chat-document"
  | "chat-media"
  | "chat-voice"
  | "chat-recording"
  | "chat-emoji"
  | "chat-gif"
  | "chat-games"
  | "chat-snap"
  | "chat-face-emoji"
  | "chat-audio-call"
  | "chat-video-call"
  | "chat-settings"
  | "chat-options"
  | "chat-safety"
  | "safety-plan"
  | "safety-emergency"
  | "safety-privacy"
  | "safety-data"
  | "safety-delete";

export const previewScreens: readonly Screen[] = [
  "splash",
  "welcome",
  "signup",
  "login",
  "otp",
  "forgotPassword",
  "newPassword",
  "quickProfile",
  "profileSetup",
  "vibes",
  "intent",
  "alignment",
  "home",
  "discovery",
  "detail",
  "mutual",
  "icebreaker",
  "likes",
  "chats",
  "find",
  "person",
  "chat",
  "profile",
  "settings",
  "safety",
  "verifyHub",
];

export const previewStates: readonly PreviewState[] = [
  "profile-settings",
  "match-safety",
  "chat-search",
  "chat-coach",
  "chat-attachments",
  "chat-document",
  "chat-media",
  "chat-voice",
  "chat-recording",
  "chat-emoji",
  "chat-gif",
  "chat-games",
  "chat-snap",
  "chat-face-emoji",
  "chat-audio-call",
  "chat-video-call",
  "chat-settings",
  "chat-options",
  "chat-safety",
  "safety-plan",
  "safety-emergency",
  "safety-privacy",
  "safety-data",
  "safety-delete",
];

export const onboardingScreens = new Set<Screen>([
  "splash",
  "welcome",
  "signup",
  "login",
  "otp",
  "forgotPassword",
  "newPassword",
  "quickProfile",
  "profileSetup",
  "vibes",
  "intent",
  "alignment",
]);

/**
 * Screens it is safe to return to after a reload. The OTP and new-password
 * screens are deliberately excluded: both depend on state that only lives for
 * one attempt, so resuming into them would dead-end.
 */
export const resumableOnboardingScreens = new Set<Screen>([
  "welcome",
  "signup",
  "login",
  "forgotPassword",
  "quickProfile",
  "profileSetup",
  "vibes",
  "intent",
  "alignment",
]);
