import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  captureInviteFromUrl,
  clearInvite,
  storedInvite,
} from "../features/onboarding/inviteTracking";
import { SharedProfilePage } from "../features/share/SharedProfilePage";
import { BackHandler, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, AuthRequestError, isSessionRejected } from "../api/authApi";
import { profileApi, onProfileReward } from "../api/profileApi";
import { uploadPhoto } from "../api/uploadPhoto";
import {
  matchApi,
  type SparkWallet,
} from "../api/matchApi";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Mukta_400Regular,
  Mukta_500Medium,
  Mukta_600SemiBold,
  Mukta_700Bold,
} from "@expo-google-fonts/mukta";
import { Marcellus_400Regular } from "@expo-google-fonts/marcellus";
import * as ImagePicker from "expo-image-picker";

import { Match, matches } from "../data";
import { profileStrength } from "../domain/profileStrength";
import { colors } from "../theme";
import {
  ChatMessage,
  CoupleChatSettings,
  DatePlanStatus,
  DiscoverySignal,
  LocalReport,
  MatchFilters,
  OnboardingResumeScreen,
  ProfileDraft,
  RelationshipReflectionChoice,
  RelationshipReflectionRecord,
  RelationshipReminderRecord,
  RoseLedger,
  clearAppState,
  defaultCoupleChatSettings,
  defaultMatchFilters,
  initialPersistedState,
  loadAppState,
  saveAppState,
} from "../storage";
import {
  appEnvironment,
  // backendMode,
  backendRuntime,
  fetchDailyMatches,
  fetchMatchingPoolStatus,
  loadCurrentMemberBootstrap,
  requestAccountDeletion,
  type MatchingPoolStatus,
} from "./adapters/previewMemberRuntime";
import { deckCandidates, rankMatches } from "../domain/matching";
import { AdminLoginScreen } from "../features/admin/screens/AdminLoginScreen";
import { AdminDashboardScreen } from "../features/admin/screens/AdminDashboardScreen";
import { PremiumScreen } from "../features/premium/screens/PremiumScreen";
import { APP_MAX_WIDTH, PHONE_WIDTH } from "../layout/breakpoints";
import { useLayout } from "../layout/useLayout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { configureAnalyticsConsent, track } from "../lib/telemetry";
import { CallHost } from "../features/chat/CallHost";
import {
  fetchPersistedChatMessages as fetchPersistedChatMessagesPreview,
  fetchPersistedRelationshipJourney,
  persistBlock as persistBlockPreview,
  persistChatMessage as persistChatMessagePreview,
  persistChatSettings as persistChatSettingsPreview,
  persistClearMatchingLearning,
  persistDateProposal as persistDateProposalPreview,
  persistDiscoverySignal,
  // persistIcebreakerAnswer,
  persistLiveLocationShare as persistLiveLocationSharePreview,
  persistMatchDecision,
  persistMatchingPreferences,
  persistMessageDelete as persistMessageDeletePreview,
  persistMessageEdit as persistMessageEditPreview,
  persistMessageUserState as persistMessageUserStatePreview,
  persistOnboardingProfile,
  // persistProfileView,
  persistReport as persistReportPreview,
  persistUnmatch as persistUnmatchPreview,
  subscribePersistedChatMessages as subscribePersistedChatMessagesPreview,
} from "./adapters/previewPersistence";
import { chatApi } from "../api/chatApi";
import { callApi } from "../api/callApi";
import {
  connectChatSocket,
  disconnectChatSocket,
  emitChatRead,
  emitChatTyping,
  getChatSocket,
  isChatSocketConnected,
} from "../api/chatSocket";
import { minimizeActiveCallIfAny } from "../features/chat/activeCallBackGuard";
import { forgetNativePush, startNativePush } from "./push/nativePush";
import { pushApi } from "../api/pushApi";
import { safetyApi } from "../api/safetyApi";
import { conversationIdFor, profileIdFor } from "../domain/matchIdentity";
import { buildProfileCompletion } from "../domain/profileCompletion";
import { isDatePlanStatus } from "../domain/dateLifecycle";
import { memberNeedsOnboarding } from "../domain/memberBootstrap";
import {
  canCommitMemberMutation,
  evaluateMemberDataRuntime,
  memberMutationFailureMessage,
  type MemberMutationResult,
} from "../domain/memberDataRuntime";
import {
  coupleModeRoutes,
  guardCoupleModeRoute,
  initialCoupleModeState,
  reduceCoupleMode,
  type CoupleModeRoute,
  type CoupleModeState,
  type ExperienceMode,
} from "../domain/coupleMode";
import { createLocalCoupleModeRepository } from "./adapters/localCoupleModeRepository";
import { fetchCurrentCoupleConnectionHub as fetchCurrentCoupleConnectionHubPreview } from "./adapters/previewCoupleConnection";
import { type CoupleConnectionHub } from "../domain/coupleConnection";
import { coupleApi } from "../api/coupleApi";
import { searchChatGifCatalog } from "../domain/chatMediaCatalog";
import {
  applyMessageDeletion,
  applyMessageEdit,
} from "../domain/chatExperience";
import {
  onboardingScreens,
  previewScreens,
  previewStates,
  resumableOnboardingScreens,
  type PreviewState,
  type Screen,
} from "../app/navigation/types";
import { SplashScreen } from "../features/launch/screens/LaunchScreens";
import { AccessWelcomeScreen } from "../features/access/screens/WelcomeScreen";
import {
  ForgotPasswordScreen,
  LogInScreen,
  NewPasswordScreen,
  OtpScreen,
  QuickProfileScreen,
  SignUpScreen,
  type QuickProfile,
  type SignUpDraft,
} from "../features/access/screens/AccessScreens";
import {
  AlignmentScreen,
  IntentScreen,
  VibesScreen,
} from "../features/onboarding/screens/PreferenceScreens";
import { ProfileSetupScreen } from "../features/onboarding/screens/ProfileSetupScreen";
import {
  SafetyActions,
  SafetyCenter,
  type SafetyTool,
} from "../features/trust/screens/SafetyScreens";
import { VerificationHubScreen } from "../features/trust/screens/VerificationHubScreen";
import { ChatsScreen } from "../features/social/screens/ChatsScreen";
import { FindPeopleScreen } from "../features/social/screens/FindPeopleScreen";
import { PersonScreen } from "../features/social/screens/PersonScreen";
import { socialApi, type ContactsMatchResult, type SocialUser } from "../api/socialApi";
import { contactBook, invitesFor, type BookContact } from "../features/social/contactBook";
import { canPickContacts } from "../features/onboarding/inviteHelpers";
import { matchFromSocialUser } from "../domain/socialMatch";
import { DiscoveryCenterScreen } from "../features/discovery/screens/DiscoveryCenterScreen";
import { LikesScreen } from "../features/discovery/screens/LikesScreen";
import { GamesScreen } from "../features/games/GamesScreen";
import type { GameKind } from "../api/gamesApi";
import { HomeScreen } from "../features/discovery/screens/HomeScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { SettingsScreen } from "../features/profile/screens/SettingsScreen";
import { SupportScreen } from "../features/help/screens/SupportScreen";
import { MatchDetailScreen } from "../features/discovery/screens/MatchDetailScreen";
import {
  IcebreakerScreen,
  MutualMatchScreen,
} from "../features/discovery/screens/MatchJourneyScreens";
import {
  ChatScreen,
  RoseComposer,
  RoseReceivedPopup,
  type CoupleLaunchTool,
  type RoseAvailability,
  type RosePopupPayload,
} from "../features/chat/ChatFeature";
import {
  AppNoticeSheet,
  type AppNotice,
} from "../components/feedback/AppNoticeSheet";
import { setPostTools, setProfileOpener, userIdFromToken } from "../features/posts/profileLink";
import { loadChatsAndMatches } from "../features/social/chatTargets";
import { postApi } from "../api/postApi";
import { SharedPostModal, readPostParam } from "../features/posts/SharedPostModal";
import { StoryHost } from "../features/stories/StoryHost";
import { loadStories, openStoriesOf, takeStoryParam } from "../features/stories/storyStore";
import { setFestival, startFestivalWatch } from "../features/festival/festivalStore";
import type { ActiveFestival } from "../features/festival/themes";
// expo-contacts is native-only; loaded lazily inside onMatchContacts

/* =========================================================
    PREMIUM BACKGROUND (MATCHES SPLASH SCREEN EXACTLY)
    ========================================================= */

/**
 * The app canvas.
 *
 * This used to stack four gradients — a seven-stop base plus three rotated
 * "atmosphere" washes — to get the old premium glow. The daylight identity
 * does not want atmosphere: it wants a flat limewash wall so cards, chips and
 * type do the work. One View, no gradients, and a good deal less to composite
 * on a mid-range phone.
 */
function AppCanvas({ children }: { children: ReactNode }) {
  const layout = useLayout();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Platform.OS === "web" ? "#DBDEE1" : colors.canvas,
        alignItems: "center",
      }}
    >
      <View
        style={[
          {
            flex: 1,
            width: "100%",
            backgroundColor: colors.canvas,
            overflow: "hidden",
          },
          // On the web the app sits in a centred card. On a phone-sized
          // window that card is phone-wide, which is what it should be. On
          // a laptop it used to stay phone-wide too, so the whole app was a
          // 430px strip in the middle of a 1440px screen - the thing this
          // is meant to stop being.
          Platform.OS === "web"
            ? {
                maxWidth: layout.isWide ? APP_MAX_WIDTH : PHONE_WIDTH,
                boxShadow: "0 0 40px rgba(21,23,25,0.14)",
              }
            : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Debounced from the sign-up screen, so a taken username shows up while the
 * member is still typing rather than after the SMS.
 *
 * Declared at module scope on purpose: `SignUpScreen` lists this in an effect
 * dependency array, so a new function on every render would restart the
 * debounce forever.
 */
async function checkUsernameAvailable(username: string) {
  try {
    const result = await authApi.checkUsername(username);
    return { available: result.available, reason: result.reason };
  } catch {
    // Offline or a server hiccup: do not block sign-up on a hint. The server
    // checks again for real when the account is created.
    return { available: true, reason: "" };
  }
}

/** Server may call this field `about` or `bio`; accept both. */
const readBio = (profile: any, fallback = ""): string =>
  profile?.about ?? profile?.bio ?? fallback;

/** Hobbies may come back as an array or as a JSON string. */
const readHobbies = (profile: any): string[] => {
  const raw = profile?.hobbies;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Send both keys so it saves whichever one the backend expects. */
const buildProfilePayload = (draft: any) => ({
  firstName: draft.firstName,
  gender: draft.gender,
  age: draft.age,
  height: draft.height,
  city: draft.city,
  profession: draft.profession,
  religion: draft.religion,
  community: draft.community,
  bio: draft.bio ?? "",
  about: draft.bio ?? "",
  hobbies: draft.hobbies ?? [], // <-- YEH ADD KARO
});
// The signed-out policy. Used before there is a session, and by the showcase.
const previewDataRuntime = evaluateMemberDataRuntime(backendRuntime.mode);
function getPreviewScreen(): Screen | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (backendRuntime.mode !== "demo" && params.get("previewAccess") !== "1")
    return undefined;
  const requested = params.get("preview") as Screen | null;
  return requested && previewScreens.includes(requested)
    ? requested
    : undefined;
}

function getGoogleCallback(): { email: string; fullName: string } | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get("provider") !== "google") return undefined;
  const email = params.get("email");
  if (!email) return undefined;
  return { email, fullName: params.get("fullName") ?? "" };
}

function getPreviewState(): PreviewState | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (backendRuntime.mode !== "demo" && params.get("previewAccess") !== "1")
    return undefined;
  const requested = params.get("previewState") as PreviewState | null;
  return requested && previewStates.includes(requested) ? requested : undefined;
}
const showcasePreviewScreen = getPreviewScreen();
const showcasePreviewState = getPreviewState();
const googleCallbackData = getGoogleCallback();
/** The sign-in pages: once signed in, the back button never goes back to them. */
const AUTH_SCREENS = new Set<Screen>(["splash", "welcome", "signup", "login", "otp", "forgotPassword", "newPassword", "adminLogin"]);

const isAdminMode = Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1";
const isPreviewAccessMode =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  (window.location.hostname.endsWith(".chatgpt.site") ||
    window.location.hostname.endsWith(".workers.dev") ||
    new URLSearchParams(window.location.search).get("previewAccess") === "1");
const showcaseOnboardingScreens = onboardingScreens;
const onboardingResumeScreens = resumableOnboardingScreens;
const showcaseExperienceMode: ExperienceMode =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mode") === "couple"
    ? "couple"
    : "seeking";
const showcaseMemberProfile: ProfileDraft = {
  firstName: "Aarav",
  gender: "man",
  age: "30",
  city: "Mumbai, MH",
  height: "5 ft 10 in",
  profession: "Product Strategist",
  religion: "Hindu",
  community: "Punjabi",
};
const isCustomerShowcase = Boolean(
  showcasePreviewScreen &&
  !showcaseOnboardingScreens.has(showcasePreviewScreen),
);
const showcaseChatSeed: Record<string, ChatMessage[]> = {};
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
const icebreakerQuestion = "Coffee date ☕ or road trip 🚗?";
const todayKey = () => new Date().toISOString().slice(0, 10);
const coupleModeRepository = createLocalCoupleModeRepository(AsyncStorage);
const showcaseCoupleModeState: CoupleModeState =
  showcaseExperienceMode === "couple"
    ? reduceCoupleMode(
        reduceCoupleMode(initialCoupleModeState, {
          type: "select_experience",
          mode: "couple",
          at: new Date().toISOString(),
        }),
        {
          type: "link_partner",
          connectionId: "preview-couple",
          partner: { memberId: "preview-partner", displayName: "My Partner" },
          at: new Date().toISOString(),
        },
      )
    : initialCoupleModeState;
function isCoupleModeRoute(screen: Screen): screen is Screen & CoupleModeRoute {
  return (coupleModeRoutes as readonly string[]).includes(screen);
}
function getRoseAvailability(ledger: RoseLedger): RoseAvailability {
  const today = todayKey();
  return {
    freeAvailable: ledger.dayKey !== today || !ledger.freeUsed,
    paidCredits: ledger.paidCredits,
  };
}
function mergeChatMessageList(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  [...current, ...incoming].forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
function isChatMessage(value: unknown): value is ChatMessage {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as ChatMessage).id === "string" &&
    typeof (value as ChatMessage).createdAt === "number"
  );
}
// function isIcebreakerWaitingForOtherAnswer(data: unknown) {
//   return (
//     !!data &&
//     typeof data === "object" &&
//     !Array.isArray(data) &&
//     (
//       data as {
//         unlocked?: unknown;
//       }
//     ).unlocked === false
//   );
// }
function isMutualMatchDecision(data: unknown) {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (
      data as {
        matched?: unknown;
      }
    ).matched === true
  );
}
function backendDateStatus(value: unknown): DatePlanStatus {
  return isDatePlanStatus(value) ? value : "proposed";
}
function intentFromDatabase(value: string) {
  return value === "marriage"
    ? "Marriage"
    : value === "long_term"
      ? "Long-term Relationship"
      : "Long-term, leading to Marriage";
}
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
function MilaanApp() {
  // Local state exists only for deterministic frontend preview/offline UX.
  // Production behavior is supplied later through the typed AWS ports.
  // Mukta (Ek Type) carries both Latin and Devanagari, so the bilingual
  // labels in the sign-up flow render in one family.
  const [fontsLoaded] = useFonts({
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
    // The display face. Mukta carries the interface and Devanagari;
    // Marcellus carries names and headings, where the app should sound
    // like an occasion rather than a form.
    Marcellus_400Regular,
  });
  const appLayout = useLayout();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  // Set from the signed-in account; only admins see the Admin Panel entry in
  // Settings. The server still checks the role on every /admin call.
  const [isAdmin, setIsAdmin] = useState(false);
  const [screen, setScreen] = useState<Screen>(() => {
    if (isAdminMode) return "adminLogin" as Screen;
    return showcasePreviewScreen ?? "splash";
  });
  // Where saving the intent / future answers returns to: Settings when they
  // were opened from there, Home otherwise.
  // The festival theme the admin has on (Diwali, Eid...): ask now, every
  // few minutes and when the app comes back; the socket also tells us.
  useEffect(() => {
    startFestivalWatch();
  }, []);
  const alignmentReturnRef = useRef<Screen>("home");
  useEffect(() => {
    if (screen !== "alignment") alignmentReturnRef.current = screen === "settings" ? "settings" : "home";
  }, [screen]);
  // App-wide back-button guard: give every in-app screen its own browser
  // history entry, so the hardware/gesture back button steps back through
  // screens instead of exiting the whole app/webview. Without this, the
  // very first back press anywhere (e.g. on the profile screen) would
  // close the app, since nothing was ever pushed onto history.
  // True while the realtime socket is connected; the REST polls below slow
  // right down (kept only as a safety net) when it is.
  const chatSocketConnectedRef = useRef(false);
  // Chat (by conversation id) that a tapped notification wants opened; kept
  // until the matches have loaded and it can be resolved.
  const [pendingNotificationChat, setPendingNotificationChat] = useState<
    string | null
  >(null);
  // Latest delivered/read status the socket reported per message id. The
  // server can report "read" before our own send request has even returned
  // (so the message isn't in state yet); this lets us apply it afterwards.
  const messageStatusCacheRef = useRef<Record<string, ChatMessage["status"]>>(
    {},
  );
  const screenRef = useRef(screen);
  // Signed in and past onboarding: back must not land on the sign-in pages.
  const signedInRef = useRef(false);
  // The phone app's own back stack (Android's back button).
  const nativeBackRef = useRef<Screen[]>([]);
  const isPoppingScreenRef = useRef(false);
  const hasMountedBackGuardRef = useRef(false);
  useEffect(() => {
    captureInviteFromUrl();
  }, []);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    window.history.replaceState({ milaanScreen: screenRef.current }, "");
    const handlePopState = (event: PopStateEvent) => {
      // The admin dashboard walks back through its own tabs (and stays put
      // on Overview); leaving it is its "Back to app" / "Logout" button.
      if (screenRef.current === "adminDashboard") return;
      // A full-screen call (if any) gets first claim on every back press --
      // minimize it and re-seed our own entry rather than navigating away,
      // which would otherwise unmount the call along with the screen it's
      // shown on. See activeCallBackGuard.ts for why this lives here as a
      // single shared check instead of a second, separately-stacked history
      // entry/listener on the call screen itself.
      if (minimizeActiveCallIfAny()) {
        window.history.pushState({ milaanScreen: screenRef.current }, "");
        return;
      }
      const target = (event.state as { milaanScreen?: Screen } | null)
        ?.milaanScreen;
      // Signed in, back never returns to the sign-in pages left behind in
      // the browser's history: stay where you are instead.
      if (target && signedInRef.current && AUTH_SCREENS.has(target)) {
        window.history.pushState({ milaanScreen: screenRef.current }, "");
        return;
      }
      if (target && target !== screenRef.current) {
        isPoppingScreenRef.current = true;
        setScreen(target);
      } else {
        // Bottom of our in-app stack — never let the back button exit the
        // app; just re-seed a history entry and stay on the current screen.
        window.history.pushState({ milaanScreen: screenRef.current }, "");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  // Android's back button: the screen before, never the sign-in pages once
  // signed in; with nowhere left to go, Home, and from Home the phone's own
  // back (the app goes to the background). Open sheets and modals close
  // first on their own.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const last = nativeBackRef.current[nativeBackRef.current.length - 1];
    if (isPoppingScreenRef.current) isPoppingScreenRef.current = false;
    else if (last !== screen) nativeBackRef.current = [...nativeBackRef.current, screen].slice(-30);
  }, [screen]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (minimizeActiveCallIfAny()) return true;
      const stack = nativeBackRef.current;
      while (stack.length > 1) {
        stack.pop();
        const previous = stack[stack.length - 1]!;
        if (signedInRef.current && AUTH_SCREENS.has(previous)) continue;
        isPoppingScreenRef.current = true;
        setScreen(previous);
        return true;
      }
      if (signedInRef.current && screenRef.current !== "home") {
        nativeBackRef.current = ["home"];
        isPoppingScreenRef.current = true;
        setScreen("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (isPoppingScreenRef.current) {
      isPoppingScreenRef.current = false;
      return;
    }
    if (!hasMountedBackGuardRef.current) {
      hasMountedBackGuardRef.current = true;
      return;
    }
    window.history.pushState({ milaanScreen: screen }, "");
  }, [screen]);
  // Nobody is selected until a real person is opened. Seeding this from the
  // sample deck once put an invented person in a signed-in member's chat.
  const noPartner: Match = matchFromSocialUser({
    userId: "",
    username: "",
    name: "",
    avatarUrl: null,
    isPrivate: false,
  });
  const [selected, setSelected] = useState<Match>(noPartner);
  const hasSelected = !!selected.id;
  // --- finding people ---
  const [personId, setPersonId] = useState<string | null>(null);
  // Where Back on someone's profile goes: the screen it was opened from
  // (a chat, Find people...), the way Instagram returns you.
  const [personReturn, setPersonReturn] = useState<Screen>("find");
  // A tap on a name or photo on a post (its header, a comment, the likes
  // list) opens that profile. The real opener is set further down, once
  // openPerson exists; this keeps the registration a hook above the fonts gate.
  const openProfileRef = useRef<(userId: string) => void>(() => undefined);
  useEffect(() => {
    setProfileOpener((userId) => openProfileRef.current(userId));
    return () => setProfileOpener(null);
  }, []);
  // A post opened from a shared link (https://apnajoda.com/?post=<id>), or
  // from a post someone sent you in a chat.
  const [sharedPostId, setSharedPostId] = useState<string | null>(() => readPostParam());
  // A story notification that was tapped: play that person's stories once signed in.
  // A cold start on the website arrives as /?story=<userId>.
  const [pendingStoryUser, setPendingStoryUser] = useState<string | null>(() => takeStoryParam());
  const postTokenRef = useRef<string | null>(null);
  useEffect(() => {
    setPostTools({
      open: (postId) => setSharedPostId(postId),
      load: (postId) =>
        postTokenRef.current
          ? postApi.get(postTokenRef.current, postId)
          : Promise.reject(new Error("Not signed in.")),
    });
    return () => setPostTools(null);
  }, []);
  // Private until the server says otherwise: guessing "public" for a moment
  // would show the wrong switch to someone who never chose it.
  const [isPrivateAccount, setIsPrivateAccount] = useState(true);
  const [vibeList, setVibeList] = useState<string[]>([]);
  const [intent, setIntent] = useState("Long-term, leading to Marriage");
  const [alignment, setAlignment] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(isCustomerShowcase);
  /** Approved selfie AND Pro - the server works it out, never the app. */
  const [blueTick, setBlueTick] = useState(false);
  // Whether the one-time "100% profile" Super Like has been paid.
  const [completionRewardClaimed, setCompletionRewardClaimed] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "pending" | "approved" | "rejected"
  >("none");
  /**
   * The server owns both of these. Reading only `verified` left the hub
   * showing "not started" to someone whose selfie was already waiting in the
   * review queue, because the status was set locally on submit and never
   * loaded back.
   */
  const applyAccountPrivacyFrom = (account: unknown) => {
    const row = (account ?? {}) as {
      is_private?: unknown;
      isPrivate?: unknown;
    };
    const value = row.is_private ?? row.isPrivate;
    if (value !== undefined) setIsPrivateAccount(value === true || value === 1);
  };
  /** Server row -> intent + the four alignment answers ("future essentials"). */
  const applyIntentFrom = (row: unknown) => {
    const r = (row ?? {}) as Record<string, unknown>;
    if (typeof r.intent === "string" && r.intent) setIntent(r.intent);
    const next: Record<string, string> = {};
    for (const key of ["timeline", "children", "family", "relocation"]) {
      const value = r[key];
      if (typeof value === "string" && value) next[key] = value;
    }
    if (Object.keys(next).length) setAlignment(next);
  };
  const applyVerificationFrom = (profile: unknown) => {
    const row = (profile ?? {}) as {
      verified?: unknown;
      verification_status?: unknown;
      blue_tick?: unknown;
    };
    const isVerified = row.verified === true || row.verified === 1;
    setVerified(isVerified);
    setBlueTick(isVerified && (row.blue_tick === true || row.blue_tick === 1));
    const status = row.verification_status;
    setVerificationStatus(
      status === "pending" || status === "approved" || status === "rejected"
        ? status
        : "none",
    );
  };
  const [authDestination, setAuthDestination] = useState("");
  // Held only while the member is on the OTP screen: the server needs the
  // username and password again on the verify call so the account is created
  // in one transaction after the code checks out.
  const [signUpDraft, setSignUpDraft] = useState<SignUpDraft | null>(null);
  // Which account is being recovered, and the code, across the two
  // forgot-password screens.
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  // The OTP screen is shared by sign-up and password reset; this only picks
  // the copy and where "back" goes. The server scopes the code itself.
  const [otpPurpose, setOtpPurpose] = useState<"signup" | "reset">("signup");
  const [quickProfile, setQuickProfile] = useState<QuickProfile>({
    firstName: "",
    age: "",
    gender: "",
    photoUri: "",
  });
  const [accessToken, setAccessToken] = useState("");
  // A signed-in member is on the server whatever the build mode says. Reading
  // this from the build alone kept their messages in local state and never
  // sent them, so a conversation vanished the moment they left the thread.
  const memberDataRuntime = evaluateMemberDataRuntime(
    backendRuntime.mode,
    !!accessToken,
  );
  const onboardingCompleteRef = useRef(false);
  const [serverDiscoveredMatches, setServerDiscoveredMatches] = useState<
    Match[] | null
  >(null);
  const [onboardingComplete, setOnboardingComplete] =
    useState(isCustomerShowcase);
  useEffect(() => {
    signedInRef.current = !!accessToken && onboardingComplete;
  }, [accessToken, onboardingComplete]);
  const [profileReminderShownAt, setProfileReminderShownAt] = useState(
    initialPersistedState.profileReminderShownAt,
  );
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(
    isCustomerShowcase
      ? showcaseMemberProfile
      : initialPersistedState.profileDraft,
  );
  const [chatMessages, setChatMessages] =
    useState<Record<string, ChatMessage[]>>(showcaseChatSeed);
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [partnerPresence, setPartnerPresence] = useState<{
    online: boolean;
    lastActiveAt: string | null;
    typing: boolean;
  } | null>(null);
  const [coinBalance, setCoinBalance] = useState(
    previewDataRuntime.initialCoinBalance,
  );
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);
  const [selfieUri, setSelfieUri] = useState("");
  const [voiceIntroUri, setVoiceIntroUri] = useState("");
  const [vouches, setVouches] = useState<string[]>([]);
  const [discoverySignals, setDiscoverySignals] = useState<DiscoverySignal[]>(
    [],
  );
  const [smartDiscovery, setSmartDiscovery] = useState(true);
  const [crossedPaths, setCrossedPaths] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [safeCheckIns, setSafeCheckIns] = useState<string[]>([]);
  const [matchFilters, setMatchFilters] =
    useState<MatchFilters>(defaultMatchFilters);
  const [roseLedger, setRoseLedger] = useState<RoseLedger>(
    initialPersistedState.roseLedger,
  );
  const [roseTarget, setRoseTarget] = useState<Match | null>(null);
  const [rosePopup, setRosePopup] = useState<RosePopupPayload | null>(null);
  /** Sparks and Super Likes, straight from the server. Null until loaded. */
  const [sparkWallet, setSparkWallet] = useState<SparkWallet | null>(null);
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null);
  const [detailSafetyOpen, setDetailSafetyOpen] = useState(
    showcasePreviewState === "match-safety",
  );
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const [lastSeenVisible, setLastSeenVisible] = useState(
    initialPersistedState.lastSeenVisible,
  );
  const [analyticsConsent, setAnalyticsConsent] = useState(
    initialPersistedState.analyticsConsent,
  );
  const [chatSettings, setChatSettings] = useState<
    Record<string, CoupleChatSettings>
  >(initialPersistedState.chatSettings);
  const [relationshipReflections, setRelationshipReflections] = useState<
    Record<string, RelationshipReflectionRecord>
  >(initialPersistedState.relationshipReflections);
  const [relationshipReminders, setRelationshipReminders] = useState<
    Record<string, RelationshipReminderRecord>
  >(initialPersistedState.relationshipReminders);
  const [serverMatches, setServerMatches] = useState<Match[] | null>(
    isPreviewAccessMode || previewDataRuntime.allowsMockMatches ? null : [],
  );
  const [matchLoadState, setMatchLoadState] = useState<MemberMatchLoadState>(
    isPreviewAccessMode || previewDataRuntime.allowsMockMatches
      ? "preview"
      : "loading",
  );
  const [matchingPoolStatus, setMatchingPoolStatus] =
    useState<MatchingPoolStatus | null>(null);
  const [coupleMode, setCoupleMode] = useState<CoupleModeState>(
    showcaseCoupleModeState,
  );
  const [coupleHub, setCoupleHub] = useState<CoupleConnectionHub>({
    experienceMode: showcaseExperienceMode,
    connection: null,
    connections: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [chatLaunchTool, setChatLaunchTool] = useState<CoupleLaunchTool>(null);
  // A game picked on the Games tab, started when that chat opens.
  const [chatLaunchGame, setChatLaunchGame] = useState<GameKind | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeCoupleConnectionId] = useState<string | null>(null);
  const activeCoupleHubConnection =
    coupleHub.connections.find(
      (connection) => connection.connectionId === activeCoupleConnectionId,
    ) ?? null;
  const couplePartnerName =
    activeCoupleHubConnection?.partnerDisplayName.trim() ||
    coupleMode.connection.partner?.displayName.trim() ||
    "My Partner";
  const activeCoupleConnectionIdResolved =
    activeCoupleHubConnection?.connectionId ??
    coupleMode.connection.connectionId ??
    null;
  const couplePartner: Match = {
    ...matches[0]!,
    id: `couple-${activeCoupleConnectionIdResolved ?? "space"}`,
    profileId:
      activeCoupleHubConnection?.partnerMemberId ??
      coupleMode.connection.partner?.memberId,
    matchId: activeCoupleConnectionIdResolved ?? undefined,
    name: couplePartnerName,
    city: profileDraft.city || "Private couple space",
    profession: "Your partner",
    intent: "Committed relationship",
    match: "Exceptional Match",
    vibes: ["Together", "Private", "Intentional"],
    photo: "",
    photos: [],
  };
  const conversationPartner =
    coupleMode.experienceMode === "couple" ? couplePartner : selected;
  const applyCoupleHub = (hub: CoupleConnectionHub) => {
    setCoupleHub(hub);
    if (!hub.connection) {
      if (hub.experienceMode === "couple")
        setCoupleMode((current) =>
          current.experienceMode === "couple"
            ? current
            : reduceCoupleMode(current, {
                type: "select_experience",
                mode: "couple",
                at: new Date().toISOString(),
              }),
        );
      return;
    }
    const connection = hub.connection;
    setCoupleMode((current) => {
      if (
        current.connection.status === "active" &&
        current.connection.connectionId === connection.connectionId
      )
        return current;
      const at = new Date().toISOString();
      const inCoupleMode =
        current.experienceMode === "couple"
          ? current
          : reduceCoupleMode(current, {
              type: "select_experience",
              mode: "couple",
              at,
            });
      return reduceCoupleMode(inCoupleMode, {
        type: "link_partner",
        connectionId: connection.connectionId,
        partner: {
          memberId: connection.partnerMemberId,
          displayName: connection.partnerDisplayName,
        },
        at,
      });
    });
  };
  /** Saves the profile, re-reads it from the server and confirms the bio stuck. */
  /** Saves the profile, re-reads it from the server and confirms bio + hobbies stuck. */
  const saveProfileAndSync = async (token: string, draft: any) => {
    await profileApi.updateProfile(token, buildProfilePayload(draft));
    const fresh = await profileApi.getMyProfile(token);

    // Bio check
    const savedBio = String(readBio(fresh?.profile, "")).trim();
    const wantedBio = String(draft.bio ?? "").trim();
    if (savedBio !== wantedBio) {
      throw new Error(
        "Bio server par save nahi hua. Backend /profile update me bio/about field check karo.",
      );
    }

    // Hobbies check
    const savedHobbies = readHobbies(fresh?.profile);
    const wantedHobbies = draft.hobbies || [];
    const hobbiesMatch =
      savedHobbies.length === wantedHobbies.length &&
      wantedHobbies.every((h: string) => savedHobbies.includes(h));
    if (!hobbiesMatch) {
      throw new Error(
        "Hobbies server par save nahi hui. Backend me hobbies column check karo.",
      );
    }

    setProfileDraft((current: any) => ({
      ...current,
      bio: savedBio,
      hobbies: savedHobbies,
    }));
  };
  const refreshServerMatches = async () => {
    if (memberDataRuntime.source !== "server") return;
    setMatchLoadState("loading");
    try {
      const [daily, pool] = await Promise.all([
        fetchDailyMatches(5),
        fetchMatchingPoolStatus(),
      ]);
      setServerMatches(daily ?? []);
      setMatchingPoolStatus(pool);
      setMatchLoadState("ready");
    } catch (error) {
      setServerMatches([]);
      setMatchLoadState("error");
      setAppNotice({
        title: "Matches unavailable",
        body:
          error instanceof Error
            ? error.message
            : "Your curated matches could not be loaded securely. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
    }
  };
  useEffect(() => {
    let active = true;
    const started = Date.now();
    Promise.all([loadAppState(), coupleModeRepository.load()]).then(
      async ([saved, savedCoupleMode]) => {
        if (!active) return;
        let nextScreen: Screen = "welcome";
        if (previewDataRuntime.allowsLocalHydration) {
          if (!showcasePreviewScreen) {
            setCoupleMode(savedCoupleMode);
            setAuthDestination(saved.authDestination);
            setVerified(saved.verified);
            setProfileDraft({
              ...initialPersistedState.profileDraft,
              ...saved.profileDraft,
            });
            setVibeList(saved.vibes);
            setIntent(saved.intent);
            setAlignment(saved.alignment);
            setChatMessages(saved.chats);
            setCoinBalance(saved.coinBalance);
            setProfilePhotos(saved.photos);
            setSelfieUri(saved.selfieUri);
            setVoiceIntroUri(saved.voiceIntroUri);
            setVouches(saved.vouches);
            setDiscoverySignals(saved.discoverySignals);
            setSmartDiscovery(saved.smartDiscovery);
            setCrossedPaths(saved.crossedPaths);
            setBlockedIds(saved.blockedIds);
            setReports(saved.reports);
            setSafeCheckIns(saved.safeCheckIns);
            setMatchFilters({
              ...defaultMatchFilters,
              ...saved.matchFilters,
            });
            setRoseLedger({
              ...initialPersistedState.roseLedger,
              ...saved.roseLedger,
            });
            setLastSeenVisible(saved.lastSeenVisible ?? true);
            setAnalyticsConsent(saved.analyticsConsent ?? false);
            setChatSettings(saved.chatSettings ?? {});
            setRelationshipReflections(saved.relationshipReflections ?? {});
            setRelationshipReminders(saved.relationshipReminders ?? {});
            setProfileReminderShownAt(saved.profileReminderShownAt ?? 0);
            // Someone part-way through sign-up resumes where they were;
            // someone with no session at all starts at the front door, not
            // half-way inside it.
            nextScreen = saved.onboardingComplete
              ? "home"
              : resumableOnboardingScreens.has(saved.onboardingScreen as Screen)
                ? (saved.onboardingScreen as Screen)
                : "welcome";
            setOnboardingComplete(saved.onboardingComplete);
          }
        }
        if (memberDataRuntime.source === "server") {
          try {
            const member = await loadCurrentMemberBootstrap();
            const needsOnboarding = member
              ? memberNeedsOnboarding(member)
              : false;
            nextScreen = !member
              ? "welcome"
              : needsOnboarding
                ? "profileSetup"
                : "home";
            setOnboardingComplete(Boolean(member && !needsOnboarding));
            applyVerificationFrom(member?.profile);
            if (!member) setAuthDestination("");
            if (member?.profile) {
              setProfileDraft((current) => ({
                ...current,
                firstName: member.profile?.first_name ?? "",
                gender: member.matchAttributes?.gender ?? current.gender,
                city: member.profile?.city ?? "",
                profession: member.profile?.profession ?? "",
                religion: member.profile?.religion ?? "",
                community: member.profile?.community ?? "",
              }));
            }
            if (member?.matchingPreferences) {
              const serverPreferences = member.matchingPreferences;
              setMatchFilters({
                lookingFor:
                  serverPreferences.looking_for === "women"
                    ? "Women"
                    : serverPreferences.looking_for === "men"
                      ? "Men"
                      : "Everyone",
                minAge: serverPreferences.min_age,
                maxAge: serverPreferences.max_age,
                cities: serverPreferences.cities,
                intents: serverPreferences.intents.map(intentFromDatabase),
                mustHaveVibes: serverPreferences.must_have_vibes,
                familyPriority: serverPreferences.family_priority,
                children: serverPreferences.children,
                marriageTimeline: serverPreferences.marriage_timeline,
                relocation: serverPreferences.relocation,
                distancePreference: serverPreferences.distance_preference,
              });
              setSmartDiscovery(serverPreferences.smart_discovery);
            }
            if (member && !needsOnboarding) {
              await refreshServerMatches();
            } else {
              setMatchLoadState("ready");
            }
          } catch (error) {
            nextScreen = "welcome";
            setOnboardingComplete(false);
            setVerified(false);
            setMatchLoadState("error");
            setAppNotice({
              title: "Secure sign-in required",
              body:
                error instanceof Error
                  ? error.message
                  : "The production backend could not restore your session.",
              icon: "shield-outline",
              tone: "ruby",
            });
          }
        }
        if (googleCallbackData) {
          setAuthDestination(googleCallbackData.email);
          nextScreen = "otp";
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }

        try {
          const savedToken = await AsyncStorage.getItem("milaan_access_token");
          if (savedToken) {
            let currentToken: string = savedToken;
            let me;
            try {
              me = await authApi.me(currentToken);
            } catch {
              const tokens = await authApi.refreshSavedSession();
              if (!tokens) throw new AuthRequestError("No saved session", 401);
              currentToken = tokens.accessToken;
              me = await authApi.me(currentToken);
            }
            setAccessToken(currentToken);
            applyAccountPrivacyFrom(me.user);
            setIsAdmin(me?.user?.role === "admin");
            const profileData = await profileApi.getMyProfile(currentToken);
            try {
              const discoverResult = await profileApi.discoverMatches(
                currentToken,
                20,
              );
              if (discoverResult.matches)
                setServerDiscoveredMatches(discoverResult.matches);
              // This is the path a returning member actually takes: the
              // block above it is skipped, because memberDataRuntime is read
              // from a render where accessToken is still empty. Without this
              // line matchLoadState stayed on its initial "preview" for the
              // whole session, and an empty deck told the member to widen
              // filters instead of saying it was still loading or had failed.
              setMatchLoadState("ready");
            } catch {
              setServerDiscoveredMatches([]);
              setMatchLoadState("error");
            }
            if (profileData.profile) {
              setProfileDraft((current) => ({
                ...current,
                firstName: profileData.profile.first_name ?? current.firstName,
                gender: profileData.profile.gender ?? current.gender,
                age: profileData.profile.age
                  ? String(profileData.profile.age)
                  : current.age,
                height: profileData.profile.height ?? current.height,
                city: profileData.profile.city ?? current.city,
                profession:
                  profileData.profile.profession ?? current.profession,
                religion: profileData.profile.religion ?? current.religion,
                community: profileData.profile.community ?? current.community,
                bio: readBio(profileData.profile, (current as any).bio ?? ""),
                hobbies: readHobbies(profileData.profile),
              }));
              applyVerificationFrom(profileData.profile);
            }
            setCompletionRewardClaimed(!!profileData?.completionRewardClaimed);
            if (profileData.photos?.length)
              setProfilePhotos(profileData.photos);
            if (profileData.vibes?.length) setVibeList(profileData.vibes);
            applyIntentFrom(profileData.intent);
            const onboardingDone = !!profileData.profile?.onboarding_complete;
            setOnboardingComplete(onboardingDone);
            nextScreen = onboardingDone ? "home" : "profileSetup";
            setAuthDestination(me.user.email || me.user.phone || "");
          }
        } catch (error) {
          console.log("Session restore failed:", error);
          // Only forget the saved login when the server says it is invalid.
          // A network problem or server error must not sign the person out.
          if (isSessionRejected(error)) {
            // An old login that has simply run out: not an error to show.
            // The welcome screen comes up and the person logs in again (the
            // card used to sit over the log-in buttons on a fresh phone).
            await AsyncStorage.removeItem("milaan_access_token");
            await AsyncStorage.removeItem("milaan_refresh_token");
          } else {
            setAppNotice({
              title: "Could not reach Apnajoda",
              body: "Check your internet connection, then open the app again.",
              icon: "cloud-offline-outline",
              tone: "ruby",
            });
          }
        }
        const remaining = Math.max(0, 3000 - (Date.now() - started));
        ``;
        setTimeout(() => {
         if (active) {
           if (isAdminMode) {
             setScreen("adminLogin");
           } else {
          
             setScreen(showcasePreviewScreen ?? nextScreen);
           }
           setHydrated(true);
         }
        }, remaining);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated || !memberDataRuntime.allowsLocalPersistence) return;
    if (showcasePreviewScreen) return;
    const timer = setTimeout(() => {
      const onboardingScreen = (
        onboardingResumeScreens.has(screen) ? screen : "welcome"
      ) as OnboardingResumeScreen;
      void saveAppState({
        onboardingComplete,
        onboardingScreen,
        profileReminderShownAt,
        authDestination,
        verified,
        profileDraft,
        vibes: vibeList,
        intent,
        alignment,
        chats: chatMessages,
        coinBalance,
        photos: profilePhotos,
        selfieUri,
        voiceIntroUri,
        vouches,
        discoverySignals,
        smartDiscovery,
        crossedPaths,
        blockedIds,
        reports,
        safeCheckIns,
        matchFilters,
        roseLedger,
        lastSeenVisible,
        analyticsConsent,
        chatSettings,
        relationshipReflections,
        relationshipReminders,
      });
      void coupleModeRepository.save(coupleMode);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    onboardingComplete,
    screen,
    profileReminderShownAt,
    authDestination,
    verified,
    profileDraft,
    vibeList,
    intent,
    alignment,
    chatMessages,
    coinBalance,
    profilePhotos,
    selfieUri,
    voiceIntroUri,
    vouches,
    discoverySignals,
    smartDiscovery,
    crossedPaths,
    blockedIds,
    reports,
    safeCheckIns,
    matchFilters,
    roseLedger,
    lastSeenVisible,
    analyticsConsent,
    chatSettings,
    relationshipReflections,
    relationshipReminders,
    coupleMode,
  ]);
  useEffect(() => {
    // 🚨 DISABLED: Profile reminder popup band kar diya hai
    return;

    if (
      !hydrated ||
      !onboardingComplete ||
      showcasePreviewScreen ||
      appNotice ||
      !["home", "explore", "profile"].includes(screen)
    )
      return;
    const completion = buildProfileCompletion({
      profile: profileDraft,
      verified,
      photoCount: profilePhotos.length,
      hasVoiceIntro: !!voiceIntroUri,
      vouchCount: vouches.length,
      vibeCount: vibeList.length,
      intent,
      lastReminderShownAt: profileReminderShownAt,
    });
    if (!completion.reminderDue) return;
    const timer = setTimeout(() => {
      setProfileReminderShownAt(Date.now());
      setAppNotice({
        title: completion.reminderTitle,
        body: completion.reminderBody,
        icon: "person-circle-outline",
        tone: "gold",
        actionLabel: "Complete profile",
        actionScreen: "profile",
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    onboardingComplete,
    screen,
    appNotice,
    profileDraft,
    verified,
    profilePhotos.length,
    voiceIntroUri,
    vouches.length,
    vibeList.length,
    intent,
    profileReminderShownAt,
  ]);
  useEffect(() => {
    configureAnalyticsConsent(hydrated && analyticsConsent, {
      platform:
        Platform.OS === "ios" || Platform.OS === "android"
          ? Platform.OS
          : "web",
      appVersion: "1.0.0",
      buildVariant:
        appEnvironment === "production" ? "production" : "development",
    });
  }, [hydrated, analyticsConsent]);
  useEffect(() => {
    if (!hydrated) return;
    track("screen_viewed", { screen_key: screen });
    if (screen === "welcome")
      track("onboarding_started", { screen_key: "welcome" });
  }, [hydrated, screen]);
  useEffect(() => {
    if (!accessToken) return;
    const renew = async () => {
      try {
        const tokens = await authApi.refreshSavedSession();
        if (tokens) setAccessToken(tokens.accessToken);
      } catch {
        // Temporary problems (offline, server busy) are retried on the next
        // tick. The saved login is kept; it is only dropped when the app
        // restores the session and the server rejects it.
      }
    };
    // Refresh well ahead of the access token's own lifetime (15m by default).
    const interval = setInterval(() => void renew(), 5 * 60 * 1000);
    // Phones pause timers while the app is in the background, so renew right
    // away when the app comes back or the connection returns.
    const onWake = () => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      )
        void renew();
    };
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", onWake);
    if (typeof window !== "undefined")
      window.addEventListener("online", onWake);
    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onWake);
      if (typeof window !== "undefined")
        window.removeEventListener("online", onWake);
    };
  }, [accessToken]);
  useEffect(() => {
    if (!accessToken || Platform.OS !== "web") return;
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      typeof window === "undefined" ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    )
      return;
    void (async () => {
      try {
        try { if (window.localStorage.getItem("milaan.push.off") === "1") return; } catch {}
        const registration = await navigator.serviceWorker.register("/sw.js");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await pushApi.subscribe(accessToken, existing.toJSON());
          return;
        }
        const publicKey = await pushApi.getPublicKey();
        if (!publicKey) return;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await pushApi.subscribe(accessToken, subscription.toJSON());
      } catch {
        // Push notifications are optional; a failure here should not
        // interrupt anything else in the app.
      }
    })();
  }, [accessToken]);
  // The phone app: its own notifications (Expo push), and opening the chat
  // or post a tapped notification is about.
  useEffect(() => {
    if (!accessToken || Platform.OS === "web") return;
    return startNativePush(accessToken, {
      onOpenChat: (conversationId) => setPendingNotificationChat(conversationId),
      onOpenPost: (postId) => setSharedPostId(postId),
      onOpenStory: (userId) => setPendingStoryUser(userId),
    });
  }, [accessToken]);
  // Play the stories a tapped notification was about, once signed in.
  useEffect(() => {
    if (!pendingStoryUser || !accessToken || !onboardingComplete) return;
    const userId = pendingStoryUser;
    setPendingStoryUser(null);
    void loadStories(accessToken).then(() => openStoriesOf(userId));
  }, [pendingStoryUser, accessToken, onboardingComplete]);
  // Notification taps: a cold start arrives as /?chat=<id>, an already-open
  // app gets a message from the service worker. Either way, remember which
  // chat to open instead of landing on the home screen.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).get("chat");
    if (fromUrl) {
      setPendingNotificationChat(fromUrl);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("chat");
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        // Leaving the param in the address bar is harmless.
      }
    }
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;
    const onWorkerMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; conversationId?: string; postId?: string; storyUserId?: string }
        | undefined;
      if (data?.type === "open-chat" && data.conversationId)
        setPendingNotificationChat(data.conversationId);
      // A "liked / commented on your post" notification opens that post.
      if (data?.type === "open-post" && data.postId) setSharedPostId(data.postId);
      // A story like, mention or close-friends story opens their stories.
      if (data?.type === "open-story" && data.storyUserId) setPendingStoryUser(data.storyUserId);
    };
    navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
  }, []);
  useEffect(() => {
    if (!pendingNotificationChat || !hydrated || !accessToken) return;
    if (
      coupleMode.experienceMode === "couple" &&
      conversationIdFor(couplePartner) === pendingNotificationChat
    ) {
      setScreen("chat");
      setPendingNotificationChat(null);
      return;
    }
    const pool = [
      ...(serverMatches ?? []),
      ...(serverDiscoveredMatches ?? []),
      ...matches,
    ];
    const match = pool.find(
      (candidate) => conversationIdFor(candidate) === pendingNotificationChat,
    );
    if (!match) return;
    setSelected(match);
    setScreen("chat");
    setPendingNotificationChat(null);
  }, [
    pendingNotificationChat,
    hydrated,
    accessToken,
    serverMatches,
    serverDiscoveredMatches,
    coupleMode.experienceMode,
  ]);
  useEffect(() => {
    if (!hydrated || !["coupleSetup", "home", "profile"].includes(screen))
      return;
    let active = true;
    const sync = () =>
      void (
        accessToken
          ? coupleApi.getHub(accessToken)
          : fetchCurrentCoupleConnectionHubPreview()
      )
        .then((hub) => {
          if (active) applyCoupleHub(hub);
        })
        .catch(() => undefined);
    sync();
    const timer = setInterval(
      sync,
      coupleMode.experienceMode === "couple" ? 8000 : 60000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [hydrated, coupleMode.experienceMode, screen, accessToken]);
  useEffect(() => {
    if (coupleMode.experienceMode !== "couple" || !isCoupleModeRoute(screen))
      return;
    const decision = guardCoupleModeRoute(coupleMode, screen);
    if (!decision.allowed && decision.resolved !== screen)
      setScreen(decision.resolved as Screen);
  }, [coupleMode, screen]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);
  useEffect(() => {
    if (!hydrated || screen !== "chat") return;
    const matchId = conversationPartner.id;
    const backendMatchId = conversationIdFor(conversationPartner);
    let active = true;
    void Promise.all([
      fetchPersistedChatMessages(backendMatchId),
      fetchPersistedRelationshipJourney(backendMatchId),
    ]).then(([messages, journeyData]) => {
      if (!active) return;
      const journey =
        journeyData &&
        typeof journeyData === "object" &&
        !Array.isArray(journeyData)
          ? (journeyData as {
              proposal?: unknown;
              reflection?: unknown;
              reminder?: unknown;
            })
          : null;
      const proposal =
        journey?.proposal &&
        typeof journey.proposal === "object" &&
        !Array.isArray(journey.proposal)
          ? (journey.proposal as {
              id?: unknown;
              status?: unknown;
            })
          : null;
      const reflection =
        journey?.reflection &&
        typeof journey.reflection === "object" &&
        !Array.isArray(journey.reflection)
          ? (journey.reflection as {
              choice?: unknown;
              use_for_matching?: unknown;
              created_at?: unknown;
              updated_at?: unknown;
            })
          : null;
      const reminder =
        journey?.reminder &&
        typeof journey.reminder === "object" &&
        !Array.isArray(journey.reminder)
          ? (journey.reminder as {
              enabled?: unknown;
              reminder_at?: unknown;
            })
          : null;
      const proposalId =
        typeof proposal?.id === "string" ? proposal.id : undefined;
      const merged = mergeChatMessageList(
        chatMessages[matchId] ?? [],
        messages,
      );
      const latestDate = [...merged]
        .reverse()
        .find(
          (message) =>
            message.type === "date" &&
            message.date &&
            (message.date.proposalId === proposalId ||
              !message.date.proposalId),
        );
      const hydratedMessages =
        proposalId && latestDate
          ? merged.map((message) =>
              message.id === latestDate.id && message.date
                ? {
                    ...message,
                    date: {
                      ...message.date,
                      proposalId,
                      planStatus: backendDateStatus(proposal?.status),
                    },
                  }
                : message,
            )
          : merged;
      if (hydratedMessages.length > 0)
        setChatMessages((current) => ({
          ...current,
          [matchId]: mergeChatMessageList(
            current[matchId] ?? [],
            hydratedMessages,
          ),
        }));
      if (
        latestDate &&
        reflection &&
        ["continue", "pause", "close"].includes(String(reflection.choice))
      ) {
        const createdAt =
          typeof reflection.created_at === "string"
            ? Date.parse(reflection.created_at)
            : Date.now();
        const updatedAt =
          typeof reflection.updated_at === "string"
            ? Date.parse(reflection.updated_at)
            : createdAt;
        setRelationshipReflections((current) => ({
          ...current,
          [matchId]: {
            choice: reflection.choice as RelationshipReflectionChoice,
            dateMessageId: latestDate.id,
            dateProposalId: proposalId,
            useForMatching: reflection.use_for_matching === true,
            createdAt,
            updatedAt,
          },
        }));
      }
      if (latestDate && reminder) {
        setRelationshipReminders((current) => ({
          ...current,
          [matchId]: {
            enabled: reminder.enabled === true,
            dateMessageId: latestDate.id,
            dateProposalId: proposalId,
            scheduledFor:
              typeof reminder.reminder_at === "string"
                ? reminder.reminder_at
                : undefined,
            updatedAt: Date.now(),
          },
        }));
      }
    });
    const unsubscribe = subscribePersistedChatMessages(
      backendMatchId,
      (message) => {
        setChatMessages((current) => ({
          ...current,
          [matchId]: mergeChatMessageList(current[matchId] ?? [], [message]),
        }));
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrated, screen, conversationPartner.id]);
  // Realtime connection (socket.io). Connects once the person is signed in
  // and stays up app-wide; reconnects by itself. Chat falls back to the REST
  // polling below whenever it is not connected.
  useEffect(() => {
    if (!accessToken) {
      chatSocketConnectedRef.current = false;
      disconnectChatSocket();
      return;
    }
    const socket = connectChatSocket(accessToken);
    if (!socket) return;
    const onConnect = () => {
      chatSocketConnectedRef.current = true;
    };
    const onDisconnect = () => {
      chatSocketConnectedRef.current = false;
    };
    if (socket.connected) onConnect();
    const onStatusCache = (data: {
      ids?: string[];
      status?: ChatMessage["status"];
    }) => {
      if (!data?.ids || !data.status) return;
      const order: Record<string, number> = {
        sent: 0,
        delivered: 1,
        read: 2,
      };
      const status = data.status;
      data.ids.forEach((id) => {
        const known = messageStatusCacheRef.current[id];
        if (!known || (order[status] ?? 0) > (order[known] ?? 0))
          messageStatusCacheRef.current[id] = status;
      });
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    socket.on("message:status", onStatusCache);
    // The admin put a festival theme on (or off): show it at once.
    const onTheme = (data: { theme?: ActiveFestival | null }) => setFestival(data?.theme ?? null);
    socket.on("app:theme", onTheme);
    return () => {
      socket.off("app:theme", onTheme);
      socket.off("message:status", onStatusCache);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
    };
  }, [accessToken]);
  // Live events for the chat that is open: new messages, ticks, edits,
  // typing and the partner's online/offline state.
  useEffect(() => {
    if (!hydrated || screen !== "chat" || !accessToken) return;
    const socket = getChatSocket();
    if (!socket) return;
    const matchId = conversationPartner.id;
    const backendMatchId = conversationIdFor(conversationPartner);
    let partnerId = "";
    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    const rank: Record<string, number> = { sent: 0, delivered: 1, read: 2 };
    const chatVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";
    const markRead = () => {
      if (chatVisible()) emitChatRead(backendMatchId);
    };
    const patchPresence = (
      patch: Partial<{
        online: boolean;
        lastActiveAt: string | null;
        typing: boolean;
      }>,
    ) =>
      setPartnerPresence((current) => ({
        online: false,
        lastActiveAt: null,
        typing: false,
        ...(current ?? {}),
        ...patch,
      }));
    const watch = () => {
      socket.emit(
        "conversation:watch",
        backendMatchId,
        (ack?: {
          ok?: boolean;
          partnerId?: string;
          online?: boolean;
          lastActiveAt?: string | null;
          typing?: boolean;
        }) => {
          if (!ack?.ok) return;
          partnerId = ack.partnerId ?? "";
          patchPresence({
            online: !!ack.online,
            lastActiveAt: ack.lastActiveAt ?? null,
            typing: !!ack.typing,
          });
        },
      );
      markRead();
    };
    const onNew = (data: {
      conversationId?: string;
      message?: ChatMessage;
    }) => {
      if (
        data?.conversationId !== backendMatchId ||
        !isChatMessage(data.message)
      )
        return;
      const incoming = data.message;
      setChatMessages((current) => ({
        ...current,
        [matchId]: mergeChatMessageList(current[matchId] ?? [], [incoming]),
      }));
      patchPresence({ typing: false });
      markRead();
    };
    const onUpdate = (data: {
      conversationId?: string;
      message?: ChatMessage;
    }) => {
      if (
        data?.conversationId !== backendMatchId ||
        !isChatMessage(data.message)
      )
        return;
      const incoming = data.message;
      setChatMessages((current) => ({
        ...current,
        [matchId]: mergeChatMessageList(current[matchId] ?? [], [incoming]),
      }));
    };
    const onStatus = (data: {
      conversationId?: string;
      ids?: string[];
      status?: ChatMessage["status"];
    }) => {
      if (data?.conversationId !== backendMatchId || !data.ids || !data.status)
        return;
      const ids = new Set(data.ids);
      const status = data.status;
      setChatMessages((current) => ({
        ...current,
        [matchId]: (current[matchId] ?? []).map((message) =>
          ids.has(message.id) &&
          (rank[status] ?? 0) > (rank[message.status] ?? 0)
            ? { ...message, status }
            : message,
        ),
      }));
    };
    const onTyping = (data: { conversationId?: string; typing?: boolean }) => {
      if (data?.conversationId !== backendMatchId) return;
      patchPresence({ typing: !!data.typing });
      if (typingTimer) clearTimeout(typingTimer);
      // Safety: if the "stopped typing" signal is lost, clear it ourselves.
      if (data.typing)
        typingTimer = setTimeout(() => patchPresence({ typing: false }), 6000);
    };
    const onPresence = (data: {
      userId?: string;
      online?: boolean;
      lastActiveAt?: string;
    }) => {
      if (!partnerId || data?.userId !== partnerId) return;
      patchPresence({
        online: !!data.online,
        lastActiveAt: data.lastActiveAt ?? null,
        ...(data.online ? {} : { typing: false }),
      });
    };
    const onVisible = () => {
      if (chatVisible()) emitChatRead(backendMatchId);
    };
    socket.on("connect", watch);
    socket.on("message:new", onNew);
    socket.on("message:update", onUpdate);
    socket.on("message:status", onStatus);
    socket.on("typing", onTyping);
    socket.on("presence", onPresence);
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", onVisible);
    if (socket.connected) watch();
    return () => {
      if (typingTimer) clearTimeout(typingTimer);
      socket.off("connect", watch);
      socket.off("message:new", onNew);
      socket.off("message:update", onUpdate);
      socket.off("message:status", onStatus);
      socket.off("typing", onTyping);
      socket.off("presence", onPresence);
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onVisible);
      if (socket.connected) socket.emit("conversation:unwatch", backendMatchId);
    };
  }, [hydrated, screen, conversationPartner.id, accessToken]);
  // Polls the partner's real last-active status for the "online"/"last
  // seen X ago" line at the top of the chat, and now also their "is
  // typing…" status. Only while the chat screen is actually open and
  // we're talking to the live backend (not the preview catalog) — there's
  // no websocket here, so this is the same kind of short-interval REST
  // poll already used for incoming calls and messages. 3s (rather than
  // the original 15s, back from when this only drove the much
  // slower-changing online/last-seen line) keeps the typing indicator
  // feeling responsive without needing a real-time channel.
  useEffect(() => {
    if (!hydrated || screen !== "chat" || !accessToken) {
      setPartnerPresence(null);
      return;
    }
    let active = true;
    const backendMatchId = conversationIdFor(conversationPartner);
    let tick = 0;
    const poll = () => {
      tick += 1;
      // Presence/typing arrive over the socket; poll only every ~30s then.
      if (chatSocketConnectedRef.current && tick % 10 !== 1) return;
      void chatApi
        .getPresence(accessToken, backendMatchId)
        .then((presence) => {
          if (active) setPartnerPresence(presence);
        })
        .catch(() => undefined);
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [hydrated, screen, conversationPartner.id, accessToken]);

  /**
   * A call has to reach you wherever you are in the app.
   *
   * Incoming calls were only noticed by a poll inside the chat screen, and
   * only for the one conversation open on it. Anywhere else - Home, Likes,
   * your own profile, a different thread - the phone never rang. Push was
   * meant to cover that, but push needs VAPID keys and there are none, so
   * notifyUser did nothing and a call reached nobody who was not already
   * looking at that exact chat.
   *
   * The socket now carries the call, so it arrives at once. The poll stays
   * as the fallback for a socket that has dropped, at a slow interval since
   * it is only a safety net. Either way the thread is opened, and the chat
   * screen's own banner and ringtone take it from there.
   */
  const handledCallRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !accessToken) return;
    let active = true;

    const open = (call: {
      id: string;
      callerId: string;
      callerName: string;
    }) => {
      if (!active || handledCallRef.current === call.id) return;
      handledCallRef.current = call.id;
      if (screen === "chat" && conversationPartner.id === call.callerId) return;
      openConversationWith({
        userId: call.callerId,
        username: "",
        name: call.callerName || "Someone",
        avatarUrl: null,
        isPrivate: false,
      });
    };

    const socket = getChatSocket();
    const onIncoming = (data: {
      callId: string;
      callerId: string;
      callerName: string;
    }) =>
      open({
        id: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
      });
    socket?.on("call:incoming", onIncoming);

    const poll = () => {
      if (isChatSocketConnected()) return;
      void callApi
        .getIncoming(accessToken)
        .then((call) => call && open(call))
        .catch(() => undefined);
    };
    poll();
    const timer = setInterval(poll, 5000);

    return () => {
      active = false;
      socket?.off("call:incoming", onIncoming);
      clearInterval(timer);
    };
  }, [hydrated, accessToken, screen, conversationPartner.id]);

  useEffect(() => {
    if (!hydrated || screen !== "chat" || !accessToken) return;
    let active = true;
    void chatApi
      .getSettings(accessToken, conversationIdFor(conversationPartner))
      .then((settings) => {
        if (!active || !settings) return;
        setChatSettings((current) => ({
          ...current,
          [conversationPartner.id]: settings,
        }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hydrated, screen, conversationPartner.id, accessToken]);
  useEffect(() => {
    if (!hydrated || screen !== "chat" || !accessToken) return;
    let active = true;
    void safetyApi
      .getBlockStatus(accessToken, profileIdFor(conversationPartner))
      .then((blocked) => {
        if (!active) return;
        setBlockedIds((current) => {
          const already = current.includes(conversationPartner.id);
          if (blocked && !already) return [...current, conversationPartner.id];
          if (!blocked && already)
            return current.filter((id) => id !== conversationPartner.id);
          return current;
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hydrated, screen, conversationPartner.id, accessToken]);
  // Every hook must run on every render, so these sit above the early
  // return below. Placed after it, they only ran once the fonts had loaded,
  // React saw a different number of hooks and the whole app crashed.
  const refreshSparkWallet = useCallback(async () => {
    if (!accessToken) return;
    try {
      setSparkWallet(await matchApi.sparkWallet(accessToken));
    } catch {
      // Leave the last known count; the send itself is checked on the server.
    }
  }, [accessToken]);
  useEffect(() => {
    void refreshSparkWallet();
  }, [refreshSparkWallet]);
  // Whichever save takes the profile to 100%, say so and show the new
  // Super Like straight away.
  useEffect(
    () =>
      onProfileReward(() => {
        setCompletionRewardClaimed(true);
        void refreshSparkWallet();
        setAppNotice({
          title: "Profile complete! 🎉",
          body: "You earned a free Super Like. Use it on someone special.",
          icon: "star",
          tone: "gold",
        });
      }),
    [refreshSparkWallet],
  );
  if (!fontsLoaded)
    return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  const navigateTo = (target: Screen) => {
    setScreen(target);
  };
  // const openCoupleTool = (tool: Exclude<CoupleLaunchTool, null>) => {
  //   if (!coupleAccess.capabilities.canPlayGames) {
  //     navigateTo("chat");
  //     return;
  //   }
  //   setChatLaunchTool(tool);
  //   navigateTo("chat");
  // };
  const fetchPersistedChatMessages = (conversationId: string) =>
    accessToken
      ? chatApi.fetchMessages(accessToken, conversationId)
      : fetchPersistedChatMessagesPreview(conversationId);
  const subscribePersistedChatMessages = (
    conversationId: string,
    onMessage: (message: ChatMessage) => void,
  ) => {
    if (!accessToken)
      return subscribePersistedChatMessagesPreview(conversationId, onMessage);
    let active = true;
    let sinceMs = Date.now();
    let tick = 0;
    const poll = () => {
      if (!active) return;
      tick += 1;
      // Socket delivers new messages instantly; poll only every ~15s then.
      if (chatSocketConnectedRef.current && tick % 5 !== 0) return;
      const pollStartedAt = Date.now();
      void chatApi
        .fetchMessagesSince(accessToken, conversationId, sinceMs)
        .then((messages) => {
          if (!active) return;
          sinceMs = pollStartedAt;
          messages.forEach(onMessage);
        })
        .catch(() => undefined);
    };
    const timer = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  };
  const persistChatMessage = (conversationId: string, message: ChatMessage) =>
    accessToken
      ? chatApi.sendMessage(accessToken, conversationId, message)
      : persistChatMessagePreview(conversationId, message);
  const persistDateProposal = (
    conversationId: string,
    date: NonNullable<ChatMessage["date"]>,
  ) =>
    accessToken
      ? chatApi.sendDateProposal(accessToken, conversationId, date)
      : persistDateProposalPreview(conversationId, date);
  const persistLiveLocationShare = (
    conversationId: string,
    location: NonNullable<ChatMessage["location"]>,
    clientActionId: string,
  ) =>
    accessToken
      ? chatApi.shareLiveLocation(
          accessToken,
          conversationId,
          location,
          clientActionId,
        )
      : persistLiveLocationSharePreview(
          conversationId,
          location,
          clientActionId,
        );
  const persistMessageEdit = (
    conversationId: string,
    messageId: string,
    text: string,
  ) =>
    accessToken
      ? chatApi.editMessage(accessToken, conversationId, messageId, text)
      : persistMessageEditPreview(conversationId, messageId, text);
  const persistMessageDelete = (conversationId: string, messageId: string) =>
    accessToken
      ? chatApi.deleteMessage(accessToken, conversationId, messageId)
      : persistMessageDeletePreview(conversationId, messageId);
  const persistMessageUserState = (
    conversationId: string,
    messageId: string,
    input: {
      starred?: boolean;
      pinned?: boolean;
      hidden?: boolean;
      reaction?: string | null;
    },
  ) =>
    accessToken
      ? chatApi.setMessageState(accessToken, conversationId, messageId, input)
      : persistMessageUserStatePreview(conversationId, messageId, input);
  // Resolves to null when nobody has an account with that phone / email,
  // so the screen can offer to invite them instead of showing an error.
  const confirmMemberMutation = (
    result: MemberMutationResult,
    title: string,
    fallback: string,
  ) => {
    if (canCommitMemberMutation(memberDataRuntime, result)) return true;
    setAppNotice({
      title,
      body: memberMutationFailureMessage(result, fallback),
      icon: "cloud-offline-outline",
      tone: "ruby",
    });
    return false;
  };
  const trackDiscovery = (type: DiscoverySignal["type"], match: Match) => {
    track("discovery_signal", { type });
    setDiscoverySignals((current) => [
      ...current.slice(-49),
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        matchId: match.id,
        createdAt: Date.now(),
      },
    ]);
    if (type === "view")
      void persistDiscoverySignal(profileIdFor(match), "view");
  };
  const openDetail = (m: Match) => {
    trackDiscovery("view", m);
    setSelected(m);
    setScreen("detail");
  };
  /**
   * Like somebody found by searching, rather than met in the deck.
   *
   * The same decision the deck records, so it lands in their Likes tab and
   * they can accept it. This used to call socialApi.follow, which wrote a
   * follow row that the Likes tab never reads and that messaging - gated on
   * a mutual like - never unlocks: the like went nowhere.
   */
  const likeFromSearch = async (
    userId: string,
  ): Promise<"accepted" | "pending"> => {
    if (!accessToken) return "pending";
    const result = await matchApi.decide(accessToken, userId, "interested");
    if (result?.mutual) {
      await loadChatsAndMatches(accessToken);
      return "accepted";
    }
    setAppNotice({
      title: "Like sent",
      body: "They will see it in their Likes. If they like you back, the chat opens.",
      icon: "heart-outline",
    });
    return "pending";
  };

  /**
   * Who in your phone's contacts is on Apnajoda, and who to invite. The phone
   * app reads the whole address book (with permission); on Android Chrome
   * the screen passes the contacts you picked. Names stay on the phone.
   */
  const onMatchContacts = async (picked?: BookContact[]): Promise<ContactsMatchResult> => {
    let contacts: BookContact[] = picked ?? [];
    if (!picked) {
      if (Platform.OS === "web") return { matched: [], unmatched: [], invites: [] };
      const Contacts = await import("expo-contacts");
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Allow Contacts for Apnajoda to find people you know.");
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      contacts = data.map((c) => ({
        name: c.name || [c.firstName, c.lastName].filter(Boolean).join(" "),
        phones: (c.phoneNumbers || []).map((p) => p.number || "").filter(Boolean),
      }));
    }
    const book = contactBook(contacts);
    if (!book.phones.length) {
      throw new Error("No Indian mobile numbers found in your contacts.");
    }
    const result = await socialApi.matchContacts(accessToken, book.phones);
    return { ...result, invites: invitesFor(result.unmatched, book.names) };
  };

  const chooseInterested = async (match: Match) => {
    if (accessToken) {
      try {
        const result = await matchApi.decide(
          accessToken,
          match.id,
          "interested",
        );
        setSelected(match);
        trackDiscovery("interested", match);
        setDismissedIds((current) => [...new Set([...current, match.id])]);
        if (result.mutual) {
          setScreen("mutual");
          return;
        }
        setAppNotice({
          title: "Interest sent privately",
          body: `If ${match.name} chooses you too, Apnajoda will open a mutual match and icebreaker.`,
          icon: "heart-outline",
          tone: "gold",
        });
      } catch (error) {
        setAppNotice({
          title: "Interest not sent",
          body:
            error instanceof Error
              ? error.message
              : "Your interest could not be confirmed. Please try again.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchDecision(
      profileIdFor(match),
      "interested",
    );
    if (
      !confirmMemberMutation(
        result,
        "Interest not sent",
        "Your interest could not be confirmed. Please try again.",
      )
    )
      return;
    setSelected(match);
    trackDiscovery("interested", match);
    if (
      memberDataRuntime.source === "preview" ||
      isMutualMatchDecision(result.data)
    ) {
      setScreen("mutual");
      return;
    }
    setDismissedIds((current) => [...new Set([...current, match.id])]);
    setAppNotice({
      title: "Interest sent privately",
      body: `If ${match.name} chooses you too, Apnajoda will open a mutual match and icebreaker.`,
      icon: "heart-outline",
      tone: "gold",
    });
  };
  const passMatch = async (match: Match) => {
    if (accessToken) {
      try {
        await matchApi.decide(accessToken, match.id, "pass");
        trackDiscovery("skip", match);
        setDismissedIds((current) => [...new Set([...current, match.id])]);
      } catch (error) {
        setAppNotice({
          title: "Pass not saved",
          body:
            error instanceof Error
              ? error.message
              : "This profile could not be removed securely. Please try again.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchDecision(profileIdFor(match), "pass");
    if (
      !confirmMemberMutation(
        result,
        "Pass not saved",
        "This profile could not be removed securely. Please try again.",
      )
    )
      return;
    trackDiscovery("skip", match);
    setDismissedIds((current) => [...new Set([...current, match.id])]);
  };
  const answerIcebreaker = async (_answer: string) => {
    setScreen("chat");
  };
  // A signed-in member only ever sees real people; the samples stay in the
  // signed-out showcase. See deckCandidates for why this is not a `??`.
  const candidates = deckCandidates({
    serverDiscovered: serverDiscoveredMatches,
    samples: matches,
    signedIn: memberDataRuntime.source === "server",
  });
  const localRankedMatches = rankMatches(
    candidates,
    { intent, vibes: vibeList, filters: matchFilters },
    discoverySignals,
    blockedIds,
    smartDiscovery,
  );
  const rankedMatches =
    serverMatches === null
      ? localRankedMatches
      : serverMatches.filter((match) => !blockedIds.includes(match.id));
  const visibleMatches = rankedMatches.filter(
    (match) => !dismissedIds.includes(match.id),
  );
  // Signed in, the server is the only source of truth. The local ledger is
  // for the preview build only - it is what let a reinstall hand out a
  // second free Spark.
  const roseAvailability: RoseAvailability = accessToken
    ? {
        freeAvailable: sparkWallet?.freeSparkAvailable ?? false,
        paidCredits: sparkWallet?.sparks ?? 0,
        superlikes: sparkWallet?.superlikes ?? 0,
      }
    : getRoseAvailability(roseLedger);
  const openRose = (match: Match) => {
    setRoseTarget(match);
    void refreshSparkWallet();
  };
  const createRoseMessage = (note: string): ChatMessage => ({
    id: `spark-${Date.now()}`,
    type: "rose",
    text: note,
    rose: { name: "Golden Spark", emoji: "✨" },
    createdAt: Date.now(),
    status: "sent",
  });
  const appendChatMessage = async (match: Match, message: ChatMessage) => {
    const matchId = match.id;
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode) {
      setChatMessages((current) => ({
        ...current,
        [matchId]: [...(current[matchId] ?? []), message],
      }));
      return true;
    }
    let nextMessage = message;
    if (message.type === "date" && message.date) {
      const proposalResult = await persistDateProposal(
        conversationIdFor(match),
        message.date,
      );
      if (
        !confirmMemberMutation(
          proposalResult,
          "Meet-up plan not sent",
          "Your date proposal could not be confirmed. Please try again.",
        )
      )
        return false;
      const data = proposalResult.data as
        | {
            id?: unknown;
            status?: unknown;
          }
        | undefined;
      if (typeof data?.id === "string")
        nextMessage = {
          ...message,
          date: {
            ...message.date,
            proposalId: data.id,
            planStatus: data.status === "accepted" ? "accepted" : "proposed",
          },
        };
    }
    if (message.type === "location" && message.location?.live) {
      const locationResult = await persistLiveLocationShare(
        conversationIdFor(match),
        message.location,
        message.id,
      );
      if (
        !confirmMemberMutation(
          locationResult,
          "Location not shared",
          "Your live location could not be activated securely.",
        )
      )
        return false;
    }
    const result = await persistChatMessage(
      conversationIdFor(match),
      nextMessage,
    );
    if (
      !confirmMemberMutation(
        result,
        "Message not sent",
        "Your message could not be delivered securely. Please try again.",
      )
    )
      return false;
    if (!isChatMessage(result.data)) {
      setAppNotice({
        title: "Message not sent",
        body: "The secure server returned an invalid message acknowledgement.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return false;
    }
    const acknowledged = result.data as ChatMessage;
    const cachedStatus = messageStatusCacheRef.current[acknowledged.id];
    const statusOrder: Record<string, number> = {
      sent: 0,
      delivered: 1,
      read: 2,
    };
    const withStatus =
      cachedStatus &&
      (statusOrder[cachedStatus] ?? 0) > (statusOrder[acknowledged.status] ?? 0)
        ? { ...acknowledged, status: cachedStatus }
        : acknowledged;
    setChatMessages((current) => ({
      ...current,
      [matchId]: mergeChatMessageList(current[matchId] ?? [], [withStatus]),
    }));
    return true;
  };
  const replaceChatMessage = (
    matchId: string,
    messageId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    setChatMessages((current) => ({
      ...current,
      [matchId]: (current[matchId] ?? []).map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    }));
  };
  const editChatMessage = async (
    match: Match,
    messageId: string,
    text: string,
  ) => {
    const current = (chatMessages[match.id] ?? []).find(
      (message) => message.id === messageId,
    );
    if (
      !current ||
      current.mine === false ||
      current.type !== "text" ||
      current.deletedForEveryone
    )
      return false;
    const edited = applyMessageEdit(current, text);
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode) {
      replaceChatMessage(match.id, messageId, () => edited);
      return true;
    }
    const result = await persistMessageEdit(
      conversationIdFor(match),
      messageId,
      edited.text ?? "",
    );
    if (
      !confirmMemberMutation(
        result,
        "Message not edited",
        "The edited message could not be confirmed.",
      )
    )
      return false;
    if (isChatMessage(result.data))
      replaceChatMessage(match.id, messageId, () => result.data as ChatMessage);
    return true;
  };
  const deleteChatMessage = async (match: Match, messageId: string) => {
    const current = (chatMessages[match.id] ?? []).find(
      (message) => message.id === messageId,
    );
    if (!current || current.mine === false) return false;
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode) {
      replaceChatMessage(match.id, messageId, (message) =>
        applyMessageDeletion(message),
      );
      return true;
    }
    const result = await persistMessageDelete(
      conversationIdFor(match),
      messageId,
    );
    if (
      !confirmMemberMutation(
        result,
        "Message not deleted",
        "The delete request could not be confirmed.",
      )
    )
      return false;
    if (isChatMessage(result.data))
      replaceChatMessage(match.id, messageId, () => result.data as ChatMessage);
    return true;
  };
  const updateChatMessageState = async (
    match: Match,
    messageId: string,
    input: {
      starred?: boolean;
      pinned?: boolean;
      hidden?: boolean;
      reaction?: string | null;
    },
  ) => {
    replaceChatMessage(match.id, messageId, (message) => ({
      ...message,
      starredByMe: input.starred ?? message.starredByMe,
      pinnedAt:
        input.pinned === undefined
          ? message.pinnedAt
          : input.pinned
            ? Date.now()
            : undefined,
      reactions:
        input.reaction === undefined
          ? message.reactions
          : { ...message.reactions, me: input.reaction ?? "" },
    }));
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode)
      return true;
    const result = await persistMessageUserState(
      conversationIdFor(match),
      messageId,
      input,
    );
    if (!result.saved) {
      setAppNotice({
        title: "Message action not synced",
        body: memberMutationFailureMessage(
          result,
          "Try the action again when your connection is stable.",
        ),
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return false;
    }
    return true;
  };
  const forwardChatMessages = async (
    target: Match,
    sourceMessages: ChatMessage[],
  ) => {
    let sent = 0;
    for (const source of sourceMessages) {
      if (source.deletedForEveryone) continue;
      const clone: ChatMessage = {
        ...source,
        id: `forward-${Date.now()}-${sent}-${Math.random().toString(36).slice(2, 6)}`,
        mine: true,
        senderId: undefined,
        forwarded: true,
        editedAt: undefined,
        reactions: undefined,
        starredByMe: undefined,
        pinnedAt: undefined,
        createdAt: Date.now() + sent,
        status: "sent",
      };
      if (await appendChatMessage(target, clone)) sent += 1;
    }
    return sent;
  };
  // const updateLastSeenPrivacy = async (value: boolean) => {
  //   const result = await persistPrivacySettings({
  //     lastSeenVisible: value,
  //     onlineStatusVisible: value,
  //   });
  //   if (
  //     !confirmMemberMutation(
  //       result,
  //       "Privacy setting not saved",
  //       "Your visibility setting could not be confirmed.",
  //     )
  //   )
  //     return;
  //   setLastSeenVisible(value);
  // };
  // const updateAnalyticsPrivacy = async (value: boolean) => {
  //   const result = await persistPrivacySettings({ analyticsConsent: value });
  //   if (
  //     !confirmMemberMutation(
  //       result,
  //       "Privacy setting not saved",
  //       "Your analytics choice could not be confirmed.",
  //     )
  //   )
  //     return;
  //   setAnalyticsConsent(value);
  // };
  const updateSelectedChatSettings = async (settings: CoupleChatSettings) => {
    if (isPreviewAccessMode && !accessToken) {
      setChatSettings((current) => ({
        ...current,
        [conversationPartner.id]: settings,
      }));
      return;
    }
    const result = accessToken
      ? await chatApi.saveSettings(
          accessToken,
          conversationIdFor(conversationPartner),
          settings,
        )
      : await persistChatSettingsPreview(
          conversationIdFor(conversationPartner),
          settings,
        );
    if (
      !confirmMemberMutation(
        result,
        "Chat settings not saved",
        "Your conversation settings could not be confirmed.",
      )
    )
      return;
    setChatSettings((current) => ({
      ...current,
      [conversationPartner.id]: settings,
    }));
  };
  const completeOnboarding = async () => {
    if (!isPreviewAccessMode && !accessToken) {
      const result = await persistOnboardingProfile({
        profile: profileDraft,
        photos: profilePhotos,
        selfieUri,
        voiceIntroUri,
        vibes: vibeList,
        intent,
        alignment,
        smartDiscovery,
        crossedPaths,
        lastSeenVisible,
        matchFilters,
      });
      if (
        !confirmMemberMutation(
          result,
          "Profile not completed",
          "Your profile could not be saved securely. Please try again.",
        )
      )
        return;
    }
    if (accessToken) {
      try {
        await profileApi.updateProfile(
          accessToken,
          buildProfilePayload(profileDraft),
        );

        await profileApi.updatePhotos(accessToken, profilePhotos);
        await profileApi.updateVibes(accessToken, vibeList);
        await profileApi.updateIntent(accessToken, {
          intent,
          timeline: alignment.timeline,
          children: alignment.children,
          family: alignment.family,
          relocation: alignment.relocation,
        });
        await profileApi.updatePreferences(accessToken, {
          lookingFor: matchFilters.lookingFor,
          minAge: matchFilters.minAge,
          maxAge: matchFilters.maxAge,
          cities: matchFilters.cities,
          intents: matchFilters.intents,
          mustHaveVibes: matchFilters.mustHaveVibes,
          familyPriority: matchFilters.familyPriority,
          children: matchFilters.children,
          marriageTimeline: matchFilters.marriageTimeline,
          relocation: matchFilters.relocation,
          distancePreference: matchFilters.distancePreference,
          smartDiscovery,
        });
        await profileApi.completeOnboarding(accessToken);
      } catch (error) {
        setAppNotice({
          title: "Profile sync failed",
          body:
            error instanceof Error
              ? error.message
              : "Your profile could not be saved to the server. Please try again.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
        return;
      }
    }
    setOnboardingComplete(true);
    setScreen("home");
    if (memberDataRuntime.source === "server" && !isPreviewAccessMode)
      await refreshServerMatches();
  };
  const updateMatchFilters = async (next: MatchFilters) => {
    if (accessToken) {
      try {
        await profileApi.updatePreferences(accessToken, {
          lookingFor: next.lookingFor,
          minAge: next.minAge,
          maxAge: next.maxAge,
          cities: next.cities,
          intents: next.intents,
          mustHaveVibes: next.mustHaveVibes,
          familyPriority: next.familyPriority,
          children: next.children,
          marriageTimeline: next.marriageTimeline,
          relocation: next.relocation,
          distancePreference: next.distancePreference,
          smartDiscovery,
        });
        setMatchFilters(next);
      } catch (error) {
        setAppNotice({
          title: "Preferences not saved",
          body:
            error instanceof Error
              ? error.message
              : "Your match preferences could not be confirmed.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchingPreferences({
      filters: next,
      profile: profileDraft,
      alignment,
      smartDiscovery,
    });
    if (
      !confirmMemberMutation(
        result,
        "Preferences not saved",
        "Your match preferences could not be confirmed.",
      )
    )
      return;
    setMatchFilters(next);
  };
  const updateSmartDiscovery = async (enabled: boolean) => {
    if (accessToken) {
      try {
        await profileApi.updatePreferences(accessToken, {
          lookingFor: matchFilters.lookingFor,
          minAge: matchFilters.minAge,
          maxAge: matchFilters.maxAge,
          cities: matchFilters.cities,
          intents: matchFilters.intents,
          mustHaveVibes: matchFilters.mustHaveVibes,
          familyPriority: matchFilters.familyPriority,
          children: matchFilters.children,
          marriageTimeline: matchFilters.marriageTimeline,
          relocation: matchFilters.relocation,
          distancePreference: matchFilters.distancePreference,
          smartDiscovery: enabled,
        });
        setSmartDiscovery(enabled);
      } catch (error) {
        setAppNotice({
          title: "Discovery setting not saved",
          body:
            error instanceof Error
              ? error.message
              : "Smart Discovery could not be updated securely.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchingPreferences({
      filters: matchFilters,
      profile: profileDraft,
      alignment,
      smartDiscovery: enabled,
    });
    if (
      !confirmMemberMutation(
        result,
        "Discovery setting not saved",
        "Smart Discovery could not be updated securely.",
      )
    )
      return;
    setSmartDiscovery(enabled);
  };
  const clearMatchingActivity = async () => {
    const result = await persistClearMatchingLearning();
    if (
      !confirmMemberMutation(
        result,
        "Activity not cleared",
        "Your matching activity could not be cleared securely.",
      )
    )
      return;
    setDiscoverySignals([]);
  };
  // "I'm safe" for a date plan, from Safety Center (the date card has the same button).
  const recordSafeCheckIn = async (id: string) => {
    if (memberDataRuntime.source === "preview" || !accessToken) {
      setSafeCheckIns((current) => [...new Set([...current, id])]);
      return;
    }
    const message = Object.values(chatMessages).flat().find((m) => m.id === id);
    const proposalId = message?.date?.proposalId;
    const result = proposalId ? await chatApi.dateCheckIn(accessToken, proposalId).catch(() => null) : null;
    if (result?.saved) {
      setSafeCheckIns((current) => [...new Set([...current, id])]);
      return;
    }
    setAppNotice({
      title: "Check-in not recorded",
      body: result?.error || "You can check in once the date is accepted.",
      icon: "shield-outline",
      tone: "ruby",
    });
  };
  const reportMatch = async (
    match: Match,
    reason: string,
    details?: string,
  ) => {
    const reportId = `report-${Date.now()}`;
    const result = accessToken
      ? await safetyApi.report(
          accessToken,
          profileIdFor(match),
          reason,
          details,
          reportId,
        )
      : await persistReportPreview(
          profileIdFor(match),
          reason,
          details,
          reportId,
        );
    if (
      !confirmMemberMutation(
        result,
        "Report not submitted",
        "Your safety report could not be confirmed. Please try again.",
      )
    )
      return false;
    setReports((current) => [
      ...current,
      {
        id: reportId,
        matchId: match.id,
        reason,
        details,
        createdAt: Date.now(),
      },
    ]);
    setAppNotice({
      title: "Report submitted privately",
      body: "Your report is saved for safety review. The other member is not notified.",
      icon: "flag-outline",
      tone: "gold",
    });
    return true;
  };
  const blockMatch = async (match: Match) => {
    const result = accessToken
      ? await safetyApi.block(accessToken, profileIdFor(match))
      : await persistBlockPreview(profileIdFor(match));
    if (
      !confirmMemberMutation(
        result,
        "Member not blocked",
        "The private block could not be confirmed. Please try again.",
      )
    )
      return false;
    setBlockedIds((current) => [...new Set([...current, match.id])]);
    setDismissedIds((current) => [...new Set([...current, match.id])]);
    setAppNotice({
      title: "Blocked privately",
      body: `${match.name} is hidden from your matches, likes and chats. They will not be notified.`,
      icon: "ban-outline",
      tone: "ruby",
    });
    return true;
  };
  const unblockMatch = async (match: Match) => {
    if (accessToken) {
      const result = await safetyApi.unblock(accessToken, profileIdFor(match));
      if (
        !confirmMemberMutation(
          result,
          "Could not unblock",
          "The unblock could not be confirmed. Please try again.",
        )
      )
        return false;
    }
    setBlockedIds((current) => current.filter((id) => id !== match.id));
    setAppNotice({
      title: "Unblocked",
      body: `${match.name} can appear in your matches and chats again.`,
      icon: "checkmark-circle-outline",
      tone: "gold",
    });
    return true;
  };
  const unmatchMatch = async (match: Match) => {
    const result = accessToken
      ? await safetyApi.unmatch(accessToken, conversationIdFor(match))
      : await persistUnmatchPreview(
          conversationIdFor(match),
          `unmatch-${Date.now()}`,
        );
    if (
      !confirmMemberMutation(
        result,
        "Could not unmatch",
        "The relationship could not be closed securely. Please try again.",
      )
    )
      return false;
    setDismissedIds((current) => [...new Set([...current, match.id])]);
    setAppNotice({
      title: "Unmatched",
      body: `${match.name} has been removed from your introductions and conversation flow.`,
      icon: "person-remove-outline",
      tone: "rose",
    });
    return true;
  };
  const sendRose = async (
    match: Match,
    note: string,
    kind: "spark" | "superlike" = "spark",
  ) => {
    if (accessToken) {
      try {
        const result = await matchApi.sendSpark(accessToken, {
          targetId: profileIdFor(match),
          kind,
          note,
        });
        setSparkWallet(result.wallet);
        setSelected(match);
        trackDiscovery("interested", match);
        setDismissedIds((current) => [...new Set([...current, match.id])]);
        if (result.mutual) {
          setScreen("mutual");
          return;
        }
        setAppNotice({
          title: kind === "superlike" ? "Super Like sent ⭐" : "Spark sent ✨",
          body: `${match.name} will see you at the top of their Likes with your note.`,
          icon: kind === "superlike" ? "star" : "sparkles",
          tone: "gold",
        });
      } catch (error) {
        setAppNotice({
          title: kind === "superlike" ? "Super Like not sent" : "Spark not sent",
          body:
            error instanceof Error
              ? error.message
              : "It could not be sent. Please try again.",
          icon: "sparkles",
          tone: "ruby",
        });
        void refreshSparkWallet();
      }
      return;
    }
    const today = todayKey();
    const available = getRoseAvailability(roseLedger);
    if (!available.freeAvailable && available.paidCredits <= 0) {
      setAppNotice({
        title: "That is today's Spark",
        body: "One Golden Spark a day, free for everyone. Yours comes back tomorrow.",
        icon: "sparkles",
        tone: "gold",
      });
      return;
    }
    const paid = !available.freeAvailable;
    setRoseLedger((current) => ({
      dayKey: today,
      freeUsed: paid ? current.freeUsed : true,
      paidCredits: paid
        ? Math.max(0, current.paidCredits - 1)
        : current.paidCredits,
      sent: [
        ...current.sent.slice(-49),
        {
          id: `rose-${Date.now()}`,
          matchId: match.id,
          note,
          paid,
          createdAt: Date.now(),
        },
      ],
    }));
    trackDiscovery("interested", match);
    void persistMatchDecision(profileIdFor(match), "interested");
    appendChatMessage(match, createRoseMessage(note));
    setRosePopup({ match, note, paid });
  };
  const resetDemo = async () => {
    await Promise.all([clearAppState(), coupleModeRepository.clear()]);
    setCoupleMode(initialCoupleModeState);
    setChatLaunchTool(null);
    setVerified(initialPersistedState.verified);
    setProfileDraft(initialPersistedState.profileDraft);
    setVibeList(initialPersistedState.vibes);
    setIntent(initialPersistedState.intent);
    setAlignment(initialPersistedState.alignment);
    setChatMessages(initialPersistedState.chats);
    setChatDrafts({});
    setCoinBalance(initialPersistedState.coinBalance);
    setProfilePhotos(initialPersistedState.photos);
    setSelfieUri("");
    setVoiceIntroUri("");
    setVouches([]);
    setDiscoverySignals([]);
    setSmartDiscovery(true);
    setCrossedPaths(false);
    setBlockedIds([]);
    setReports([]);
    setSafeCheckIns([]);
    setMatchFilters(defaultMatchFilters);
    setRoseLedger(initialPersistedState.roseLedger);
    setLastSeenVisible(initialPersistedState.lastSeenVisible);
    setAnalyticsConsent(initialPersistedState.analyticsConsent);
    setChatSettings(initialPersistedState.chatSettings);
    setRelationshipReflections(initialPersistedState.relationshipReflections);
    setRelationshipReminders(initialPersistedState.relationshipReminders);
    setProfileReminderShownAt(initialPersistedState.profileReminderShownAt);
    setRosePopup(null);
    setAppNotice(null);
    setDetailSafetyOpen(false);
    setDismissedIds([]);
    // setProfileViewNotifiedIds([]);
    setAuthDestination("");
    setOnboardingComplete(false);
    setScreen("welcome");
  };
  const deleteAccount = async () => {
    try {
      if (accessToken) {
        await authApi.deleteAccount(accessToken);
      } else {
        await requestAccountDeletion();
      }
    } catch (error) {
      setAppNotice({
        title: "Account not deleted",
        body:
          error instanceof Error
            ? error.message
            : "Your account could not be deleted. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return;
    } finally {
      await AsyncStorage.removeItem("milaan_access_token");
      await AsyncStorage.removeItem("milaan_refresh_token");
      setAccessToken("");
      await resetDemo();
    }
  };
  /** Drops the saved tokens and local state. Shared by log out and deactivate. */
  const clearLocalSession = async () => {
    await AsyncStorage.removeItem("milaan_access_token");
    await AsyncStorage.removeItem("milaan_refresh_token");
    setAccessToken("");
    setIsAdmin(false);
    await resetDemo();
  };

  const logout = async () => {
    try {
      if (accessToken) await forgetNativePush(accessToken);
      if (accessToken) await authApi.logout(accessToken);
    } catch {
      // A failed sign-out call still clears this device.
    }
    await clearLocalSession();
  };
  const deactivateAccount = async () => {
    if (!accessToken) return;
    try {
      await authApi.deactivateAccount(accessToken);
    } catch (error) {
      // The account is still active on the server, so the local session must
      // stay: clearing it here would lock the member out of a live account.
      setAppNotice({
        title: "Account not deactivated",
        body:
          error instanceof Error
            ? error.message
            : "Your account could not be deactivated. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return;
    }
    await clearLocalSession();
  };
  const pickQuickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAppNotice({
        title: "Photo access needed",
        body: "Allow photo access to add a picture, or skip it for now.",
        icon: "images-outline",
        tone: "ruby",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setQuickProfile((current) => ({
        ...current,
        photoUri: result.assets[0]!.uri,
      }));
    }
  };

  /**
   * Saves the short profile and opens the app. Everything else — height,
   * city, work, community, vibes, intent — is optional and lives behind
   * "Complete your profile" on the profile screen.
   */
  const saveQuickProfile = async () => {
    const next: ProfileDraft = {
      ...profileDraft,
      firstName: quickProfile.firstName.trim(),
      age: quickProfile.age,
      gender: quickProfile.gender,
    };
    setProfileDraft(next);
    const photos = quickProfile.photoUri
      ? [quickProfile.photoUri]
      : profilePhotos;
    if (quickProfile.photoUri) setProfilePhotos(photos);

    if (accessToken) {
      await profileApi.updateProfile(accessToken, buildProfilePayload(next));
      if (quickProfile.photoUri) {
        await profileApi.updatePhotos(accessToken, photos);
      }
      await profileApi.completeOnboarding(accessToken);
    }

    setOnboardingComplete(true);
    onboardingCompleteRef.current = true;
    setScreen("home");
  };

  /**
   * Everything that has to happen once the server hands us a session, whether
   * it came from sign-up, sign-in or a password reset. Returns the screen to
   * show next so each caller does not have to work it out again.
   */
  const adoptSession = async (session: {
    accessToken: string;
    refreshToken: string;
    user?: {
      phone?: string | null;
      username?: string | null;
      isPrivate?: boolean;
      role?: string | null;
    };
  }): Promise<Screen> => {
    await AsyncStorage.setItem("milaan_access_token", session.accessToken);
    await AsyncStorage.setItem("milaan_refresh_token", session.refreshToken);
    setAccessToken(session.accessToken);
    setAuthDestination(session.user?.phone || session.user?.username || "");
    applyAccountPrivacyFrom(session.user);
    setIsAdmin(session.user?.role === "admin");

    // A member who already has a profile goes straight in; a brand-new one
    // sees the short profile screen. If the profile call fails we send them
    // to the short screen rather than into an empty app.
    try {
      const profileData = await profileApi.getMyProfile(session.accessToken);
      if (profileData.profile) {
        setProfileDraft((current) => ({
          ...current,
          firstName: profileData.profile.first_name ?? current.firstName,
          gender: profileData.profile.gender ?? current.gender,
          age: profileData.profile.age
            ? String(profileData.profile.age)
            : current.age,
          height: profileData.profile.height ?? current.height,
          city: profileData.profile.city ?? current.city,
          profession: profileData.profile.profession ?? current.profession,
          religion: profileData.profile.religion ?? current.religion,
          community: profileData.profile.community ?? current.community,
          bio: readBio(profileData.profile, (current as any).bio ?? ""),
          hobbies: readHobbies(profileData.profile), // <-- YEH ADD KARO
        }));
        applyVerificationFrom(profileData.profile);
        setCompletionRewardClaimed(!!profileData?.completionRewardClaimed);
        setQuickProfile({
          firstName: profileData.profile.first_name ?? "",
          age: profileData.profile.age ? String(profileData.profile.age) : "",
          gender: profileData.profile.gender ?? "",
          photoUri: profileData.photos?.[0] ?? "",
        });
      }
      if (profileData.photos?.length) setProfilePhotos(profileData.photos);
      if (profileData.vibes?.length) setVibeList(profileData.vibes);
      applyIntentFrom(profileData.intent);
      const done = !!profileData.profile?.onboarding_complete;
      setOnboardingComplete(done);
      onboardingCompleteRef.current = done;
      return done ? "home" : "quickProfile";
    } catch {
      setOnboardingComplete(false);
      onboardingCompleteRef.current = false;
      return "quickProfile";
    }
  };

  /** Open someone's page. */
  const openPerson = (userId: string) => {
    setPersonId(userId);
    if (screen !== "person") setPersonReturn(screen);
    setScreen("person");
  };
  postTokenRef.current = accessToken ?? null;
  // Your own name on a post opens your own profile, not a stranger's view of it.
  openProfileRef.current = (userId: string) => {
    if (userId === userIdFromToken(accessToken)) setScreen("profile");
    else openPerson(userId);
  };

  /**
   * Open the thread with someone found through the follow graph. Chat is typed
   * around `Match`; the thread only needs their identity and name.
   */
  const openConversationWith = (user: SocialUser) => {
    setSelected(matchFromSocialUser(user));
    setScreen("chat");
  };

  /**
   * What the Chats tab shows: conversations, plus matches nobody has written
   * to yet.
   *
   * The server builds the conversation list out of chat_messages, so a brand
   * new match appeared nowhere until one of the two sent something — and
   * neither could, because there was no thread to open. A match with no
   * messages is listed as an empty conversation; the row already reads
   * "Say hello".
   */
  return (

    
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppCanvas>
        {screen === "splash" && <SplashScreen />}
        {screen === "welcome" && (
          <AccessWelcomeScreen
            onSignUp={() => setScreen("signup")}
            onLogIn={() => setScreen("login")}
          />
        )}
        {screen === "signup" && (
          <SignUpScreen
            onBack={() => setScreen("welcome")}
            onLogIn={() => setScreen("login")}
            onCheckUsername={checkUsernameAvailable}
            onSubmit={async (draft) => {
              await authApi.registerStart(draft);
              setSignUpDraft(draft);
              setAuthDestination(draft.phone);
              setOtpPurpose("signup");
              setScreen("otp");
            }}
          />
        )}
        {screen === "login" && (
          <LogInScreen
            onBack={() => setScreen("welcome")}
            onSignUp={() => setScreen("signup")}
            onForgotPassword={(identifier) => {
              setResetIdentifier(identifier);
              setScreen("forgotPassword");
            }}
            onSubmit={async (input) => {
              const session = await authApi.login(input);
              const next = await adoptSession(session);
              // A reset done elsewhere can mark the account as needing a new
              // password; that screen comes before the app either way.
              if (session.mustChangePassword) {
                setResetIdentifier(input.identifier);
                setScreen("newPassword");
                return;
              }
              setScreen(next);
            }}
          />
        )}
        {screen === "otp" && (
          <OtpScreen
            destination={authDestination}
            purpose={otpPurpose}
            onBack={() =>
              setScreen(otpPurpose === "reset" ? "forgotPassword" : "signup")
            }
            onResend={async () => {
              if (otpPurpose === "reset") {
                await authApi.forgotPassword(resetIdentifier);
                return;
              }
              if (signUpDraft) await authApi.registerStart(signUpDraft);
            }}
            onVerify={async (code) => {
              // Resetting a password: the code is checked when the new
              // password is submitted, so the update screen always comes
              // first. Holding the code here keeps that order.
              if (otpPurpose === "reset") {
                setResetCode(code);
                setScreen("newPassword");
                return;
              }
              if (!signUpDraft) {
                setScreen("signup");
                return;
              }
              const session = await authApi.registerVerify({
                ...signUpDraft,
                code,
                invite: storedInvite() || undefined,
              });
              clearInvite();
              setSignUpDraft(null);
              setScreen(await adoptSession(session));
            }}
          />
        )}
        {screen === "forgotPassword" && (
          <ForgotPasswordScreen
            initialIdentifier={resetIdentifier}
            onBack={() => setScreen("login")}
            onSubmit={async (identifier) => {
              const result = await authApi.forgotPassword(identifier);
              setResetIdentifier(identifier);
              setAuthDestination(result.maskedPhone || identifier);
              setOtpPurpose("reset");
              setScreen("otp");
            }}
          />
        )}
        {screen === "newPassword" && (
          <NewPasswordScreen
            onBack={() => setScreen(resetCode ? "otp" : "login")}
            onSubmit={async (password) => {
              const session = await authApi.resetPassword({
                identifier: resetIdentifier,
                code: resetCode,
                password,
              });
              setResetCode("");
              const next = await adoptSession(session);
              setAppNotice({
                title: "Password updated",
                body: "Use your new password next time you log in.",
                icon: "checkmark-circle",
                tone: "gold",
              });
              setScreen(next);
            }}
          />
        )}
        {screen === "quickProfile" && (
          <QuickProfileScreen
            value={quickProfile}
            onChange={setQuickProfile}
            onPickPhoto={pickQuickProfilePhoto}
            onSubmit={saveQuickProfile}
          />
        )}
        {screen === "profileSetup" && (
          <ProfileSetupScreen
            accessToken={accessToken}
            profile={profileDraft}
            onProfileChange={setProfileDraft}
            photos={profilePhotos}
            onPhotosChange={setProfilePhotos}
            voiceUri={voiceIntroUri}
            onVoiceChange={setVoiceIntroUri}
            allowPreviewContinue={isPreviewAccessMode}
            verificationStatus={verificationStatus}
            verified={verified}
            blueTick={blueTick}
            // Only once they have a profile - not in the middle of first sign-up.
            onVerify={accessToken && onboardingComplete ? () => navigateTo("verifyHub") : undefined}
            onNext={async (latest?: any) => {
              const draftToSave = latest ?? profileDraft;
              if (onboardingComplete && accessToken) {
                try {
                  await saveProfileAndSync(accessToken, draftToSave);

                  await profileApi.updatePhotos(accessToken, profilePhotos);
                  setAppNotice({
                    title: "Profile updated",
                    body: "Your changes have been saved.",
                    icon: "checkmark-circle",
                    tone: "gold",
                  });
                  setScreen("profile");
                  // Auto close popup after 2 seconds
                  setTimeout(() => setAppNotice(null), 2000);
                } catch (error) {
                  setAppNotice({
                    title: "Profile not saved",
                    body:
                      error instanceof Error
                        ? error.message
                        : "Your changes could not be saved. Please try again.",
                    icon: "cloud-offline-outline",
                    tone: "ruby",
                  });
                }
                return;
              }
              setScreen("vibes");
            }}
          />
        )}
        {screen === "vibes" && (
          <VibesScreen
            value={vibeList}
            onChange={setVibeList}
            onNext={() => setScreen("intent")}
          />
        )}
        {screen === "intent" && (
          <IntentScreen
            value={intent}
            onChange={setIntent}
            onNext={() => setScreen("alignment")}
          />
        )}
        {screen === "alignment" && (
          <AlignmentScreen
            value={alignment}
            onChange={setAlignment}
            finishLabel={onboardingComplete ? "Save" : undefined}
            onNext={() => {
              // Editing from Home: save to the server now, otherwise a refresh
              // reloads the old answers. During onboarding the whole profile is
              // saved together at the end, so just move on.
              if (!onboardingComplete || !accessToken) {
                setScreen("discovery");
                return;
              }
              void profileApi
                .updateIntent(accessToken, {
                  intent,
                  timeline: alignment.timeline,
                  children: alignment.children,
                  family: alignment.family,
                  relocation: alignment.relocation,
                })
                .then(() => setScreen(alignmentReturnRef.current))
                .catch(() =>
                  setAppNotice({
                    title: "Not saved",
                    body: "Your answers could not be saved. Check your connection and try again.",
                    icon: "cloud-offline-outline",
                    tone: "ruby",
                  }),
                );
            }}
          />
        )}
        {screen === "home" && (
          <HomeScreen
            accessToken={accessToken}
            preview={isPreviewAccessMode}
            items={visibleMatches}
            matchLoadState={matchLoadState}
            matchingPoolStatus={matchingPoolStatus}
            onRetryMatches={() => void refreshServerMatches()}
            signals={discoverySignals}
            dismissedCount={dismissedIds.length}
            firstName={profileDraft.firstName}
            profilePhoto={profilePhotos[0]}
            profileGrowth={{
              hasPhoto: profilePhotos.length > 0,
              verified,
              hasVoiceIntro: !!voiceIntroUri,
              vouchesCount: vouches.length,
              vibeCount: vibeList.length,
              hasIntent: !!intent,
            }}
            roseAvailability={roseAvailability}
            crossedPaths={crossedPaths}
            openDetail={openDetail}
            onInterested={chooseInterested}
            onSkip={passMatch}
            onRose={openRose}
            onSparkRewarded={() => void refreshSparkWallet()}
            strength={profileStrength({
              firstName: profileDraft.firstName,
              age: profileDraft.age,
              gender: profileDraft.gender,
              city: profileDraft.city,
              profession: profileDraft.profession,
              bio: (profileDraft as any).bio,
              hobbies: (profileDraft as any).hobbies,
              photoCount: profilePhotos.filter(Boolean).length,
              alignment,
              verificationStatus,
              verified,
            })}
            completionRewardClaimed={completionRewardClaimed}
            navigate={navigateTo}
          />
        )}
        {screen === "verifyHub" && (
          <VerificationHubScreen
            verified={verified}
            selfieUri={selfieUri}
            verificationStatus={verificationStatus}
            onBack={() => setScreen("profile")}
            onRequestPose={async () => {
              if (!accessToken) throw new Error("Please sign in again.");
              return profileApi.verificationPose(accessToken);
            }}
            onVerify={async (uri) => {
              if (!accessToken) {
                setAppNotice({
                  title: "Sign in required",
                  body: "Please sign in again to complete verification.",
                  icon: "shield-outline",
                  tone: "ruby",
                });
                throw new Error("Sign in required");
              }
              // The picker hands back a device-local reference. Sending it
              // as-is stored a path only that handset could resolve, so the
              // review queue had nothing anyone could open — a selfie was
              // "submitted" without ever leaving the phone.
              const selfieUrl = await uploadPhoto(uri, accessToken);
              await profileApi.submitVerification(accessToken, selfieUrl);
              setSelfieUri(selfieUrl);
              setVerificationStatus("pending");
              setVerified(false);
              setAppNotice({
                title: "Selfie submitted",
                body: "Your selfie is under review. We'll verify it shortly.",
                icon: "shield-checkmark",
                tone: "gold",
              });
            }}
          />
        )}
        {screen === "detail" && hasSelected && (
          <MatchDetailScreen
            match={selected}
            back={() => setScreen("home")}
            navigate={navigateTo}
            accessToken={accessToken}
            onStartChat={() => setScreen("chat")}
          />
        )}
        {screen === "mutual" && hasSelected && (
          <MutualMatchScreen
            match={selected}
            next={() => setScreen("icebreaker")}
            back={() => setScreen("home")}
          />
        )}
        {screen === "icebreaker" && hasSelected && (
          <IcebreakerScreen
            match={selected}
            question={icebreakerQuestion}
            onSubmit={answerIcebreaker}
          />
        )}
        {/*
          On a desktop the conversation list does not go away when a thread
          is opened - it becomes the column beside it, the way every
          desktop messenger works. On a phone it is still one screen at a
          time, because there is no room for two.
        */}
        {(screen === "chats" || (appLayout.isDesktop && screen === "chat")) &&
          accessToken && (
            <ChatsScreen
              pane={appLayout.isDesktop && screen === "chat"}
              activeConversationId={
                screen === "chat"
                  ? conversationIdFor(conversationPartner)
                  : undefined
              }
              onLoad={() => loadChatsAndMatches(accessToken)}
              onOpenConversation={(conversation) =>
                openConversationWith(conversation.user)
              }
              onFind={() => setScreen("find")}
              navigate={navigateTo}
            />
          )}

        {screen === "adminLogin" && (
          <AdminLoginScreen
            onLogin={(token: string) => {
              setAdminToken(token);
              setScreen("adminDashboard");
            }}
            />
        )}

        {screen === "adminDashboard" && adminToken && (
          <AdminDashboardScreen
            accessToken={adminToken}
            // Opened from Settings: go back to the app, still signed in.
            exitLabel={isAdminMode ? "Logout" : "Back to app"}
            onLogout={() => {
              setAdminToken(null);
              setScreen(isAdminMode ? "adminLogin" : "settings");
            }}
          />
        )}

        {screen === "premium" && accessToken && (
          <PremiumScreen
            accessToken={accessToken}
            onBack={() => setScreen("profile")}
            onVerify={() => setScreen("verifyHub")}
          />
        )}

        {screen === "find" && accessToken && (
          <FindPeopleScreen
            contactsMode={Platform.OS !== "web" ? "device" : canPickContacts() ? "picker" : "none"}
            getMyUsername={async () => {
              const me: any = await authApi.me(accessToken).catch(() => null);
              return String(me?.user?.username ?? "");
            }}
            onBack={() => setScreen("home")}
            onSearch={(term) => socialApi.search(accessToken, term)}
            onMatchContacts={onMatchContacts}
            onOpenPerson={openPerson}
            onFollow={(userId) => likeFromSearch(userId)}
            discoverUsers={visibleMatches.map((m) => ({
              userId: m.id,
              username:
                m.name?.toLowerCase().replace(/\s+/g, "_") || "member",
              name: m.name || "Member",
              avatarUrl: m.photo || null,
              isPrivate: false,
            }))}
          />
        )}

        {screen === "person" && accessToken && personId && (
          <PersonScreen
            userId={personId}
            onBack={() => setScreen(personReturn)}
            onLoad={(userId) => socialApi.person(accessToken, userId)}
            onFollow={(userId) => likeFromSearch(userId)}
            onMessage={(page) => openConversationWith(page.user)}
            accessToken={accessToken}
          />
        )}

        {screen === "chat" &&
          (hasSelected || coupleMode.experienceMode === "couple") && (
            <ChatScreen
              runtimePorts={{
                realtime: { connect: async () => null },
                gifSearch: {
                  configured: true,
                  providerName: "Tenor (Live)",
                  search: async ({ query, offset = 0, limit = 36 }) => {
                    try {
                      // Note: 'LIVDSRZULELA' Tenor ka public beta API key hai testing ke liye
                      const apiKey = "LIVDSRZULELA";
                      const url = `https://g.tenor.com/v1/search?q=${encodeURIComponent(query || "trending")}&key=${apiKey}&limit=${limit}&pos=${offset}`;
                      const res = await fetch(url);
                      const data = await res.json();
                      const results = data.results || [];

                      return {
                        items: results.map((item: any) => ({
                          id: item.id,
                          title: item.content_description || "GIF",
                          uri: item.media[0].gif.url,
                          style: "GIF",
                          previewEmoji: "✨",
                          searchText: item.content_description || "",
                        })),
                        totalCount: 100,
                        nextOffset:
                          offset + limit < 100 ? offset + limit : null,
                        provider: "tenor",
                      };
                    } catch (e) {
                      // Agar API fail ho jaye toh built-in catalog use karo
                      const all = searchChatGifCatalog(query);
                      const items = all.slice(offset, offset + limit);
                      return {
                        items,
                        totalCount: all.length,
                        nextOffset:
                          offset + items.length < all.length
                            ? offset + items.length
                            : null,
                        provider: "preview",
                      };
                    }
                  },
                },
              }}
              previewState={showcasePreviewState}
              isChatPreview={
                memberDataRuntime.source === "preview" || isPreviewAccessMode
              }
              experienceMode={coupleMode.experienceMode}
              initialTool={chatLaunchTool}
              onToolConsumed={() => setChatLaunchTool(null)}
              initialGame={chatLaunchGame}
              onGameConsumed={() => setChatLaunchGame(null)}
              match={conversationPartner}
              messages={chatMessages[conversationPartner.id] ?? []}
              settings={{
                ...defaultCoupleChatSettings,
                ...chatSettings[conversationPartner.id],
              }}
              conversationSettings={chatSettings}
              initialDraft={chatDrafts[conversationPartner.id] ?? ""}
              onDraftConsumed={() =>
                setChatDrafts((current) => {
                  const next = { ...current };
                  delete next[conversationPartner.id];
                  return next;
                })
              }
              onSettingsChange={updateSelectedChatSettings}
              roseAvailability={roseAvailability}
              onRose={() =>
                coupleMode.experienceMode === "seeking" &&
                openRose(conversationPartner)
              }
              onSend={(message) =>
                appendChatMessage(conversationPartner, message)
              }
              onEdit={(messageId, text) =>
                editChatMessage(conversationPartner, messageId, text)
              }
              onDelete={(messageId) =>
                deleteChatMessage(conversationPartner, messageId)
              }
              onMessageState={(messageId, input) =>
                updateChatMessageState(conversationPartner, messageId, input)
              }
              onForward={(target, forwarded) =>
                forwardChatMessages(target, forwarded)
              }
              onOpenConversation={(target) => {
                setSelected(target);
                setScreen("chat");
              }}
              // Tap their photo or name at the top of the chat to open their
              // profile, as in Instagram. Only for a real account (the id is
              // the member's user id), not the preview people.
              onOpenPartnerProfile={
                accessToken && isMemberId(conversationPartner.id)
                  ? () => openPerson(conversationPartner.id)
                  : undefined
              }
              onReport={(reason, details) =>
                reportMatch(conversationPartner, reason, details)
              }
              onBlock={async () => {
                if (await blockMatch(conversationPartner)) setScreen("home");
              }}
              isBlocked={blockedIds.includes(conversationPartner.id)}
              onUnblock={async () => {
                await unblockMatch(conversationPartner);
              }}
              onUnmatch={async () => {
                if (await unmatchMatch(conversationPartner)) setScreen("home");
              }}
              navigate={navigateTo}
              accessToken={accessToken}
              livePartnerOnline={partnerPresence?.online}
              partnerLastActiveAt={partnerPresence?.lastActiveAt ?? null}
              livePartnerTyping={partnerPresence?.typing}
              onTypingChange={(typing) => {
                if (!accessToken) return;
                if (
                  emitChatTyping(conversationIdFor(conversationPartner), typing)
                )
                  return;
                void chatApi
                  .setTyping(
                    accessToken,
                    conversationIdFor(conversationPartner),
                    typing,
                  )
                  .catch(() => undefined);
              }}
            />
          )}
        {screen === "safety" && (
          <SafetyCenter
            reports={reports}
            blockedCount={blockedIds.length}
            datePlans={Object.values(chatMessages)
              .flat()
              .filter((message) => message.type === "date")}
            safeCheckIns={safeCheckIns}
            preview={memberDataRuntime.source === "preview"}
            initialTool={
              (showcasePreviewState === "safety-plan"
                ? "plan"
                : showcasePreviewState === "safety-emergency"
                  ? "emergency"
                  : showcasePreviewState === "safety-privacy"
                    ? "privacy"
                    : showcasePreviewState === "safety-data"
                      ? "data"
                      : showcasePreviewState === "safety-delete"
                        ? "delete"
                        : null) as SafetyTool | null
            }
            onCheckIn={recordSafeCheckIn}
            onDeleteAccount={deleteAccount}
            accessToken={accessToken || undefined}
            onUnblocked={(userId) => setBlockedIds((ids) => ids.filter((id) => id !== userId))}
            onBack={() => setScreen("profile")}
          />
        )}
        {screen === "discovery" && (
          <DiscoveryCenterScreen
            filters={matchFilters}
            onFiltersChange={updateMatchFilters}
            signals={discoverySignals}
            smartDiscovery={smartDiscovery}
            crossedPaths={crossedPaths}
            onSmartChange={updateSmartDiscovery}
            onCrossedChange={setCrossedPaths}
            onClear={clearMatchingActivity}
            onBack={() =>
              onboardingComplete ? setScreen("home") : void completeOnboarding()
            }
          />
        )}
        {screen === "likes" && (
          <LikesScreen
            navigate={navigateTo}
            accessToken={accessToken}
            openDetail={openDetail}
            onOpenChat={(person) =>
              openConversationWith({
                userId: person.userId,
                username: person.username,
                name: person.name,
                avatarUrl: person.photo || null,
                isPrivate: false,
              })
            }
            onMatched={(person) => {
              // Accepting made it mutual, so the thread exists now. Open it
              // rather than leaving them to find it: this is the moment the
              // whole app is built around.
              openConversationWith({
                userId: person.userId,
                username: person.username,
                name: person.name,
                avatarUrl: person.photo || null,
                isPrivate: false,
              });
              setAppNotice({
                title: `You matched with ${person.name}`,
                body: "You can both message each other now.",
                icon: "heart",
                tone: "gold",
              });
            }}
          />
        )}
        {screen === "games" && (
          <GamesScreen
            navigate={navigateTo}
            accessToken={accessToken}
            onPlay={(match, kind) => {
              setChatLaunchGame(kind);
              openConversationWith({
                userId: match.id,
                username: match.username || "",
                name: match.name,
                avatarUrl: match.photo || null,
                isPrivate: false,
              });
            }}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            profile={profileDraft}
            verified={verified}
            blueTick={blueTick}
            intentInput={{ intent, ...alignment }}
            profilePhoto={profilePhotos[0]}
            navigate={navigateTo}
            accessToken={accessToken}
          />
        )}

        <RoseComposer
          visible={!!roseTarget}
          recipientName={roseTarget?.name ?? ""}
          availability={roseAvailability}
          onClose={() => setRoseTarget(null)}
          onSend={(note, kind) => {
            if (roseTarget) void sendRose(roseTarget, note, kind);
            setRoseTarget(null);
          }}
          onBuySuperLikes={
            accessToken
              ? () => {
                  setRoseTarget(null);
                  setScreen("premium");
                }
              : undefined
          }
        />
        <RoseReceivedPopup
          data={rosePopup}
          onClose={() => setRosePopup(null)}
          onOpenChat={(match) => {
            setSelected(match);
            setRosePopup(null);
            setScreen("chat");
          }}
        />

        {screen === "settings" && (
          <SettingsScreen accessToken={accessToken}
            navigate={navigateTo}
            isPrivate={isPrivateAccount}
            onPrivacyChange={async (next) => {
              if (!accessToken) return;
              const previous = isPrivateAccount;
              setIsPrivateAccount(next);
              try {
                await socialApi.setPrivacy(accessToken, next);
              } catch {
                setIsPrivateAccount(previous);
                setAppNotice({
                  title: "Could not change that",
                  body: "Your privacy setting was not saved. Please try again.",
                  icon: "cloud-offline-outline",
                  tone: "ruby",
                });
              }
            }}
            onOpenAdmin={
              isAdmin && accessToken
                ? () => {
                    setAdminToken(accessToken);
                    setScreen("adminDashboard");
                  }
                : undefined
            }
            onLogout={() => void logout()}
            onDeactivate={() => void deactivateAccount()}
            onDeletePermanently={() => setScreen("safety")}
          />
        )}
        {screen === "support" && (
          <SupportScreen onBack={() => setScreen("settings")} />
        )}
        {/* Plays stories opened from anywhere: the row on Home or a ring round a photo. */}
        {!!accessToken && onboardingComplete && <StoryHost accessToken={accessToken} />}
        {!!sharedPostId && accessToken && onboardingComplete && (
          <SharedPostModal
            postId={sharedPostId}
            accessToken={accessToken}
            onClose={() => setSharedPostId(null)}
          />
        )}
        {selected.id ? (
          <SafetyActions
            visible={detailSafetyOpen}
            match={selected}
            isBlocked={blockedIds.includes(selected.id)}
            onClose={() => setDetailSafetyOpen(false)}
            onSafetyCenter={() => {
              setDetailSafetyOpen(false);
              setScreen("safety");
            }}
            onReport={async (reason, details) => {
              setDetailSafetyOpen(false);
              if (await reportMatch(selected, reason, details))
                setAppNotice({
                  title: "Report submitted privately",
                  body: "Your report is saved for safety review. The other member is not notified.",
                  icon: "flag-outline",
                  tone: "gold",
                });
            }}
            onBlock={async () => {
              setDetailSafetyOpen(false);
              if (await blockMatch(selected)) {
                setScreen("home");
                setAppNotice({
                  title: "Blocked privately",
                  body: `${selected.name} is hidden from your matches, likes and chats. They will not be notified.`,
                  icon: "ban-outline",
                  tone: "ruby",
                });
              }
            }}
            onUnblock={async () => {
              setDetailSafetyOpen(false);
              await unblockMatch(selected);
            }}
            onUnmatch={async () => {
              setDetailSafetyOpen(false);
              if (await unmatchMatch(selected)) {
                setScreen("home");
                setAppNotice({
                  title: "Unmatched",
                  body: `${selected.name} has been removed from your introductions and conversation flow.`,
                  icon: "person-remove-outline",
                  tone: "rose",
                });
              }
            }}
          />
        ) : null}
        <AppNoticeSheet
          notice={appNotice}
          onClose={() => setAppNotice(null)}
          onAction={(nextScreen) => {
            setAppNotice(null);
            navigateTo(nextScreen);
          }}
        />
        <CallHost accessToken={accessToken} />
      </AppCanvas>
    </SafeAreaProvider>
  );
}
/**
 * A "show my family" link (?share=<token>) opens the shared profile on its
 * own - no sign-in, none of the app around it.
 */
const sharedProfileToken: string | null = (() => {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get("share");
  return token && /^[a-f0-9]{32}$/.test(token) ? token : null;
})();


/** A real member's id (a UUID), as opposed to a preview person's "1", "2"... */
function isMemberId(id: string | undefined): id is string {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export default function App() {
  return (
    <ErrorBoundary>
      {sharedProfileToken ? (
        <SharedProfilePage token={sharedProfileToken} />
      ) : (
        <MilaanApp />
      )}
    </ErrorBoundary>
  );
}



