import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Image,
  Platform,
  Linking,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppCanvas } from "../../../components/AppCanvas";
import { brand, cardShadow, whiteCard } from "../../../components/brand";
import { PressScale, Reveal } from "../../../components/motion";
import { fonts, palette, radius, typeScale } from "../../../theme";
import { pushApi } from "../../../api/pushApi";
import { CloseFriendsSheet } from "../../stories/CloseFriendsSheet";
import { openKundliEditor } from "../../kundli/kundliStore";
import { RingtoneSheet } from "../../chat/ringtones/RingtoneSheet";
import { Sheet } from "../../posts/PostSheets";
import { SHARE_TEXT } from "../components/InviteCard";
import { referralApi } from "../../../api/referralApi";
import { profileApi } from "../../../api/profileApi";
import { socialApi, type MutedPerson } from "../../../api/socialApi";
import { storyApi } from "../../../api/storyApi";
import { matchApi } from "../../../api/matchApi";
import { openSavedTabNext } from "../components/PostsSection";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

// Set to "1" when the member turns notifications off, so the app-wide
// auto-subscribe in MilaanApp does not quietly turn them back on.
const PUSH_OFF_KEY = "milaan.push.off";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/*
 * Navy x Crimson settings: each group is a white card with a small label
 * above it; every row has its icon in a pink circle and sinks when pressed.
 * These live outside the screen so they are not re-created on every
 * render (that remounted the switches and replayed the animations).
 */
// The policy pages. They are listed here only, not on the login screen.
const LEGAL_LINKS: {
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "Privacy Policy", url: "https://apnajoda.com/privacy.html", icon: "shield-checkmark-outline" },
  { label: "Terms of Service", url: "https://apnajoda.com/terms.html", icon: "document-text-outline" },
  { label: "Refund & Cancellation", url: "https://apnajoda.com/refund.html", icon: "receipt-outline" },
  { label: "Shipping & Delivery", url: "https://apnajoda.com/shipping.html", icon: "cube-outline" },
  { label: "Pricing", url: "https://apnajoda.com/pricing.html", icon: "pricetag-outline" },
  { label: "Contact Us", url: "https://apnajoda.com/contact.html", icon: "mail-outline" },
];

function SettingsRow({
  icon,
  label,
  onPress,
  danger = false,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.985}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        minHeight: 56,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: palette.rule,
      }}
    >
      <IconDot icon={icon} />
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.bodyMedium,
          fontSize: 15,
          color: danger ? palette.crimson : palette.ink,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={danger ? palette.crimson : palette.slate} />
    </PressScale>
  );
}

function IconDot({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: brand.pillBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={18} color={palette.crimson} />
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: fonts.bodySemi,
        fontSize: 12,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: palette.slate,
        marginTop: 22,
        marginBottom: 8,
        marginLeft: 4,
      }}
    >
      {title}
    </Text>
  );
}

function SettingsCard({ children, delay = 0, danger }: { children: React.ReactNode; delay?: number; danger?: boolean }) {
  return (
    <Reveal delay={delay}>
      <View
        style={{
          ...whiteCard,
          overflow: "hidden",
          borderWidth: danger ? 1 : 0,
          borderColor: palette.crimsonTint,
        }}
      >
        {children}
      </View>
    </Reveal>
  );
}

// Where the Settings list was scrolled to, and when it was last left. Going into a
// setting and coming back lands where you were; a fresh visit starts at the top.
const settingsScroll = { y: 0, leftAt: 0 };

export function SettingsScreen({
  navigate,
  isPrivate,
  onPrivacyChange,
  onLogout,
  onDeactivate,
  onDeletePermanently,
  onOpenAdmin,
  accessToken,
}: {
  navigate: (screen: any) => void;
  isPrivate: boolean;
  onPrivacyChange: (next: boolean) => Promise<void>;
  onLogout: () => void;
  onDeactivate: () => void;
  onDeletePermanently: () => void;
  /** Only passed for admin accounts; everyone else never sees the entry. */
  onOpenAdmin?: () => void;
  accessToken?: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const restoredScroll = useRef(false);
  useEffect(() => () => {
    settingsScroll.leftAt = Date.now();
  }, []);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // ---- notifications (browser push) ----
  const pushSupported =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined";
  const [notifOn, setNotifOn] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [ringOpen, setRingOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [mutedOpen, setMutedOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [messageFrom, setMessageFrom] = useState<"everyone" | "matches">("everyone");
  const [mutedPeople, setMutedPeople] = useState<MutedPerson[]>([]);
  const [matchList, setMatchList] = useState<{ id: string; name: string; photo: string | null }[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [listBusy, setListBusy] = useState(false);
  const openMessages = () => {
    setMessagesOpen(true);
    if (accessToken)
      void profileApi
        .getMyProfile(accessToken)
        .then((data: any) => setMessageFrom(data?.messageFrom === "matches" ? "matches" : "everyone"))
        .catch(() => undefined);
  };
  const chooseMessageFrom = async (value: "everyone" | "matches") => {
    setMessageFrom(value);
    if (!accessToken) return;
    try {
      await profileApi.setMessageFrom(accessToken, value);
    } catch {
      // Shown as it was saved; the next open shows the real value.
    }
  };
  const openMuted = () => {
    setMutedOpen(true);
    if (accessToken) void socialApi.muted(accessToken).then(setMutedPeople).catch(() => undefined);
  };
  const unmute = async (userId: string) => {
    if (!accessToken) return;
    await socialApi.unmute(accessToken, userId).catch(() => undefined);
    setMutedPeople((current) => current.filter((person) => person.userId !== userId));
  };
  const openHide = () => {
    setHideOpen(true);
    if (!accessToken) return;
    setListBusy(true);
    Promise.all([matchApi.getMatches(accessToken), storyApi.hidden(accessToken)])
      .then(([matches, hidden]: any[]) => {
        setMatchList(((matches?.matches as any[]) || []).map((m) => ({ id: m.id, name: m.name, photo: m.photo || null })));
        setHiddenIds(hidden.map((person: { userId: string }) => person.userId));
      })
      .catch(() => undefined)
      .finally(() => setListBusy(false));
  };
  const toggleHide = async (userId: string) => {
    if (!accessToken) return;
    const isHidden = hiddenIds.includes(userId);
    setHiddenIds((current) => (isHidden ? current.filter((id) => id !== userId) : [...current, userId]));
    try {
      if (isHidden) await storyApi.unhideFrom(accessToken, userId);
      else await storyApi.hideFrom(accessToken, userId);
    } catch {
      setHiddenIds((current) => (isHidden ? [...current, userId] : current.filter((id) => id !== userId)));
    }
  };
  const inviteFriends = async () => {
    if (!accessToken) return;
    try {
      const { link } = await referralApi.getInviteLink(accessToken);
      await Share.share({ message: `${SHARE_TEXT} ${link}` });
    } catch {
      // The share sheet was closed or is unavailable here.
    }
  };
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifNote, setNotifNote] = useState("");

  useEffect(() => {
    if (!pushSupported) return;
    let off = false;
    try {
      off = window.localStorage.getItem(PUSH_OFF_KEY) === "1";
    } catch {
      // Storage blocked: fall back to the permission alone.
    }
    setNotifOn(!off && Notification.permission === "granted");
  }, [pushSupported]);

  const changeNotifications = async (next: boolean) => {
    setNotifBusy(true);
    setNotifNote("");
    try {
      if (next) {
        if (Notification.permission === "denied") {
          setNotifNote(
            "Notifications are blocked for this site. Allow them in your browser settings, then try again.",
          );
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotifNote("Permission was not given, so notifications stay off.");
          return;
        }
        try {
          window.localStorage.removeItem(PUSH_OFF_KEY);
        } catch {
          // Harmless.
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const publicKey = await pushApi.getPublicKey();
          if (!publicKey) {
            setNotifNote("Notifications are not set up on the server yet.");
            return;
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        if (accessToken) {
          await pushApi.subscribe(accessToken, subscription.toJSON());
        }
        setNotifOn(true);
      } else {
        try {
          window.localStorage.setItem(PUSH_OFF_KEY, "1");
        } catch {
          // Harmless.
        }
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          if (accessToken) {
            await pushApi
              .unsubscribe(accessToken, subscription.endpoint)
              .catch(() => undefined);
          }
          await subscription.unsubscribe();
        }
        setNotifOn(false);
      }
    } catch {
      setNotifNote("Could not change that. Please try again.");
    } finally {
      setNotifBusy(false);
    }
  };

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 60,
            paddingHorizontal: 12,
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            settingsScroll.y = event.nativeEvent.contentOffset.y;
          }}
          onContentSizeChange={() => {
            if (restoredScroll.current) return;
            restoredScroll.current = true;
            const returning = Date.now() - settingsScroll.leftAt < 60_000;
            if (returning && settingsScroll.y > 0) {
              scrollRef.current?.scrollTo({ y: settingsScroll.y, animated: false });
            }
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 12,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Back to profile"
                onPress={() => navigate("profile")}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: palette.paper,
                  justifyContent: "center",
                  alignItems: "center",
                  ...cardShadow,
                }}
              >
                <Ionicons name="arrow-back" size={20} color={palette.ink} />
              </PressScale>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.title,
                  color: palette.ink,
                }}
              >
                Settings
              </Text>
            </View>

            {/* App info: the navy hero of this screen */}
            <Reveal>
              <LinearGradient
                colors={brand.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={require("../../../../assets/apnajoda-mark.png")}
                    style={{ width: 48, height: 48 }}
                    resizeMode="contain"
                    accessibilityLabel="Apnajoda"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 22, color: brand.onHero }}>Apnajoda</Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: brand.onHeroSoft, marginTop: 2 }}>
                    Meaningful connections. Meaningful futures.
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: brand.onHeroSoft, marginTop: 4 }}>
                    Version 1.0.0
                  </Text>
                </View>
              </LinearGradient>
            </Reveal>

            {onOpenAdmin && (
              <>
                <SectionLabel title="Admin" />
                <SettingsCard delay={60}>
                  <SettingsRow
                    icon="shield-checkmark-outline"
                    label="Admin Panel"
                    onPress={onOpenAdmin}
                    isLast
                  />
                </SettingsCard>
              </>
            )}

            {/* Account */}
            <SectionLabel title="Account" />
            <SettingsCard delay={120}>
              <SettingsRow
                icon="person-outline"
                label="Edit Profile"
                onPress={() => navigate("profileSetup")}
              />
              {/* Intent and the future questions: on the Profile as badges, edited here (not on Home). */}
              <SettingsRow
                icon="compass-outline"
                label="Intent & Future Plans"
                onPress={() => navigate("alignment")}
              />
              {/* Who sees the stories you share to Close friends. */}
              {!!accessToken && (
                <SettingsRow icon="star-outline" label="Close Friends" onPress={() => setCloseOpen(true)} />
              )}
              <SettingsRow
                icon="shield-checkmark-outline"
                label="Trust Hub & Verification"
                onPress={() => navigate("verifyHub")}
              />
              {/* Optional, for people who follow kundli: here and in Match
                  Filters, never on the profile everyone sees. */}
              <SettingsRow icon="planet-outline" label="Kundli & Gun Milan" onPress={openKundliEditor} />
              <SettingsRow icon="musical-note-outline" label="Call ringtone" onPress={() => setRingOpen(true)} />
              <SettingsRow
                icon="options-outline"
                label="Match Filters & Preferences"
                onPress={() => navigate("discovery")}
                isLast
              />
            </SettingsCard>

            {/* Discover */}
            <SectionLabel title="Discover" />
            <SettingsCard delay={180}>
              <SettingsRow
                icon="heart-outline"
                label="Who Chose You"
                onPress={() => navigate("likes")}
              />
              <SettingsRow
                icon="search-outline"
                label="Find Someone"
                onPress={() => navigate("find")}
              />
              <SettingsRow
                icon="person-add-outline"
                label="Invite friends"
                onPress={() => void inviteFriends()}
                isLast
              />
            </SettingsCard>

            {/* Notifications (web push) */}
            {pushSupported && (
              <>
                <SectionLabel title="Notifications" />
                <SettingsCard delay={240}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                  >
                    <View style={{ marginRight: 14 }}>
                      <IconDot icon={notifOn ? "notifications-outline" : "notifications-off-outline"} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 15,
                          color: palette.ink,
                        }}
                      >
                        Push notifications
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 12,
                          color: notifNote ? palette.crimson : palette.slate,
                          marginTop: 3,
                        }}
                      >
                        {notifNote ||
                          (notifOn
                            ? "On. You will hear about messages, likes and calls."
                            : "Off. You will not get alerts on this device.")}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Push notifications"
                      value={notifOn}
                      disabled={notifBusy}
                      onValueChange={(next) => void changeNotifications(next)}
                      trackColor={{ false: palette.rule, true: palette.crimson }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </SettingsCard>
              </>
            )}

            {/* Privacy & Safety */}
            <SectionLabel title="Privacy & Safety" />
            <SettingsCard delay={300}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Account privacy, ${isPrivate ? "Private" : "Public"}`}
                disabled={savingPrivacy}
                onPress={() => setPrivacyOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.rule,
                }}
              >
                <View style={{ marginRight: 14 }}>
                  <IconDot icon={isPrivate ? "lock-closed-outline" : "lock-open-outline"} />
                </View>
                <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: palette.ink }}>Account privacy</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, marginRight: 6 }}>
                  {isPrivate ? "Private" : "Public"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={palette.slate} />
              </Pressable>
              <SettingsRow
                icon="lock-closed-outline"
                label="Two-step verification"
                onPress={() => navigate("two-step")}
              />
              <SettingsRow
                icon="time-outline"
                label="Your activity"
                onPress={() => navigate("yourActivity")}
              />
              <SettingsRow
                icon="phone-portrait-outline"
                label="Where you're logged in"
                onPress={() => navigate("devices")}
              />
              <SettingsRow icon="chatbubble-ellipses-outline" label="Messages" onPress={openMessages} />
              <SettingsRow icon="volume-mute-outline" label="Muted accounts" onPress={openMuted} />
              <SettingsRow icon="eye-off-outline" label="Hide story from" onPress={openHide} />
              <SettingsRow
                icon="bookmark-outline"
                label="Saved"
                onPress={() => {
                  openSavedTabNext.on = true;
                  navigate("profile");
                }}
              />
              <SettingsRow icon="ban-outline" label="Blocked accounts" onPress={() => navigate("safety")} />
              <SettingsRow icon="download-outline" label="Download your data" onPress={() => navigate("safety")} />
              <SettingsRow
                icon="shield-outline"
                label="Safety & Privacy"
                onPress={() => navigate("safety")}
                isLast
              />
            </SettingsCard>

            {/* Support - single link */}
            <SectionLabel title="Support" />
            <SettingsCard delay={360}>
              <SettingsRow
                icon="help-circle-outline"
                label="Help & Support"
                onPress={() => navigate("support")}
                isLast
              />
            </SettingsCard>

            {/* Legal - the policy pages, listed here only */}
            <SectionLabel title="Legal" />
            <SettingsCard delay={390}>
              {LEGAL_LINKS.map((link, index) => (
                <SettingsRow
                  key={link.url}
                  icon={link.icon}
                  label={link.label}
                  onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
                  isLast={index === LEGAL_LINKS.length - 1}
                />
              ))}
            </SettingsCard>

            {/* Danger Zone */}
            <SectionLabel title="Danger zone" />
            <SettingsCard delay={420} danger>
              <SettingsRow
                icon="log-out-outline"
                label="Log out"
                onPress={onLogout}
                danger
              />
              <SettingsRow
                icon="pause-circle-outline"
                label="Deactivate account"
                onPress={onDeactivate}
                danger
              />
              <SettingsRow
                icon="trash-outline"
                label="Delete account permanently"
                onPress={onDeletePermanently}
                danger
                isLast
              />
            </SettingsCard>
          </View>
        </ScrollView>
        <RingtoneSheet visible={ringOpen} onClose={() => setRingOpen(false)} />
        <Sheet visible={messagesOpen} title="Who can message you" onClose={() => setMessagesOpen(false)}>
          <View style={{ padding: 16, gap: 10 }}>
            {(
              [
                ["everyone", "Everyone", "Anyone can message you. Private accounts still need a match first."],
                ["matches", "Only matches", "Only people you have matched with can message you."],
              ] as const
            ).map(([value, title, body]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: messageFrom === value }}
                  onPress={() => void chooseMessageFrom(value)}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: messageFrom === value ? palette.crimson : palette.rule }}
                >
                  <Ionicons name={messageFrom === value ? "radio-button-on" : "radio-button-off"} size={22} color={messageFrom === value ? palette.crimson : palette.slate} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>{title}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, lineHeight: 19 }}>{body}</Text>
                  </View>
                </Pressable>
            ))}
          </View>
        </Sheet>
        <Sheet visible={mutedOpen} title="Muted accounts" onClose={() => setMutedOpen(false)}>
          <View style={{ padding: 16, gap: 10 }}>
            {mutedPeople.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
                Nobody is muted. Muted accounts' posts and stories leave your feed, and they are not told.
              </Text>
            ) : (
              mutedPeople.map((person) => (
                <View key={person.userId} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>@{person.username}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Unmute ${person.username}`} onPress={() => void unmute(person.userId)} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.navy }}>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.navy }}>Unmute</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </Sheet>
        <Sheet visible={hideOpen} title="Hide story from" onClose={() => setHideOpen(false)}>
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, lineHeight: 19 }}>
              People you tap here stop seeing your stories. Nobody is told.
            </Text>
            {listBusy && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Loading...</Text>}
            {!listBusy && matchList.length === 0 && (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>You have no matches yet.</Text>
            )}
            {matchList.map((person) => {
              const hidden = hiddenIds.includes(person.id);
              return (
                <Pressable key={person.id} accessibilityRole="checkbox" accessibilityState={{ checked: hidden }} onPress={() => void toggleHide(person.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
                  <Ionicons name={hidden ? "checkbox" : "square-outline"} size={22} color={hidden ? palette.crimson : palette.slate} />
                  {person.photo ? (
                    <Image source={{ uri: person.photo }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.paperSand }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: palette.cream }}>{(person.name || "?").charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{person.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Sheet>
        <Sheet visible={privacyOpen} title="Account privacy" onClose={() => setPrivacyOpen(false)}>
          <View style={{ padding: 16, gap: 10 }}>
            {[
              {
                key: false,
                title: "Public",
                body: "Anyone can see your posts, find you by username, and message you.",
              },
              {
                key: true,
                title: "Private",
                body: "Only people you match with see your posts. Nobody finds you by username. Messages open after a match.",
              },
            ].map((option) => {
              const selected = isPrivate === option.key;
              return (
                <Pressable
                  key={option.title}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={option.title}
                  disabled={savingPrivacy}
                  onPress={async () => {
                    setPrivacyOpen(false);
                    if (selected) return;
                    setSavingPrivacy(true);
                    try {
                      await onPrivacyChange(option.key);
                    } finally {
                      setSavingPrivacy(false);
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: selected ? palette.crimson : palette.rule,
                  }}
                >
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={selected ? palette.crimson : palette.slate}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>{option.title}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, lineHeight: 19 }}>{option.body}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Sheet>
        {!!accessToken && (
          <CloseFriendsSheet visible={closeOpen} accessToken={accessToken} onClose={() => setCloseOpen(false)} />
        )}
      </SafeAreaView>
    </AppCanvas>
  );
}

