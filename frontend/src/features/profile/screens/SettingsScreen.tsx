import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppCanvas } from "../../../components/AppCanvas";
import { brand, cardShadow, whiteCard } from "../../../components/brand";
import { PressScale, Reveal } from "../../../components/motion";
import { fonts, palette, typeScale } from "../../../theme";
import { pushApi } from "../../../api/pushApi";

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
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 60,
            paddingHorizontal: 12,
          }}
          showsVerticalScrollIndicator={false}
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
              <SettingsRow
                icon="shield-checkmark-outline"
                label="Trust Hub & Verification"
                onPress={() => navigate("verifyHub")}
              />
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
              <View
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
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 15,
                      color: palette.ink,
                    }}
                  >
                    Private account
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 12,
                      color: palette.slate,
                      marginTop: 3,
                    }}
                  >
                    {isPrivate
                      ? "Only your matches see your posts, and nobody can find you by username. You still appear to people browsing."
                      : "Anyone can see your posts and find you by your username, like Instagram."}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Private account"
                  value={isPrivate}
                  disabled={savingPrivacy}
                  onValueChange={async (next) => {
                    setSavingPrivacy(true);
                    try {
                      await onPrivacyChange(next);
                    } finally {
                      setSavingPrivacy(false);
                    }
                  }}
                  trackColor={{ false: palette.rule, true: palette.crimson }}
                  thumbColor="#FFFFFF"
                />
              </View>
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
      </SafeAreaView>
    </AppCanvas>
  );
}

