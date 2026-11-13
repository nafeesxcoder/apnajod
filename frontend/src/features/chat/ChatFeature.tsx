import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { GestureResponderEvent } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Location from "expo-location";

import { Button, shared } from "../../components";
import { handleBottomNavScroll } from "../../components/navigation/BottomNav";
import {
  MiniPremiumIcon,
  PremiumIcon,
  type PremiumIconTone,
} from "../../components/premium/PremiumIcon";
import { SheetHeader } from "../../components/sheets/SheetHeader";
import { SafetyActions } from "../trust/screens/SafetyScreens";
import {
  createBackendGifSearch,
  isLiveGifSearchAvailable,
} from "../../api/gifApi";
import { callSession, useCallSession } from "./callSession";
import { callApi } from "../../api/callApi";
import {
  chatApi,
  fetchIcebreakers,
  fetchStreak,
  type ChatStreak,
} from "../../api/chatApi";
import { matches, type Match } from "../../data";
import type { PreviewState, Screen } from "../../app/navigation/types";
import type {
  ChatMessage,
  CoupleChatSettings,
  DatePlanStatus,
} from "../../storage";
import { defaultCoupleChatSettings } from "../../storage";
import { colors, fonts, palette, radius } from "../../theme";
import { receiptColor, receiptIcon, receiptLabel } from "./receipt";
import { APP_MAX_WIDTH, CHAT_LIST_WIDTH, RAIL_WIDTH } from "../../layout/breakpoints";
import { useLayout } from "../../layout/useLayout";
import { useKeyboardInset } from "../../layout/useKeyboardInset";
import {
  aiStyles,
  chatPremiumStyles,
  chatStyles,
  coachStyles,
  coupleStyles,
  dateStyles,
  discoveryStyles,
  gameStyles,
  launchStyles,
  premiumButtonStyles,
  rosePopupStyles,
  snapStyles,
  stickerStyles,
  styles,
} from "../../theme/appStyles";
import type { ExperienceMode } from "../../domain/coupleMode";
import { truthOrDarePrompts } from "../../domain/coupleGamePrompts";
import {
  buildCatalogGifUri,
  buildStickerPayload,
  classifyEmojiMotion,
  customChatStickers,
  parseCatalogGifUri,
  parseStickerPayload,
  searchChatGifCatalog,
  type ChatGifCatalogItem,
  type CustomChatSticker,
  type EmojiMotion,
} from "../../domain/chatMediaCatalog";
import {
  buildPrivacySafeLinkPreview,
  gifLibraryStorageKey,
  isConversationMuted,
  mergeGifRecents,
  notificationMuteLabel,
  toggleGifFavourite,
  type GifLibraryEntry,
} from "../../domain/chatExperience";
import { dateLifecycleCopy } from "../../domain/dateLifecycle";
import { conversationIdFor } from "../../domain/matchIdentity";
import {
  GamePlaySheet,
  KnowMeSetupSheet,
  LiveGameCard,
  LiveGamesSection,
} from "./games/LiveGames";
import { gamesApi, type GameKind } from "../../api/gamesApi";
import {
  chatMoreAttachments,
  chatPrimaryAttachments,
} from "../../domain/featureFocus";
import { scanMessageSafety, type MessageSafetyScan } from "../../domain/safety";
import type {
  ChatRuntimePorts,
  MatchRealtimeSession,
  RealtimeCallEvent,
} from "./contracts/ChatRuntimePorts";
import { AppCanvas } from "../../components/AppCanvas";

// 🚀 BACKGROUND IMAGE ADDED HERE

export type RoseAvailability = {
  /** Today's free Spark is still there. */
  freeAvailable: boolean;
  /** Extra Sparks (earned from the Daily Question). */
  paidCredits: number;
  /** Super Likes bought in packs. Undefined on the preview build. */
  superlikes?: number;
};
export type RosePopupPayload = { match: Match; note: string; paid: boolean };
export type CoupleLaunchTool = "games" | null;
const accessibilityHitSlop = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const;
const ChatRuntimeContext = createContext<ChatRuntimePorts | null>(null);
const useChatRuntime = () => {
  const runtime = useContext(ChatRuntimeContext);
  if (!runtime)
    throw new Error("ChatRuntimePorts must be provided by ChatScreen.");
  return runtime;
};

const quickEmojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🥸",
  "🤩",
  "🥳",
  "🙂‍↕️",
  "😏",
  "😒",
  "🙂‍↔️",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🫣",
  "🤭",
  "🫢",
  "🫡",
  "🤫",
  "🫠",
  "🤥",
  "😶",
  "😐",
  "😑",
  "😬",
  "🙄",
  "😯",
  "😦",
  "😧",
  "😮",
  "😲",
  "🥱",
  "😴",
  "🤤",
  "😪",
  "😮‍💨",
  "😵",
  "😵‍💫",
  "🤐",
  "🥴",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "🤑",
  "🤠",
  "😈",
  "👿",
  "👋",
  "🤚",
  "🖐️",
  "✋",
  "🖖",
  "👌",
  "🤌",
  "🤏",
  "✌️",
  "🤞",
  "🫰",
  "🤟",
  "🤘",
  "🤙",
  "👈",
  "👉",
  "👆",
  "👇",
  "☝️",
  "👍",
  "👎",
  "✊",
  "👊",
  "🤛",
  "🤜",
  "👏",
  "🙌",
  "🫶",
  "🫶🏽",
  "🤲",
  "🙏",
  "✍️",
  "💅",
  "🤝",
  "💪",
  "🫵",
  "🫂",
  "👀",
  "👁️",
  "👄",
  "❤️",
  "🩷",
  "🧡",
  "💛",
  "💚",
  "💙",
  "🩵",
  "💜",
  "🤎",
  "🖤",
  "🩶",
  "🤍",
  "💔",
  "❤️‍🔥",
  "❤️‍🩹",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
  "💌",
  "💋",
  "💯",
  "💢",
  "💥",
  "💫",
  "💦",
  "💨",
  "🕳️",
  "💬",
  "👑",
  "💍",
  "💎",
  "✨",
  "⭐",
  "🌟",
  "🔥",
  "🌹",
  "💐",
  "🌷",
  "🌸",
  "🌺",
  "🌻",
  "🌼",
  "🪷",
  "🍀",
  "☕",
  "🫖",
  "🍵",
  "🍕",
  "🍔",
  "🍟",
  "🌮",
  "🍜",
  "🍝",
  "🍛",
  "🍫",
  "🍰",
  "🧁",
  "🍦",
  "🍿",
  "🥂",
  "🍷",
  "🍹",
  "🎂",
  "🎉",
  "🎊",
  "🎁",
  "🎈",
  "🪩",
  "🎵",
  "🎶",
  "🎬",
  "📸",
  "🚗",
  "✈️",
  "🏡",
  "🌍",
  "🌙",
  "☀️",
  "🌧️",
  "🌈",
  "⚡",
  "💃🏽",
  "🕺",
  "🏋️",
  "🧘‍♀️",
  "🐶",
  "🐱",
  "🐼",
  "🦁",
  "🦄",
  "🦋",
  "🐥",
  "🐒",
  "🙈",
  "🙉",
  "🙊",
];
type EmojiCategoryId =
  "recent" | "smileys" | "love" | "gestures" | "food" | "travel" | "all";
const emojiCategories: Array<{
  id: EmojiCategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  emojis: string[];
}> = [
  {
    id: "recent",
    label: "Recent",
    icon: "time-outline",
    emojis: [
      "❤️",
      "😂",
      "🥰",
      "😘",
      "😊",
      "🙏",
      "🔥",
      "💐",
      "☕",
      "✨",
      "🫶",
      "😍",
      "🤣",
      "💌",
      "🌹",
      "🥺",
      "🎉",
      "🙈",
    ],
  },
  {
    id: "smileys",
    label: "Smileys",
    icon: "happy-outline",
    emojis: quickEmojis.slice(0, 100),
  },
  {
    id: "love",
    label: "Love",
    icon: "heart-outline",
    emojis: quickEmojis.slice(140, 185),
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "hand-left-outline",
    emojis: quickEmojis.slice(100, 145),
  },
  {
    id: "food",
    label: "Food",
    icon: "restaurant-outline",
    emojis: quickEmojis.slice(185, 215),
  },
  {
    id: "travel",
    label: "Travel",
    icon: "airplane-outline",
    emojis: quickEmojis.slice(215),
  },
  { id: "all", label: "All", icon: "apps-outline", emojis: quickEmojis },
];
const emojiSearchGroups = [
  {
    keywords: "love heart romantic kiss rose flower",
    emojis: emojiCategories.find((item) => item.id === "love")!.emojis,
  },
  {
    keywords: "laugh funny haha smile happy",
    emojis: ["😂", "🤣", "😄", "😁", "😆", "😅", "😜", "🤪", "😎", "🥳"],
  },
  {
    keywords: "sad cry upset miss",
    emojis: ["🥺", "😢", "😭", "😞", "😔", "💔", "😥", "😓"],
  },
  {
    keywords: "food coffee chai date dinner cake",
    emojis: emojiCategories.find((item) => item.id === "food")!.emojis,
  },
  {
    keywords: "travel car plane home weather",
    emojis: emojiCategories.find((item) => item.id === "travel")!.emojis,
  },
  {
    keywords: "hand clap pray hug gesture",
    emojis: emojiCategories.find((item) => item.id === "gestures")!.emojis,
  },
];
const isAnimatedEmojiText = (value = "") => {
  const trimmed = value.trim().replace(/^✨STICKER\|/, "");
  return (
    !!trimmed &&
    !/[\p{L}\p{N}]/u.test(trimmed) &&
    /\p{Extended_Pictographic}/u.test(trimmed) &&
    Array.from(trimmed).length <= 8
  );
};
const snapFilters = [
  { name: "Ruby Glow", color: "rgba(31,82,134,.24)" },
  { name: "Golden Hour", color: "rgba(170,42,68,.18)" },
  { name: "Noir", color: "rgba(0,0,0,.38)" },
  { name: "Rose Film", color: "rgba(163,185,207,.18)" },
  { name: "Cool Date", color: "rgba(32,84,136,.18)" },
  { name: "Velvet Crush", color: "rgba(19,53,87,.32)" },
  { name: "Bollywood Sparkle", color: "rgba(113,153,194,.22)" },
  { name: "Chai Warmth", color: "rgba(132,33,53,.22)" },
  { name: "Dream Home", color: "rgba(238,239,241,.13)" },
  { name: "Moonlit Date", color: "rgba(28,76,125,.25)" },
  { name: "Rose Petal", color: "rgba(131,164,198,.28)" },
  { name: "Cinema Night", color: "rgba(15,17,19,.48)" },
  { name: "Soft Blush", color: "rgba(209,212,216,.22)" },
  { name: "Royal Ruby", color: "rgba(24,65,106,.3)" },
  { name: "Shaadi Glow", color: "rgba(205,105,125,.2)" },
  { name: "Meme Pop", color: "rgba(51,114,93,.16)" },
  { name: "Funny Face", color: "rgba(255,255,255,.18)" },
  { name: "Desi Drama", color: "rgba(161,40,64,.20)" },
  { name: "Puppy Mood", color: "rgba(108,26,42,.18)" },
  { name: "Cartoon Crush", color: "rgba(125,130,137,.18)" },
  { name: "Retro VHS", color: "rgba(35,90,146,.16)" },
  { name: "Neon Club", color: "rgba(35,90,146,.22)" },
  { name: "Soft Focus", color: "rgba(224,226,229,.18)" },
  { name: "Laugh Track", color: "rgba(161,40,64,.16)" },
  { name: "Crown Mode", color: "rgba(170,42,68,.22)" },
];
const faceEmojiOptions = [
  "😂",
  "🤣",
  "😎",
  "👑",
  "🥸",
  "🤠",
  "🤓",
  "🤡",
  "😈",
  "👽",
  "🤖",
  "🦄",
  "🐶",
  "🐱",
  "🐼",
  "🦁",
  "🐵",
  "🙈",
  "💘",
  "😍",
  "😘",
  "🤭",
  "😜",
  "😇",
  "🕶️",
  "🎩",
  "💃🏽",
  "🪩",
  "🔥",
  "✨",
];
const chatCoachSuggestions = [
  {
    label: "Warm question",
    message: (match: Match) =>
      `I liked your ${match.vibes[0]?.toLowerCase() ?? "intentional"} energy. What does a great weekend look like for you?`,
  },
  {
    label: "Date idea",
    message: (match: Match) =>
      `This may be early, but ${match.city.split(",")[0]} has some great cafés. Want to plan a simple public coffee sometime?`,
  },
  {
    label: "Values check",
    message: (_: Match) =>
      "What is one value you would never compromise in a serious relationship?",
  },
  {
    label: "Family tone",
    message: (_: Match) =>
      "How do you like to balance family involvement with independence as a couple?",
  },
];
type CoupleGame = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: PremiumIconTone;
  tag: string;
  description: string;
  howToPlay: string;
  prompts: string[];
};
type GameReplyPayload = { parentId: string; gameTitle: string; answer: string };
const parseGameReply = (message: ChatMessage): GameReplyPayload | null => {
  if (message.type !== "text" || !message.text?.startsWith("🎮REPLY|"))
    return null;
  const parts = message.text.split("|");
  return {
    parentId: parts[1] ?? "",
    gameTitle: parts[2] ?? "Couple game",
    answer: parts.slice(3).join("|"),
  };
};
const parseQuotedReply = (text?: string) => {
  if (!text?.startsWith("↩REPLY|")) return null;
  const parts = text.split("|");
  return {
    parentId: parts[1] ?? "",
    quote: parts[2] ?? "Message",
    body: parts.slice(3).join("|"),
  };
};
const coupleGames: CoupleGame[] = [
  {
    id: "truth-dare",
    title: "Truth or Dare",
    icon: "flame",
    tone: "ruby",
    tag: "100 ROMANTIC + FUN ROUNDS",
    description:
      "A safe mix of funny, romantic, thoughtful and future-focused rounds.",
    howToPlay:
      "Take turns. Answer honestly or complete the dare, then choose another round.",
    prompts: truthOrDarePrompts,
  },
  {
    id: "connection-cards",
    title: "Curiosity Cards",
    icon: "chatbubbles",
    tone: "rose",
    tag: "GET CLOSER",
    description: "Reciprocal questions that move from light to meaningful.",
    howToPlay:
      "Both people answer the same card before moving to the next one.",
    prompts: [
      "Which small everyday gesture makes you feel genuinely considered?",
      "What does a peaceful Sunday in your future look like?",
      "What is something you are learning to communicate more clearly?",
      "Which family tradition would you love to keep—or thoughtfully reinvent?",
      "What kind of support helps you most on a difficult day?",
      "What is one dream that feels more exciting when shared?",
    ],
  },
  {
    id: "decode-us",
    title: "Decode Us",
    icon: "help-circle",
    tone: "plum",
    tag: "PUZZLES",
    description: "Emoji clues, mini riddles and playful guesses.",
    howToPlay:
      "One person answers privately in their head; the other gets one guess and one hint.",
    prompts: [
      "EMOJI CLUE · ☕🌧️📚 — invent the perfect date hidden in these emojis.",
      "RIDDLE · I can fill a room but take up no space. What am I?",
      "GUESS ME · Give three clues about your comfort food without naming it.",
      "EMOJI STORY · 🧳🌄🎵🍜 — where did our imaginary weekend go?",
      "TWO CLUES · Describe your dream city using only weather + one sound.",
      "MYSTERY · Pick an object near you; give one true clue and one tricky clue.",
    ],
  },
  {
    id: "coffee-roadtrip",
    title: "Coffee or Road Trip",
    icon: "cafe",
    tone: "gold",
    tag: "QUICK PICKS",
    description: "Fast choices that reveal the reason behind the answer.",
    howToPlay:
      "Choose first, explain why second. No “both” answers for this round.",
    prompts: [
      "Cozy coffee ☕ or spontaneous road trip 🚗 — and what makes it your pick?",
      "Sunrise walk 🌅 or late-night dessert 🍰?",
      "Plan every detail 🗓️ or leave one surprise ✨?",
      "Cook together 🍝 or find a hidden local restaurant 🥢?",
      "Mountain cabin 🏔️ or city weekend 🌆?",
      "Voice note 🎙️ or handwritten letter 💌?",
    ],
  },
  {
    id: "future-draft",
    title: "Future Draft",
    icon: "diamond",
    tone: "gold",
    tag: "DATE TO MARRY",
    description: "Build a shared future one thoughtful pick at a time.",
    howToPlay:
      "Each person ranks the four choices, then compare the biggest difference with curiosity.",
    prompts: [
      "Rank for the next five years: family, career, home, travel.",
      "Draft a Sunday: rest, friends, family time, one adventure.",
      "Choose three home feelings: calm, lively, private, welcoming, creative.",
      "Rank money priorities: security, experiences, giving, comfort.",
      "Pick two couple rituals: weekly date, daily walk, family dinner, monthly trip.",
      "Choose the first thing to protect in a busy season: honesty, quality time, health, patience.",
    ],
  },
  {
    id: "caption-battle",
    title: "Caption Battle",
    icon: "images",
    tone: "ruby",
    tag: "LAUGH TOGETHER",
    description: "Turn imaginary moments into funny one-line captions.",
    howToPlay:
      "Both send one caption. The next person chooses the winner and starts another round.",
    prompts: [
      "Caption this: we arrived at the restaurant wearing the exact same color.",
      "Caption this: our “quick coffee” somehow became a four-hour conversation.",
      "Caption this: the GPS said two minutes; we are now beside a goat farm.",
      "Caption this: both families joined the video call five minutes early.",
      "Caption this: we tried cooking together and the smoke alarm became the referee.",
      "Caption this: our first couple photo has one perfect smile and one closed eye.",
    ],
  },
];
const coupleThemes = [
  {
    name: "Ruby Velvet",
    accent: "#1F5286",
    soft: "rgba(31,82,134,.12)",
    panel: "#0F1011",
    bg: "#0D0E0F",
    border: "#15395E",
  },
  {
    name: "Champagne Night",
    accent: "#AA2A44",
    soft: "rgba(170,42,68,.13)",
    panel: "#450E19",
    bg: "#121315",
    border: "#681929",
  },
  {
    name: "Royal Plum",
    accent: "#7F848B",
    soft: "rgba(127,132,139,.13)",
    panel: "#0F1113",
    bg: "#0D0E0F",
    border: "#17406A",
  },
  {
    name: "Moonlit Noir",
    accent: "#D8DBDE",
    soft: "rgba(216,219,222,.12)",
    panel: "#0F1011",
    bg: "#0E0F10",
    border: "#123354",
  },
  {
    name: "Rose Gold",
    accent: "#BCCBD9",
    soft: "rgba(188,203,217,.13)",
    panel: "#0F1113",
    bg: "#0D0E0F",
    border: "#153B61",
  },
  {
    name: "Emerald Promise",
    accent: "#468B74",
    soft: "rgba(70,139,116,.12)",
    panel: "#101214",
    bg: "#0F1011",
    border: "#173A2E",
  },
  {
    name: "Desert Chai",
    accent: "#BB2F4B",
    soft: "rgba(187,47,75,.13)",
    panel: "#450F1A",
    bg: "#121416",
    border: "#681929",
  },
  {
    name: "Bollywood Glow",
    accent: "#578BBF",
    soft: "rgba(87,139,191,.13)",
    panel: "#0F1011",
    bg: "#0D0E0F",
    border: "#163D65",
  },
  {
    name: "Ocean Drive",
    accent: "#5E8FC0",
    soft: "rgba(94,143,192,.12)",
    panel: "#0F1011",
    bg: "#0E0F10",
    border: "#14395E",
  },
  {
    name: "Ivory Calm",
    accent: "#E0E2E5",
    soft: "rgba(224,226,229,.10)",
    panel: "#470F1A",
    bg: "#121416",
    border: "#761D2F",
  },
];

// Cancel handlers for media that is still uploading, keyed by the local
// placeholder message id. The loader's X button on the bubble calls these.
const mediaUploadCancels = new Map<string, () => void>();

// A tick can only move forward (sent -> delivered -> read). Local overrides
// used to always win, which pinned sent messages to a single grey tick even
// after the server reported them delivered/read.
const statusRank: Record<string, number> = { sent: 0, delivered: 1, read: 2 };
function furthestStatus(
  local: ChatMessage["status"] | undefined,
  server: ChatMessage["status"],
): ChatMessage["status"] {
  if (!local) return server;
  return (statusRank[local] ?? 0) >= (statusRank[server] ?? 0) ? local : server;
}

const maxChatFileBytes = 100 * 1024 * 1024;
const formatChatFileSize = (bytes?: number) => {
  if (!bytes || bytes < 1) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

// expo-image-picker's web shim (ExponentImagePicker.web.ts) listens for a
// 'cancel' event alongside the real 'change' event on its hidden <input>,
// and treats either as "the user canceled". On some Android setups, picking
// a heavyweight third-party picker app (Google Photos, rather than the
// lightweight system Photo Picker) as the handler for that <input> fires a
// spurious 'cancel' before the <input>'s files are populated -- so the shim
// resolves `{ canceled: true }` even though the user genuinely selected a
// file and tapped that picker's own native "Done" button. That silently
// short-circuited sendGalleryMedia() before it ever reached the caption
// preview, which is why nothing appeared to happen.
//
// We can't patch the vendored library, so on web we drive our own minimal
// <input type="file"> instead and ONLY act on a real 'change' event that
// carries a file. We deliberately do not try to detect a cancel at all (no
// 'cancel' listener, no window-focus heuristic): on Android the picked file
// can arrive well after both of those signals fire, so any timer-based
// "nothing was chosen" guess just recreates the same race. A genuine cancel
// simply never resolves -- harmless, since the caller has no loading state
// waiting on it -- and the next pick discards the stale input.
let activeWebPickerInput: HTMLInputElement | null = null;

function pickWebMedia(opts: { accept: string }): Promise<File | null> {
  return new Promise((resolve) => {
    if (activeWebPickerInput?.parentNode) {
      activeWebPickerInput.parentNode.removeChild(activeWebPickerInput);
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = opts.accept;
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.left = "-1000px";
    activeWebPickerInput = input;
    input.addEventListener("change", () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      // A 'change' with no file is not a pick; keep waiting for a real one.
      if (!file) return;
      if (activeWebPickerInput === input) activeWebPickerInput = null;
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(file);
    });
    document.body.appendChild(input);
    input.click();
  });
}

function webFileToImagePickerAsset(file: File): ImagePicker.ImagePickerAsset {
  const isVideo = file.type.startsWith("video/");
  return {
    uri: URL.createObjectURL(file),
    width: 0,
    height: 0,
    type: isVideo ? "video" : "image",
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || undefined,
  } as ImagePicker.ImagePickerAsset;
}

// Turns a last-active ISO timestamp into a short relative label like
// WhatsApp's "last seen 5 minutes ago" / "last seen today at 2:40 PM".
function formatLastSeen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Last seen recently";
  const diffMs = Date.now() - then;
  if (diffMs < 60 * 1000) return "Last seen just now";
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60)
    return `Last seen ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Last seen ${days} day${days === 1 ? "" : "s"} ago`;
  return "Last seen a while ago";
}

export function ChatScreen({
  runtimePorts,
  previewState,
  isChatPreview,
  experienceMode,
  initialTool,
  onToolConsumed,
  match,
  messages,
  settings,
  conversationSettings,
  initialDraft,
  onDraftConsumed,
  onSettingsChange,
  roseAvailability: _roseAvailability,
  onRose,
  onSend,
  onEdit,
  onDelete,
  onMessageState,
  onForward,
  onOpenConversation,
  onReport,
  onBlock,
  isBlocked,
  onUnblock,
  onUnmatch,
  onOpenPartnerProfile,
  navigate,
  accessToken,
  livePartnerOnline,
  partnerLastActiveAt,
  livePartnerTyping,
  onTypingChange,
}: {
  runtimePorts: ChatRuntimePorts;
  previewState?: PreviewState;
  showcaseDateStatus?: DatePlanStatus;
  isChatPreview: boolean;
  experienceMode: ExperienceMode;
  initialTool: CoupleLaunchTool;
  onToolConsumed: () => void;
  match: Match;
  messages: ChatMessage[];
  settings: CoupleChatSettings;
  conversationSettings: Record<string, CoupleChatSettings>;
  initialDraft?: string;
  onDraftConsumed?: () => void;
  onSettingsChange: (settings: CoupleChatSettings) => void;
  roseAvailability: RoseAvailability;
  onRose: () => void;
  onSend: (message: ChatMessage) => Promise<boolean>;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
  onMessageState: (
    messageId: string,
    input: {
      starred?: boolean;
      pinned?: boolean;
      hidden?: boolean;
      reaction?: string | null;
    },
  ) => Promise<boolean>;
  onForward: (target: Match, messages: ChatMessage[]) => Promise<number>;
  onOpenConversation: (target: Match) => void;
  onReport: (reason: string, details?: string) => void | Promise<unknown>;
  onBlock: () => void;
  isBlocked?: boolean;
  onUnblock: () => void;
  onUnmatch: () => void;
  // Couple chats: tapping the header avatar opens the partner's profile.
  onOpenPartnerProfile?: () => void;
  navigate: (s: Screen) => void;
  accessToken: string;
  // Polled from the backend's real last-active timestamp (see
  // chatApi.getPresence) rather than the realtime port, which never
  // actually fires in production. Optional so existing preview/demo call
  // sites that don't poll this still compile unchanged.
  livePartnerOnline?: boolean;
  partnerLastActiveAt?: string | null;
  // Same REST-polled story as livePartnerOnline above, for the "is
  // typing…" indicator.
  livePartnerTyping?: boolean;
  onTypingChange?: (typing: boolean) => void;
}) {
  const { width: chatWidth, height: chatHeight } = useWindowDimensions();
  const { isDesktop: isDesktopChat } = useLayout();
  const keyboardInset = useKeyboardInset();
  const messagesRef = useRef<ScrollView | null>(null);
  // When the server has a GIPHY key, GIF search goes through it; otherwise the
  // built-in reaction catalog from runtimePorts stays in use.
  const [liveGifSearch, setLiveGifSearch] = useState<ReturnType<
    typeof createBackendGifSearch
  > | null>(null);
  useEffect(() => {
    if (!accessToken) {
      setLiveGifSearch(null);
      return;
    }
    let alive = true;
    void isLiveGifSearchAvailable(accessToken).then((available) => {
      if (alive) {
        setLiveGifSearch(
          available ? createBackendGifSearch(accessToken) : null,
        );
      }
    });
    return () => {
      alive = false;
    };
  }, [accessToken]);
  const effectivePorts = useMemo(
    () =>
      liveGifSearch
        ? { ...runtimePorts, gifSearch: liveGifSearch }
        : runtimePorts,
    [runtimePorts, liveGifSearch],
  );
  const chatInputRef = useRef<TextInput | null>(null);
  const textSelectionRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [text, setText] = useState("");
  // Play-together games. The server keeps the state; see LiveGames.
  const [knowMeSetupOpen, setKnowMeSetupOpen] = useState(false);
  const [playGameId, setPlayGameId] = useState<string | null>(null);
  const [liveGameError, setLiveGameError] = useState("");
  const startLiveGame = async (kind: GameKind) => {
    setLiveGameError("");
    setGamesOpen(false);
    setShowAttachments(false);
    if (kind === "know_me") {
      setKnowMeSetupOpen(true);
      return;
    }
    try {
      const game = await gamesApi.start(accessToken, conversationIdFor(match), kind);
      setPlayGameId(game.id);
    } catch (error) {
      setLiveGameError(error instanceof Error ? error.message : "Could not start the game.");
    }
  };
  // Opening lines for a chat with no messages yet. See icebreakerService.
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const chatIsEmpty = messages.length === 0;
  // They spoke last and it has been over an hour: say so, gently, at the
  // bottom of the thread. The push reminder is the same idea for when the
  // app is closed.
  const lastShown = [...messages]
    .reverse()
    .find((m) => !m.deletedForEveryone && !m.hiddenForMe && !m.deletedAt);
  const theyAreWaiting =
    !!lastShown &&
    lastShown.mine === false &&
    Date.now() - lastShown.createdAt > 60 * 60 * 1000;
  useEffect(() => {
    if (!accessToken || !chatIsEmpty || experienceMode === "couple") {
      setIcebreakers([]);
      return;
    }
    let live = true;
    void fetchIcebreakers(accessToken, conversationIdFor(match)).then((lines) => {
      if (live) setIcebreakers(lines);
    });
    return () => {
      live = false;
    };
  }, [accessToken, chatIsEmpty, match.id, experienceMode]);
  // 🔥 in the header. Re-read when the message count changes, since a reply
  // can be what completes today.
  const [streak, setStreak] = useState<ChatStreak | null>(null);
  useEffect(() => {
    if (!accessToken || experienceMode === "couple") {
      setStreak(null);
      return;
    }
    let live = true;
    void fetchStreak(accessToken, conversationIdFor(match)).then((value) => {
      if (live) setStreak(value);
    });
    return () => {
      live = false;
    };
  }, [accessToken, match.id, experienceMode, messages.length]);
  const [showAttachments, setShowAttachments] = useState(
    previewState === "chat-attachments",
  );
  const [attachmentPage, setAttachmentPage] = useState<"main" | "more">("main");
  const [showEmoji, setShowEmoji] = useState(previewState === "chat-emoji");
  const [recordingPreviewVisible, setRecordingPreviewVisible] = useState(
    previewState === "chat-recording",
  );
  const [showCoach, setShowCoach] = useState(previewState === "chat-coach");
  const [gifOpen, setGifOpen] = useState(previewState === "chat-gif");
  const [gamesOpen, setGamesOpen] = useState(previewState === "chat-games");
  const [snapOpen, setSnapOpen] = useState(previewState === "chat-snap");
  const [faceEmojiOpen, setFaceEmojiOpen] = useState(
    previewState === "chat-face-emoji",
  );
  // The call itself lives in callSession (rendered by CallHost at the app root),
  // so it survives leaving this screen. These are just read-only views of it.
  const callState = useCallSession();
  const callMode = callState.mode;
  const callMinimized = callState.minimized;
  const [chatError, setChatError] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(
    previewState === "chat-options",
  );
  const [safetyOpen, setSafetyOpen] = useState(previewState === "chat-safety");
  const [settingsOpen, setSettingsOpen] = useState(
    previewState === "chat-settings",
  );
  const [searchOpen, setSearchOpen] = useState(previewState === "chat-search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  // Brief highlight on the original message after tapping a reply quote.
  // Kept separate from selectedMessageId because that one opens the
  // message action sheet.
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);
  const [viewerVideoUri, setViewerVideoUri] = useState<string | null>(null);
  // Photo/video picked from gallery or camera waits here for a caption and
  // an explicit send, same as WhatsApp's pre-send preview -- it is NOT
  // uploaded or dispatched to the chat until the user taps the send icon.
  const [pendingMedia, setPendingMedia] = useState<{
    kind: "image" | "video";
    uri: string;
    asset: ImagePicker.ImagePickerAsset;
    fallbackName: string;
  } | null>(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const [pendingMediaError, setPendingMediaError] = useState("");
  // Photos/videos/voice notes that are still uploading. They show up in the
  // chat right away with a loader on the bubble (like WhatsApp) and are
  // swapped for the real message once the server confirms it.
  const [uploadingMessages, setUploadingMessages] = useState<ChatMessage[]>([]);
  const [quickReactFor, setQuickReactFor] = useState<{
    message: ChatMessage;
    pageX: number;
    pageY: number;
  } | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [forwardMessages, setForwardMessages] = useState<ChatMessage[]>([]);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [messageActionNotice, setMessageActionNotice] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  // The realtime port (below) never actually fires in production — see its
  // onPresence handler — so livePartnerOnline (polled over REST by the
  // parent screen, chatApi.getPresence) is the real source of truth for
  // online status. Keep partnerOnline in sync with it whenever it's given.
  useEffect(() => {
    if (typeof livePartnerOnline === "boolean")
      setPartnerOnline(livePartnerOnline);
  }, [livePartnerOnline]);
  useEffect(() => {
    if (typeof livePartnerTyping === "boolean")
      setPartnerTyping(livePartnerTyping);
  }, [livePartnerTyping]);
  const [, setRealtimeConnected] = useState(false);
  const [activeRealtimeSession, setActiveRealtimeSession] =
    useState<MatchRealtimeSession | null>(null);
  const latestMessagesRef = useRef(messages);
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);
  const [, setLastCallEvent] = useState<RealtimeCallEvent | null>(null);
  const [, setIncomingCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    callerName: string;
    mode: "audio" | "video";
  } | null>(null);
  const startRealCall = async (kind: "audio" | "video") => {
    if (!accessToken || callSession.get().mode) return;
    try {
      const result = await callApi.start(
        accessToken,
        conversationIdFor(match),
        kind,
      );
      callSession.begin({
        mode: kind,
        callId: result.id,
        isCaller: true,
        match,
        isCoupleMode,
      });
    } catch {
      // silent: person can retry the call button
    }
  };
  useEffect(() => {
    if (!accessToken || callMode) return;
    let active = true;
    const poll = async () => {
      try {
        const call = await callApi.getIncoming(accessToken);
        if (!active) return;
        // Compare the CALLER's id, not the stored conversation id. A call
        // records its conversation as the id the caller addressed it by,
        // which is the callee's own user id - so matching it against
        // conversationIdFor(match), the caller's id, compared two different
        // people and was never true. The banner could not appear even when
        // the callee was sitting in the right thread.
        if (call && call.callerId === conversationIdFor(match)) {
          setIncomingCall({
            id: call.id,
            callerName: call.callerName,
            mode: call.mode,
          });
        } else {
          setIncomingCall(null);
        }
      } catch {
        // ignore transient errors; next poll retries
      }
    };
    const timer = setInterval(() => void poll(), 3000);
    void poll();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [accessToken, callMode, match]);
  // Play an audible ring + vibrate whenever an incoming call is detected.
  // There was previously no sound or vibration at all when a call arrived —
  // the banner appeared silently, so "the ring doesn't reach" really meant
  // "the ring never makes a sound". No ringtone asset exists in the app, so
  // this synthesizes a two-tone ring with the Web Audio API and repeats it
  // (plus a matching vibration pattern where supported) until the incoming
  // call is answered, declined, or otherwise clears.
  const ringAudioCtxRef = useRef<AudioContext | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const stopRinging = () => {
      if (ringTimerRef.current) {
        clearInterval(ringTimerRef.current);
        ringTimerRef.current = null;
      }
      if (ringAudioCtxRef.current) {
        void ringAudioCtxRef.current.close().catch(() => undefined);
        ringAudioCtxRef.current = null;
      }
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.vibrate
      ) {
        navigator.vibrate(0);
      }
    };
    if (!incomingCall || Platform.OS !== "web") {
      stopRinging();
      return;
    }
    const AudioContextCtor =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const playTone = () => {
      try {
        const ctx: AudioContext =
          ringAudioCtxRef.current ?? new AudioContextCtor();
        ringAudioCtxRef.current = ctx;
        const now = ctx.currentTime;
        [0, 0.45].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 480;
          gain.gain.setValueAtTime(0, now + offset);
          gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.02);
          gain.gain.linearRampToValueAtTime(0, now + offset + 0.38);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.4);
        });
      } catch {
        // some browsers block audio without a direct user gesture; ignore
      }
    };
    playTone();
    ringTimerRef.current = setInterval(playTone, 2000);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }
    return stopRinging;
  }, [incomingCall]);
  const [connectionOnline, setConnectionOnline] = useState(() =>
    Platform.OS !== "web" || typeof navigator === "undefined"
      ? true
      : navigator.onLine,
  );
  const [deliveryOverrides, setDeliveryOverrides] = useState<
    Record<string, ChatMessage["status"]>
  >({});
  const deliveryTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageOffsets = useRef<Record<string, number>>({});
  // After jumping to a quoted message, the list must not snap back to the
  // bottom when its content size changes (the highlight resizes it).
  const holdAutoScrollUntil = useRef(0);
  // Whether the person is reading at the bottom of the chat. The list only
  // follows new content (new messages, ticks, typing…) while this is true,
  // so scrolling up to read old messages is no longer undone every time
  // something resizes the list.
  const nearBottomRef = useRef(true);
  // While the list is animating to the bottom itself, intermediate scroll
  // positions must not count as "the person scrolled away".
  const followingBottomUntil = useRef(0);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTypingActiveRef = useRef(false);
  const realtimeSession = useRef<MatchRealtimeSession | null>(null);
  const speechRecognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    onresult?:
      | ((event: {
          results: ArrayLike<{ 0?: { transcript?: string } }>;
        }) => void)
      | null;
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
  } | null>(null);
  const voiceTranscriptRef = useRef("");
  const isCoupleMode = experienceMode === "couple";
  // Design previews (?preview=chat-audio-call / chat-video-call) open straight into a call screen.
  useEffect(() => {
    if (
      previewState !== "chat-audio-call" &&
      previewState !== "chat-video-call"
    )
      return;
    callSession.begin({
      mode: previewState === "chat-video-call" ? "video" : "audio",
      callId: null,
      isCaller: true,
      match,
      isCoupleMode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError)
      setChatError(status.error ?? "Voice note failed. Please try again.");
  });
  const recorderState = useAudioRecorderState(recorder, 200);
  useEffect(() => {
    if (!initialDraft) return;
    setText(initialDraft);
    setShowAttachments(false);
    setShowEmoji(false);
    onDraftConsumed?.();
  }, [initialDraft, onDraftConsumed]);
  useEffect(() => {
    if (initialTool === "games") setGamesOpen(true);
    if (initialTool) onToolConsumed();
  }, [initialTool, onToolConsumed]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const updateConnection = () => setConnectionOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);
  useEffect(
    () => () => {
      deliveryTimers.current.forEach(clearTimeout);
      deliveryTimers.current = [];
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (isChatPreview) return;
    let cancelled = false;
    setActiveRealtimeSession(null);
    const matchId = conversationIdFor(match);
    void runtimePorts.realtime
      .connect(matchId, {
        onTyping: setPartnerTyping,
        onPresence: setPartnerOnline,
        onConnection: setRealtimeConnected,
        onReceipt: (status) =>
          setDeliveryOverrides((current) => {
            const next = { ...current };
            latestMessagesRef.current.forEach((message) => {
              if (message.mine !== false) next[message.id] = status;
            });
            return next;
          }),
        onCall: (event) => {
          setLastCallEvent(event);
          if (event.event === "invite" && event.mode)
            setIncomingCallId(event.clientCallId);
          if (["reject", "end", "missed", "failed"].includes(event.event)) {
            setIncomingCallId(null);
            callSession.end(match.id);
          }
        },
      })
      .then(async (session) => {
        if (cancelled) {
          await session?.close();
          return;
        }
        realtimeSession.current = session;
        setActiveRealtimeSession(session);
        if (session) {
          await session.markDelivered();
          await session.markRead();
        }
      })
      .catch((error) => {
        if (!cancelled)
          setChatError(
            error instanceof Error
              ? error.message
              : "Realtime chat could not connect.",
          );
      });
    return () => {
      cancelled = true;
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      const session = realtimeSession.current;
      realtimeSession.current = null;
      if (session) void session.close();
    };
  }, [isChatPreview, match.id]);
  useEffect(() => {
    if (!activeRealtimeSession || !messages.length) return;
    void activeRealtimeSession
      .markDelivered()
      .then(() => activeRealtimeSession.markRead())
      .catch(() => undefined);
  }, [activeRealtimeSession, messages.length]);
  useEffect(() => {
    if (!connectionOnline) return;
    setDeliveryOverrides((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, status]) => [
          id,
          status === "sent" ? "delivered" : status,
        ]),
      ),
    );
  }, [connectionOnline]);
  const createMessage = (
    message: Omit<ChatMessage, "id" | "createdAt" | "status">,
  ): ChatMessage => ({
    ...message,
    ...(message.type === "text" && message.text
      ? { linkPreview: buildPrivacySafeLinkPreview(message.text) }
      : {}),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    status: "sent",
  });
  const messageSummary = (message: ChatMessage) => {
    const sticker = parseStickerPayload(message.text);
    return message.text?.startsWith("🎮GAME|")
      ? `Game: ${message.text.split("|")[1] ?? "Couple game"}`
      : message.text?.startsWith("🎮REPLY|")
        ? `Game answer: ${parseGameReply(message)?.answer ?? ""}`
        : message.text?.startsWith("↩REPLY|")
          ? (parseQuotedReply(message.text)?.body ?? "Reply")
          : sticker
            ? `${sticker.label} ${sticker.emoji}`
            : message.text?.trim() ||
              message.date?.venue ||
              message.document?.name ||
              (message.type === "voice"
                ? "Voice message"
                : message.type === "location"
                  ? "Live location"
                  : message.type === "image"
                    ? "Photo"
                    : message.type === "gif"
                      ? "GIF"
                      : message.type === "snap"
                        ? "View-once photo"
                        : "Message");
  };
  const dispatchMessage = async (message: ChatMessage) => {
    setChatError("");
    // The person's own message always scrolls into view.
    nearBottomRef.current = true;
    holdAutoScrollUntil.current = 0;
    setDeliveryOverrides((current) => ({ ...current, [message.id]: "sent" }));
    const sent = await onSend(message);
    if (!sent) {
      setChatError(
        "Message was not confirmed. Check your connection and try again.",
      );
      return false;
    }
    if (connectionOnline && isChatPreview) {
      const deliveredTimer = setTimeout(() => {
        setDeliveryOverrides((current) => ({
          ...current,
          [message.id]: "delivered",
        }));
        setPartnerTyping(true);
      }, 700);
      const readTimer = setTimeout(() => {
        setDeliveryOverrides((current) => ({
          ...current,
          [message.id]: "read",
        }));
        setPartnerTyping(false);
      }, 2400);
      deliveryTimers.current.push(deliveredTimer, readTimer);
    }
    return sent;
  };
  // Shows the media in the chat immediately with a loader on the bubble,
  // uploads it in the background, then sends the real message. The X on the
  // loader aborts the upload and nothing is sent.
  const sendMediaWithLoader = async (opts: {
    localUri: string;
    fileName: string;
    build: (uri: string) => Omit<ChatMessage, "id" | "createdAt" | "status">;
  }) => {
    const placeholder: ChatMessage = {
      ...createMessage(opts.build(opts.localUri)),
      uploading: true,
    };
    const controller = new AbortController();
    mediaUploadCancels.set(placeholder.id, () => controller.abort());
    setUploadingMessages((current) => [...current, placeholder]);
    try {
      const uploadedUri = accessToken
        ? await chatApi
            .uploadMedia(
              accessToken,
              opts.localUri,
              opts.fileName,
              controller.signal,
            )
            .catch((error) => {
              if (controller.signal.aborted) throw error;
              return opts.localUri;
            })
        : opts.localUri;
      if (controller.signal.aborted) return false;
      return await dispatchMessage(createMessage(opts.build(uploadedUri)));
    } catch (error) {
      if (!controller.signal.aborted) {
        setChatError(
          error instanceof Error
            ? error.message
            : "Could not send. Please try again.",
        );
      }
      return false;
    } finally {
      mediaUploadCancels.delete(placeholder.id);
      setUploadingMessages((current) =>
        current.filter((item) => item.id !== placeholder.id),
      );
    }
  };
  const insertEmojiAtCursor = (emoji: string) => {
    const { start, end } = textSelectionRef.current;
    setText((current) => {
      const safeStart = Math.min(start, current.length);
      const safeEnd = Math.min(end, current.length);
      return current.slice(0, safeStart) + emoji + current.slice(safeEnd);
    });
    // move cursor after inserted emoji
    requestAnimationFrame(() => {
      textSelectionRef.current = {
        start: start + emoji.length,
        end: start + emoji.length,
      };
    });
  };

  const updateText = (value: string) => {
    setText(value);
    if (isChatPreview) return;
    const hasText = value.trim().length > 0;
    // runtimePorts.realtime is a stub that never actually connects in
    // production (see MilaanApp.tsx), so realtimeSession.current is
    // always null there and this call was previously a silent no-op —
    // nothing ever told the backend this person was typing. The REST
    // call below (onTypingChange, polled by the other side via
    // chatApi.getPresence) is what actually carries the signal; only
    // fire it on the leading edge of typing, not on every keystroke.
    if (hasText && !restTypingActiveRef.current) {
      restTypingActiveRef.current = true;
      onTypingChange?.(true);
    }
    if (realtimeSession.current) {
      void realtimeSession.current.sendTyping(hasText).catch(() => undefined);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      void realtimeSession.current?.sendTyping(false).catch(() => undefined);
      if (restTypingActiveRef.current) {
        restTypingActiveRef.current = false;
        onTypingChange?.(false);
      }
    }, 1400);
  };
  const sendText = async () => {
    const value = text.trim();
    if (!value) return;
    const messageText = replyTarget
      ? `↩REPLY|${replyTarget.id}|${messageSummary(replyTarget).slice(0, 64)}|${value}`
      : value;
    const previousReplyTarget = replyTarget;
    // Clear the box right away (no "sending" clock on the button); if the
    // server doesn't confirm, put the text back so nothing is lost.
    setText("");
    setReplyTarget(null);
    setShowEmoji(false);
    if (!isChatPreview) {
      void realtimeSession.current?.sendTyping(false).catch(() => undefined);
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (restTypingActiveRef.current) {
        restTypingActiveRef.current = false;
        onTypingChange?.(false);
      }
    }
    // Refocus synchronously (inside the tap) so mobile browsers keep the keyboard.
    if (!showEmoji) chatInputRef.current?.focus();
    const sent = await dispatchMessage(
      createMessage({ type: "text", text: messageText }),
    );
    if (!sent) {
      setText((current) => current || value);
      setReplyTarget((current) => current ?? previousReplyTarget);
    }
  };
  const sendQuickShare = (textValue: string) => {
    void dispatchMessage(createMessage({ type: "text", text: textValue }));
    setShowAttachments(false);
    setAttachmentPage("main");
  };
  const startVoiceNote = async () => {
    setChatError("");
    setShowAttachments(false);
    setShowEmoji(false);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setChatError(
          "Microphone permission is needed to record a voice message.",
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      voiceTranscriptRef.current = "";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const SpeechRecognition =
          (
            window as unknown as {
              SpeechRecognition?: new () => NonNullable<
                typeof speechRecognitionRef.current
              >;
              webkitSpeechRecognition?: new () => NonNullable<
                typeof speechRecognitionRef.current
              >;
            }
          ).SpeechRecognition ??
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => NonNullable<
                typeof speechRecognitionRef.current
              >;
            }
          ).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.onresult = (event) => {
            voiceTranscriptRef.current = Array.from(event.results)
              .map((result) => result[0]?.transcript ?? "")
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
          };
          speechRecognitionRef.current = recognition;
          try {
            recognition.start();
          } catch {
            speechRecognitionRef.current = null;
          }
        }
      }
      recorder.record({ forDuration: 120 });
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not start recording. Check microphone access and try again.",
      );
    }
  };
  const sendVoiceNote = async () => {
    const durationMs = Math.max(1000, recorderState.durationMillis);
    try {
      await recorder.stop();
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      speechRecognitionRef.current = null;
      await setAudioModeAsync({ allowsRecording: false });
      if (recorder.uri) {
        const transcript = voiceTranscriptRef.current || undefined;
        void sendMediaWithLoader({
          localUri: recorder.uri,
          fileName: `voice-${Date.now()}.m4a`,
          build: (uri) => ({
            type: "voice",
            uri,
            voice: {
              uri,
              durationMs,
              transcript,
              transcriptStatus: transcript ? "available" : "unavailable",
            },
          }),
        });
      } else
        setChatError(
          "The recording could not be saved. Please record it again.",
        );
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not send the voice message.",
      );
    }
  };
  const cancelVoiceNote = async () => {
    try {
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      speechRecognitionRef.current = null;
      voiceTranscriptRef.current = "";
      if (recorderState.isRecording) await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setChatError(
        "Recording stopped, but the microphone could not reset cleanly.",
      );
    }
  };
  const sendOrRecord = () => {
    if (text.trim()) {
      void sendText();
      return;
    }
    void startVoiceNote();
  };
  const shareLiveLocation = async () => {
    setChatError("");
    // The permission request itself can throw (e.g. the browser has no
    // navigator.geolocation, or the user dismissed the native prompt in a
    // way expo-location's web shim treats as an error rather than a denial)
    // — previously that threw out of this function entirely with nothing
    // shown to the user, which made the whole "Location" attachment button
    // look like it silently did nothing.
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setChatError("Location permission is needed to share live location.");
        return;
      }
    } catch {
      setChatError(
        "Location access isn't available. Check your browser/device location settings and try again.",
      );
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const locationMessage = createMessage({
        type: "location",
        text: "Live location shared",
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Live location · tracking for 30 min",
          live: true,
          expiresAt: Date.now() + 30 * 60 * 1000,
          accuracy: position.coords.accuracy ?? undefined,
        },
      });
      await dispatchMessage(locationMessage);
      setShowAttachments(false);
    } catch {
      setChatError(
        "Could not get your current location. Try again outdoors or check permission settings.",
      );
    }
  };
  const sendGalleryMedia = async () => {
    setChatError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setChatError("Photo and video permission is needed to share media.");
      return;
    }
    try {
      let asset: ImagePicker.ImagePickerAsset | undefined;
      if (Platform.OS === "web") {
        // See pickWebMedia above -- works around an expo-image-picker web
        // bug where a real selection can falsely come back as "canceled".
        // Photos only: Android shows a simpler picker (tap a photo to select)
        // for an image-only input than for a mixed image+video one. Videos
        // are sent through the Document button, which also opens the caption
        // preview.
        const file = await pickWebMedia({ accept: "image/*" });
        asset = file ? webFileToImagePickerAsset(file) : undefined;
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          quality: 0.82,
          videoMaxDuration: 180,
        });
        asset = result.canceled ? undefined : result.assets[0];
      }
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > maxChatFileBytes) {
        setChatError("Choose a photo or video smaller than 100 MB.");
        return;
      }
      const name =
        asset.fileName?.trim() ||
        `Apnajoda-media-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
      // Don't upload/send yet -- open the WhatsApp-style preview so the user
      // can add a caption (or just tap send to share it as-is).
      setPendingCaption("");
      setPendingMediaError("");
      setPendingMedia({
        kind: asset.type === "video" ? "video" : "image",
        uri: asset.uri,
        asset,
        fallbackName: name,
      });
      setShowAttachments(false);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not open your photo and video library.",
      );
    }
  };
  const sendCameraPhoto = async () => {
    setChatError("");
    // On web, permission is always pre-granted (there is no native prompt),
    // so this call is a no-op — but awaiting it here yields to a microtask
    // and drops the "user activation" from the tap that started this
    // function. Without that activation, the browser silently refuses to
    // open the camera capture dialog a moment later, so the button appeared
    // to do nothing. Skip the await entirely on web and only ask for
    // permission on native, where it's a real OS-level prompt.
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setChatError("Camera permission is needed to take a photo.");
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName?.trim() || `Apnajoda-photo-${Date.now()}.jpg`;
      setPendingCaption("");
      setPendingMediaError("");
      setPendingMedia({
        kind: "image",
        uri: asset.uri,
        asset,
        fallbackName: name,
      });
      setShowAttachments(false);
    }
  };
  const cancelPendingMedia = () => {
    setPendingMedia(null);
    setPendingCaption("");
    setPendingMediaError("");
  };
  const confirmSendPendingMedia = () => {
    if (!pendingMedia) return;
    const { asset, kind, fallbackName } = pendingMedia;
    const caption = pendingCaption.trim();
    // Close the preview straight away; the photo/video appears in the chat
    // with a loader on it while it uploads (see sendMediaWithLoader).
    setPendingMedia(null);
    setPendingCaption("");
    setPendingMediaError("");
    void sendMediaWithLoader({
      localUri: asset.uri,
      fileName: fallbackName,
      build: (uri) =>
        kind === "video"
          ? {
              type: "document",
              uri,
              text: caption || undefined,
              document: {
                name: fallbackName,
                size: asset.fileSize,
                mimeType: asset.mimeType ?? "video/mp4",
                kind: "video",
              },
            }
          : { type: "image", uri, text: caption || undefined },
    });
  };
  const sendDocument = async () => {
    setChatError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if (asset.size && asset.size > maxChatFileBytes) {
        setChatError("Choose a document smaller than 100 MB.");
        return;
      }
      const isVideo = asset.mimeType?.startsWith("video/") ?? false;
      const isImage = asset.mimeType?.startsWith("image/") ?? false;
      if (isVideo || isImage) {
        // A photo/video picked through the Document button gets the same
        // caption preview as the Media button, instead of being sent
        // instantly with no way to add text.
        const name =
          asset.name?.trim() ||
          `Apnajoda-media-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
        setPendingCaption("");
        setPendingMediaError("");
        setPendingMedia({
          kind: isVideo ? "video" : "image",
          uri: asset.uri,
          asset: {
            uri: asset.uri,
            width: 0,
            height: 0,
            type: isVideo ? "video" : "image",
            fileName: name,
            fileSize: asset.size,
            mimeType: asset.mimeType,
          } as ImagePicker.ImagePickerAsset,
          fallbackName: name,
        });
        setShowAttachments(false);
        setAttachmentPage("main");
        return;
      }
      const uploadedUri = accessToken
        ? await chatApi
            .uploadMedia(
              accessToken,
              asset.uri,
              asset.name || `document-${Date.now()}`,
            )
            .catch(() => asset.uri)
        : asset.uri;
      await dispatchMessage(
        createMessage({
          type: "document",
          uri: uploadedUri,
          text: isVideo ? "Video" : "Document",
          document: {
            name: asset.name || "Shared document",
            size: asset.size,
            mimeType: asset.mimeType ?? "application/octet-stream",
            kind: isVideo ? "video" : "document",
          },
        }),
      );
      setShowAttachments(false);
      setAttachmentPage("main");
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not open the document picker. Please try again.",
      );
    }
  };
  const sendGif = (uri: string) => {
    void dispatchMessage(createMessage({ type: "gif", uri }));
    setGifOpen(false);
    setShowEmoji(false);
    setShowAttachments(false);
  };
  const sendEmojiSticker = (sticker: CustomChatSticker) => {
    void dispatchMessage(
      createMessage({ type: "text", text: buildStickerPayload(sticker) }),
    );
    setShowEmoji(false);
  };
  const sendSnap = (
    uri: string,
    filter: string,
    sticker: string,
    viewOnce: boolean,
  ) => {
    void dispatchMessage(
      createMessage({
        type: "snap",
        uri,
        snap: {
          filter,
          sticker,
          viewOnce,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        },
      }),
    );
    setSnapOpen(false);
    setShowAttachments(false);
  };
  const sendFaceEmoji = (faceUri: string, emoji: string, filter: string) => {
    void dispatchMessage(
      createMessage({
        type: "sticker",
        sticker: { faceUri, emoji, filter, label: "My face emoji" },
      }),
    );
    setFaceEmojiOpen(false);
    setShowAttachments(false);
  };
  const startGame = (game: CoupleGame, prompt: string) => {
    void dispatchMessage(
      createMessage({ type: "text", text: `🎮GAME|${game.title}|${prompt}` }),
    );
    setGamesOpen(false);
    setShowAttachments(false);
  };
  const sendGameReply = (parent: ChatMessage, answer: string) => {
    const value = answer.trim();
    if (!value) return;
    const gameTitle = parent.text?.split("|")[1] ?? "Couple game";
    void dispatchMessage(
      createMessage({
        type: "text",
        text: `🎮REPLY|${parent.id}|${gameTitle}|${value}`,
      }),
    );
  };
  const openAttachment = (id: string) => {
    if (id === "camera") {
      void sendCameraPhoto();
      return;
    }
    if (id === "gallery") {
      void sendGalleryMedia();
      return;
    }
    if (id === "location") {
      void shareLiveLocation();
      return;
    }
    if (id === "document") {
      void sendDocument();
      return;
    }
    if (id === "more") {
      setAttachmentPage("more");
      return;
    }
    if (id === "contact") {
      sendQuickShare(
        `👤 Trusted contact card\n${match.name} · Apnajoda verified match`,
      );
      return;
    }
    if (id === "poll") {
      sendQuickShare(
        "📊 Which date feels best?\n☕ Café   🍽️ Dinner   🎨 Activity",
      );
      return;
    }
    if (id === "gif") {
      setGifOpen(true);
      return;
    }
    if (id === "games") {
      setGamesOpen(true);
      return;
    }
    if (id === "snap") {
      setSnapOpen(true);
      return;
    }
    if (id === "face") {
      setFaceEmojiOpen(true);
      return;
    }
    if (id === "spark") {
      setShowAttachments(false);
      onRose();
      return;
    }
    if (id === "disappearing") {
      onSettingsChange({
        ...settings,
        retentionMode: settings.retentionMode === "keep" ? "24_hours" : "keep",
      });
      setShowAttachments(false);
      return;
    }
    if (id === "back") setAttachmentPage("main");
  };
  const activeTheme =
    coupleThemes.find((theme) => theme.name === settings.theme) ??
    coupleThemes[0]!;
  const disappearingMessages = settings.retentionMode !== "keep";
  const retentionShort =
    settings.retentionMode === "after_seen"
      ? "After seen"
      : settings.retentionMode === "24_hours"
        ? "24h"
        : settings.retentionMode === "7_days"
          ? "7d"
          : "Keep";
  const displayName = settings.nickname.trim() || match.name;
  const partnerIsOnline = isChatPreview ? connectionOnline : partnerOnline;
  // While the partner is actively here with you (or typing), no status
  // text shows above the chat at all — only when they're away does the
  // real last-seen time appear, so it reads as actual information rather
  // than a constant "Online now" banner.
  const presenceLabel = partnerTyping
    ? `${match.name} is typing…`
    : partnerIsOnline
      ? ""
      : !connectionOnline
        ? "You are offline"
        : partnerLastActiveAt
          ? formatLastSeen(partnerLastActiveAt)
          : "Last seen recently";
  const messageSafety = scanMessageSafety(text);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const previewMessagesBase: ChatMessage[] =
    previewState === "chat-document"
      ? [
          ...messages,
          {
            id: "document-card-preview",
            mine: true,
            type: "document",
            text: "Document",
            uri: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            document: {
              name: "Relationship values.pdf",
              size: 1887437,
              mimeType: "application/pdf",
              kind: "document",
            },
            createdAt: Date.now() - 120000,
            status: "read",
          },
        ]
      : previewState === "chat-media"
        ? [
            ...messages,
            {
              id: "media-card-preview",
              mine: true,
              type: "image",
              text: "Photo",
              uri: match.photo,
              createdAt: Date.now() - 120000,
              status: "read",
            },
          ]
        : previewState === "chat-voice"
          ? [
              ...messages,
              {
                id: "voice-card-preview",
                mine: true,
                type: "voice",
                text: "Voice message",
                uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                voice: {
                  uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                  durationMs: 18000,
                },
                createdAt: Date.now() - 120000,
                status: "read",
              },
            ]
          : messages;
  const previewMessages: ChatMessage[] = uploadingMessages.length
    ? [...previewMessagesBase, ...uploadingMessages]
    : previewMessagesBase;
  const recordingUiActive =
    recorderState.isRecording || recordingPreviewVisible;
  const recordingDurationMs = recordingPreviewVisible
    ? 7800
    : recorderState.durationMillis;
  const gameRepliesByParent = previewMessages.reduce<
    Record<string, ChatMessage[]>
  >((groups, message) => {
    const reply = parseGameReply(message);
    if (reply) {
      groups[reply.parentId] = [...(groups[reply.parentId] ?? []), message];
    }
    return groups;
  }, {});
  const topLevelMessages = previewMessages.filter(
    (message) =>
      !parseGameReply(message) &&
      !hiddenMessageIds.includes(message.id) &&
      !message.hiddenForMe,
  );
  const visibleMessages = normalizedSearch
    ? topLevelMessages.filter(
        (message) =>
          messageSummary(message).toLowerCase().includes(normalizedSearch) ||
          (gameRepliesByParent[message.id] ?? []).some((reply) =>
            messageSummary(reply).toLowerCase().includes(normalizedSearch),
          ),
      )
    : topLevelMessages;
  const pinnedMessages = previewMessages
    .filter((message) => !!message.pinnedAt && !message.deletedForEveryone)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  const selectedMessage =
    previewMessages.find((message) => message.id === selectedMessageId) ?? null;
  const selectMessage = (message: ChatMessage) => {
    if (message.deletedForEveryone) return;
    if (multiSelectMode) {
      setSelectedMessageIds((current) =>
        current.includes(message.id)
          ? current.filter((id) => id !== message.id)
          : [...current, message.id],
      );
      return;
    }
    setSelectedMessageId((current) =>
      current === message.id ? null : message.id,
    );
  };
  const startMultiSelect = (message?: ChatMessage) => {
    setMultiSelectMode(true);
    setSelectedMessageIds(message ? [message.id] : []);
    setSelectedMessageId(null);
  };
  const stopMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedMessageIds([]);
  };
  const reactToMessage = async (messageId: string, reaction: string) => {
    const current = previewMessages.find((item) => item.id === messageId);
    const next = current?.reactions?.me === reaction ? null : reaction;
    await onMessageState(messageId, { reaction: next });
    setSelectedMessageId(null);
  };
  const toggleStar = async (messageId: string) => {
    const current = previewMessages.find((item) => item.id === messageId);
    await onMessageState(messageId, { starred: !current?.starredByMe });
    setSelectedMessageId(null);
  };
  const togglePin = async (messageId: string) => {
    const current = previewMessages.find((item) => item.id === messageId);
    await onMessageState(messageId, { pinned: !current?.pinnedAt });
    setSelectedMessageId(null);
  };
  const hideForMe = async (messageId: string) => {
    setHiddenMessageIds((current) => [...current, messageId]);
    await onMessageState(messageId, { hidden: true });
    setSelectedMessageId(null);
  };
  const copySelected = async () => {
    if (!selectedMessage) return;
    const value = messageSummary(selectedMessage);
    try {
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(value);
        setMessageActionNotice("Message copied.");
      } else {
        await Share.share({ message: value });
        setMessageActionNotice("Copy/share options opened.");
      }
    } catch {
      setMessageActionNotice("Could not copy this message.");
    }
    setSelectedMessageId(null);
  };
  const forwardSelected = () => {
    const chosen = multiSelectMode
      ? previewMessages.filter((message) =>
          selectedMessageIds.includes(message.id),
        )
      : selectedMessage
        ? [selectedMessage]
        : [];
    if (!chosen.length) return;
    setForwardMessages(chosen);
    setSelectedMessageId(null);
    stopMultiSelect();
  };
  const requestDeleteSelected = () => {
    if (!selectedMessage || selectedMessage.mine === false) return;
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setHiddenMessageIds((current) => [
      ...new Set([...current, selectedMessage.id]),
    ]);
    setPendingDelete(selectedMessage);
    setSelectedMessageId(null);
    pendingDeleteTimer.current = setTimeout(() => {
      void onDelete(selectedMessage.id);
      setPendingDelete(null);
      pendingDeleteTimer.current = null;
    }, 5000);
  };
  const undoDelete = () => {
    if (!pendingDelete) return;
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setHiddenMessageIds((current) =>
      current.filter((id) => id !== pendingDelete.id),
    );
    setPendingDelete(null);
    pendingDeleteTimer.current = null;
  };
  const jumpToMessage = (messageId: string) => {
    const y = messageOffsets.current[messageId];
    if (typeof y === "number") {
      holdAutoScrollUntil.current = Date.now() + 3000;
      nearBottomRef.current = false;
      messagesRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
      setHighlightedMessageId(null);
      setTimeout(() => setHighlightedMessageId(messageId), 250);
      setTimeout(() => setHighlightedMessageId(null), 1800);
    } else
      setMessageActionNotice(
        "The original message is outside the loaded history.",
      );
  };
  return (
    <ChatRuntimeContext.Provider value={effectivePorts}>
      <AppCanvas>
        <SafeAreaView
          style={[
            chatPremiumStyles.safeArea,
            { backgroundColor: "transparent" },
            // On a desktop the rail and the conversation list sit to the
            // left of this thread, so it starts where they end.
            isDesktopChat
              ? {
                  paddingLeft: RAIL_WIDTH + CHAT_LIST_WIDTH,
                  maxWidth: APP_MAX_WIDTH,
                  alignSelf: "stretch" as const,
                  borderLeftWidth: 0,
                }
              : null,
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: palette.paperBase,
              borderBottomWidth: 1,
              borderBottomColor: palette.rule,
              gap: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isCoupleMode ? "Back to our space" : "Back to matches"
              }
              hitSlop={accessibilityHitSlop}
              onPress={() => {
                // A full-screen call minimizes instead of hanging up.
                if (callMode && !callMinimized) {
                  callSession.setMinimized(true);
                  return;
                }
                navigate("home");
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${match.name}'s profile`}
              disabled={!onOpenPartnerProfile}
              onPress={onOpenPartnerProfile}
            >
              {match.photo ? (
                <Image
                  accessible
                  accessibilityLabel={`${match.name} profile photo`}
                  source={{ uri: match.photo }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    borderWidth: 2,
                    borderColor: palette.crimson,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: palette.crimson,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}
                  >
                    {match.name[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Conversation with ${displayName}`}
              accessibilityHint={onOpenPartnerProfile ? "Open their profile" : "Edit chat nickname"}
              hitSlop={accessibilityHitSlop}
              // Like Instagram: the name opens their profile. The nickname is
              // still in the chat menu.
              onPress={() => (onOpenPartnerProfile ? onOpenPartnerProfile() : setSettingsOpen(true))}
              style={{ flex: 1 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                    fontFamily: fonts.display,
                    fontSize: 17,
                    color: colors.text,
                  }}
                >
                  {displayName}
                </Text>
                {!!streak?.show && (
                  <Text
                    accessibilityLabel={
                      streak.atRisk
                        ? `${streak.count} day streak, reply today to keep it`
                        : `${streak.count} day streak`
                    }
                    style={{ fontSize: 14, fontWeight: "700", color: "#C2410C" }}
                  >
                    🔥 {streak.count}
                    {streak.atRisk ? " ⏳" : ""}
                  </Text>
                )}
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: partnerTyping
                      ? palette.crimson
                      : partnerIsOnline
                        ? palette.emerald
                        : palette.slate,
                  }}
                />
                <Text numberOfLines={1} style={{ fontSize: 12, color: colors.muted }}>
                  {presenceLabel || "Online"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Audio call"
              hitSlop={accessibilityHitSlop}
              onPress={() => void startRealCall("audio")}
            >
              <Ionicons name="call-outline" size={22} color={palette.navy} />
            </Pressable>
            {chatWidth >= 340 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Video call"
                hitSlop={accessibilityHitSlop}
                onPress={() => void startRealCall("video")}
              >
                <Ionicons name="videocam-outline" size={24} color={palette.navy} />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chat options"
              hitSlop={accessibilityHitSlop}
              onPress={() => setOptionsOpen(true)}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.muted} />
            </Pressable>
          </View>
          {searchOpen && (
            <View style={chatStyles.searchBar}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel="Search this conversation"
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search this conversation"
                placeholderTextColor="#1F5286"
                style={chatStyles.searchInput}
              />
              <Text
                accessibilityLiveRegion="polite"
                style={chatStyles.searchCount}
              >
                {normalizedSearch ? `${visibleMessages.length} found` : ""}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close message search"
                hitSlop={accessibilityHitSlop}
                onPress={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
          )}
          {!!incomingCall && !callMode && (
            <View accessibilityRole="alert" style={chatStyles.incomingCall}>
              <PremiumIcon
                name={incomingCall?.mode === "video" ? "videocam" : "call"}
                tone="ruby"
                size={40}
                iconSize={19}
              />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.incomingCallTitle}>
                  Incoming {incomingCall?.mode ?? "audio"} call
                </Text>
                <Text style={chatStyles.incomingCallBody}>
                  {match.name} · Verified mutual match
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decline call"
                hitSlop={accessibilityHitSlop}
                onPress={() => {
                  if (incomingCall)
                    void callApi
                      .respond(accessToken, incomingCall.id, false)
                      .catch(() => undefined);
                  setIncomingCall(null);
                  setIncomingCallId(null);
                }}
                style={chatStyles.callDecline}
              >
                <Ionicons name="call" size={17} color={colors.danger} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Accept call"
                hitSlop={accessibilityHitSlop}
                onPress={() => {
                  if (!incomingCall) return;
                  void callApi
                    .respond(accessToken, incomingCall.id, true)
                    .catch(() => undefined);
                  callSession.begin({
                    mode: incomingCall.mode,
                    callId: incomingCall.id,
                    isCaller: false,
                    match,
                    isCoupleMode,
                  });
                  setIncomingCall(null);
                }}
                style={chatStyles.callAccept}
              >
                <Ionicons name="call" size={17} color={colors.textInverse} />
              </Pressable>
            </View>
          )}
          <View style={chatStyles.contextBar}>
            <View style={shared.spacer} />
            {false && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reply coach"
                accessibilityState={{ expanded: showCoach }}
                hitSlop={accessibilityHitSlop}
                onPress={() => setShowCoach((value) => !value)}
                style={[
                  chatStyles.contextAction,
                  showCoach && chatStyles.contextActionOn,
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={showCoach ? colors.gold : colors.muted}
                />
                <Text style={chatStyles.contextActionText}>Coach</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search messages"
              accessibilityState={{ expanded: searchOpen }}
              hitSlop={accessibilityHitSlop}
              onPress={() => {
                setSearchOpen((value) => !value);
                setSearchQuery("");
              }}
              style={chatStyles.contextIcon}
            >
              <Ionicons name="search-outline" size={17} color={colors.muted} />
            </Pressable>
            {chatWidth >= 410 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chat settings"
                hitSlop={accessibilityHitSlop}
                onPress={() => setSettingsOpen(true)}
                style={chatStyles.contextIcon}
              >
                <Ionicons
                  name="settings-outline"
                  size={17}
                  color={colors.muted}
                />
              </Pressable>
            )}
          </View>
          {showCoach && (
            <View style={[coachStyles.chatCoach, chatStyles.coachPanel]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 7 }}
              >
                {chatCoachSuggestions.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      setText(item.message(match));
                      setShowCoach(false);
                    }}
                    style={[
                      coachStyles.suggestionChip,
                      {
                        borderColor: "#D3D6DA",
                        backgroundColor: "rgba(255,255,255,.045)",
                      },
                    ]}
                  >
                    <Text style={coachStyles.suggestionText}>{item.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {!!chatError && (
            <Pressable
              onPress={() => setChatError("")}
              style={chatStyles.errorBanner}
            >
              <Text style={chatStyles.errorText}>{chatError}</Text>
              <MiniPremiumIcon
                name="close"
                tone="dark"
                size={28}
                iconSize={13}
              />
            </Pressable>
          )}
          {!!pinnedMessages.length && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${pinnedMessages.length} pinned messages`}
              onPress={() => setPinnedOpen(true)}
              style={chatStyles.pinnedBanner}
            >
              <MiniPremiumIcon name="pin" tone="gold" size={28} iconSize={13} />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.pinnedBannerTitle}>
                  {pinnedMessages.length} pinned{" "}
                  {pinnedMessages.length === 1 ? "message" : "messages"}
                </Text>
                <Text numberOfLines={1} style={chatStyles.pinnedBannerBody}>
                  {messageSummary(pinnedMessages[0]!)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#701B2C" />
            </Pressable>
          )}
          {multiSelectMode && (
            <View accessibilityRole="toolbar" style={chatStyles.multiSelectBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel message selection"
                onPress={stopMultiSelect}
                style={chatStyles.multiSelectButton}
              >
                <Ionicons name="close" size={18} color="#194470" />
              </Pressable>
              <Text
                accessibilityLiveRegion="polite"
                style={chatStyles.multiSelectCount}
              >
                {selectedMessageIds.length} selected
              </Text>
              <View style={shared.spacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward selected messages"
                disabled={!selectedMessageIds.length}
                onPress={forwardSelected}
                style={[
                  chatStyles.multiSelectAction,
                  !selectedMessageIds.length && { opacity: 0.4 },
                ]}
              >
                <Ionicons name="arrow-redo-outline" size={17} color="#FFFFFF" />
                <Text style={chatStyles.multiSelectActionText}>Forward</Text>
              </Pressable>
            </View>
          )}
          {!!pendingDelete && (
            <View accessibilityRole="alert" style={chatStyles.undoBanner}>
              <Ionicons name="trash-outline" size={17} color="#163D65" />
              <Text style={chatStyles.undoText}>Message deleted</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Undo message delete"
                onPress={undoDelete}
                style={chatStyles.undoButton}
              >
                <Text style={chatStyles.undoButtonText}>UNDO</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            ref={messagesRef}
            onScroll={(event) => {
              handleBottomNavScroll(event);
              const { contentOffset, contentSize, layoutMeasurement } =
                event.nativeEvent;
              const atBottom =
                contentOffset.y + layoutMeasurement.height >=
                contentSize.height - 160;
              if (atBottom || Date.now() > followingBottomUntil.current)
                nearBottomRef.current = atBottom;
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            // Never "on-drag" on the web: react-native-web dismisses the
            // keyboard on EVERY scroll event, not just a finger drag. Opening
            // the keyboard shrinks the page, the message list scrolls to keep
            // its place, and that scroll closed the keyboard again - so in any
            // chat long enough to scroll, the keyboard would not stay up.
            keyboardDismissMode={
              Platform.OS === "ios"
                ? "interactive"
                : Platform.OS === "android"
                  ? "on-drag"
                  : "none"
            }
            onContentSizeChange={() => {
              if (Date.now() < holdAutoScrollUntil.current) return;
              if (!nearBottomRef.current) return;
              followingBottomUntil.current = Date.now() + 800;
              messagesRef.current?.scrollToEnd({ animated: true });
            }}
            contentContainerStyle={[
              styles.messages,
              chatPremiumStyles.messages,
            ]}
          >
            {visibleMessages.map((message) => (
              <View
                key={message.id}
                onLayout={(event) => {
                  messageOffsets.current[message.id] =
                    event.nativeEvent.layout.y;
                }}
                style={[
                  chatStyles.messageGroup,
                  (highlightedMessageId === message.id ||
                    selectedMessageIds.includes(message.id)) &&
                    chatStyles.messageGroupSelected,
                ]}
              >
                <ChatBubble
                  message={message}
                  status={furthestStatus(
                    deliveryOverrides[message.id],
                    message.status,
                  )}
                  accent={activeTheme.accent}
                  reaction={
                    message.reactions?.partner ||
                    message.reactions?.me ||
                    undefined
                  }
                  starred={message.starredByMe}
                  pinned={!!message.pinnedAt}
                  selected={selectedMessageIds.includes(message.id)}
                  gameReplies={gameRepliesByParent[message.id] ?? []}
                  onReplyJump={jumpToMessage}
                  onGameReply={(answer) => sendGameReply(message, answer)}
                  onOpenLiveGame={
                    accessToken && !isCoupleMode ? (id) => setPlayGameId(id) : undefined
                  }
                  onPress={() => selectMessage(message)}
                  onSwipeReply={() => setReplyTarget(message)}
                  onSwipeEdit={
                    message.mine !== false && message.type === "text"
                      ? () => setEditTarget(message)
                      : undefined
                  }
                  onOpenImage={(uri) => setViewerImageUri(uri)}
                  onOpenVideo={(uri) => setViewerVideoUri(uri)}
                  onQuickReact={(event) => {
                    if (multiSelectMode || message.deletedForEveryone) return;
                    const { pageX, pageY } = event.nativeEvent;
                    setQuickReactFor({ message, pageX, pageY });
                  }}
                />
              </View>
            ))}
            <Modal
              visible={!!viewerImageUri}
              transparent
              animationType="fade"
              onRequestClose={() => setViewerImageUri(null)}
            >
              <Pressable
                style={{
                  flex: 1,
                  backgroundColor: "#000000",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => setViewerImageUri(null)}
              >
                {viewerImageUri && (
                  <ExpoImage
                    source={{ uri: viewerImageUri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    autoplay
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setViewerImageUri(null)}
                  style={{
                    position: "absolute",
                    top: 48,
                    right: 20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </Pressable>
            </Modal>
            <Modal
              visible={!!viewerVideoUri}
              transparent
              animationType="fade"
              onRequestClose={() => setViewerVideoUri(null)}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#000000",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {viewerVideoUri && <InlineVideoPlayer uri={viewerVideoUri} />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close video"
                  onPress={() => setViewerVideoUri(null)}
                  style={{
                    position: "absolute",
                    top: 48,
                    right: 20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </Modal>
            {!!normalizedSearch && !visibleMessages.length && (
              <View style={chatStyles.emptySearch}>
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={colors.muted}
                />
                <Text style={chatStyles.emptySearchText}>
                  No messages match “{searchQuery}”.
                </Text>
              </View>
            )}
            {!isCoupleMode &&
              !normalizedSearch &&
              messages.length === 0 &&
              icebreakers.length > 0 && (
                <View
                  accessibilityLabel="Ways to start the conversation"
                  style={{
                    margin: 16,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E3E7EC",
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Mukta_700Bold",
                      fontSize: 15,
                      color: "#151719",
                    }}
                  >
                    👋 Say something better than "Hi"
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Mukta_400Regular",
                      fontSize: 13,
                      color: "#5A5E63",
                    }}
                  >
                    Tap one to start - you can edit it before sending.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Start with a quick game"
                    onPress={() => setGamesOpen(true)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 12,
                      backgroundColor: pressed ? "#E8EEF5" : "#F1F4F8",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    })}
                  >
                    <Text style={{ fontSize: 18 }}>🎮</Text>
                    <Text
                      style={{
                        fontFamily: "Mukta_600SemiBold",
                        fontSize: 14,
                        color: "#1D4F81",
                      }}
                    >
                      Or start with a quick game
                    </Text>
                  </Pressable>
                  {icebreakers.map((line) => (
                    <Pressable
                      key={line}
                      accessibilityRole="button"
                      accessibilityLabel={`Use opening line: ${line}`}
                      onPress={() => setText(line)}
                      style={({ pressed }) => ({
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#1D4F81",
                        backgroundColor: pressed ? "#EEF2F6" : "#F8FAFC",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      })}
                    >
                      <Text
                        style={{
                          fontFamily: "Mukta_500Medium",
                          fontSize: 14,
                          color: "#1D4F81",
                        }}
                      >
                        {line}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            {!!liveGameError && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${liveGameError}. Tap to dismiss.`}
                onPress={() => setLiveGameError("")}
                style={{
                  alignSelf: "center",
                  marginVertical: 8,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: "#FBE9EC",
                }}
              >
                <Text style={{ fontSize: 13, color: "#B3261E" }}>🎮 {liveGameError}</Text>
              </Pressable>
            )}
            {!isCoupleMode && !normalizedSearch && theyAreWaiting && !partnerTyping && (
              <View
                accessible
                accessibilityLabel={`${match.name} is waiting for your reply`}
                style={{
                  alignSelf: "center",
                  marginVertical: 12,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: "#FDF0E1",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Mukta_600SemiBold",
                    fontSize: 13,
                    color: "#9A5B00",
                  }}
                >
                  💬 {match.name} is waiting for your reply
                </Text>
              </View>
            )}
            {!isCoupleMode && partnerTyping && (
              <View
                accessible
                accessibilityLabel={`${match.name} is typing`}
                style={chatStyles.typingRow}
              >
                {match.photo ? (
                  <Image
                    accessible={false}
                    source={{ uri: match.photo }}
                    style={chatStyles.typingAvatar}
                  />
                ) : (
                  <View
                    style={[chatStyles.typingAvatar, chatStyles.initialAvatar]}
                  >
                    <Text style={chatStyles.typingInitial}>
                      {match.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={chatStyles.typingBubble}>
                  <View style={chatStyles.typingDot} />
                  <View style={chatStyles.typingDot} />
                  <View style={chatStyles.typingDot} />
                </View>
                <Text style={chatStyles.typingLabel}>
                  {match.name} is typing
                </Text>
              </View>
            )}
          </ScrollView>
          <KeyboardAvoidingView
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : Platform.OS === "android"
                  ? "height"
                  : undefined
            }
            // On the web KeyboardAvoidingView takes no behaviour, so the
            // keyboard covered the composer and the emoji panel - and the
            // search field inside it that had just been tapped.
            style={[chatStyles.keyboardWrap, { paddingBottom: keyboardInset }]}
          >
            {!!text.trim() && messageSafety.signals.length > 0 && (
              <SafetyNudge
                scan={messageSafety}
                onOpenSafety={() => navigate("safety")}
              />
            )}
            {showAttachments && (
              <View
                style={[
                  chatStyles.attachmentTray,
                  chatWidth >= 600 && chatStyles.attachmentTrayWide,
                ]}
              >
                <View style={chatStyles.attachmentTrayHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      accessibilityRole="header"
                      style={chatStyles.attachmentTrayTitle}
                    >
                      {attachmentPage === "main"
                        ? "Share in chat"
                        : "More ways to connect"}
                    </Text>
                    <Text style={chatStyles.attachmentTrayBody}>
                      {attachmentPage === "main"
                        ? "Photos, video, files, places and date plans."
                        : "Play together, create a poll or turn on privacy tools."}
                    </Text>
                  </View>
                  <Text style={chatStyles.attachmentTrayPage}>
                    {attachmentPage === "main" ? "1 / 2" : "2 / 2"}
                  </Text>
                </View>
                {(attachmentPage === "main"
                  ? chatPrimaryAttachments
                  : chatMoreAttachments
                )
                  .filter((item) => !isCoupleMode || item.id !== "spark")
                  .map((item) => (
                    <Attachment
                      key={item.id}
                      icon={item.icon as keyof typeof Ionicons.glyphMap}
                      label={
                        item.id === "disappearing"
                          ? disappearingMessages
                            ? `${retentionShort} On`
                            : "Timer Off"
                          : item.label
                      }
                      color={item.color}
                      onPress={() => openAttachment(item.id)}
                    />
                  ))}
              </View>
            )}
            {showEmoji && (
              <EmojiMediaPanel
                onEmoji={insertEmojiAtCursor}
                onGif={sendGif}
                onSticker={sendEmojiSticker}
              />
            )}
            {replyTarget && (
              <View style={chatStyles.replyPreview}>
                <View style={chatStyles.replyAccent} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Jump to the message you're replying to"
                  style={{ flex: 1 }}
                  onPress={() => jumpToMessage(replyTarget.id)}
                >
                  <Text style={chatStyles.replyTitle}>
                    {replyTarget.mine !== false
                      ? "Replying to your message"
                      : `Replying to ${displayName}`}
                  </Text>
                  <Text numberOfLines={1} style={chatStyles.replyText}>
                    {messageSummary(replyTarget)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                  hitSlop={accessibilityHitSlop}
                  onPress={() => setReplyTarget(null)}
                >
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
            )}
            {recordingUiActive ? (
              <VoiceRecordingComposer
                durationMs={recordingDurationMs}
                onCancel={() => {
                  setRecordingPreviewVisible(false);
                  void cancelVoiceNote();
                }}
                onSend={() => {
                  if (recordingPreviewVisible) {
                    setRecordingPreviewVisible(false);
                    return;
                  }
                  void sendVoiceNote();
                }}
              />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: palette.paperBase,
                  borderTopWidth: 1,
                  borderTopColor: palette.rule,
                  gap: 10,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showEmoji ? "Show keyboard" : "Emoji, GIFs and stickers"
                  }
                  hitSlop={accessibilityHitSlop}
                  onPress={() => {
                    setShowAttachments(false);
                    setAttachmentPage("main");
                    if (showEmoji) {
                      setShowEmoji(false);
                      chatInputRef.current?.focus();
                    } else {
                      chatInputRef.current?.blur();
                      setShowEmoji(true);
                    }
                  }}
                >
                  <Ionicons
                    name={showEmoji ? "keypad-outline" : "happy-outline"}
                    size={24}
                    color={palette.crimson}
                  />
                </Pressable>

                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.paperSand,
                    borderWidth: 1,
                    borderColor: palette.rule,
                    borderRadius: radius.pill,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    gap: 8,
                  }}
                >
                  <TextInput
                    ref={chatInputRef}
                    accessibilityLabel="Type a message"
                    value={text}
                    onChangeText={updateText}
                    onSelectionChange={(event) => {
                      textSelectionRef.current = event.nativeEvent.selection;
                    }}
                    onFocus={() => {
                      setShowEmoji(false);
                      setShowAttachments(false);
                      setAttachmentPage("main");
                    }}
                    placeholder="Message…"
                    placeholderTextColor="#9AA4AF"
                    multiline
                    maxLength={4000}
                    style={[
                      {
                        flex: 1,
                        fontSize: 15,
                        color: colors.text,
                        maxHeight: 110,
                        paddingVertical: 0,
                      },
                      Platform.OS === "web"
                        ? ({ outlineStyle: "none" } as never)
                        : null,
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Attach"
                    accessibilityState={{ expanded: showAttachments }}
                    hitSlop={accessibilityHitSlop}
                    onPress={() => {
                      setShowEmoji(false);
                      setAttachmentPage("main");
                      setShowAttachments((value) => !value);
                    }}
                  >
                    <Ionicons name="attach" size={22} color={palette.crimson} />
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    text.trim() ? "Send message" : "Record voice message"
                  }
                  onPress={sendOrRecord}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: palette.navy,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={text.trim() ? "send" : "mic"}
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            )}
            
          </KeyboardAvoidingView>
          {/* No bottom tab bar inside an open chat — matches WhatsApp, where
              being in a conversation replaces the app's main navigation with
              just that conversation until you go back. */}
          <MessageActionSheet
            visible={!!selectedMessage}
            message={selectedMessage}
            reaction={selectedMessage?.reactions?.me || undefined}
            starred={!!selectedMessage?.starredByMe}
            pinned={!!selectedMessage?.pinnedAt}
            notice={messageActionNotice}
            onClose={() => {
              setSelectedMessageId(null);
              setMessageActionNotice("");
            }}
            onInfo={() =>
              setMessageActionNotice(
                selectedMessage
                  ? `${selectedMessage.mine === false ? "Received" : "Sent"} ${new Date(selectedMessage.createdAt).toLocaleString()} · ${furthestStatus(deliveryOverrides[selectedMessage.id], selectedMessage.status)}${selectedMessage.editedAt ? " · Edited" : ""}`
                  : "",
              )
            }
            onReply={() => {
              if (selectedMessage) setReplyTarget(selectedMessage);
              setSelectedMessageId(null);
            }}
            onEdit={() => {
              if (selectedMessage) setEditTarget(selectedMessage);
              setSelectedMessageId(null);
            }}
            onCopy={() => void copySelected()}
            onReact={(reaction) => {
              if (selectedMessage)
                void reactToMessage(selectedMessage.id, reaction);
            }}
            onForward={forwardSelected}
            onMultiSelect={() => {
              if (selectedMessage) startMultiSelect(selectedMessage);
            }}
            onPin={() => {
              if (selectedMessage) void togglePin(selectedMessage.id);
            }}
            onStar={() => {
              if (selectedMessage) void toggleStar(selectedMessage.id);
            }}
            onDelete={requestDeleteSelected}
            onHideForMe={() => {
              if (selectedMessage) void hideForMe(selectedMessage.id);
            }}
          />
          {!!quickReactFor &&
            (() => {
              const barWidth = 312;
              const barHeight = 56;
              const left = Math.min(
                Math.max(quickReactFor.pageX - barWidth / 2, 12),
                chatWidth - barWidth - 12,
              );
              const top = Math.min(
                Math.max(quickReactFor.pageY - barHeight - 24, 60),
                chatHeight - barHeight - 100,
              );
              const activeReaction = quickReactFor.message.reactions?.me;
              return (
                <Modal
                  visible
                  transparent
                  animationType="fade"
                  onRequestClose={() => setQuickReactFor(null)}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close quick reactions"
                    style={chatStyles.floatReactBackdrop}
                    onPress={() => setQuickReactFor(null)}
                  />
                  <View
                    style={[
                      chatStyles.floatReactBar,
                      { left, top, width: barWidth },
                    ]}
                  >
                    {["❤️", "😂", "😮", "😢", "🙏", "👍"].map((item) => (
                      <Pressable
                        key={item}
                        accessibilityRole="button"
                        accessibilityLabel={`React ${item}`}
                        accessibilityState={{
                          selected: activeReaction === item,
                        }}
                        onPress={() => {
                          void reactToMessage(quickReactFor.message.id, item);
                          setQuickReactFor(null);
                        }}
                        style={[
                          chatStyles.floatReactButton,
                          activeReaction === item &&
                            chatStyles.floatReactButtonOn,
                        ]}
                      >
                        <Text style={chatStyles.floatReactEmoji}>{item}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="More message actions"
                      onPress={() => {
                        setSelectedMessageId(quickReactFor.message.id);
                        setQuickReactFor(null);
                      }}
                      style={chatStyles.floatReactMoreButton}
                    >
                      <Ionicons name="add" size={20} color="#163C63" />
                    </Pressable>
                  </View>
                </Modal>
              );
            })()}
          <EditMessageSheet
            message={editTarget}
            onClose={() => setEditTarget(null)}
            onSave={async (textValue) => {
              if (!editTarget) return false;
              const saved = await onEdit(editTarget.id, textValue);
              if (saved) setEditTarget(null);
              return saved;
            }}
          />
          <ForwardSelectorSheet
            visible={forwardMessages.length > 0}
            messages={forwardMessages}
            current={match}
            onClose={() => setForwardMessages([])}
            onForward={async (target) => {
              const sent = await onForward(target, forwardMessages);
              setForwardMessages([]);
              setMessageActionNotice(
                `${sent} ${sent === 1 ? "message" : "messages"} forwarded to ${target.name}.`,
              );
            }}
          />
          <PinnedMessagesSheet
            visible={pinnedOpen}
            messages={pinnedMessages}
            onClose={() => setPinnedOpen(false)}
            onJump={(messageId) => {
              setPinnedOpen(false);
              setTimeout(() => jumpToMessage(messageId), 250);
            }}
            onUnpin={(messageId) => void togglePin(messageId)}
          />
          <ConversationInboxSheet
            visible={inboxOpen}
            current={match}
            settings={conversationSettings}
            onClose={() => setInboxOpen(false)}
            onOpen={(target) => {
              setInboxOpen(false);
              onOpenConversation(target);
            }}
          />
          <GifPicker
            visible={gifOpen}
            onClose={() => setGifOpen(false)}
            onSelect={sendGif}
            onSticker={sendEmojiSticker}
          />
          <GameSheet
            visible={gamesOpen}
            onClose={() => setGamesOpen(false)}
            onPlay={startGame}
            onPickLive={
              accessToken && !isCoupleMode ? (kind) => void startLiveGame(kind) : undefined
            }
          />
          {!!accessToken && !isCoupleMode && (
            <>
              <KnowMeSetupSheet
                visible={knowMeSetupOpen}
                accessToken={accessToken}
                partnerName={match.name}
                onClose={() => setKnowMeSetupOpen(false)}
                onStart={async (setup) => {
                  const game = await gamesApi.start(
                    accessToken,
                    conversationIdFor(match),
                    "know_me",
                    setup,
                  );
                  setKnowMeSetupOpen(false);
                  setPlayGameId(game.id);
                }}
              />
              <GamePlaySheet
                gameId={playGameId}
                accessToken={accessToken}
                partnerName={match.name}
                onClose={() => setPlayGameId(null)}
              />
            </>
          )}
          <SnapStudio
            visible={snapOpen}
            onClose={() => setSnapOpen(false)}
            onSend={sendSnap}
          />
          <FaceEmojiStudio
            visible={faceEmojiOpen}
            onClose={() => setFaceEmojiOpen(false)}
            onSend={sendFaceEmoji}
          />
          <MediaCaptionPreview
            visible={!!pendingMedia}
            kind={pendingMedia?.kind ?? "image"}
            uri={pendingMedia?.uri ?? ""}
            fallbackName={pendingMedia?.fallbackName ?? ""}
            caption={pendingCaption}
            onChangeCaption={setPendingCaption}
            onCancel={cancelPendingMedia}
            onSend={() => void confirmSendPendingMedia()}
            sending={false}
            error={pendingMediaError}
          />
          <CoupleSettingsSheet
            visible={settingsOpen}
            match={match}
            settings={settings}
            onChange={onSettingsChange}
            onClose={() => setSettingsOpen(false)}
          />
          <ChatOptionsSheet
            visible={optionsOpen}
            retentionLabel={retentionShort}
            screenshotAlerts={settings.screenshotAlerts}
            onClose={() => setOptionsOpen(false)}
            onInbox={() => {
              setOptionsOpen(false);
              setInboxOpen(true);
            }}
            onSearch={() => {
              setOptionsOpen(false);
              setSearchOpen(true);
              setSearchQuery("");
            }}
            onSettings={() => {
              setOptionsOpen(false);
              setSettingsOpen(true);
            }}
            onSafety={() => {
              setOptionsOpen(false);
              setSafetyOpen(true);
            }}
            onSelectMessages={() => {
              setOptionsOpen(false);
              startMultiSelect();
            }}
          />
          <SafetyActions
            mode={experienceMode}
            visible={safetyOpen}
            match={match}
            isBlocked={isBlocked}
            onClose={() => setSafetyOpen(false)}
            onSafetyCenter={() => {
              setSafetyOpen(false);
              navigate("safety");
            }}
            onReport={(reason, details) => {
              setSafetyOpen(false);
              return onReport(reason, details);
            }}
            onBlock={() => {
              setSafetyOpen(false);
              onBlock();
            }}
            onUnblock={() => {
              setSafetyOpen(false);
              onUnblock();
            }}
            onUnmatch={() => {
              setSafetyOpen(false);
              onUnmatch();
            }}
          />
        </SafeAreaView>
      </AppCanvas>
    </ChatRuntimeContext.Provider>
  );
}

function MessageReceipt({ status }: { status: ChatMessage["status"] }) {
  return (
    <View accessibilityLabel={receiptLabel(status)} style={chatStyles.receipt}>
      <Ionicons
        name={receiptIcon(status)}
        size={14}
        color={receiptColor(status)}
      />
    </View>
  );
}

/** How wide a photo, GIF or snap sits in the thread. */
const MEDIA_BUBBLE_WIDTH = 260;

function ChatBubble({
  message,
  status,
  accent: _accent,
  reaction,
  starred,
  pinned,
  selected,
  gameReplies = [],
  onReplyJump,
  onGameReply,
  onOpenLiveGame,
  onPress,
  onOpenImage,
  onOpenVideo,
  onQuickReact,
  onSwipeReply,
  onSwipeEdit,
}: {
  message: ChatMessage;
  status: ChatMessage["status"];
  accent?: string;
  reaction?: string;
  onSwipeEdit?: () => void;
  starred?: boolean;
  pinned?: boolean;
  selected?: boolean;
  gameReplies?: ChatMessage[];
  onReplyJump?: (messageId: string) => void;
  onGameReply?: (answer: string) => void;
  /** Open a play-together game from its card. */
  onOpenLiveGame?: (gameId: string) => void;
  onPress?: () => void;
  onOpenImage?: (uri: string) => void;
  onOpenVideo?: (uri: string) => void;
  onQuickReact?: (event: GestureResponderEvent) => void;
  onSwipeReply?: () => void;
}) {
  /**
   * A photo keeps its own shape.
   *
   * The frame was a fixed 210px tall, so a portrait photo - which is most
   * of what people send from a phone - was cropped to a letterbox slice
   * of itself. The real ratio comes from the image once it loads, clamped
   * so that a panorama or a very tall screenshot still fits a bubble.
   */
  const [mediaRatio, setMediaRatio] = useState(4 / 3);
  const mediaUri = message.uri;
  useEffect(() => {
    // Image.getSize rather than onLoad: react-native-web does not give
    // the loaded dimensions through the load event the way native does,
    // so every photo kept the default shape no matter what it was.
    if (!mediaUri) return;
    let live = true;
    Image.getSize(
      mediaUri,
      (width, height) => {
        if (!live || !width || !height) return;
        setMediaRatio(Math.min(1.9, Math.max(0.62, width / height)));
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [mediaUri]);

  const mine = message.mine !== false;
  // WhatsApp-style swipe actions: swipe right on any message to reply;
  // swipe left on your own message to edit it (can't edit the other
  // person's message, so a left swipe on their bubble just resists back).
  const SWIPE_ACTION_THRESHOLD = 56;
  const SWIPE_ACTION_MAX = 84;
  const canSwipeEdit = mine && !!onSwipeEdit;
  const swipeX = useRef(new Animated.Value(0)).current;
  const resetSwipe = () =>
    Animated.spring(swipeX, {
      toValue: 0,
      friction: 7,
      tension: 80,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        let clamped = gesture.dx;
        if (clamped > 0) clamped = Math.min(SWIPE_ACTION_MAX, clamped);
        else if (canSwipeEdit) clamped = Math.max(-SWIPE_ACTION_MAX, clamped);
        else clamped = 0;
        swipeX.setValue(clamped);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_ACTION_THRESHOLD) onSwipeReply?.();
        else if (canSwipeEdit && gesture.dx < -SWIPE_ACTION_THRESHOLD)
          onSwipeEdit?.();
        resetSwipe();
      },
      onPanResponderTerminate: resetSwipe,
    }),
  ).current;
  const gamePayload =
    message.type === "text" && message.text?.startsWith("🎮GAME|")
      ? message.text.split("|")
      : null;
  const gameTitle = gamePayload?.[1] ?? "";
  const gamePrompt = gamePayload?.slice(2).join("|") ?? "";
  const quotedReply =
    message.type === "text" ? parseQuotedReply(message.text) : null;
  const stickerPayload =
    message.type === "text" ? parseStickerPayload(message.text) : null;
  const catalogGif =
    message.type === "gif" ? parseCatalogGifUri(message.uri) : null;
  const emojiText =
    stickerPayload?.emoji ??
    (message.type === "text" ? (message.text?.trim() ?? "") : "");
  const isJustEmoji = isAnimatedEmojiText(message.text);
  const emojiOnly = message.type === "text" && !!stickerPayload; // Only animate custom stickers
  const textBody = quotedReply?.body ?? message.text;
  const linkPreview =
    message.linkPreview ?? buildPrivacySafeLinkPreview(textBody);
  const incomingSafety = !mine && textBody ? scanMessageSafety(textBody) : null;
  const isVideoDocument =
    message.type === "document" && message.document?.kind === "video";
  const openDocument = () => {
    if (!message.uri) return;
    if (isVideoDocument) {
      // Play videos inside the app rather than handing off to the browser.
      onOpenVideo?.(message.uri);
      return;
    }
    void Linking.openURL(message.uri).catch(() => undefined);
  };
  const isMediaBubble =
    message.type === "image" ||
    message.type === "gif" ||
    message.type === "snap";
  const bubbleStyle = [
    {
      maxWidth: "80%" as const,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      marginBottom: 8,
      alignSelf: mine ? ("flex-end" as const) : ("flex-start" as const),
    },
    mine
      ? { backgroundColor: palette.navy, borderBottomRightRadius: 4 }
      : {
          backgroundColor: palette.paper,
          borderWidth: 1,
          borderColor: palette.rule,
          borderBottomLeftRadius: 4,
        },
    !!gamePayload && chatStyles.gameMessageBubble,
    !!gamePayload && !mine && chatStyles.gameMessageBubbleTheirs,
    message.type === "sticker" && chatStyles.stickerBubble,
    message.type === "date" && dateStyles.dateBubble,
    message.type === "voice" && chatStyles.voiceBubble,
    message.type === "voice" && !mine && chatStyles.voiceBubbleTheirs,
    message.type === "location" && chatStyles.locationBubble,
    message.type === "document" && chatStyles.documentBubble,
    message.type === "document" && !mine && chatStyles.documentBubbleTheirs,
    // A photo bubble needs a real width. Without one it sizes to its
    // content, the frame's `width: 100%` has nothing to resolve against,
    // and the photo collapses to a thumbnail a few pixels across.
    isMediaBubble && { padding: 6, width: MEDIA_BUBBLE_WIDTH },
    (emojiOnly || isJustEmoji) && {
      backgroundColor: "transparent",
      borderWidth: 0,
      borderColor: "transparent",
      elevation: 0,
      shadowOpacity: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
  ];
  if (message.deletedForEveryone) return null;
  return (
    <View style={chatStyles.swipeReplyWrap}>
      <Animated.View
        style={[
          chatStyles.swipeReplyIcon,
          { left: 10 },
          {
            opacity: swipeX.interpolate({
              inputRange: [0, SWIPE_ACTION_THRESHOLD, SWIPE_ACTION_MAX],
              outputRange: [0, 0.4, 1],
              extrapolate: "clamp",
            }),
          },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="arrow-undo-outline" size={16} color={colors.muted} />
      </Animated.View>
      {canSwipeEdit && (
        <Animated.View
          style={[
            chatStyles.swipeReplyIcon,
            { right: 10 },
            {
              opacity: swipeX.interpolate({
                inputRange: [-SWIPE_ACTION_MAX, -SWIPE_ACTION_THRESHOLD, 0],
                outputRange: [1, 0.4, 0],
                extrapolate: "clamp",
              }),
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="create-outline" size={16} color={colors.muted} />
        </Animated.View>
      )}
      <Animated.View
        {...swipeResponder.panHandlers}
        style={{ width: "100%", transform: [{ translateX: swipeX }] }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Message: ${messageSummaryForAccessibility(message)}. ${mine ? status : "Received"}.`}
          accessibilityHint={
            message.type === "document"
              ? isVideoDocument
                ? "Play shared video"
                : "Open shared file"
              : gamePayload
                ? "Answer inside this game card"
                : "Open message actions"
          }
          onPress={
            message.type === "document"
              ? openDocument
              : gamePayload
                ? undefined
                : (message.type === "image" ||
                      message.type === "snap" ||
                      (message.type === "gif" && !catalogGif)) &&
                    message.uri
                  ? () => onOpenImage?.(message.uri!)
                  : onPress
          }
          onLongPress={
            gamePayload ? undefined : (event) => onQuickReact?.(event)
          }
          delayLongPress={280}
          style={bubbleStyle}
        >
          {selected && (
            <View pointerEvents="none" style={chatStyles.selectedMessageCheck}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          )}
          {message.forwarded && (
            <View style={chatStyles.forwardedLabel}>
              <Ionicons
                name="arrow-redo-outline"
                size={10}
                color={mine ? "#DFE1E4" : "#245C95"}
              />
              <Text
                style={[
                  chatStyles.forwardedText,
                  mine && chatStyles.forwardedTextMine,
                ]}
              >
                Forwarded
              </Text>
            </View>
          )}
          {message.type === "text" &&
            !gamePayload &&
            !emojiOnly &&
            false && (
              <View
                pointerEvents="none"
                style={[
                  chatStyles.messageTail,
                  mine
                    ? chatStyles.messageTailMine
                    : chatStyles.messageTailTheirs,
                ]}
              />
            )}
          {quotedReply && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jump to original message"
              onPress={() => onReplyJump?.(quotedReply.parentId)}
              style={[
                chatStyles.quotedReply,
                mine
                  ? chatStyles.quotedReplyMine
                  : chatStyles.quotedReplyTheirs,
              ]}
            >
              <View style={chatStyles.quotedReplyAccent} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    chatStyles.quotedReplyLabel,
                    mine && chatStyles.quotedReplyLabelMine,
                  ]}
                >
                  Reply · tap to view
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    chatStyles.quotedReplyText,
                    mine && chatStyles.quotedReplyTextMine,
                  ]}
                >
                  {quotedReply.quote}
                </Text>
              </View>
              <Ionicons
                name="arrow-up"
                size={13}
                color={mine ? "#CE7486" : "#163C63"}
              />
            </Pressable>
          )}
          {message.type === "text" && !gamePayload && !emojiOnly && (
            <Text
              style={[
                styles.bubbleText,
                mine ? { color: colors.textInverse } : { color: colors.text },
                // A message that is only emoji shows large, like WhatsApp.
                isJustEmoji && {
                  fontSize:
                    Array.from((textBody ?? "").trim()).length <= 3 ? 56 : 38,
                  lineHeight:
                    Array.from((textBody ?? "").trim()).length <= 3 ? 68 : 48,
                },
              ]}
            >
              {textBody}
            </Text>
          )}
          {linkPreview && <LinkPreviewCard preview={linkPreview} mine={mine} />}
          {!!incomingSafety?.signals.length &&
            incomingSafety.severity !== "calm" && (
              <IncomingMessageSafety scan={incomingSafety} />
            )}
          {emojiOnly && (
            <AnimatedEmojiMessage emoji={emojiText} sticker={stickerPayload} />
          )}
          {message.type === "game" && !!message.game && (
            <LiveGameCard
              game={message.game}
              mine={mine}
              onOpen={
                onOpenLiveGame ? () => onOpenLiveGame(message.game!.id) : undefined
              }
            />
          )}
          {!!gamePayload && (
            <GameChatCard
              title={gameTitle}
              prompt={gamePrompt}
              mine={mine}
              replies={gameReplies}
              onReply={onGameReply}
            />
          )}
          {(message.type === "image" ||
            (message.type === "gif" && !catalogGif) ||
            message.type === "snap") &&
            message.uri && (
              <View
                style={[
                  chatStyles.messageMediaFrameAuto,
                  { aspectRatio: mediaRatio },
                ]}
              >
                {message.type === "gif" ? (
                  <ExpoImage
                    accessible
                    accessibilityLabel="Shared GIF"
                    source={{ uri: message.uri }}
                    style={chatStyles.messageMedia}
                    contentFit="cover"
                    autoplay
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Image
                    accessible
                    accessibilityLabel={
                      message.type === "snap"
                        ? "View once photo"
                        : "Shared photo"
                    }
                    source={{ uri: message.uri }}
                    style={chatStyles.messageMedia}
                    resizeMode="cover"
                  />
                )}
                <View pointerEvents="none" style={chatStyles.mediaShade} />
                {!!message.uploading && (
                  <UploadProgressOverlay messageId={message.id} />
                )}
              </View>
            )}
          {message.type === "image" && !!message.text && (
            <Text
              style={[
                chatStyles.mediaCaptionText,
                mine ? { color: colors.textInverse } : { color: colors.text },
              ]}
            >
              {message.text}
            </Text>
          )}
          {catalogGif && <CatalogGifMessage gif={catalogGif} />}
          {message.type === "gif" && (
            <View style={chatStyles.gifBadge}>
              <Text style={chatStyles.gifBadgeText}>GIF</Text>
            </View>
          )}
          {message.type === "snap" && message.snap && (
            <>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor:
                      snapFilters.find(
                        (item) => item.name === message.snap?.filter,
                      )?.color ?? "transparent",
                  },
                ]}
              />
              {!!message.snap.sticker && (
                <Text style={chatStyles.snapSticker}>
                  {message.snap.sticker}
                </Text>
              )}
              <View style={chatStyles.snapBadge}>
                <MiniPremiumIcon
                  name={message.snap.viewOnce ? "eye-off" : "time"}
                  tone="dark"
                  size={22}
                  iconSize={10}
                />
                <Text style={chatStyles.snapBadgeText}>
                  {message.snap.viewOnce ? "VIEW ONCE" : "24H SNAP"} ·{" "}
                  {message.snap.filter}
                </Text>
              </View>
            </>
          )}
          {message.type === "sticker" && message.sticker && (
            <>
              <View style={stickerStyles.faceStickerFrame}>
                <Image
                  source={{ uri: message.sticker.faceUri }}
                  style={chatStyles.faceStickerImage}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor:
                        snapFilters.find(
                          (item) => item.name === message.sticker?.filter,
                        )?.color ?? "transparent",
                    },
                  ]}
                />
              </View>
              <Text style={chatStyles.faceStickerEmoji}>
                {message.sticker.emoji}
              </Text>
              <Text style={chatStyles.mediaCaptionText}>
                {message.sticker.filter ?? "Made by me"}
              </Text>
            </>
          )}
          {message.type === "date" && message.date && (
            <>
              <View style={dateStyles.messageDateHeader}>
                <PremiumIcon
                  name="calendar"
                  tone="gold"
                  size={42}
                  iconSize={19}
                />
                <View>
                  <Text style={dateStyles.messageEyebrow}>
                    {message.date.packageTitle ?? "DATE IDEA"}
                  </Text>
                  <Text style={dateStyles.messageVenue}>
                    {message.date.venue}
                  </Text>
                  {message.date.packageTier && (
                    <Text style={dateStyles.messagePackageTier}>
                      {message.date.packageTier}
                    </Text>
                  )}
                </View>
              </View>
              <View style={dateStyles.messageDivider} />
              <View style={dateStyles.messageLine}>
                <MiniPremiumIcon
                  name="location-outline"
                  tone="rose"
                  size={28}
                  iconSize={13}
                />
                <Text style={dateStyles.messageLineText}>
                  {message.date.area}
                </Text>
              </View>
              <View style={dateStyles.messageLine}>
                <MiniPremiumIcon
                  name="time-outline"
                  tone="rose"
                  size={28}
                  iconSize={13}
                />
                <Text style={dateStyles.messageLineText}>
                  {message.date.time}
                </Text>
              </View>
              {message.date.safetyCheckIn && (
                <View style={dateStyles.safePill}>
                  <MiniPremiumIcon
                    name="shield-checkmark"
                    tone="gold"
                    size={24}
                    iconSize={11}
                  />
                  <Text style={dateStyles.safePillText}>
                    Safety check-in enabled
                  </Text>
                </View>
              )}
              <DatePlanStatusMini
                safetyCheckIn={!!message.date.safetyCheckIn}
                status={message.date.planStatus}
              />
              <Text style={dateStyles.waitingText}>
                {datePlanStatusLabel(message.date.planStatus ?? "proposed")}
              </Text>
            </>
          )}
          {message.type === "voice" && message.uri && (
            <View>
              <VoiceNote
                uri={message.uri}
                durationMs={message.voice?.durationMs ?? 0}
                transcript={message.voice?.transcript}
                transcriptStatus={message.voice?.transcriptStatus}
                mine={mine}
              />
              {!!message.uploading && (
                <UploadProgressOverlay messageId={message.id} compact />
              )}
            </View>
          )}
          {message.type === "location" && message.location && (
            <LiveLocationCard location={message.location} />
          )}
          {message.type === "document" && message.document && (
            <View>
              <DocumentChatCard document={message.document} mine={mine} />
              {!!message.uploading && (
                <UploadProgressOverlay messageId={message.id} compact />
              )}
            </View>
          )}
          {message.type === "document" &&
            message.document?.kind === "video" &&
            !!message.text && (
              <Text
                style={[
                  chatStyles.mediaCaptionText,
                  mine ? { color: colors.textInverse } : { color: colors.text },
                ]}
              >
                {message.text}
              </Text>
            )}
          <View style={chatStyles.messageMeta}>
            {message.editedAt && (
              <Text
                style={[
                  chatStyles.editedLabel,
                  mine && chatStyles.editedLabelMine,
                ]}
              >
                edited
              </Text>
            )}
            {pinned && <Ionicons name="pin" size={10} color={colors.gold} />}{" "}
            {starred && <Ionicons name="star" size={10} color={colors.gold} />}
            <Text
              style={[styles.time, { fontSize: 11 },
                {
                  color:
                    mine && !emojiOnly ? "rgba(255,255,255,.82)" : colors.muted,
                },
              ]}
            >
              {new Date(message.createdAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            {mine && <MessageReceipt status={status} />}
          </View>
          {!!reaction && (
            <View
              style={[
                chatStyles.reactionPill,
                mine && chatStyles.reactionPillMine,
              ]}
            >
              <Text style={chatStyles.reactionText}>{reaction}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function LinkPreviewCard({
  preview,
  mine,
}: {
  preview: NonNullable<ChatMessage["linkPreview"]>;
  mine: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const risky = preview.safety !== "safe";
  const open = () => {
    if (risky && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    void Linking.openURL(preview.url).catch(() => setConfirmOpen(true));
  };
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${preview.title} on ${preview.host}. ${preview.description}`}
      accessibilityHint={
        risky
          ? "Tap once to review the warning and again to open"
          : "Open shared link"
      }
      onPress={open}
      style={[
        chatStyles.linkCard,
        mine ? chatStyles.linkCardMine : chatStyles.linkCardTheirs,
        risky && chatStyles.linkCardRisk,
      ]}
    >
      <View style={[chatStyles.linkIcon, risky && chatStyles.linkIconRisk]}>
        <Ionicons
          name={risky ? "warning-outline" : "link-outline"}
          size={17}
          color={risky ? "#174069" : mine ? "#163C63" : "#FFFFFF"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[chatStyles.linkHost, mine && chatStyles.linkHostMine]}
        >
          {preview.host}
        </Text>
        <Text
          numberOfLines={2}
          style={[chatStyles.linkTitle, mine && chatStyles.linkTitleMine]}
        >
          {preview.title}
        </Text>
        <Text
          numberOfLines={confirmOpen ? 4 : 2}
          style={[
            chatStyles.linkDescription,
            mine && chatStyles.linkDescriptionMine,
          ]}
        >
          {confirmOpen
            ? "Check the full domain above. Tap again only if you trust the sender."
            : preview.description}
        </Text>
      </View>
      <Ionicons
        name={confirmOpen ? "shield-outline" : "open-outline"}
        size={16}
        color={risky ? "#174069" : mine ? "#CE7788" : "#163C63"}
      />
    </Pressable>
  );
}

function IncomingMessageSafety({ scan }: { scan: MessageSafetyScan }) {
  return (
    <View accessibilityRole="alert" style={chatStyles.incomingSafety}>
      <Ionicons name="shield-outline" size={15} color="#761D2F" />
      <View style={{ flex: 1 }}>
        <Text style={chatStyles.incomingSafetyTitle}>{scan.nudgeTitle}</Text>
        <Text style={chatStyles.incomingSafetyBody}>
          {scan.recommendedAction}
        </Text>
      </View>
    </View>
  );
}

function messageSummaryForAccessibility(message: ChatMessage) {
  if (message.text?.startsWith("🎮GAME|"))
    return `Couple game ${message.text.split("|")[1] ?? ""}`;
  if (message.text?.startsWith("🎮REPLY|"))
    return `Game answer ${parseGameReply(message)?.answer ?? ""}`;
  if (message.text?.startsWith("↩REPLY|"))
    return `Reply ${parseQuotedReply(message.text)?.body ?? ""}`;
  const sticker = parseStickerPayload(message.text);
  if (sticker) return `${sticker.label} sticker ${sticker.emoji}`;
  const catalogGif = parseCatalogGifUri(message.uri);
  if (catalogGif)
    return `${catalogGif.title}, ${catalogGif.style} animated GIF`;
  return (
    message.text?.slice(0, 50) ||
    message.date?.venue ||
    message.document?.name ||
    message.type
  );
}

function AnimatedEmojiMessage({
  emoji,
  sticker,
}: {
  emoji: string;
  sticker: CustomChatSticker | null;
}) {
  const emotion: EmojiMotion = sticker?.motion ?? classifyEmojiMotion(emoji);
  const motion = useRef(new Animated.Value(0)).current;
  const particles = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    motion.setValue(0);
    particles.setValue(0);
    const fast = ["laugh", "angry", "party"].includes(emotion);
    const bodyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: fast ? 210 : emotion === "love" ? 360 : 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: fast ? 210 : emotion === "love" ? 360 : 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const particleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(particles, {
          toValue: 1,
          duration: ["laugh", "cry"].includes(emotion) ? 760 : 1050,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(particles, {
          toValue: 0,
          duration: 1,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.delay(120),
      ]),
    );
    bodyLoop.start();
    particleLoop.start();
    return () => {
      bodyLoop.stop();
      particleLoop.stop();
    };
  }, [emotion, motion, particles]);
  const scale = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      1,
      emotion === "love"
        ? 1.24
        : emotion === "surprise"
          ? 1.28
          : emotion === "cry"
            ? 0.98
            : 1.1,
    ],
  });
  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      ["laugh", "party", "celebrate"].includes(emotion)
        ? -8
        : emotion === "cry"
          ? 3
          : -3,
    ],
  });
  const translateX = motion.interpolate({
    inputRange: [0, 1],
    outputRange: emotion === "angry" ? [-5, 5] : [0, 0],
  });
  const rotate = motion.interpolate({
    inputRange: [0, 1],
    outputRange:
      emotion === "laugh"
        ? ["-9deg", "9deg"]
        : emotion === "party"
          ? ["-11deg", "11deg"]
          : emotion === "angry"
            ? ["-3deg", "3deg"]
            : emotion === "kiss"
              ? ["-4deg", "5deg"]
              : ["0deg", "0deg"],
  });
  const particleTranslateY = particles.interpolate({
    inputRange: [0, 1],
    outputRange: ["laugh", "cry"].includes(emotion) ? [0, 34] : [14, -38],
  });
  const particleTranslateX = particles.interpolate({
    inputRange: [0, 1],
    outputRange: [0, emotion === "angry" ? 20 : emotion === "party" ? 12 : 5],
  });
  const particleOpacity = particles.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 1, 0.9, 0],
  });
  const particleScale = particles.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1.15, 0.82],
  });
  const glyphs: Record<EmojiMotion, [string, string]> = {
    laugh: ["💧", "💧"],
    cry: ["💧", "💧"],
    love: ["♥", "♡"],
    kiss: ["♥", "💋"],
    angry: ["💨", "💢"],
    party: ["✦", "●"],
    surprise: ["!", "✦"],
    sleep: ["Z", "z"],
    celebrate: ["✦", "★"],
    bounce: ["✦", ""],
  };
  const [particleOne, particleTwo] = glyphs[emotion];
  return (
    <View
      accessibilityLabel={`${sticker ? sticker.label : "Animated"} ${emotion} emoji ${emoji}`}
      style={[
        chatStyles.animatedEmojiWrap,
        { backgroundColor: "transparent", borderWidth: 0, padding: 0 }, // Clean background
      ]}
    >
      {emotion === "love" && (
        <>
          <Animated.View
            style={[
              chatStyles.heartRing,
              { opacity: motion, transform: [{ scale }] },
            ]}
          />
          <Animated.View
            style={[
              chatStyles.heartRing,
              chatStyles.heartRingOuter,
              { opacity: particles, transform: [{ scale: particleScale }] },
            ]}
          />
        </>
      )}
      {emotion === "laugh" && (
        <Animated.Text
          style={[
            chatStyles.laughBurst,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { scale: particleScale },
              ],
            },
          ]}
        >
          HA!
        </Animated.Text>
      )}
      {emotion === "cry" && (
        <>
          <Animated.View
            style={[
              chatStyles.tearStream,
              chatStyles.tearStreamLeft,
              {
                opacity: particleOpacity,
                transform: [
                  { translateY: particleTranslateY },
                  { scaleY: particleScale },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              chatStyles.tearStream,
              chatStyles.tearStreamRight,
              {
                opacity: particleOpacity,
                transform: [
                  { translateY: particleTranslateY },
                  { scaleY: particleScale },
                ],
              },
            ]}
          />
        </>
      )}
      {emotion === "kiss" && (
        <Animated.Text
          style={[
            chatStyles.kissBurst,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { scale: particleScale },
              ],
            },
          ]}
        >
          💋
        </Animated.Text>
      )}
      <Animated.View
        style={[
          chatStyles.emojiStage,
          {
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          },
        ]}
      >
        <Text
          style={[
            chatStyles.animatedEmoji,
            !!sticker && chatStyles.animatedSticker,
          ]}
        >
          {emoji}
        </Text>
      </Animated.View>
      {!!particleOne && (
        <Animated.Text
          style={[
            chatStyles.emotionParticle,
            chatStyles.emotionParticleOne,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { translateX: particleTranslateX },
                { scale: particleScale },
              ],
            },
          ]}
        >
          {particleOne}
        </Animated.Text>
      )}
      {!!particleTwo && (
        <Animated.Text
          style={[
            chatStyles.emotionParticle,
            chatStyles.emotionParticleTwo,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { translateX: Animated.multiply(particleTranslateX, -1) },
                { scale: particleScale },
              ],
            },
          ]}
        >
          {particleTwo}
        </Animated.Text>
      )}
      {/* WhatsApp style: No labels, no captions, just the big sticker */}
    </View>
  );
}

function CatalogGifMessage({ gif }: { gif: ChatGifCatalogItem }) {
  return (
    <View
      accessibilityLabel={`${gif.title}, ${gif.style} animated GIF`}
      style={{
        width: 200,
        height: 200,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#ECEDEF",
      }}
    >
      {/* Catalog GIFs have an in-app id (milaan-gif:...), not an image URL,
          so draw the same animated artwork the picker shows. Loading the id
          as an image left an empty grey box for both people in the chat. */}
      <CatalogGifArtwork gif={gif} />
    </View>
  );
}

function GameChatCard({
  title,
  prompt,
  mine,
  replies,
  onReply,
}: {
  title: string;
  prompt: string;
  mine: boolean;
  replies: ChatMessage[];
  onReply?: (answer: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(replies.length === 0);
  const [answer, setAnswer] = useState("");
  const send = () => {
    const value = answer.trim();
    if (!value || !onReply) return;
    onReply(value);
    setAnswer("");
    setReplyOpen(false);
  };
  return (
    <View
      style={[
        chatStyles.gameMessageCard,
        !mine && chatStyles.gameMessageCardTheirs,
      ]}
    >
      <View style={chatStyles.gameMessageHeader}>
        <View
          style={[
            chatStyles.gameMessageIcon,
            !mine && chatStyles.gameMessageIconTheirs,
          ]}
        >
          <Ionicons
            name="game-controller"
            size={16}
            color={mine ? "#FFFFFF" : "#153B61"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              chatStyles.gameMessageEyebrow,
              !mine && chatStyles.gameMessageEyebrowTheirs,
            ]}
          >
            COUPLE GAME · ROUND READY
          </Text>
          <Text
            numberOfLines={1}
            style={[
              chatStyles.gameMessageTitle,
              !mine && chatStyles.gameMessageTitleTheirs,
            ]}
          >
            {title}
          </Text>
        </View>
      </View>
      <Text
        style={[
          chatStyles.gameMessagePrompt,
          !mine && chatStyles.gameMessagePromptTheirs,
        ]}
      >
        {prompt}
      </Text>
      {replies.map((reply) => {
        const parsed = parseGameReply(reply);
        if (!parsed) return null;
        const replyMine = reply.mine !== false;
        return (
          <View
            key={reply.id}
            style={[
              chatStyles.gameNestedReply,
              replyMine
                ? chatStyles.gameNestedReplyMine
                : chatStyles.gameNestedReplyTheirs,
            ]}
          >
            <View style={chatStyles.gameNestedHeader}>
              <Ionicons
                name={replyMine ? "person" : "heart"}
                size={11}
                color={replyMine ? "#14395E" : "#761D2F"}
              />
              <Text style={chatStyles.gameNestedName}>
                {replyMine ? "You" : "Your match"} answered
              </Text>
              <Text style={chatStyles.gameNestedTime}>
                {new Date(reply.createdAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text style={chatStyles.gameNestedAnswer}>{parsed.answer}</Text>
          </View>
        );
      })}
      {replyOpen ? (
        <View
          style={[
            chatStyles.gameReplyComposer,
            !mine && chatStyles.gameReplyComposerTheirs,
          ]}
        >
          <TextInput
            accessibilityLabel={`Answer ${title} round`}
            value={answer}
            onChangeText={setAnswer}
            onSubmitEditing={send}
            returnKeyType="send"
            placeholder="Type your answer inside this round…"
            placeholderTextColor={mine ? "rgba(255,255,255,.65)" : "#28619B"}
            style={[
              chatStyles.gameReplyInput,
              !mine && chatStyles.gameReplyInputTheirs,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send game answer"
            disabled={!answer.trim()}
            onPress={send}
            style={[
              chatStyles.gameReplySend,
              !answer.trim() && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="send" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Answer inside game card"
          onPress={() => setReplyOpen(true)}
          style={[
            chatStyles.gameTurnPill,
            !mine && chatStyles.gameTurnPillTheirs,
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={12}
            color={mine ? "#CE7788" : "#153B61"}
          />
          <Text
            style={[
              chatStyles.gameTurnText,
              !mine && chatStyles.gameTurnTextTheirs,
            ]}
          >
            {replies.length ? "Add another answer" : "Answer inside this card"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Plays a sent video right inside the app instead of handing it off to
// Linking.openURL, which on web opened it in a brand-new browser tab. The
// web build is this app's production target (same approach the call screen
// already uses for its own <video> elements), so this renders a plain HTML5
// <video> with native controls; on a true native runtime there's no bundled
// video-view dependency yet, so it falls back to opening the file link.
function InlineVideoPlayer({ uri }: { uri: string }) {
  if (Platform.OS !== "web") {
    void Linking.openURL(uri).catch(() => undefined);
    return null;
  }
  return React.createElement("video", {
    src: uri,
    controls: true,
    autoPlay: true,
    playsInline: true,
    style: { width: "100%", height: "100%", objectFit: "contain" },
  });
}

// WhatsApp-style "about to send" screen: shown after picking a photo or
// video from the gallery/camera, before it's uploaded. Lets the user add a
// caption and confirms with a share/send icon instead of silently sending
// the media the moment it was picked.
function MediaCaptionPreview({
  visible,
  kind,
  uri,
  fallbackName,
  caption,
  onChangeCaption,
  onCancel,
  onSend,
  sending,
  error,
}: {
  visible: boolean;
  kind: "image" | "video";
  uri: string;
  fallbackName: string;
  caption: string;
  onChangeCaption: (value: string) => void;
  onCancel: () => void;
  onSend: () => void;
  sending: boolean;
  error: string;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={chatStyles.mediaPreviewRoot}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={chatStyles.mediaPreviewHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Discard and go back"
              hitSlop={accessibilityHitSlop}
              onPress={onCancel}
              style={chatStyles.mediaPreviewClose}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={chatStyles.mediaPreviewBody}>
            {kind === "image" ? (
              <Image
                source={{ uri }}
                style={chatStyles.mediaPreviewImage}
                resizeMode="contain"
              />
            ) : Platform.OS === "web" ? (
              <View style={chatStyles.mediaPreviewVideoFrame}>
                {React.createElement("video", {
                  src: uri,
                  controls: true,
                  playsInline: true,
                  style: {
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  },
                })}
              </View>
            ) : (
              <View style={chatStyles.mediaPreviewVideoFrame}>
                <Ionicons name="play-circle" size={54} color="#FFFFFF" />
                <Text
                  numberOfLines={1}
                  style={[
                    chatStyles.documentFine,
                    { color: "#141618", marginTop: 8 },
                  ]}
                >
                  {fallbackName}
                </Text>
              </View>
            )}
          </View>
          {!!error && (
            <Text style={chatStyles.mediaPreviewErrorText}>{error}</Text>
          )}
          <View style={chatStyles.mediaPreviewFooter}>
            <TextInput
              accessibilityLabel="Add a caption"
              value={caption}
              onChangeText={onChangeCaption}
              placeholder="Add a caption…"
              placeholderTextColor="rgba(255,255,255,.5)"
              multiline
              editable={!sending}
              style={chatStyles.mediaPreviewInput}
            />
            <Pressable
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel="Send"
              hitSlop={accessibilityHitSlop}
              onPress={onSend}
              style={[chatStyles.sendButton, sending && { opacity: 0.6 }]}
            >
              <Ionicons
                name={sending ? "time-outline" : "send"}
                size={20}
                color={colors.textInverse}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// WhatsApp-style loader drawn on top of a photo/video/voice bubble while it
// uploads: a spinning ring with an X in the middle that cancels the upload.
function UploadProgressOverlay({
  messageId,
  compact = false,
}: {
  messageId: string;
  compact?: boolean;
}) {
  const size = compact ? 40 : 56;
  return (
    <View pointerEvents="box-none" style={chatStyles.uploadOverlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel upload"
        hitSlop={8}
        onPress={() => mediaUploadCancels.get(messageId)?.()}
        style={[
          chatStyles.uploadBadge,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <ActivityIndicator
          size={compact ? "small" : "large"}
          color="#FFFFFF"
          style={chatStyles.uploadSpinner}
        />
        <Ionicons name="close" size={compact ? 16 : 20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function DocumentChatCard({
  document,
  mine,
}: {
  document: NonNullable<ChatMessage["document"]>;
  mine: boolean;
}) {
  const extension =
    document.name.split(".").pop()?.slice(0, 5).toUpperCase() ||
    (document.kind === "video" ? "VIDEO" : "FILE");
  return (
    <View style={chatStyles.documentCardWrap}>
      <View
        style={[
          chatStyles.documentCard,
          mine ? chatStyles.documentCardMine : chatStyles.documentCardTheirs,
        ]}
      >
        <View
          style={[chatStyles.documentIcon, mine && chatStyles.documentIconMine]}
        >
          <Ionicons
            name={document.kind === "video" ? "play" : "document-text"}
            size={22}
            color={mine ? "#FFFFFF" : "#174069"}
          />
          <Text
            style={[
              chatStyles.documentExtension,
              mine && chatStyles.documentExtensionMine,
            ]}
          >
            {extension}
          </Text>
        </View>
        <View style={chatStyles.documentCopy}>
          <Text
            numberOfLines={2}
            style={[
              chatStyles.documentName,
              mine && chatStyles.documentNameMine,
            ]}
          >
            {document.name}
          </Text>
          <View style={chatStyles.documentMetaRow}>
            <Text
              style={[
                chatStyles.documentFine,
                mine && chatStyles.documentFineMine,
              ]}
            >
              {formatChatFileSize(document.size)}
            </Text>
            <View
              style={[
                chatStyles.documentMetaDot,
                mine && chatStyles.documentMetaDotMine,
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                chatStyles.documentFine,
                mine && chatStyles.documentFineMine,
              ]}
            >
              {document.kind === "video" ? "Video" : "Document"}
            </Text>
          </View>
          <View style={chatStyles.secureFileRow}>
            <Ionicons
              name="shield-checkmark"
              size={11}
              color={mine ? "#CE7788" : "#751D2F"}
            />
            <Text
              style={[
                chatStyles.secureFileText,
                mine && chatStyles.secureFileTextMine,
              ]}
            >
              Shared securely
            </Text>
          </View>
        </View>
        <View
          style={[chatStyles.documentOpen, mine && chatStyles.documentOpenMine]}
        >
          <Ionicons
            name={document.kind === "video" ? "play" : "open-outline"}
            size={17}
            color={mine ? "#FFFFFF" : "#163D65"}
          />
        </View>
      </View>
    </View>
  );
}

function datePlanStatusLabel(status: DatePlanStatus) {
  return dateLifecycleCopy(status).label;
}

function DatePlanStatusMini({
  safetyCheckIn,
  status = "proposed",
}: {
  safetyCheckIn: boolean;
  status?: DatePlanStatus;
}) {
  const steps = [
    ["sent", "Suggested"],
    ["pending", "Accept"],
    ["reserve", "Reserve"],
    [safetyCheckIn ? "safe" : "meet", safetyCheckIn ? "Check-in" : "Meet"],
  ] as const;
  const completedSteps =
    status === "completed" ? 4 : status === "accepted" ? 2 : 1;
  return (
    <View style={dateStyles.dateFlow}>
      {steps.map((step, index) => (
        <View key={step[0]} style={dateStyles.dateFlowItem}>
          <View
            style={[
              dateStyles.dateFlowDot,
              index < completedSteps && dateStyles.dateFlowDotDone,
            ]}
          />
          <Text
            style={[
              dateStyles.dateFlowText,
              index < completedSteps && dateStyles.dateFlowTextOn,
            ]}
          >
            {step[1]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const voiceWaveHeights = [
  9, 17, 12, 25, 15, 22, 10, 19, 14, 27, 12, 21, 16, 24, 11, 18, 13, 23,
];
const formatVoiceDuration = (durationMs: number) => {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function VoiceNote({
  uri,
  durationMs,
  transcript,
  transcriptStatus,
  mine,
}: {
  uri: string;
  durationMs: number;
  transcript?: string;
  transcriptStatus?: "available" | "processing" | "unavailable";
  mine: boolean;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const waveWidth = useRef(1);
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const playedSeconds = Math.max(0, Math.floor(status.currentTime ?? 0));
  const progress = Math.min(1, playedSeconds / totalSeconds);
  const changeRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    player.setPlaybackRate(next);
  };
  const seek = (x: number) =>
    void player.seekTo(
      Math.max(
        0,
        Math.min(totalSeconds, (x / waveWidth.current) * totalSeconds),
      ),
    );
  return (
    <View style={{ gap: 6 }}>
      <View style={[chatStyles.voiceNote, !mine && chatStyles.voiceNoteTheirs]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${status.playing ? "Pause" : "Play"} voice message, ${formatVoiceDuration(durationMs)}`}
          onPress={() => (status.playing ? player.pause() : player.play())}
          style={[chatStyles.voicePlay, !mine && chatStyles.voicePlayTheirs]}
        >
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={17}
            color={mine ? "#153A60" : "#FFFFFF"}
          />
        </Pressable>
        <View style={chatStyles.voiceTrack}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={`Voice message position ${Math.round(progress * 100)} percent`}
            accessibilityHint="Tap the waveform to seek"
            onLayout={(event) => {
              waveWidth.current = Math.max(1, event.nativeEvent.layout.width);
            }}
            onPress={(event) => seek(event.nativeEvent.locationX)}
            style={chatStyles.voiceWave}
          >
            {voiceWaveHeights.map((height, index) => {
              const reached = index / voiceWaveHeights.length <= progress;
              return (
                <View
                  key={index}
                  style={[
                    chatStyles.voiceBar,
                    !mine && chatStyles.voiceBarTheirs,
                    reached && chatStyles.voiceBarPlayed,
                    { height },
                  ]}
                />
              );
            })}
          </Pressable>
          <View style={chatStyles.voiceDurationRow}>
            <Text
              style={[
                chatStyles.voiceDuration,
                !mine && chatStyles.voiceDurationTheirs,
              ]}
            >
              {status.playing
                ? formatVoiceDuration(playedSeconds * 1000)
                : formatVoiceDuration(durationMs)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Playback speed ${rate} times`}
              onPress={changeRate}
              style={[
                chatStyles.voiceSpeed,
                !mine && chatStyles.voiceSpeedTheirs,
              ]}
            >
              <Text
                style={[
                  chatStyles.voiceSpeedText,
                  !mine && chatStyles.voiceSpeedTextTheirs,
                ]}
              >
                {rate}×
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle voice transcript"
              onPress={() => setTranscriptOpen((value) => !value)}
              style={[
                chatStyles.voiceTranscriptButton,
                !mine && chatStyles.voiceTranscriptButtonTheirs,
              ]}
            >
              <Ionicons
                name="text-outline"
                size={11}
                color={mine ? "#CE7788" : "#174069"}
              />
            </Pressable>
          </View>
        </View>
      </View>
      {transcriptOpen && (
        <View
          style={[
            chatStyles.voiceTranscript,
            mine && chatStyles.voiceTranscriptMine,
          ]}
        >
          <Text
            style={[
              chatStyles.voiceTranscriptLabel,
              mine && chatStyles.voiceTranscriptLabelMine,
            ]}
          >
            TRANSCRIPT
          </Text>
          <Text
            style={[
              chatStyles.voiceTranscriptText,
              mine && chatStyles.voiceTranscriptTextMine,
            ]}
          >
            {transcript ||
              (transcriptStatus === "processing"
                ? "Transcription is processing securely…"
                : "A transcript was not captured for this message.")}
          </Text>
        </View>
      )}
    </View>
  );
}

function VoiceRecordingComposer({
  durationMs,
  onCancel,
  onSend,
}: {
  durationMs: number;
  onCancel: () => void;
  onSend: () => void;
}) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const elapsed = Math.min(120000, Math.max(0, durationMs));
  const activeBars = Math.max(
    1,
    Math.round((elapsed / 1000) % voiceWaveHeights.length),
  );
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Recording voice message, ${formatVoiceDuration(elapsed)} elapsed`}
      style={chatStyles.recordingComposer}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel voice recording"
        hitSlop={accessibilityHitSlop}
        onPress={onCancel}
        style={chatStyles.recordingCancel}
      >
        <Ionicons name="trash-outline" size={18} color="#163C63" />
      </Pressable>
      <View style={chatStyles.recordingMain}>
        <View style={chatStyles.recordingTop}>
          <Animated.View
            style={[
              chatStyles.recordingDot,
              { opacity: pulse, transform: [{ scale: pulse }] },
            ]}
          />
          <Text style={chatStyles.recordingLabel}>Recording</Text>
          <Text style={chatStyles.recordingTimer}>
            {formatVoiceDuration(elapsed)}
          </Text>
          <Text style={chatStyles.recordingLimit}>/ 2:00</Text>
        </View>
        <View style={chatStyles.recordingWave}>
          {voiceWaveHeights.map((height, index) => (
            <View
              key={index}
              style={[
                chatStyles.recordingBar,
                index < activeBars && chatStyles.recordingBarOn,
                { height: Math.max(5, Math.round(height * 0.62)) },
              ]}
            />
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send voice message"
        hitSlop={accessibilityHitSlop}
        onPress={onSend}
        style={chatStyles.recordingSend}
      >
        <Ionicons name="send" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function LiveLocationCard({
  location,
}: {
  location: NonNullable<ChatMessage["location"]>;
}) {
  const [mapFallback, setMapFallback] = useState("");
  const expiresIn = location.expiresAt
    ? Math.max(0, Math.ceil((location.expiresAt - Date.now()) / 60000))
    : 30;
  const coordinates = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  const openMap = () => {
    setMapFallback("");
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
    ).catch(() =>
      setMapFallback(
        `Map could not open in this preview. Approx location: ${coordinates}`,
      ),
    );
  };
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={openMap} style={chatStyles.locationCard}>
        <LinearGradient
          colors={["rgba(170,42,68,.24)", "rgba(21,59,97,.52)"]}
          style={chatStyles.locationMap}
        >
          <View style={chatStyles.locationGrid} />
          <PremiumIcon name="navigate" tone="gold" size={46} iconSize={21} />
        </LinearGradient>
        <View style={chatStyles.locationInfo}>
          <Text style={chatStyles.locationTitle}>Live location</Text>
          <Text style={chatStyles.locationSubtitle}>{location.label}</Text>
          <Text style={chatStyles.locationFine}>
            {expiresIn > 0 ? `${expiresIn} min left · ` : "Expired · "}
            approximate area shared
          </Text>
        </View>
      </Pressable>
      {!!mapFallback && (
        <View style={chatStyles.locationFallback}>
          <MiniPremiumIcon
            name="map-outline"
            tone="gold"
            size={26}
            iconSize={12}
          />
          <Text style={chatStyles.locationFallbackText}>{mapFallback}</Text>
        </View>
      )}
    </View>
  );
}

function SafetyNudge({
  scan,
  onOpenSafety,
}: {
  scan: MessageSafetyScan;
  onOpenSafety: () => void;
}) {
  const tone =
    scan.severity === "urgent" || scan.severity === "high"
      ? "ruby"
      : scan.severity === "caution"
        ? "gold"
        : "rose";
  return (
    <View style={chatStyles.safetyNudge}>
      <MiniPremiumIcon
        name={
          scan.severity === "urgent" || scan.severity === "high"
            ? "warning-outline"
            : "shield-checkmark-outline"
        }
        tone={tone}
        size={32}
        iconSize={15}
      />
      <View style={{ flex: 1 }}>
        <Text style={chatStyles.safetyNudgeTitle}>{scan.nudgeTitle}</Text>
        <Text style={chatStyles.safetyNudgeBody}>{scan.recommendedAction}</Text>
        <View style={chatStyles.safetySignalRow}>
          {scan.signals.slice(0, 3).map((signal) => (
            <View
              key={`${signal.type}-${signal.label}`}
              style={chatStyles.safetySignalPill}
            >
              <Text style={chatStyles.safetySignalText}>{signal.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable onPress={onOpenSafety} style={chatStyles.safetyNudgeButton}>
        <Text style={chatStyles.safetyNudgeButtonText}>Safety</Text>
      </Pressable>
    </View>
  );
}

function Attachment({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const tone: PremiumIconTone =
    color === "#AA2A44" ||
    ["Spark", "Location", "Date Market", "Poll"].includes(label)
      ? "gold"
      : ["Games", "More", "Back", "Document"].includes(label)
        ? "plum"
        : label === "GIF"
          ? "rose"
          : "ruby";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={accessibilityHitSlop}
      onPress={onPress}
      style={chatStyles.attachment}
    >
      <PremiumIcon name={icon} tone={tone} size={44} iconSize={19} />
      <Text style={chatStyles.attachmentLabel}>{label}</Text>
    </Pressable>
  );
}

function ChatOptionsSheet({
  visible,
  retentionLabel,
  screenshotAlerts,
  onClose,
  onInbox,
  onSearch,
  onSettings,
  onSafety,
  onSelectMessages,
}: {
  visible: boolean;
  retentionLabel: string;
  screenshotAlerts: boolean;
  onClose: () => void;
  onInbox: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onSafety: () => void;
  onSelectMessages: () => void;
}) {
  const options = [
    {
      label: "Search",
      icon: "search-outline" as const,
      onPress: onSearch,
    },
    {
      label: "Select messages",
      icon: "checkmark-done-outline" as const,
      onPress: onSelectMessages,
    },
    {
      label: `Disappearing messages · ${retentionLabel}`,
      icon: "timer-outline" as const,
      onPress: onSettings,
    },
    {
      label: "Mute notifications",
      icon: "notifications-off-outline" as const,
      onPress: onSettings,
    },
    {
      label: "Chat appearance",
      icon: "color-palette-outline" as const,
      onPress: onSettings,
    },
    {
      label: "Conversation inbox",
      icon: "file-tray-full-outline" as const,
      onPress: onInbox,
    },
    {
      label: `Screenshot alerts · ${screenshotAlerts ? "On" : "Off"}`,
      icon: "scan-outline" as const,
      onPress: onSettings,
    },
    {
      label: "Report or block",
      icon: "shield-checkmark-outline" as const,
      onPress: onSafety,
    },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title="Chat options"
          subtitle="Conversation tools and privacy"
          onClose={onClose}
        />
        <View style={chatStyles.optionList}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={option.label}
              key={option.label}
              onPress={option.onPress}
              style={chatStyles.optionRow}
            >
              <Ionicons name={option.icon} size={20} color={colors.text} />
              <Text style={[chatStyles.optionTitle, { flex: 1 }]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function RoseComposer({
  visible,
  recipientName,
  availability,
  onClose,
  onSend,
  onBuySuperLikes,
}: {
  visible: boolean;
  recipientName: string;
  availability: RoseAvailability;
  onClose: () => void;
  onSend: (note: string, kind: "spark" | "superlike") => void;
  /** Opens Premium, where Super Like packs are sold. */
  onBuySuperLikes?: () => void;
}) {
  const [note, setNote] = useState("A Golden Spark for something real ✨");
  useEffect(() => {
    if (visible) setNote("A Golden Spark for something real ✨");
  }, [visible]);
  const canSend = availability.freeAvailable || availability.paidCredits > 0;
  const superlikes = availability.superlikes;
  const sparkSummary = availability.freeAvailable
    ? availability.paidCredits > 0
      ? `Today's free Spark + ${availability.paidCredits} extra`
      : "Today's free Spark is ready"
    : availability.paidCredits > 0
      ? `${availability.paidCredits} extra Spark${availability.paidCredits === 1 ? "" : "s"} left`
      : "Free Spark used today";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title="Send a Golden Spark"
          subtitle={
            recipientName
              ? `A warmer hello for ${recipientName}`
              : "A warmer hello"
          }
          onClose={onClose}
        />
        <LinearGradient
          colors={["#4F111D", "#0E0F10"]}
          style={aiStyles.roseComposerHero}
        >
          <PremiumIcon name="sparkles" tone="gold" size={76} iconSize={35} />
          <Text style={aiStyles.roseComposerTitle}>{sparkSummary}</Text>
          <Text style={aiStyles.roseComposerBody}>
            Everyone gets 1 free Spark a day. Answer the Daily Question on Home
            for one more.
            {superlikes !== undefined
              ? ` Super Likes left: ${superlikes}.`
              : ""}
          </Text>
        </LinearGradient>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={120}
          placeholder="Write a short note…"
          placeholderTextColor="#265E97"
          style={aiStyles.roseNote}
        />
        <Button
          label={canSend ? "Send Spark ✨" : "No Spark left today"}
          icon="sparkles"
          variant="primary"
          disabled={!canSend}
          onPress={() =>
            onSend(note.trim() || "A Golden Spark for something real ✨", "spark")
          }
        />
        {superlikes !== undefined && (
          <View style={{ marginTop: 10 }}>
            <Button
              label={
                superlikes > 0
                  ? `Send as Super Like ⭐ (${superlikes} left)`
                  : "Get Super Likes ⭐"
              }
              icon="star"
              variant="gold"
              onPress={() =>
                superlikes > 0
                  ? onSend(note.trim() || "A Golden Spark for something real ✨", "superlike")
                  : onBuySuperLikes?.()
              }
            />
          </View>
        )}
        <Text style={styles.legal}>
          A Spark or Super Like puts you at the top of their Likes with your note.
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

export function RoseReceivedPopup({
  data,
  onClose,
  onOpenChat,
}: {
  data: RosePopupPayload | null;
  onClose: () => void;
  onOpenChat: (match: Match) => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!data) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [data, pulse]);
  if (!data) return null;
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={rosePopupStyles.backdrop}>
        <LinearGradient
          colors={["#131416", "#E9EBED"]}
          style={rosePopupStyles.card}
        >
          <Pressable onPress={onClose} style={rosePopupStyles.close}>
            <PremiumIcon name="close" tone="dark" size={36} iconSize={17} />
          </Pressable>
          <Text style={rosePopupStyles.petal}>✦</Text>
          <Text style={[rosePopupStyles.petal, rosePopupStyles.petalRight]}>
            ✧
          </Text>
          <Animated.View
            style={[rosePopupStyles.bloom, { transform: [{ scale }] }]}
          >
            <PremiumIcon name="sparkles" tone="gold" size={92} iconSize={42} />
          </Animated.View>
          <Text style={launchStyles.scriptHero}>A Golden Spark arrived</Text>
          <Text style={rosePopupStyles.title}>
            {data.match.name} gets this moment
          </Text>
          <Text style={rosePopupStyles.note}>“{data.note}”</Text>
          <View style={rosePopupStyles.pushPreview}>
            <PremiumIcon
              name="notifications"
              tone="gold"
              size={38}
              iconSize={17}
            />
            <Text style={rosePopupStyles.pushPreviewText}>
              Push notification queued · opens to this romantic animation
            </Text>
          </View>
          <View style={{ width: "100%", gap: 10 }}>
            <Button
              label={`Open chat with ${data.match.name}`}
              icon="chatbubble"
              onPress={() => onOpenChat(data.match)}
            />
            <Button label="Keep browsing" variant="ghost" onPress={onClose} />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function useGifProviderSearch(query: string, active: boolean) {
  const { gifSearch } = useChatRuntime();
  const [items, setItems] = useState<ChatGifCatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  useEffect(() => {
    if (!active || !gifSearch.configured) {
      setItems([]);
      setTotalCount(0);
      setNextOffset(null);
      setLoading(false);
      setError("");
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setItems([]);
    setTotalCount(0);
    setNextOffset(null);
    const timer = setTimeout(
      () => {
        void gifSearch
          .search({ query, limit: 36 })
          .then((page) => {
            if (currentRequest !== requestId.current) return;
            setItems(page.items);
            setTotalCount(page.totalCount);
            setNextOffset(page.nextOffset);
          })
          .catch((reason) => {
            if (currentRequest !== requestId.current) return;
            setError(
              reason instanceof Error
                ? reason.message
                : "GIF search is temporarily unavailable.",
            );
          })
          .finally(() => {
            if (currentRequest === requestId.current) setLoading(false);
          });
      },
      query.trim() ? 320 : 60,
    );
    return () => clearTimeout(timer);
  }, [active, gifSearch, query]);
  const loadMore = async () => {
    if (!active || !gifSearch.configured || nextOffset === null || loadingMore)
      return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await gifSearch.search({
        query,
        offset: nextOffset,
        limit: 36,
      });
      setItems((current) => [
        ...current,
        ...page.items.filter(
          (next) => !current.some((item) => item.id === next.id),
        ),
      ]);
      setTotalCount(page.totalCount);
      setNextOffset(page.nextOffset);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "More GIFs could not load. Please retry.",
      );
    } finally {
      setLoadingMore(false);
    }
  };
  return {
    items,
    totalCount,
    nextOffset,
    loading,
    loadingMore,
    error,
    loadMore,
  };
}

function GifResultTile({
  gif,
  compact,
  cardWidth,
  favourite,
  onSelect,
  onToggleFavourite,
}: {
  gif: ChatGifCatalogItem;
  compact?: boolean;
  cardWidth?: number;
  favourite?: boolean;
  onSelect: (uri: string) => void;
  onToggleFavourite?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [gif.uri]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Send ${gif.title} GIF`}
      disabled={failed || !gif.uri}
      onPress={() => onSelect(gif.uri)}
      style={[
        compact ? chatStyles.inlineGifCard : chatStyles.gifCard,
        compact && cardWidth
          ? { width: cardWidth, height: Math.round(cardWidth * 0.8) }
          : null,
      ]}
    >
      {!failed && !!gif.uri ? (
        <ExpoImage
          accessible
          accessibilityLabel={`${gif.title} animated GIF`}
          source={{ uri: gif.uri }}
          onError={() => setFailed(true)}
          style={styles.fill}
          contentFit="cover"
          autoplay
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={chatStyles.gifUnavailable}>
          <Text style={chatStyles.gifUnavailableEmoji}>✨</Text>
          <Text style={chatStyles.gifUnavailableText}>Preview unavailable</Text>
        </View>
      )}
      {!failed && (
        <LinearGradient
          colors={["transparent", "rgba(14,15,16,.88)"]}
          style={StyleSheet.absoluteFill}
        />
      )}{" "}
      {!!onToggleFavourite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favourite ? "Remove GIF from favourites" : "Add GIF to favourites"
          }
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavourite();
          }}
          style={chatStyles.gifFavourite}
        >
          <Ionicons
            name={favourite ? "star" : "star-outline"}
            size={14}
            color={favourite ? "#CE7788" : "#FFFFFF"}
          />
        </Pressable>
      )}
      <View style={compact ? chatStyles.inlineGifCopy : chatStyles.gifCardCopy}>
        <Text
          numberOfLines={1}
          style={compact ? chatStyles.inlineGifTitle : chatStyles.gifTitle}
        >
          {gif.title}
        </Text>
        <Text style={compact ? chatStyles.inlineGifStyle : chatStyles.gifStyle}>
          {gif.style}
        </Text>
      </View>
    </Pressable>
  );
}

function catalogGifTone(gif: ChatGifCatalogItem): CustomChatSticker["tone"] {
  const tones: CustomChatSticker["tone"][] = [
    "ruby",
    "rose",
    "gold",
    "plum",
    "cocoa",
  ];
  const styleNumber = Number(gif.id.split("-").at(-1) ?? 0);
  return tones[Math.abs(styleNumber) % tones.length] ?? "rose";
}

function CatalogGifArtwork({
  gif,
  compact,
}: {
  gif: ChatGifCatalogItem;
  compact?: boolean;
}) {
  const motion = useRef(new Animated.Value(0)).current;
  const emotion = classifyEmojiMotion(gif.previewEmoji ?? "✨");
  useEffect(() => {
    motion.setValue(0);
    const fast = ["laugh", "angry", "party"].includes(emotion);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: fast ? 260 : emotion === "love" ? 420 : 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: fast ? 260 : emotion === "love" ? 420 : 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [emotion, motion]);
  const tone = catalogGifTone(gif);
  const palette: Record<CustomChatSticker["tone"], readonly [string, string]> =
    {
      ruby: ["#133558", "#5187BD"],
      rose: ["#DADDE0", "#F6F7F8"],
      gold: ["#7A1E30", "#CE7486"],
      plum: ["#123252", "#3A74AF"],
      cocoa: ["#15395E", "#C43B56"],
    };
  const scale = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, emotion === "love" || emotion === "surprise" ? 1.22 : 1.1],
  });
  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      ["laugh", "party", "celebrate"].includes(emotion)
        ? -7
        : emotion === "cry"
          ? 5
          : -3,
    ],
  });
  const translateX = motion.interpolate({
    inputRange: [0, 1],
    outputRange: emotion === "angry" ? [-5, 5] : [0, 0],
  });
  const rotate = motion.interpolate({
    inputRange: [0, 1],
    outputRange:
      emotion === "laugh"
        ? ["-10deg", "10deg"]
        : emotion === "party"
          ? ["-12deg", "12deg"]
          : emotion === "kiss"
            ? ["-5deg", "6deg"]
            : ["0deg", "0deg"],
  });
  return (
    <LinearGradient colors={palette[tone]} style={styles.fill}>
      <Animated.View
        style={[
          chatStyles.catalogGifHalo,
          { opacity: motion, transform: [{ scale }] },
        ]}
      />
      {emotion === "cry" && (
        <Animated.Text
          style={[
            chatStyles.catalogGifParticle,
            { opacity: motion, transform: [{ translateY }] },
          ]}
        >
          💧
        </Animated.Text>
      )}
      {emotion === "laugh" && (
        <Animated.Text
          style={[
            chatStyles.catalogGifLaugh,
            { opacity: motion, transform: [{ scale }] },
          ]}
        >
          HA!
        </Animated.Text>
      )}
      {emotion === "kiss" && (
        <Animated.Text
          style={[
            chatStyles.catalogGifKiss,
            { opacity: motion, transform: [{ translateY }] },
          ]}
        >
          💋
        </Animated.Text>
      )}
      <Animated.Text
        style={[
          chatStyles.catalogGifEmoji,
          compact && chatStyles.catalogGifEmojiCompact,
          {
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          },
        ]}
      >
        {gif.previewEmoji ?? "✨"}
      </Animated.Text>
    </LinearGradient>
  );
}

function CatalogGifTile({
  gif,
  compact,
  cardWidth,
  favourite,
  onSelect,
  onToggleFavourite,
}: {
  gif: ChatGifCatalogItem;
  compact?: boolean;
  cardWidth?: number;
  favourite?: boolean;
  onSelect: (uri: string) => void;
  onToggleFavourite?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Send ${gif.title}, ${gif.style} animated GIF`}
      onPress={() => onSelect(buildCatalogGifUri(gif))}
      style={[
        compact ? chatStyles.inlineGifCard : chatStyles.gifCard,
        compact && cardWidth
          ? { width: cardWidth, height: Math.round(cardWidth * 0.8) }
          : null,
      ]}
    >
      <CatalogGifArtwork gif={gif} compact={compact} />
      <LinearGradient
        colors={["transparent", "rgba(14,15,16,.82)"]}
        style={StyleSheet.absoluteFill}
      />
      {!!onToggleFavourite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favourite ? "Remove GIF from favourites" : "Add GIF to favourites"
          }
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavourite();
          }}
          style={chatStyles.gifFavourite}
        >
          <Ionicons
            name={favourite ? "star" : "star-outline"}
            size={14}
            color={favourite ? "#CE7788" : "#FFFFFF"}
          />
        </Pressable>
      )}
      <View style={compact ? chatStyles.inlineGifCopy : chatStyles.gifCardCopy}>
        <Text
          numberOfLines={1}
          style={compact ? chatStyles.inlineGifTitle : chatStyles.gifTitle}
        >
          {gif.title}
        </Text>
        <Text
          numberOfLines={1}
          style={compact ? chatStyles.inlineGifStyle : chatStyles.gifStyle}
        >
          {gif.style}
        </Text>
      </View>
    </Pressable>
  );
}

function CatalogGifPager({
  offset,
  total,
  pageSize,
  onChange,
  compact: _compact,
}: {
  offset: number;
  total: number;
  pageSize: number;
  onChange: (offset: number) => void;
  compact?: boolean;
}) {
  if (total <= pageSize) return null;
  const end = Math.min(total, offset + pageSize);
  return (
    <View style={chatStyles.catalogGifPager}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous GIF page"
        disabled={offset === 0}
        onPress={() => onChange(Math.max(0, offset - pageSize))}
        style={[
          chatStyles.catalogGifPageButton,
          offset === 0 && chatStyles.catalogGifPageButtonDisabled,
        ]}
      >
        <Ionicons name="chevron-back" size={15} color="#163C63" />
      </Pressable>
      <Text style={chatStyles.catalogGifPageText}>
        {offset + 1}–{end} of {total.toLocaleString()}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next GIF page"
        disabled={end >= total}
        onPress={() => onChange(end)}
        style={[
          chatStyles.catalogGifPageButton,
          end >= total && chatStyles.catalogGifPageButtonDisabled,
        ]}
      >
        <Ionicons name="chevron-forward" size={15} color="#163C63" />
      </Pressable>
    </View>
  );
}

function GifProviderLine({ live, error }: { live: boolean; error?: string }) {
  const { gifSearch } = useChatRuntime();
  return (
    <View
      style={[
        chatStyles.gifProviderLine,
        !!error && chatStyles.gifProviderLineError,
      ]}
    >
      <Ionicons
        name={
          error ? "cloud-offline-outline" : live ? "flash" : "sparkles-outline"
        }
        size={13}
        color={error ? "#174069" : live ? "#6F1B2C" : "#163C63"}
      />
      <Text
        style={[
          chatStyles.gifProviderText,
          !!error && chatStyles.gifProviderTextError,
        ]}
      >
        {error ||
          `${live ? "Live exact search" : "Built-in animated catalog"} · ${live ? `Powered by ${gifSearch.providerName}` : "1,000 GIF reactions available now"}`}
      </Text>
    </View>
  );
}

function GifPicker({
  visible,
  onClose,
  onSelect,
  onSticker: _onSticker,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (uri: string) => void;
  onSticker: (sticker: CustomChatSticker) => void;
}) {
  const gifSearchConfigured = useChatRuntime().gifSearch.configured;
  const [query, setQuery] = useState("");
  const [catalogOffset, setCatalogOffset] = useState(0);
  const [libraryMode, setLibraryMode] = useState<
    "all" | "recent" | "favourites"
  >("all");
  const [recents, setRecents] = useState<GifLibraryEntry[]>([]);
  const [favourites, setFavourites] = useState<GifLibraryEntry[]>([]);
  useEffect(() => {
    if (visible) {
      setQuery("");
      setCatalogOffset(0);
      setLibraryMode("all");
      void AsyncStorage.getItem(gifLibraryStorageKey).then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as {
            recents?: GifLibraryEntry[];
            favourites?: GifLibraryEntry[];
          };
          setRecents(Array.isArray(parsed.recents) ? parsed.recents : []);
          setFavourites(
            Array.isArray(parsed.favourites) ? parsed.favourites : [],
          );
        } catch {
          setRecents([]);
          setFavourites([]);
        }
      });
    }
  }, [visible]);
  useEffect(() => setCatalogOffset(0), [query]);
  const provider = useGifProviderSearch(query, visible);
  const catalogMatches = searchChatGifCatalog(query);
  const catalogPageSize = 24;
  const catalogPage = catalogMatches.slice(
    catalogOffset,
    catalogOffset + catalogPageSize,
  );
  const persistLibrary = (
    nextRecents: GifLibraryEntry[],
    nextFavourites: GifLibraryEntry[],
  ) =>
    void AsyncStorage.setItem(
      gifLibraryStorageKey,
      JSON.stringify({ recents: nextRecents, favourites: nextFavourites }),
    ).catch(() => undefined);
  const entryFor = (gif: ChatGifCatalogItem, uri: string): GifLibraryEntry => ({
    uri,
    title: gif.title,
    style: gif.style,
    previewEmoji: gif.previewEmoji,
    usedAt: Date.now(),
  });
  const choose = (gif: ChatGifCatalogItem, uri: string) => {
    const next = mergeGifRecents(recents, entryFor(gif, uri));
    setRecents(next);
    persistLibrary(next, favourites);
    onSelect(uri);
  };
  const favourite = (gif: ChatGifCatalogItem, uri: string) => {
    const next = toggleGifFavourite(favourites, entryFor(gif, uri));
    setFavourites(next);
    persistLibrary(recents, next);
  };
  const renderLibraryEntry = (entry: GifLibraryEntry) => {
    const catalog = parseCatalogGifUri(entry.uri);
    const gif: ChatGifCatalogItem = catalog ?? {
      id: `saved-${entry.uri}`,
      title: entry.title,
      style: entry.style,
      uri: entry.uri,
      previewEmoji: entry.previewEmoji,
      searchText: `${entry.title} ${entry.style}`.toLowerCase(),
    };
    return catalog ? (
      <CatalogGifTile
        key={entry.uri}
        gif={gif}
        favourite={favourites.some((item) => item.uri === entry.uri)}
        onSelect={(uri) => choose(gif, uri)}
        onToggleFavourite={() => favourite(gif, entry.uri)}
      />
    ) : (
      <GifResultTile
        key={entry.uri}
        gif={gif}
        favourite={favourites.some((item) => item.uri === entry.uri)}
        onSelect={(uri) => choose(gif, uri)}
        onToggleFavourite={() => favourite(gif, entry.uri)}
      />
    );
  };
  const libraryEntries = libraryMode === "recent" ? recents : favourites;
  const count =
    libraryMode === "all"
      ? gifSearchConfigured
        ? provider.totalCount
        : catalogMatches.length
      : libraryEntries.length;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "92%" }]}>
        <SheetHeader
          title="Choose a GIF"
          subtitle="Search, recent reactions and favourites cached on this device"
          onClose={onClose}
        />
        <View accessibilityRole="tablist" style={chatStyles.gifLibraryTabs}>
          {(
            [
              { id: "all", label: "All GIFs", icon: "images-outline" },
              { id: "recent", label: "Recent", icon: "time-outline" },
              { id: "favourites", label: "Favourites", icon: "star-outline" },
            ] as const
          ).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: libraryMode === item.id }}
              key={item.id}
              onPress={() => {
                setLibraryMode(item.id);
                setQuery("");
              }}
              style={[
                chatStyles.gifLibraryTab,
                libraryMode === item.id && chatStyles.gifLibraryTabOn,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={libraryMode === item.id ? "#FFFFFF" : "#1C4A79"}
              />
              <Text
                style={[
                  chatStyles.gifLibraryTabText,
                  libraryMode === item.id && chatStyles.gifLibraryTabTextOn,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {libraryMode === "all" && (
          <>
            <View style={chatStyles.gifSearchWrap}>
              <Ionicons name="search-outline" size={17} color="#1F5286" />
              <TextInput
                accessibilityLabel="Search GIF catalog"
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Try good morning, hug, kiss, love…"
                placeholderTextColor="#585C61"
                style={chatStyles.gifSearchInput}
              />
              {!!query && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear GIF search"
                  onPress={() => setQuery("")}
                >
                  <Ionicons name="close-circle" size={18} color="#3C76B1" />
                </Pressable>
              )}
            </View>
            <GifProviderLine
              live={gifSearchConfigured}
              error={provider.error}
            />
          </>
        )}
        <View style={chatStyles.gifResultHeader}>
          <Text style={chatStyles.gifResultTitle}>
            {libraryMode === "recent"
              ? "RECENTLY USED"
              : libraryMode === "favourites"
                ? "YOUR FAVOURITES"
                : query.trim()
                  ? `RESULTS FOR “${query.trim().toUpperCase()}”`
                  : "DAILY REACTIONS"}
          </Text>
          <Text style={chatStyles.gifResultCount}>
            {provider.loading && libraryMode === "all"
              ? "Searching…"
              : count.toLocaleString()}
          </Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.gifGrid}
        >
          {libraryMode !== "all"
            ? libraryEntries.map(renderLibraryEntry)
            : (() => {
                // Prefer live provider results; fall back to built-in catalog
                if (gifSearchConfigured && provider.items.length > 0) {
                  return provider.items.map((gif) => (
                    <GifResultTile
                      key={gif.id}
                      gif={gif}
                      favourite={favourites.some(
                        (item) => item.uri === gif.uri,
                      )}
                      onSelect={(uri) => choose(gif, uri)}
                      onToggleFavourite={() => favourite(gif, gif.uri)}
                    />
                  ));
                }
                if (!provider.loading) {
                  return catalogPage.map((gif) => {
                    const uri = buildCatalogGifUri(gif);
                    return (
                      <CatalogGifTile
                        key={gif.id}
                        gif={gif}
                        favourite={favourites.some((item) => item.uri === uri)}
                        onSelect={(selectedUri) => choose(gif, selectedUri)}
                        onToggleFavourite={() => favourite(gif, uri)}
                      />
                    );
                  });
                }
                return null;
              })()}
          {libraryMode === "all" &&
            !(gifSearchConfigured && provider.items.length > 0) && (
              <CatalogGifPager
                offset={catalogOffset}
                total={catalogMatches.length}
                pageSize={catalogPageSize}
                onChange={setCatalogOffset}
              />
            )}{" "}
          {libraryMode === "all" && provider.nextOffset !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Load more GIFs"
              disabled={provider.loadingMore}
              onPress={() => void provider.loadMore()}
              style={chatStyles.gifLoadMore}
            >
              <Ionicons name="add-circle-outline" size={17} color="#174069" />
              <Text style={chatStyles.gifLoadMoreText}>
                {provider.loadingMore ? "Loading…" : "Load 36 more"}
              </Text>
            </Pressable>
          )}
          {libraryMode !== "all" && !libraryEntries.length && (
            <Text style={chatStyles.emojiEmpty}>
              {libraryMode === "recent"
                ? "GIFs you send will appear here for quick reuse."
                : "Tap the star on any GIF to keep it here."}
            </Text>
          )}
          {libraryMode === "all" &&
            !provider.loading &&
            gifSearchConfigured &&
            !provider.items.length && (
              <Text style={chatStyles.emojiEmpty}>
                No GIF found. Try love, funny, sorry or congratulations.
              </Text>
            )}
          {libraryMode === "all" &&
            !provider.loading &&
            !catalogPage.length &&
            !provider.items.length && (
              <Text style={chatStyles.emojiEmpty}>
                No GIF found. Try good morning, hug, kiss, love, laugh or chai.
              </Text>
            )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const panelFix = StyleSheet.create({
  // Horizontal ScrollViews collapse in a column on web unless told not to
  // flex; this keeps the category chips fully visible.
  categoryScroll: { flexGrow: 0, flexShrink: 0, height: 50 },
  // The grid takes whatever room is left between the chips and the tabs.
  content: { flex: 1, height: "auto", minHeight: 0 },
});

function EmojiMediaPanel({
  onEmoji,
  onGif,
  onSticker,
}: {
  onEmoji: (emoji: string) => void;
  onGif: (uri: string) => void;
  onSticker: (sticker: CustomChatSticker) => void;
}) {
  const gifSearchConfigured = useChatRuntime().gifSearch.configured;
  const { height: windowHeight } = useWindowDimensions();
  // Fit short windows (laptops) instead of squashing the grid, and size the
  // emoji cells from the real panel width so rows are evenly filled.
  const panelHeight = Math.round(
    Math.min(370, Math.max(290, windowHeight * 0.48)),
  );
  const [gridWidth, setGridWidth] = useState(0);
  const emojiColumns = gridWidth ? Math.max(7, Math.floor(gridWidth / 46)) : 8;
  const emojiCell = gridWidth ? gridWidth / emojiColumns : 44;
  // GIF tiles: 3 per row on a phone, up to 6 on a wide window.
  const gifColumns = gridWidth
    ? Math.max(3, Math.min(6, Math.floor((gridWidth + 7) / 130)))
    : 3;
  const gifCardWidth = gridWidth
    ? Math.floor((gridWidth - 7 * (gifColumns - 1)) / gifColumns)
    : undefined;
  const [mode, setMode] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [category, setCategory] = useState<EmojiCategoryId>("recent");
  const [query, setQuery] = useState("");
  const [gifLimit, setGifLimit] = useState(48);
  const [catalogOffset, setCatalogOffset] = useState(0);
  const normalized = query.trim().toLowerCase();
  const activeCategory =
    emojiCategories.find((item) => item.id === category) ?? emojiCategories[0]!;
  const searchedEmoji = normalized
    ? [
        ...new Set(
          emojiSearchGroups
            .filter(
              (group) =>
                group.keywords.includes(normalized) ||
                normalized
                  .split(/\s+/)
                  .some((term) => group.keywords.includes(term)),
            )
            .flatMap((group) => group.emojis),
        ),
      ]
    : activeCategory.emojis;
  const visibleEmoji = searchedEmoji.length
    ? searchedEmoji
    : quickEmojis.filter((emoji) => emoji.includes(query.trim()));
  const stickerTokens = normalized.split(/\s+/).filter(Boolean);
  const visibleStickers = customChatStickers.filter(
    (sticker) =>
      !stickerTokens.length ||
      stickerTokens.some((token) =>
        `${sticker.label} ${sticker.caption} ${sticker.tags} ${sticker.emoji}`
          .toLowerCase()
          .includes(token),
      ),
  );
  const provider = useGifProviderSearch(query, mode === "gif");
  const visibleGifs = provider.items.slice(0, gifLimit);
  const catalogMatches = searchChatGifCatalog(query);
  const catalogPageSize = 24;
  const catalogPage = catalogMatches.slice(
    catalogOffset,
    catalogOffset + catalogPageSize,
  );
  useEffect(() => {
    setGifLimit(48);
    setCatalogOffset(0);
  }, [mode, query]);
  const modeLabel =
    mode === "emoji"
      ? "Search emoji"
      : mode === "gif"
        ? "Search GIFs"
        : "Search stickers";
  return (
    <View
      accessibilityLabel="Emoji, GIF and sticker picker"
      style={[
        chatStyles.emojiMediaPanel,
        {
          height: panelHeight,
          borderTopWidth: 1,
          borderTopColor: "#DBDEE1",
          backgroundColor: "#FDFDFD",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        },
      ]}
    >
      <View style={chatStyles.emojiSearchWrap}>
        <Ionicons name="search-outline" size={17} color="#1F5286" />
        <TextInput
          accessibilityLabel={modeLabel}
          value={query}
          onChangeText={setQuery}
          placeholder={modeLabel}
          placeholderTextColor="#585C61"
          style={chatStyles.emojiSearchInput}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={accessibilityHitSlop}
            onPress={() => setQuery("")}
          >
            <Ionicons name="close-circle" size={18} color="#3C76B1" />
          </Pressable>
        )}
      </View>
      {mode === "emoji" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={panelFix.categoryScroll}
          contentContainerStyle={chatStyles.emojiCategoryRow}
        >
          {emojiCategories.map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: category === item.id }}
              accessibilityLabel={`${item.label} emoji`}
              key={item.id}
              onPress={() => {
                setCategory(item.id);
                setQuery("");
              }}
              style={[
                chatStyles.emojiCategoryButton,
                category === item.id && chatStyles.emojiCategoryButtonOn,
              ]}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={17}
                color={category === item.id ? "#174069" : "#1C4B7B"}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={[chatStyles.emojiContent, panelFix.content]}
        onLayout={(event) =>
          setGridWidth(Math.max(0, event.nativeEvent.layout.width - 24))
        }
        contentContainerStyle={[
          mode === "gif"
            ? chatStyles.inlineGifGrid
            : mode === "sticker"
              ? chatStyles.stickerGrid
              : {},
          mode === "emoji" && {
            flexDirection: "row",
            flexWrap: "wrap",
            paddingBottom: 10,
          },
        ]}
      >
        {mode === "emoji" && (
          <>
            <View style={chatStyles.emojiSectionHeader}>
              <Text style={chatStyles.emojiSectionTitle}>
                {normalized
                  ? "SEARCH RESULTS"
                  : activeCategory.label.toUpperCase()}
              </Text>
              <Text style={chatStyles.emojiSectionCount}>
                {visibleEmoji.length}
              </Text>
            </View>
            {visibleEmoji.map((emoji, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${emoji}`}
                key={`${emoji}-${index}`}
                onPress={() => onEmoji(emoji)}
                style={{
                  width: emojiCell,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 27 }}>{emoji}</Text>
              </Pressable>
            ))}
            {!visibleEmoji.length && (
              <Text style={chatStyles.emojiEmpty}>
                No emoji found. Try “love”, “laugh”, “food” or “travel”.
              </Text>
            )}
          </>
        )}
        {mode === "gif" && (
          <>
            <View style={chatStyles.emojiSectionHeader}>
              <Text style={chatStyles.emojiSectionTitle}>
                {gifSearchConfigured
                  ? `${normalized ? "SEARCH RESULTS" : "TRENDING GIFS"} · POWERED BY GIPHY`
                  : normalized
                    ? "SEARCH RESULTS"
                    : "1,000 DAILY-USE GIFS"}
              </Text>
              <Text style={chatStyles.emojiSectionCount}>
                {provider.loading
                  ? "…"
                  : gifSearchConfigured
                    ? provider.totalCount.toLocaleString()
                    : catalogMatches.length.toLocaleString()}
              </Text>
            </View>
            {!!provider.error && (
              <GifProviderLine
                live={gifSearchConfigured}
                error={provider.error}
              />
            )}
            {gifSearchConfigured && visibleGifs.length > 0
              ? visibleGifs.map((gif) => (
                  <GifResultTile
                    compact
                    cardWidth={gifCardWidth}
                    key={gif.id}
                    gif={gif}
                    onSelect={onGif}
                  />
                ))
              : catalogPage.map((gif) => (
                  <CatalogGifTile
                    compact
                    cardWidth={gifCardWidth}
                    key={gif.id}
                    gif={gif}
                    onSelect={onGif}
                  />
                ))}
            {!gifSearchConfigured && (
              <CatalogGifPager
                compact
                offset={catalogOffset}
                total={catalogMatches.length}
                pageSize={catalogPageSize}
                onChange={setCatalogOffset}
              />
            )}{" "}
            {provider.nextOffset !== null && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Load more GIF results"
                disabled={provider.loadingMore}
                onPress={() => void provider.loadMore()}
                style={chatStyles.inlineGifMore}
              >
                <Text style={chatStyles.inlineGifMoreText}>
                  {provider.loadingMore ? "Loading…" : "Load 36 more"}
                </Text>
              </Pressable>
            )}
            {!provider.loading &&
              gifSearchConfigured &&
              !visibleGifs.length && (
                <Text style={chatStyles.emojiEmpty}>
                  No GIF found. Try good morning, hug, kiss, love, funny or
                  sorry.
                </Text>
              )}
            {!gifSearchConfigured && !catalogPage.length && (
              <Text style={chatStyles.emojiEmpty}>
                No GIF found. Try laugh, hug, love, chai or good morning.
              </Text>
            )}
          </>
        )}
        {mode === "sticker" && (
          <>
            <View style={chatStyles.emojiSectionHeader}>
              <Text style={chatStyles.emojiSectionTitle}>
                MILAAN STICKER PACK
              </Text>
              <Text style={chatStyles.emojiSectionCount}>
                {visibleStickers.length}
              </Text>
            </View>
            {visibleStickers.map((sticker) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Send ${sticker.label} animated sticker`}
                key={sticker.id}
                onPress={() => onSticker(sticker)}
                style={chatStyles.customStickerChoice}
              >
                <LinearGradient
                  colors={
                    sticker.tone === "gold"
                      ? ["#EEEFF1", "#D7A5AF"]
                      : sticker.tone === "plum"
                        ? ["#F4F5F6", "#DFE1E4"]
                        : sticker.tone === "cocoa"
                          ? ["#EEEFF1", "#D7A6B0"]
                          : ["#F9F9FA", "#E3E5E7"]
                  }
                  style={chatStyles.customStickerInner}
                >
                  <View style={chatStyles.customStickerEmojiWrap}>
                    <Text style={chatStyles.customStickerEmoji}>
                      {sticker.emoji}
                    </Text>
                    <Text style={chatStyles.customStickerSpark}>✦</Text>
                  </View>
                  <Text numberOfLines={1} style={chatStyles.customStickerLabel}>
                    {sticker.label}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={chatStyles.customStickerCaption}
                  >
                    {sticker.caption}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
            {!visibleStickers.length && (
              <Text style={chatStyles.emojiEmpty}>
                No sticker found. Try laugh, hug, love, chai, angry or good
                morning.
              </Text>
            )}
          </>
        )}
      </ScrollView>
      <View accessibilityRole="tablist" style={chatStyles.emojiModeTabs}>
        {(
          [
            { id: "emoji", label: "Emoji", icon: "happy-outline" },
            { id: "gif", label: "GIF", icon: "images-outline" },
            { id: "sticker", label: "Stickers", icon: "sparkles-outline" },
          ] as const
        ).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === item.id }}
            key={item.id}
            onPress={() => {
              setMode(item.id);
              setQuery("");
            }}
            style={[
              chatStyles.emojiModeTab,
              mode === item.id && chatStyles.emojiModeTabOn,
            ]}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={mode === item.id ? "#FFFFFF" : "#1B4977"}
            />
            <Text
              style={[
                chatStyles.emojiModeText,
                mode === item.id && chatStyles.emojiModeTextOn,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MessageActionSheet({
  visible,
  message,
  reaction,
  starred,
  pinned,
  notice,
  onClose,
  onInfo,
  onReply,
  onEdit,
  onCopy,
  onReact,
  onForward,
  onMultiSelect,
  onPin,
  onStar,
  onDelete,
  onHideForMe,
}: {
  visible: boolean;
  message: ChatMessage | null;
  reaction?: string;
  starred: boolean;
  pinned: boolean;
  notice: string;
  onClose: () => void;
  onInfo: () => void;
  onReply: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onReact: (reaction: string) => void;
  onForward: () => void;
  onMultiSelect: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
  onHideForMe: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reactionHint, setReactionHint] = useState(false);
  useEffect(() => {
    if (visible) {
      setConfirmDelete(false);
      setReactionHint(false);
    }
  }, [visible, message?.id]);
  const actions = [
    {
      label: "Message info",
      body: "Time and delivery status",
      icon: "information-circle-outline" as const,
      onPress: onInfo,
    },
    {
      label: "Reply",
      body: "Quote this message",
      icon: "arrow-undo-outline" as const,
      onPress: onReply,
    },
    ...(message?.mine !== false &&
    message?.type === "text" &&
    !message?.text?.startsWith("🎮")
      ? [
          {
            label: "Edit",
            body: "Update this message with an edited label",
            icon: "create-outline" as const,
            onPress: onEdit,
          },
        ]
      : []),
    {
      label: "Copy",
      body: "Copy message text",
      icon: "copy-outline" as const,
      onPress: onCopy,
    },
    {
      label: "React",
      body: "Choose a quick reaction above",
      icon: "happy-outline" as const,
      onPress: () => setReactionHint(true),
    },
    {
      label: "Forward",
      body: "Share with another conversation",
      icon: "arrow-redo-outline" as const,
      onPress: onForward,
    },
    {
      label: "Select messages",
      body: "Choose several messages to forward together",
      icon: "checkmark-circle-outline" as const,
      onPress: onMultiSelect,
    },
    {
      label: pinned ? "Unpin" : "Pin",
      body: pinned
        ? "Remove from pinned messages"
        : "Keep at the top of this chat",
      icon: pinned ? ("pin-outline" as const) : ("pin" as const),
      onPress: onPin,
    },
    {
      label: starred ? "Unstar" : "Star",
      body: starred ? "Remove from starred messages" : "Save for later",
      icon: starred ? ("star-outline" as const) : ("star" as const),
      onPress: onStar,
    },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close message actions"
        style={chatStyles.actionSheetBackdrop}
        onPress={onClose}
      />
      <SafeAreaView style={chatStyles.messageActionSheet}>
        <View style={chatStyles.actionGrabber} />
        <View style={chatStyles.actionPreview}>
          <View style={chatStyles.actionPreviewAccent} />
          <View style={{ flex: 1 }}>
            <Text style={chatStyles.actionPreviewLabel}>
              {message?.mine === false ? "Received message" : "Your message"}
            </Text>
            <Text numberOfLines={2} style={chatStyles.actionPreviewText}>
              {message ? messageSummaryForAccessibility(message) : ""}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={accessibilityHitSlop}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="#1C4B7A" />
          </Pressable>
        </View>
        <View style={chatStyles.quickReactionRow}>
          {["👍", "❤️", "😂", "😮", "🥺", "🙏"].map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`React ${item}`}
              accessibilityState={{ selected: reaction === item }}
              key={item}
              onPress={() => onReact(item)}
              style={[
                chatStyles.quickReactionButton,
                reaction === item && chatStyles.quickReactionButtonOn,
              ]}
            >
              <Text style={chatStyles.quickReactionEmoji}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {(!!notice || reactionHint) && (
          <View
            accessibilityLiveRegion="polite"
            style={chatStyles.actionNotice}
          >
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#761D2F"
            />
            <Text style={chatStyles.actionNoticeText}>
              {notice ||
                "Tap one of the reactions above. Tap the selected reaction again to replace it."}
            </Text>
          </View>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={chatStyles.actionList}
        >
          {actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              key={action.label}
              onPress={action.onPress}
              style={chatStyles.actionRow}
            >
              <View style={chatStyles.actionIcon}>
                <Ionicons name={action.icon} size={18} color="#163C63" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.actionTitle}>{action.label}</Text>
                <Text style={chatStyles.actionBody}>{action.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#7E8389" />
            </Pressable>
          ))}
          {message?.mine !== false &&
            (confirmDelete ? (
              <View style={chatStyles.deleteConfirm}>
                <View style={{ flex: 1 }}>
                  <Text style={chatStyles.deleteConfirmTitle}>
                    Delete for everyone?
                  </Text>
                  <Text style={chatStyles.deleteConfirmBody}>
                    You have 5 seconds to undo before the secure delete is
                    committed.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel delete"
                  onPress={() => setConfirmDelete(false)}
                  style={chatStyles.deleteCancel}
                >
                  <Text style={chatStyles.deleteCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm delete"
                  onPress={onDelete}
                  style={chatStyles.deleteConfirmButton}
                >
                  <Text style={chatStyles.deleteConfirmButtonText}>Delete</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete message"
                onPress={() => setConfirmDelete(true)}
                style={[chatStyles.actionRow, chatStyles.deleteAction]}
              >
                <View style={[chatStyles.actionIcon, chatStyles.deleteIcon]}>
                  <Ionicons name="trash-outline" size={18} color="#19446F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={chatStyles.deleteTitle}>
                    Delete for everyone
                  </Text>
                  <Text style={chatStyles.actionBody}>
                    Remove the content from both sides
                  </Text>
                </View>
              </Pressable>
            ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete for me"
            onPress={onHideForMe}
            style={[chatStyles.actionRow, chatStyles.deleteAction]}
          >
            <View style={[chatStyles.actionIcon, chatStyles.deleteIcon]}>
              <Ionicons name="trash-outline" size={18} color="#19446F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={chatStyles.deleteTitle}>Delete for me</Text>
              <Text style={chatStyles.actionBody}>
                Remove it from your view only
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EditMessageSheet({
  message,
  onClose,
  onSave,
}: {
  message: ChatMessage | null;
  onClose: () => void;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (message) {
      setValue(parseQuotedReply(message.text)?.body ?? message.text ?? "");
      setError("");
    }
  }, [message?.id]);
  const save = async () => {
    const clean = value.trim();
    if (!clean) {
      setError("Message cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      if (!(await onSave(clean)))
        setError("The edit could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      visible={!!message}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title="Edit message"
          subtitle="Edited messages are clearly labelled for both people"
          onClose={onClose}
        />
        <View style={chatStyles.editMessageCard}>
          <TextInput
            accessibilityLabel="Edit message text"
            autoFocus
            multiline
            value={value}
            onChangeText={setValue}
            maxLength={2000}
            placeholder="Update your message"
            placeholderTextColor="#235A92"
            style={chatStyles.editMessageInput}
          />
          <Text style={chatStyles.editMessageCount}>{value.length}/2,000</Text>
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={chatStyles.editMessageError}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save edited message"
          disabled={saving || !value.trim()}
          onPress={() => void save()}
          style={[
            chatStyles.primarySheetButton,
            (saving || !value.trim()) && { opacity: 0.45 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={chatStyles.primarySheetButtonText}>
            {saving ? "Saving…" : "Save changes"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function ForwardSelectorSheet({
  visible,
  messages,
  current,
  onClose,
  onForward,
}: {
  visible: boolean;
  messages: ChatMessage[];
  current: Match;
  onClose: () => void;
  onForward: (target: Match) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState("");
  useEffect(() => {
    if (visible) {
      setQuery("");
      setSendingId("");
    }
  }, [visible]);
  const normalized = query.trim().toLowerCase();
  const recipients = matches.filter(
    (item) =>
      item.id !== current.id &&
      (!normalized ||
        `${item.name} ${item.city} ${item.profession}`
          .toLowerCase()
          .includes(normalized)),
  );
  const choose = async (target: Match) => {
    setSendingId(target.id);
    try {
      await onForward(target);
    } finally {
      setSendingId("");
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "88%" }]}>
        <SheetHeader
          title="Forward messages"
          subtitle={`${messages.length} ${messages.length === 1 ? "message" : "messages"} · choose a verified conversation`}
          onClose={onClose}
        />
        <View style={chatStyles.gifSearchWrap}>
          <Ionicons name="search-outline" size={17} color="#1F5286" />
          <TextInput
            accessibilityLabel="Search forwarding recipients"
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor="#585C61"
            style={chatStyles.gifSearchInput}
          />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.forwardList}
        >
          {recipients.map((person) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Forward to ${person.name}`}
              disabled={!!sendingId}
              key={person.id}
              onPress={() => void choose(person)}
              style={chatStyles.forwardPerson}
            >
              {person.photo ? (
                <Image
                  source={{ uri: person.photo }}
                  style={chatStyles.forwardAvatar}
                />
              ) : (
                <View
                  style={[chatStyles.forwardAvatar, chatStyles.initialAvatar]}
                >
                  <Text style={chatStyles.initialAvatarText}>
                    {person.name[0]}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.forwardName}>{person.name}</Text>
                <Text style={chatStyles.forwardMeta}>
                  {person.city} · Verified match
                </Text>
              </View>
              <View style={chatStyles.forwardButton}>
                <Ionicons
                  name={sendingId === person.id ? "time-outline" : "arrow-redo"}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            </Pressable>
          ))}
          {!recipients.length && (
            <Text style={chatStyles.emojiEmpty}>
              No verified conversation matches this search.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PinnedMessagesSheet({
  visible,
  messages,
  onClose,
  onJump,
  onUnpin,
}: {
  visible: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "85%" }]}>
        <SheetHeader
          title="Pinned messages"
          subtitle="Important moments kept at the top of this conversation"
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.forwardList}
        >
          {messages.map((message) => (
            <View key={message.id} style={chatStyles.pinnedMessageRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Jump to pinned message"
                onPress={() => onJump(message.id)}
                style={{ flex: 1 }}
              >
                <Text style={chatStyles.pinnedMessageLabel}>
                  {message.mine === false ? "FROM YOUR MATCH" : "FROM YOU"} ·{" "}
                  {new Date(message.createdAt).toLocaleDateString()}
                </Text>
                <Text numberOfLines={3} style={chatStyles.pinnedMessageText}>
                  {messageSummaryForAccessibility(message)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Unpin message"
                onPress={() => onUnpin(message.id)}
                style={chatStyles.unpinButton}
              >
                <Ionicons name="pin-outline" size={16} color="#163C63" />
              </Pressable>
            </View>
          ))}
          {!messages.length && (
            <Text style={chatStyles.emojiEmpty}>No pinned messages yet.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ConversationInboxSheet({
  visible,
  current,
  settings,
  onClose,
  onOpen,
}: {
  visible: boolean;
  current: Match;
  settings: Record<string, CoupleChatSettings>;
  onClose: () => void;
  onOpen: (target: Match) => void;
}) {
  const [tab, setTab] = useState<"active" | "pinned" | "archived">("active");
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (visible) {
      setTab("active");
      setQuery("");
    }
  }, [visible]);
  const all = [current, ...matches.filter((item) => item.id !== current.id)];
  const normalized = query.trim().toLowerCase();
  const filtered = all
    .filter((person) => {
      const preference = {
        ...defaultCoupleChatSettings,
        ...settings[person.id],
      };
      const belongs =
        tab === "archived"
          ? preference.conversationArchived
          : tab === "pinned"
            ? preference.conversationPinned && !preference.conversationArchived
            : !preference.conversationArchived;
      return (
        belongs &&
        (!normalized ||
          `${preference.nickname} ${person.name} ${person.city} ${person.profession}`
            .toLowerCase()
            .includes(normalized))
      );
    })
    .sort(
      (a, b) =>
        Number(!!settings[b.id]?.conversationPinned) -
        Number(!!settings[a.id]?.conversationPinned),
    );
  const counts = {
    active: all.filter((person) => !settings[person.id]?.conversationArchived)
      .length,
    pinned: all.filter(
      (person) =>
        settings[person.id]?.conversationPinned &&
        !settings[person.id]?.conversationArchived,
    ).length,
    archived: all.filter((person) => settings[person.id]?.conversationArchived)
      .length,
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "90%" }]}>
        <SheetHeader
          title="Conversation inbox"
          subtitle="Pinned chats stay first; archived chats remain private and searchable"
          onClose={onClose}
        />
        <View accessibilityRole="tablist" style={chatStyles.inboxTabs}>
          {(["active", "pinned", "archived"] as const).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              key={item}
              onPress={() => setTab(item)}
              style={[
                chatStyles.inboxTab,
                tab === item && chatStyles.inboxTabOn,
              ]}
            >
              <Text
                style={[
                  chatStyles.inboxTabText,
                  tab === item && chatStyles.inboxTabTextOn,
                ]}
              >
                {item[0]?.toUpperCase()}
                {item.slice(1)} · {counts[item]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={chatStyles.gifSearchWrap}>
          <Ionicons name="search-outline" size={17} color="#1F5286" />
          <TextInput
            accessibilityLabel={`Search ${tab} conversations`}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${tab}`}
            placeholderTextColor="#585C61"
            style={chatStyles.gifSearchInput}
          />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.forwardList}
        >
          {filtered.map((person) => {
            const preference = {
              ...defaultCoupleChatSettings,
              ...settings[person.id],
            };
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open conversation with ${preference.nickname || person.name}`}
                key={person.id}
                onPress={() => onOpen(person)}
                style={[
                  chatStyles.forwardPerson,
                  person.id === current.id && chatStyles.currentConversation,
                ]}
              >
                {person.photo ? (
                  <Image
                    source={{ uri: person.photo }}
                    style={chatStyles.forwardAvatar}
                  />
                ) : (
                  <View
                    style={[chatStyles.forwardAvatar, chatStyles.initialAvatar]}
                  >
                    <Text style={chatStyles.initialAvatarText}>
                      {person.name[0]}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={shared.row}>
                    <Text numberOfLines={1} style={chatStyles.forwardName}>
                      {preference.nickname || person.name}
                    </Text>
                    {preference.conversationPinned && (
                      <Ionicons name="pin" size={12} color="#791E30" />
                    )}
                    {preference.notificationMode === "muted" && (
                      <Ionicons
                        name="notifications-off"
                        size={12}
                        color="#225991"
                      />
                    )}
                  </View>
                  <Text style={chatStyles.forwardMeta}>
                    {person.city} ·{" "}
                    {person.id === current.id
                      ? "Open now"
                      : "Verified conversation"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#4A82BA" />
              </Pressable>
            );
          })}
          {!filtered.length && (
            <View style={chatStyles.inboxEmpty}>
              <MiniPremiumIcon
                name={
                  tab === "archived"
                    ? "archive-outline"
                    : "chatbubble-ellipses-outline"
                }
                tone="rose"
                size={40}
                iconSize={18}
              />
              <Text style={chatStyles.inboxEmptyTitle}>
                No {tab} conversations
              </Text>
              <Text style={chatStyles.inboxEmptyBody}>
                {query
                  ? "Try another name or city."
                  : tab === "archived"
                    ? "Archived conversations will appear here without losing messages."
                    : "Use Chat settings to pin or organize a conversation."}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function GameSheet({
  visible,
  onClose,
  onPlay,
  onPickLive,
}: {
  visible: boolean;
  onClose: () => void;
  onPlay: (game: CoupleGame, prompt: string) => void;
  /** The play-together games. Only offered in a real, signed-in chat. */
  onPickLive?: (kind: GameKind) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  useEffect(() => {
    if (visible) {
      setSelectedId(null);
      setPromptIndex(0);
      setCustomOpen(false);
      setCustomPrompt("");
    }
  }, [visible]);
  const selected = coupleGames.find((game) => game.id === selectedId);
  const selectGame = (game: CoupleGame) => {
    setSelectedId(game.id);
    setPromptIndex(0);
    setCustomOpen(false);
    setCustomPrompt("");
  };
  const nextPrompt = () => {
    if (selected)
      setPromptIndex((current) => (current + 1) % selected.prompts.length);
  };
  const sendCustom = () => {
    const value = customPrompt.trim();
    if (selected && value) onPlay(selected, `CUSTOM ROUND · ${value}`);
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, gameStyles.sheet]}>
        <SheetHeader
          title={selected?.title ?? "Couple games"}
          subtitle={
            selected
              ? "Preview a round before it enters the chat."
              : "Six simple games made for laughter and real conversation."
          }
          onClose={onClose}
        />
        {selected ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={gameStyles.detailScroll}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to all games"
              onPress={() => setSelectedId(null)}
              style={gameStyles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color="#153B61" />
              <Text style={gameStyles.backText}>All games</Text>
            </Pressable>
            <LinearGradient
              colors={["#F3F4F5", "#E1C7CC"]}
              style={gameStyles.detailHero}
            >
              <PremiumIcon
                name={selected.icon}
                tone={selected.tone}
                size={56}
                iconSize={25}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.detailTag}>{selected.tag}</Text>
                <Text style={gameStyles.detailTitle}>{selected.title}</Text>
                <Text style={gameStyles.detailBody}>
                  {selected.description}
                </Text>
              </View>
            </LinearGradient>
            <View style={gameStyles.howCard}>
              <MiniPremiumIcon
                name="people"
                tone="gold"
                size={34}
                iconSize={16}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.howLabel}>HOW TO PLAY</Text>
                <Text style={gameStyles.howText}>{selected.howToPlay}</Text>
              </View>
            </View>
            <View style={gameStyles.promptCard}>
              <View style={gameStyles.promptHeader}>
                <Text style={gameStyles.roundLabel}>
                  ROUND {promptIndex + 1} OF {selected.prompts.length}
                </Text>
                <View style={gameStyles.privatePill}>
                  <Ionicons name="lock-closed" size={10} color="#751D2F" />
                  <Text style={gameStyles.privateText}>MUTUAL CHAT</Text>
                </View>
              </View>
              <Text style={gameStyles.promptText}>
                {selected.prompts[promptIndex]}
              </Text>
            </View>
            <View style={gameStyles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show another prompt"
                onPress={nextPrompt}
                style={gameStyles.secondaryButton}
              >
                <Ionicons name="refresh" size={17} color="#153B61" />
                <Text style={gameStyles.secondaryText}>New prompt</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Send ${selected.title} round to chat`}
                onPress={() => onPlay(selected, selected.prompts[promptIndex]!)}
                style={gameStyles.primaryButton}
              >
                <Ionicons name="send" size={17} color="#FFFFFF" />
                <Text style={gameStyles.primaryText}>Send this round</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: customOpen }}
              accessibilityLabel="Create your own game prompt"
              onPress={() => setCustomOpen((value) => !value)}
              style={[
                gameStyles.customToggle,
                customOpen && gameStyles.customToggleOn,
              ]}
            >
              <MiniPremiumIcon
                name="create-outline"
                tone="rose"
                size={32}
                iconSize={15}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.customToggleTitle}>
                  Write your own round
                </Text>
                <Text style={gameStyles.customToggleBody}>
                  Add a private question or challenge in your own words.
                </Text>
              </View>
              <Ionicons
                name={customOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color="#173F67"
              />
            </Pressable>
            {customOpen && (
              <View style={gameStyles.customCard}>
                <View style={gameStyles.customHeader}>
                  <View>
                    <Text style={gameStyles.customLabel}>CUSTOM PROMPT</Text>
                    <Text style={gameStyles.customHint}>
                      Keep it kind, mutual and comfortable.
                    </Text>
                  </View>
                  <Text style={gameStyles.customCount}>
                    {customPrompt.length}/220
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel="Custom game prompt"
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  multiline
                  maxLength={220}
                  placeholder="Example: What tiny tradition would you love us to create together?"
                  placeholderTextColor="#2D67A1"
                  style={gameStyles.customInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send custom game round"
                  accessibilityState={{ disabled: !customPrompt.trim() }}
                  disabled={!customPrompt.trim()}
                  onPress={sendCustom}
                  style={[
                    gameStyles.customSend,
                    !customPrompt.trim() && gameStyles.customSendDisabled,
                  ]}
                >
                  <Ionicons name="send" size={15} color="#FFFFFF" />
                  <Text style={gameStyles.customSendText}>
                    Send custom round
                  </Text>
                </Pressable>
              </View>
            )}
            <Text style={gameStyles.privacyNote}>
              This round appears as one clear card. Both people answer inside
              that same card.
            </Text>
          </ScrollView>
        ) : (
          <>
            <View style={gameStyles.hero}>
              <PremiumIcon
                name="game-controller"
                tone="gold"
                size={44}
                iconSize={20}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.heroTitle}>
                  Play without leaving chat
                </Text>
                <Text style={gameStyles.heroBody}>
                  Choose a game, preview the exact prompt, then send only when
                  it feels right.
                </Text>
              </View>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={gameStyles.grid}
            >
              {!!onPickLive && <LiveGamesSection onPick={onPickLive} />}
              {coupleGames.map((game) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${game.title}`}
                  key={game.id}
                  onPress={() => selectGame(game)}
                  style={gameStyles.card}
                >
                  <PremiumIcon
                    name={game.icon}
                    tone={game.tone}
                    size={44}
                    iconSize={20}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={gameStyles.cardTag}>{game.tag}</Text>
                    <Text style={gameStyles.title}>{game.title}</Text>
                    <Text numberOfLines={2} style={gameStyles.body}>
                      {game.description}
                    </Text>
                  </View>
                  <View style={gameStyles.openButton}>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={gameStyles.privacyNote}>
              100 original Truth or Dare rounds · custom prompts · private to
              this mutual chat.
            </Text>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function CoupleSettingsSheet({
  visible,
  match,
  settings,
  onChange,
  onClose,
}: {
  visible: boolean;
  match: Match;
  settings: CoupleChatSettings;
  onChange: (settings: CoupleChatSettings) => void;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(settings.nickname);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (visible) {
      setNickname(settings.nickname);
      setStatus("");
    }
  }, [visible, settings.nickname]);
  const activeTheme =
    coupleThemes.find((theme) => theme.name === settings.theme) ??
    coupleThemes[0]!;
  const saveNickname = () => {
    onChange({
      ...settings,
      nickname: nickname.trim(),
      theme: settings.theme || coupleThemes[0]!.name,
    });
    setStatus(
      nickname.trim()
        ? `${match.name} now appears as ${nickname.trim()} in this chat.`
        : "Nickname removed for this match.",
    );
  };
  const chooseTheme = (theme: (typeof coupleThemes)[number]) => {
    onChange({ ...settings, theme: theme.name });
    setStatus(`${theme.name} theme applied.`);
  };
  const retentionOptions = [
    {
      value: "keep" as const,
      label: "Keep messages",
      body: "Messages stay until someone deletes them.",
    },
    {
      value: "after_seen" as const,
      label: "Delete after seen",
      body: "New messages disappear once the recipient has seen them.",
    },
    {
      value: "24_hours" as const,
      label: "24 hours",
      body: "New messages disappear 24 hours after sending.",
    },
    {
      value: "7_days" as const,
      label: "7 days",
      body: "New messages disappear after one week.",
    },
  ];
  const chooseRetention = (
    retentionMode: CoupleChatSettings["retentionMode"],
  ) => {
    onChange({ ...settings, retentionMode });
    setStatus(
      retentionMode === "keep"
        ? "Messages will be kept."
        : "Privacy timer updated for new messages. Existing messages keep their current policy.",
    );
  };
  const toggleScreenshotAlerts = () => {
    onChange({ ...settings, screenshotAlerts: !settings.screenshotAlerts });
    setStatus(
      !settings.screenshotAlerts
        ? "Screenshot alerts turned on where the device supports detection."
        : "Screenshot alerts turned off for this chat.",
    );
  };
  const toggleShareTypingStatus = () => {
    onChange({ ...settings, shareTypingStatus: !settings.shareTypingStatus });
    setStatus(
      !settings.shareTypingStatus
        ? "Your “is typing…” status is now shared."
        : "Your “is typing…” status is now hidden from this chat.",
    );
  };
  const toggleConversationFlag = (
    key: "conversationPinned" | "conversationArchived",
  ) => {
    const next = !settings[key];
    onChange({ ...settings, [key]: next });
    setStatus(
      key === "conversationPinned"
        ? next
          ? "Conversation pinned to the top."
          : "Conversation unpinned."
        : next
          ? "Conversation moved to Archived. New messages can bring it back."
          : "Conversation restored to your inbox.",
    );
  };
  const setNotificationMode = (
    notificationMode: CoupleChatSettings["notificationMode"],
  ) => {
    onChange({
      ...settings,
      notificationMode,
      mutedUntil:
        notificationMode === "muted" ? settings.mutedUntil : undefined,
    });
    setStatus(
      notificationMode === "all"
        ? "All message notifications enabled."
        : notificationMode === "mentions"
          ? "Only important and direct notifications will alert you."
          : "Conversation muted.",
    );
  };
  const muteFor = (duration: "1h" | "8h" | "1w" | "forever") => {
    const durationMs =
      duration === "1h"
        ? 60 * 60 * 1000
        : duration === "8h"
          ? 8 * 60 * 60 * 1000
          : duration === "1w"
            ? 7 * 24 * 60 * 60 * 1000
            : undefined;
    onChange({
      ...settings,
      notificationMode: "muted",
      mutedUntil: durationMs ? Date.now() + durationMs : undefined,
    });
    setStatus(
      duration === "forever"
        ? "Muted until you turn notifications back on."
        : `Muted for ${duration === "1h" ? "1 hour" : duration === "8h" ? "8 hours" : "1 week"}.`,
    );
  };
  const notificationMuted = isConversationMuted(settings);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "92%" }]}>
        <SheetHeader
          title="Chat settings"
          subtitle="Inbox, notifications, appearance and privacy"
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={coupleStyles.scrollContent}
        >
          <LinearGradient
            colors={[activeTheme.accent, activeTheme.panel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={coupleStyles.preview}
          >
            {match.photo ? (
              <Image
                source={{ uri: match.photo }}
                style={coupleStyles.previewAvatar}
              />
            ) : (
              <View
                style={[coupleStyles.previewAvatar, chatStyles.initialAvatar]}
              >
                <Text style={chatStyles.initialAvatarText}>
                  {match.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={coupleStyles.previewName}>
                {nickname.trim() || match.name}
              </Text>
              <Text style={coupleStyles.previewMeta}>
                {match.name} · {activeTheme.name}
              </Text>
            </View>
            <PremiumIcon name="heart" tone="gold" size={44} iconSize={19} />
          </LinearGradient>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>NICKNAME</Text>
            <View style={coupleStyles.nicknameRow}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder={`Nickname for ${match.name}`}
                placeholderTextColor="#1F5286"
                style={coupleStyles.nicknameInput}
              />
              <Pressable onPress={saveNickname} style={coupleStyles.saveButton}>
                <Text style={coupleStyles.saveText}>Save</Text>
              </Pressable>
            </View>
            <Text style={styles.helper}>Only you see this nickname.</Text>
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>CONVERSATION</Text>
            <View style={chatStyles.conversationPreferenceRow}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.conversationPinned }}
                onPress={() => toggleConversationFlag("conversationPinned")}
                style={[
                  chatStyles.conversationPreference,
                  settings.conversationPinned &&
                    chatStyles.conversationPreferenceOn,
                ]}
              >
                <MiniPremiumIcon
                  name="pin"
                  tone={settings.conversationPinned ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleStyles.privacyTitle}>
                    Pin conversation
                  </Text>
                  <Text style={coupleStyles.privacyBody}>
                    Keep this chat at the top of your inbox.
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.conversationArchived }}
                onPress={() => toggleConversationFlag("conversationArchived")}
                style={[
                  chatStyles.conversationPreference,
                  settings.conversationArchived &&
                    chatStyles.conversationPreferenceOn,
                ]}
              >
                <MiniPremiumIcon
                  name="archive-outline"
                  tone={settings.conversationArchived ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleStyles.privacyTitle}>
                    Archive conversation
                  </Text>
                  <Text style={coupleStyles.privacyBody}>
                    Hide it from the active inbox without deleting messages.
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
          <View style={coupleStyles.section}>
            <View style={shared.row}>
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={shared.spacer} />
              <Text style={chatStyles.notificationStatus}>
                {notificationMuteLabel(settings)}
              </Text>
            </View>
            <View style={chatStyles.notificationModes}>
              {(
                [
                  { id: "all", label: "All", icon: "notifications" },
                  { id: "mentions", label: "Important", icon: "at" },
                  { id: "muted", label: "Muted", icon: "notifications-off" },
                ] as const
              ).map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: settings.notificationMode === item.id,
                  }}
                  key={item.id}
                  onPress={() => setNotificationMode(item.id)}
                  style={[
                    chatStyles.notificationMode,
                    settings.notificationMode === item.id &&
                      chatStyles.notificationModeOn,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={
                      settings.notificationMode === item.id
                        ? "#FFFFFF"
                        : "#1B4A79"
                    }
                  />
                  <Text
                    style={[
                      chatStyles.notificationModeText,
                      settings.notificationMode === item.id &&
                        chatStyles.notificationModeTextOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {notificationMuted && (
              <View style={chatStyles.muteDurationRow}>
                {(
                  [
                    { id: "1h", label: "1 hour" },
                    { id: "8h", label: "8 hours" },
                    { id: "1w", label: "1 week" },
                    { id: "forever", label: "Always" },
                  ] as const
                ).map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => muteFor(item.id)}
                    style={chatStyles.muteDuration}
                  >
                    <Text style={chatStyles.muteDurationText}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.sectionLabel}>SOUND</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7 }}
            >
              {(
                ["Apnajoda Chime", "Soft Rose", "Classic", "Silent"] as const
              ).map((sound) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: settings.notificationSound === sound,
                  }}
                  key={sound}
                  onPress={() => {
                    onChange({ ...settings, notificationSound: sound });
                    setStatus(`${sound} selected for this chat.`);
                  }}
                  style={[
                    chatStyles.soundChoice,
                    settings.notificationSound === sound &&
                      chatStyles.soundChoiceOn,
                  ]}
                >
                  <Ionicons
                    name={
                      sound === "Silent"
                        ? "volume-mute-outline"
                        : "musical-note-outline"
                    }
                    size={14}
                    color={
                      settings.notificationSound === sound
                        ? "#FFFFFF"
                        : "#1B4A79"
                    }
                  />
                  <Text
                    style={[
                      chatStyles.soundChoiceText,
                      settings.notificationSound === sound &&
                        chatStyles.soundChoiceTextOn,
                    ]}
                  >
                    {sound}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>MESSAGE PRIVACY</Text>
            {retentionOptions.map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{
                  checked: settings.retentionMode === option.value,
                }}
                key={option.value}
                onPress={() => chooseRetention(option.value)}
                style={[
                  coupleStyles.privacyChoice,
                  settings.retentionMode === option.value &&
                    coupleStyles.privacyChoiceOn,
                ]}
              >
                <MiniPremiumIcon
                  name={
                    settings.retentionMode === option.value
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  tone={
                    settings.retentionMode === option.value ? "gold" : "dark"
                  }
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleStyles.privacyTitle}>{option.label}</Text>
                  <Text style={coupleStyles.privacyBody}>{option.body}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>ACTIVITY STATUS</Text>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.shareTypingStatus }}
              onPress={toggleShareTypingStatus}
              style={coupleStyles.captureCard}
            >
              <PremiumIcon
                name="chatbubble-ellipses-outline"
                tone={settings.shareTypingStatus ? "gold" : "dark"}
                size={44}
                iconSize={20}
              />
              <View style={{ flex: 1 }}>
                <Text style={coupleStyles.privacyTitle}>
                  Show when you're typing
                </Text>
                <Text style={coupleStyles.privacyBody}>
                  Lets the other person see "is typing…" while you write a
                  reply. Turn this off to hide it — you'll still see theirs,
                  unless they've hidden it too.
                </Text>
              </View>
              <View
                style={[
                  coupleStyles.toggle,
                  settings.shareTypingStatus && coupleStyles.toggleOn,
                ]}
              >
                <View
                  style={[
                    coupleStyles.toggleKnob,
                    settings.shareTypingStatus && coupleStyles.toggleKnobOn,
                  ]}
                />
              </View>
            </Pressable>
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>SCREENSHOT ALERTS</Text>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.screenshotAlerts }}
              onPress={toggleScreenshotAlerts}
              style={coupleStyles.captureCard}
            >
              <PremiumIcon
                name="scan-outline"
                tone={settings.screenshotAlerts ? "gold" : "dark"}
                size={44}
                iconSize={20}
              />
              <View style={{ flex: 1 }}>
                <Text style={coupleStyles.privacyTitle}>
                  Notify both people
                </Text>
                <Text style={coupleStyles.privacyBody}>
                  When a supported native device reports a capture, Apnajoda
                  records the event and alerts the other person.
                </Text>
              </View>
              <View
                style={[
                  coupleStyles.toggle,
                  settings.screenshotAlerts && coupleStyles.toggleOn,
                ]}
              >
                <View
                  style={[
                    coupleStyles.toggleKnob,
                    settings.screenshotAlerts && coupleStyles.toggleKnobOn,
                  ]}
                />
              </View>
            </Pressable>
            <View style={coupleStyles.limitCard}>
              <MiniPremiumIcon
                name="information-circle-outline"
                tone="rose"
                size={30}
                iconSize={14}
              />
              <Text style={coupleStyles.limitText}>
                Web browsers and some operating-system capture methods cannot be
                detected reliably. Apnajoda will never show a false “screenshot
                taken” alert.
              </Text>
            </View>
          </View>
          <View style={coupleStyles.section}>
            <View style={shared.row}>
              <Text style={styles.sectionLabel}>COUPLE THEME</Text>
              <View style={shared.spacer} />
              <Pressable
                onPress={() =>
                  setStatus(
                    "Custom colors and wallpaper will be available after secure sync is connected.",
                  )
                }
                style={premiumButtonStyles.smallGhost}
              >
                <Text style={discoveryStyles.manageText}>Custom</Text>
              </Pressable>
            </View>
            <View style={coupleStyles.themeGrid}>
              {coupleThemes.map((theme) => (
                <Pressable
                  key={theme.name}
                  onPress={() => chooseTheme(theme)}
                  style={[
                    coupleStyles.themeCard,
                    settings.theme === theme.name && {
                      borderColor: theme.accent,
                      backgroundColor: theme.soft,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[theme.accent, theme.panel]}
                    style={coupleStyles.themeDot}
                  />
                  <Text style={coupleStyles.themeName}>{theme.name}</Text>
                  {settings.theme === theme.name && (
                    <MiniPremiumIcon
                      name="checkmark-circle"
                      tone="gold"
                      size={28}
                      iconSize={13}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
          {!!status && (
            <View style={coupleStyles.statusCard}>
              <MiniPremiumIcon
                name="checkmark-circle"
                tone="gold"
                size={28}
                iconSize={13}
              />
              <Text style={coupleStyles.statusText}>{status}</Text>
            </View>
          )}
          <Text style={chatStyles.billingNote}>
            Preview settings save on this device. Production timers and
            supported capture events are enforced by the server for mutual
            matches.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SnapStudio({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (
    uri: string,
    filter: string,
    sticker: string,
    viewOnce: boolean,
  ) => void;
}) {
  const [uri, setUri] = useState("");
  const [filter, setFilter] = useState(snapFilters[0]!.name);
  const [sticker, setSticker] = useState("💘");
  const [viewOnce, setViewOnce] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (visible) {
      setUri("");
      setFilter(snapFilters[0]!.name);
      setSticker("💘");
      setViewOnce(true);
      setError("");
    }
  }, [visible]);
  const choose = async (camera = false) => {
    setError("");
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          camera
            ? "Camera permission is needed to create a Snap."
            : "Photo permission is needed to choose a Snap.",
        );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
      if (!result.canceled && result.assets[0]) {
        setUri(result.assets[0].uri);
        return;
      }
      setError("No photo selected. Choose camera or library to continue.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not open camera or photo library. Please try again.",
      );
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={snapStyles.screen}>
        <View style={snapStyles.header}>
          <Pressable onPress={onClose} style={chatStyles.sheetClose}>
            <PremiumIcon name="close" tone="dark" size={38} iconSize={18} />
          </Pressable>
          <Text style={snapStyles.headerTitle}>Apnajoda Snap</Text>
          <Pressable
            disabled={!uri}
            onPress={() => onSend(uri, filter, sticker, viewOnce)}
            style={premiumButtonStyles.smallGhost}
          >
            <Text style={[snapStyles.sendText, !uri && { opacity: 0.35 }]}>
              Send
            </Text>
          </Pressable>
        </View>
        {uri ? (
          <View style={snapStyles.preview}>
            <Image source={{ uri }} style={styles.fill} />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: snapFilters.find(
                    (item) => item.name === filter,
                  )?.color,
                },
              ]}
            />
            <Text style={snapStyles.previewSticker}>{sticker}</Text>
            <View style={snapStyles.previewLabel}>
              <MiniPremiumIcon
                name={viewOnce ? "eye-off" : "time"}
                tone="dark"
                size={28}
                iconSize={13}
              />
              <Text style={snapStyles.previewLabelText}>
                {viewOnce ? "View once" : "Available for 24 hours"}
              </Text>
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={["#0F1113", "#0D0E0F"]}
            style={snapStyles.empty}
          >
            <PremiumIcon name="camera" tone="ruby" size={74} iconSize={34} />
            <Text style={snapStyles.emptyTitle}>Create a playful moment</Text>
            <Text style={styles.helper}>
              Take a photo or choose one from your library.
            </Text>
            <View style={snapStyles.emptyActions}>
              <Button
                label="Camera"
                icon="camera"
                onPress={() => void choose(true)}
              />
              <Button
                label="Photo library"
                variant="secondary"
                icon="images"
                onPress={() => void choose(false)}
              />
            </View>
          </LinearGradient>
        )}
        {uri && (
          <View style={snapStyles.controls}>
            <Text style={styles.sectionLabel}>FILTERS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {snapFilters.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => setFilter(item.name)}
                  style={[
                    snapStyles.filterChip,
                    filter === item.name && snapStyles.filterChipOn,
                  ]}
                >
                  <View
                    style={[
                      snapStyles.filterDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={snapStyles.filterText}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionLabel}>FUN STICKERS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14 }}
            >
              {faceEmojiOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSticker(item)}
                  style={[
                    snapStyles.emojiChoice,
                    sticker === item && snapStyles.emojiChoiceOn,
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setViewOnce((value) => !value)}
              style={snapStyles.viewOnce}
            >
              <MiniPremiumIcon
                name={viewOnce ? "checkmark-circle" : "ellipse-outline"}
                tone={viewOnce ? "gold" : "dark"}
                size={34}
                iconSize={16}
              />
              <View>
                <Text style={shared.label}>View once</Text>
                <Text style={styles.helper}>
                  A private snap that disappears after opening
                </Text>
              </View>
            </Pressable>
            <Button
              label="Replace photo"
              variant="secondary"
              icon="camera-reverse"
              onPress={() => void choose(true)}
            />
          </View>
        )}
        {!!error && (
          <View style={snapStyles.errorCard}>
            <MiniPremiumIcon
              name="alert-circle-outline"
              tone="ruby"
              size={28}
              iconSize={13}
            />
            <Text style={snapStyles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function FaceEmojiStudio({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (uri: string, emoji: string, filter: string) => void;
}) {
  const [uri, setUri] = useState("");
  const [emoji, setEmoji] = useState("😂");
  const [filter, setFilter] = useState(snapFilters[5]!.name);
  const [error, setError] = useState("");
  const autoLaunch = useRef(false);
  useEffect(() => {
    if (visible) {
      autoLaunch.current = false;
      setUri("");
      setEmoji("😂");
      setFilter(snapFilters[5]!.name);
      setError("");
    }
  }, [visible]);
  const capture = async (camera = true) => {
    setError("");
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          camera
            ? "Camera permission is needed for Funny Cam."
            : "Photo permission is needed.",
        );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          });
      if (!result.canceled && result.assets[0]) {
        setUri(result.assets[0].uri);
        return;
      }
      setError(
        "No face photo selected. Open camera or use gallery to create a custom emoji.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not open camera. Please try again or use gallery.",
      );
    }
  };
  useEffect(() => {
    if (!visible || uri || autoLaunch.current) return;
    autoLaunch.current = true;
    const timer = setTimeout(() => void capture(true), 180);
    return () => clearTimeout(timer);
  }, [visible, uri]);
  const activeColor =
    snapFilters.find((item) => item.name === filter)?.color ?? "transparent";
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={snapStyles.screen}>
        <View style={snapStyles.header}>
          <Pressable onPress={onClose} style={chatStyles.sheetClose}>
            <PremiumIcon name="close" tone="dark" size={38} iconSize={18} />
          </Pressable>
          <Text style={snapStyles.headerTitle}>Funny Cam</Text>
          <Pressable
            disabled={!uri}
            onPress={() => onSend(uri, emoji, filter)}
            style={premiumButtonStyles.smallGhost}
          >
            <Text style={[snapStyles.sendText, !uri && { opacity: 0.35 }]}>
              Send
            </Text>
          </Pressable>
        </View>
        {uri ? (
          <View style={[snapStyles.preview, { height: "50%" }]}>
            <Image source={{ uri }} style={styles.fill} />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: activeColor },
              ]}
            />
            <Text style={snapStyles.previewSticker}>{emoji}</Text>
            <View style={snapStyles.previewLabel}>
              <MiniPremiumIcon
                name="sparkles"
                tone="gold"
                size={28}
                iconSize={13}
              />
              <Text style={snapStyles.previewLabelText}>{filter}</Text>
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={["#101214", "#0D0E0F"]}
            style={snapStyles.empty}
          >
            <PremiumIcon name="camera" tone="ruby" size={76} iconSize={35} />
            <Text style={snapStyles.emptyTitle}>Opening camera…</Text>
            <Text style={[styles.helper, { textAlign: "center" }]}>
              Funny Cam starts with camera. If your browser blocks it, tap Open
              camera below.
            </Text>
            <View style={snapStyles.emptyActions}>
              <Button
                label="Open camera"
                icon="camera"
                onPress={() => void capture(true)}
              />
              <Button
                label="Use gallery"
                variant="secondary"
                icon="images"
                onPress={() => void capture(false)}
              />
            </View>
          </LinearGradient>
        )}
        <View style={snapStyles.controls}>
          <Text style={styles.sectionLabel}>
            {snapFilters.length} FUNNY CAMERA FILTERS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {snapFilters.map((item) => (
              <Pressable
                key={item.name}
                onPress={() => setFilter(item.name)}
                style={[
                  snapStyles.filterChip,
                  filter === item.name && snapStyles.filterChipOn,
                ]}
              >
                <View
                  style={[
                    snapStyles.filterDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={snapStyles.filterText}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.sectionLabel}>CUSTOM FACE EMOJI / PROPS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {faceEmojiOptions.map((item) => (
              <Pressable
                key={item}
                onPress={() => setEmoji(item)}
                style={[
                  snapStyles.emojiChoice,
                  emoji === item && snapStyles.emojiChoiceOn,
                ]}
              >
                <Text style={{ fontSize: 29 }}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={chatStyles.privacyBanner}>
            <PremiumIcon
              name="shield-checkmark"
              tone="gold"
              size={38}
              iconSize={18}
            />
            <Text style={chatStyles.privacyBannerText}>
              Use only your own face. Funny Cam photos stay in chat and are not
              used for matching or ads.
            </Text>
          </View>
          {uri && (
            <Button
              label="Retake with camera"
              variant="secondary"
              icon="camera-reverse"
              onPress={() => void capture(true)}
            />
          )}{" "}
          {!!error && <Text style={styles.formError}>{error}</Text>}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
