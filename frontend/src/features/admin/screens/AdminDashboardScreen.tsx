import { createElement, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../api/adminApi";
import { LinearGradient } from "expo-linear-gradient";
import { FESTIVAL_THEMES, type ActiveFestival, type FestivalTheme } from "../../festival/themes";
import { setFestival } from "../../festival/festivalStore";
import { PromoCard } from "../../promo/PromoPopup";
import { PROMO_STYLES, type Promo } from "../../promo/styles";
import { GrowthTab } from "./GrowthTab";
import { MusicTab } from "./MusicTab";
import { fonts, radius } from "../../../theme";

// 👇 Naya tab "security" add kiya
type Tab =
  | "overview"
  | "growth"
  | "users"
  | "verifications"
  | "reports"
  | "appeals"
  | "payments"
  | "festivals"
  | "coupons"
  | "promo"
  | "questions"
  | "music"
  | "security";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: "grid-outline" },
  { key: "growth", label: "Growth", icon: "trending-up-outline" },
  { key: "users", label: "Users", icon: "people-outline" },
  {
    key: "verifications",
    label: "Verifications",
    icon: "shield-checkmark-outline",
  },
  { key: "reports", label: "Reports", icon: "flag-outline" },
  { key: "appeals", label: "Appeals", icon: "chatbox-ellipses-outline" },
  { key: "payments", label: "UPI Payments", icon: "cash-outline" },
  { key: "festivals", label: "Festival Themes", icon: "sparkles-outline" },
  { key: "coupons", label: "Coupons", icon: "pricetags-outline" },
  { key: "promo", label: "Offer Popup", icon: "megaphone-outline" },
  { key: "questions", label: "Daily Questions", icon: "help-circle-outline" },
  { key: "music", label: "Music", icon: "musical-notes-outline" },
  { key: "security", label: "Security", icon: "lock-closed-outline" }, // 👈 New
];

/** The Users tab's filters: who has what. */
type UserFilter = "all" | "verified" | "bluetick" | "pro" | "paid" | "pending";
const USER_FILTERS: { key: UserFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verified", label: "Selfie verified" },
  { key: "bluetick", label: "Blue tick" },
  { key: "pro", label: "Pro" },
  { key: "paid", label: "Paid (Plus or Pro)" },
  { key: "pending", label: "Verification pending" },
];

type AdminPlace = { tab: Tab; filter: UserFilter };

const errText = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

const COLORS = {
  bg: "#F7F8FA",
  sidebar: "#FFFFFF",
  card: "#FFFFFF",
  textMain: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  primary: "#1E3A8A",
  primaryLight: "#EFF6FF",
  danger: "#EF4444",
  success: "#10B981",
};

const webHoverStyle: any =
  Platform.OS === "web" ? { cursor: "pointer", transition: "all 0.2s" } : {};

export function AdminDashboardScreen({
  accessToken,
  onLogout,
  exitLabel = "Logout",
}: {
  accessToken: string;
  onLogout: () => void;
  exitLabel?: string;
}) {
  const [tab, setTabState] = useState<Tab>("overview");
  const [usersFilter, setUsersFilter] = useState<UserFilter>("all");
  const placeRef = useRef<AdminPlace>({ tab: "overview", filter: "all" });
  // Native back: the tabs you came through.
  const backStack = useRef<AdminPlace[]>([]);
  const show = (place: AdminPlace) => {
    placeRef.current = place;
    setTabState(place.tab);
    setUsersFilter(place.filter);
  };
  /**
   * Opening a tab is a step back can undo: the browser's back (and
   * Android's) goes to the tab before, and from Overview it stays in the
   * admin instead of leaving it.
   */
  const setTab = (next: Tab, filter: UserFilter = "all") => {
    const place = { tab: next, filter };
    if (place.tab === placeRef.current.tab && place.filter === placeRef.current.filter) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.history.pushState({ milaanScreen: "adminDashboard", adminTab: next, adminFilter: filter }, "");
    } else backStack.current = [...backStack.current, placeRef.current].slice(-30);
    show(place);
  };
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.history.replaceState({ milaanScreen: "adminDashboard", adminTab: "overview", adminFilter: "all" }, "");
      const onPop = (event: PopStateEvent) => {
        // The app's own back handling leaves the admin alone (see MilaanApp).
        const state = event.state as { adminTab?: Tab; adminFilter?: UserFilter } | null;
        if (state?.adminTab) {
          show({ tab: state.adminTab, filter: state.adminFilter ?? "all" });
          return;
        }
        // Past the first admin page: stay in the admin, on Overview.
        window.history.pushState({ milaanScreen: "adminDashboard", adminTab: "overview", adminFilter: "all" }, "");
        show({ tab: "overview", filter: "all" });
      };
      window.addEventListener("popstate", onPop, true);
      return () => window.removeEventListener("popstate", onPop, true);
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const previous = backStack.current.pop();
      if (previous) show(previous);
      else if (placeRef.current.tab !== "overview") show({ tab: "overview", filter: "all" });
      // On Overview, back stays here; Logout / Exit leaves the admin.
      return true;
    });
    return () => sub.remove();
    // show only sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A 260px sidebar leaves almost nothing on a phone, so narrow screens get
  // a top bar with scrollable tabs instead.
  const { width } = useWindowDimensions();
  const narrow = width < 768;
  const pad = narrow ? 16 : 32;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        flexDirection: narrow ? "column" : "row",
      }}
    >
      {narrow && (
        <View
          style={{
            backgroundColor: COLORS.sidebar,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            paddingTop: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
            }}
          >
            <Image
              source={require("../../../../assets/apnajoda-logo.png")}
              style={{ width: 120, height: 40 }}
              resizeMode="contain"
            />
            <Pressable
              onPress={onLogout}
              accessibilityRole="button"
              accessibilityLabel={exitLabel}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={COLORS.danger}
              />
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 14,
                  color: COLORS.danger,
                }}
              >
                {exitLabel}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: active ? COLORS.primaryLight : COLORS.bg,
                  }}
                >
                  <Ionicons
                    name={t.icon}
                    size={16}
                    color={active ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={{
                      fontFamily: active ? fonts.bodySemi : fonts.body,
                      fontSize: 13,
                      color: active ? COLORS.primary : COLORS.textMuted,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ================= LEFT SIDEBAR ================= */}
      {!narrow && (
        <View
          style={{
            width: 260,
            backgroundColor: COLORS.sidebar,
            borderRightWidth: 1,
            borderRightColor: COLORS.border,
            paddingVertical: 32,
            paddingHorizontal: 20,
            display: "flex",
          }}
        >
          <View
            style={{
              marginBottom: 40,
              paddingHorizontal: 8,
              alignItems: "flex-start",
            }}
          >
            <Image
              source={require("../../../../assets/apnajoda-logo.png")}
              style={{ width: 170, height: 55 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ gap: 8 }}>
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: radius.md || 8,
                      backgroundColor: active
                        ? COLORS.primaryLight
                        : "transparent",
                    },
                    webHoverStyle,
                  ]}
                >
                  <Ionicons
                    name={t.icon}
                    size={20}
                    color={active ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={{
                      fontFamily: active ? fonts.bodySemi : fonts.body,
                      fontSize: 15,
                      color: active ? COLORS.primary : COLORS.textMuted,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: "auto", gap: 16 }}>
            <Pressable
              onPress={onLogout}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                },
                webHoverStyle,
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={COLORS.danger}
              />
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 15,
                  color: COLORS.danger,
                }}
              >
                {exitLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 72,
            backgroundColor: COLORS.card,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: pad,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 18,
              color: COLORS.textMain,
              textTransform: "capitalize",
            }}
          >
            {tab}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {!narrow && (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: COLORS.textMuted,
                }}
              >
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            )}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.primaryLight,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                style={{ fontFamily: fonts.bodySemi, color: COLORS.primary }}
              >
                A
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: pad, gap: 24, flexGrow: 1 }}
        >
          {tab === "overview" && (
            <OverviewTab accessToken={accessToken} onNavigate={setTab} />
          )}
          {tab === "growth" && <GrowthTab accessToken={accessToken} />}
          {tab === "users" && (
            <UsersTab accessToken={accessToken} filter={usersFilter} onFilter={(f) => setTab("users", f)} />
          )}
          {tab === "verifications" && (
            <VerificationsTab accessToken={accessToken} />
          )}
          {tab === "reports" && <ReportsTab accessToken={accessToken} />}
          {tab === "appeals" && <AppealsTab accessToken={accessToken} />}
          {tab === "payments" && <PaymentsTab accessToken={accessToken} />}
          {tab === "festivals" && <FestivalsTab accessToken={accessToken} />}
          {tab === "coupons" && <CouponsTab accessToken={accessToken} />}
          {tab === "promo" && <PromoTab accessToken={accessToken} />}
          {tab === "questions" && <QuestionsTab accessToken={accessToken} />}
          {tab === "music" && <MusicTab accessToken={accessToken} />}
          {tab === "security" && <SecurityTab accessToken={accessToken} />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- shared bits ---------------- */

function Loading() {
  return (
    <ActivityIndicator
      size="large"
      color={COLORS.primary}
      style={{ marginTop: 50 }}
    />
  );
}

function Message({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  return (
    <View
      style={{
        padding: 40,
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 20,
      }}
    >
      <Ionicons
        name={
          tone === "error"
            ? "alert-circle-outline"
            : "information-circle-outline"
        }
        size={40}
        color={tone === "error" ? COLORS.danger : COLORS.textMuted}
      />
      <Text
        style={{
          color: tone === "error" ? COLORS.danger : COLORS.textMuted,
          fontFamily: fonts.body,
          marginTop: 12,
          fontSize: 15,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const shadowStyle: any =
    Platform.OS === "web"
      ? {
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        }
      : {};
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.card,
          borderRadius: 12,
          padding: 24,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: 12,
        },
        shadowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  tone = "navy",
  busy,
}: {
  label: string;
  onPress: () => void;
  tone?: "navy" | "danger" | "plain";
  busy?: boolean;
}) {
  const bg =
    tone === "navy"
      ? COLORS.primary
      : tone === "danger"
        ? COLORS.danger
        : "transparent";
  const color = tone === "plain" ? COLORS.textMain : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[
        {
          backgroundColor: bg,
          borderWidth: tone === "plain" ? 1 : 0,
          borderColor: COLORS.border,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 8,
          opacity: busy ? 0.6 : 1,
          alignItems: "center",
          justifyContent: "center",
        },
        webHoverStyle,
      ]}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const pick = (row: any, ...keys: string[]) => {
  for (const k of keys)
    if (row?.[k] !== undefined && row?.[k] !== null) return row[k];
  return undefined;
};

const displayName = (u: any) =>
  String(
    pick(u, "first_name", "full_name", "name", "firstName") ??
      pick(u, "username") ??
      "Member",
  );

function joinedLabel(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ---------------- Overview ---------------- */

function OverviewTab({
  accessToken,
  onNavigate,
}: {
  accessToken: string;
  onNavigate: (t: Tab, filter?: UserFilter) => void;
}) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const statsRes: any = await adminApi.stats(accessToken);
        if (active) setStats(statsRes.stats);

        const usersRes: any = await adminApi.users(accessToken, "");
        let list: any[] = [];
        if (usersRes && Array.isArray(usersRes.users)) list = usersRes.users;
        else if (usersRes && Array.isArray(usersRes.items))
          list = usersRes.items;
        else if (Array.isArray(usersRes)) list = usersRes;

        if (active) setRecentUsers(list.slice(0, 5));
      } catch (e) {
        if (active) setError(errText(e, "Failed to load overview data"));
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchData();
    return () => {
      active = false;
    };
  }, [accessToken]);

  if (loading) return <Loading />;
  if (error) return <Message tone="error" text={error} />;

  const totalUsers = Number(stats?.users ?? 0);
  const newThisWeek = Number(stats?.newThisWeek ?? 0);
  const pendingVerifications = Number(stats?.pendingVerifications ?? 0);
  const verifiedUsers = Number(stats?.verifiedUsers ?? 0);
  const blueTickUsers = Number(stats?.blueTickUsers ?? 0);
  const openReports = Number(stats?.openReports ?? 0);
  const openAppeals = Number(stats?.openAppeals ?? 0);
  const pendingPayments = Number(stats?.pendingPayments ?? 0);
  const revenue = Number(stats?.revenuePaise ?? 0) / 100;

  return (
    <View style={{ gap: 24 }}>
      <View
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 16,
          padding: 32,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <View style={{ zIndex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: "#FFF",
              marginBottom: 8,
            }}
          >
            Welcome back, Admin!
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Here is what's happening with Apnajoda today.
          </Text>
        </View>
        <Ionicons
          name="analytics"
          size={100}
          color="rgba(255,255,255,0.1)"
          style={{ position: "absolute", right: 10, bottom: -20 }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
        <StatCard
          title="Total Users"
          value={String(totalUsers)}
          icon="people"
          trend={newThisWeek > 0 ? `+${newThisWeek} this week` : undefined}
          trendUp
          onPress={() => onNavigate("users")}
        />
        <StatCard
          title="Pending Verifications"
          value={String(pendingVerifications)}
          icon="shield-checkmark"
          trend={pendingVerifications > 0 ? "Needs review" : undefined}
          onPress={() => onNavigate("verifications")}
        />
        <StatCard
          title="Verified Members"
          value={String(verifiedUsers)}
          icon="checkmark-done-circle"
          onPress={() => onNavigate("users", "verified")}
        />
        <StatCard
          title="Blue Tick Members"
          value={String(blueTickUsers)}
          icon="ribbon"
          onPress={() => onNavigate("users", "bluetick")}
        />
        <StatCard
          title="Open Reports"
          value={String(openReports)}
          icon="flag"
          trend={openReports > 0 ? "Needs review" : undefined}
          onPress={() => onNavigate("reports")}
        />
        <StatCard
          title="Appeals"
          value={String(openAppeals)}
          icon="chatbox-ellipses"
          trend={openAppeals > 0 ? "Needs review" : undefined}
          onPress={() => onNavigate("appeals")}
        />
        <StatCard
          title="UPI to verify"
          value={String(pendingPayments)}
          icon="qr-code"
          trend={pendingPayments > 0 ? "Check bank app" : undefined}
          onPress={() => onNavigate("payments")}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${revenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
          icon="cash"
        />
      </View>

      <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
        <Card style={{ flex: 2, minWidth: 300 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 16,
                color: COLORS.textMain,
              }}
            >
              Recently Joined
            </Text>
            <Pressable onPress={() => onNavigate("users")}>
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: COLORS.primary,
                }}
              >
                View All
              </Text>
            </Pressable>
          </View>
          {recentUsers.length === 0 ? (
            <Text style={{ fontFamily: fonts.body, color: COLORS.textMuted }}>
              No recent users found.
            </Text>
          ) : (
            recentUsers.map((u, i) => {
              const nameStr = displayName(u);
              const contactStr = [
                u?.username ? `@${u.username}` : "",
                u?.city ?? "",
                joinedLabel(u?.created_at),
              ]
                .filter(Boolean)
                .join(" · ");
              const initial = nameStr.charAt(0).toUpperCase();

              return (
                <View
                  key={String(u?.id ?? i)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: i !== recentUsers.length - 1 ? 1 : 0,
                    borderBottomColor: COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: COLORS.primaryLight,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemi,
                        color: COLORS.primary,
                      }}
                    >
                      {initial}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: fonts.bodySemi,
                        fontSize: 14,
                        color: COLORS.textMain,
                      }}
                    >
                      {nameStr}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: COLORS.textMuted,
                      }}
                    >
                      {contactStr}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Card style={{ flex: 1, minWidth: 250 }}>
          <Text
            style={{
              fontFamily: fonts.bodySemi,
              fontSize: 16,
              color: COLORS.textMain,
              marginBottom: 16,
            }}
          >
            Quick Actions
          </Text>
          <View style={{ gap: 12 }}>
            <SmallButton
              label={`Review Verifications${pendingVerifications ? ` (${pendingVerifications})` : ""}`}
              onPress={() => onNavigate("verifications")}
            />
            <SmallButton
              label={`Review Reports${openReports ? ` (${openReports})` : ""}`}
              tone="plain"
              onPress={() => onNavigate("reports")}
            />
            <SmallButton
              label="Change Password"
              tone="plain"
              onPress={() => onNavigate("security")}
            />
          </View>
        </Card>
      </View>
    </View>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  onPress,
}: {
  title: string;
  value: string;
  icon: any;
  trend?: string;
  trendUp?: boolean;
  onPress?: () => void;
}) {
  const shadowStyle: any =
    Platform.OS === "web"
      ? { boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }
      : {};
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          flex: 1,
          minWidth: 220,
          backgroundColor: COLORS.card,
          borderRadius: 12,
          padding: 24,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        shadowStyle,
        onPress ? webHoverStyle : null,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: COLORS.primaryLight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name={icon} size={24} color={COLORS.primary} />
        </View>
        {trend && (
          <View
            style={{
              backgroundColor: trendUp ? "#ECFDF5" : "#FEF2F2",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 11,
                color: trendUp ? COLORS.success : COLORS.danger,
              }}
            >
              {trend}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: COLORS.textMuted,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 32,
          color: COLORS.textMain,
        }}
      >
        {value}
      </Text>
    </Pressable>
  );
}

/* ---------------- Users ---------------- */

function UsersTab({
  accessToken,
  filter,
  onFilter,
}: {
  accessToken: string;
  /** Who to list: everyone, or only verified / blue tick / Pro / paid / pending. */
  filter: UserFilter;
  onFilter: (filter: UserFilter) => void;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError("");
      try {
        const res: any = await adminApi.users(accessToken, q, filter);
        let list = [];
        if (Array.isArray(res?.users)) list = res.users;
        else if (Array.isArray(res?.items)) list = res.items;
        else if (Array.isArray(res)) list = res;
        setUsers(list);
      } catch (e) {
        setError(errText(e, "Failed to load users"));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, filter],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query, load]);

  const toggleBan = async (user: any, banned: boolean) => {
    const userId = String(user?.id || "");
    if (!userId) return;
    setBusyId(userId);
    try {
      if (banned) await adminApi.unbanUser(accessToken, userId);
      else await adminApi.banUser(accessToken, userId);
      await load(query.trim());
    } catch (e) {
      setError(errText(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  const inputStyle: any = {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: COLORS.textMain,
    maxWidth: 400,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  };

  return (
    <View style={{ gap: 20 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, phone or username..."
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        style={inputStyle}
      />

      {/* Who has what: tap a filter to list only those members. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {USER_FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Show ${f.label}`}
              onPress={() => onFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: on ? COLORS.primary : COLORS.border,
                backgroundColor: on ? COLORS.primary : COLORS.card,
                ...webHoverStyle,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? "#FFFFFF" : COLORS.textMain }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!loading && !error && (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>
          {users.length === 1 ? "1 member" : `${users.length} members`}
          {users.length >= 200 ? " (newest 200 - search to find someone)" : ""}
        </Text>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <Message tone="error" text={error} />
      ) : users.length === 0 ? (
        <Message text={filter === "all" ? "No users match that search." : "Nobody here yet."} />
      ) : (
        <View style={{ gap: 12 }}>
          {users.map((u) => {
            const name = displayName(u);
            const contact = [
              u?.username ? `@${u.username}` : "",
              u?.phone ?? "",
              u?.age ? `${u.age} yrs` : "",
              u?.city ?? "",
              u?.created_at ? `Joined ${joinedLabel(u.created_at)}` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            const role = String(pick(u, "role") ?? "user");
            const verified = u?.verified === 1 || u?.verified === true;
            const blueTick =
              verified && (u?.blue_tick === 1 || u?.blue_tick === true);
            // The server marks a banned account "suspended".
            const banned = ["suspended", "banned"].includes(
              String(pick(u, "status") ?? ""),
            );
            const userId = String(u?.id || Math.random());

            return (
              <Card
                key={userId}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemi,
                        fontSize: 16,
                        color: COLORS.textMain,
                      }}
                    >
                      {name}
                    </Text>
                    {role === "admin" && <Badge text="Admin" />}
                    {verified && <Badge text="✓ Selfie verified" />}
                    {blueTick && <Badge text="Blue tick" />}
                    {!!u?.plan && (
                      <Badge text={`${u.plan} · ${u.plan_until ? `till ${joinedLabel(u.plan_until)}` : "no end date"}`} />
                    )}
                    {u?.plan === "Pro" && !verified && <Badge text="Pro, not verified (no blue tick)" danger />}
                    {!verified && u?.verification_status === "pending" && <Badge text="Verification pending" />}
                    {banned && <Badge text="Suspended" danger />}
                  </View>
                  {!!contact && (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: COLORS.textMuted,
                        marginTop: 4,
                      }}
                    >
                      {contact}
                    </Text>
                  )}
                </View>
                {role !== "admin" && (
                  <SmallButton
                    label={banned ? "Restore" : "Suspend"}
                    tone={banned ? "plain" : "danger"}
                    busy={busyId === userId}
                    onPress={() => void toggleBan(u, banned)}
                  />
                )}
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Badge({ text, danger }: { text: string; danger?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: danger ? "#FEE2E2" : "#E0E7FF",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 11,
          color: danger ? COLORS.danger : COLORS.primary,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/* ---------------- Verifications ---------------- */

function VerificationsTab({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.verifications(accessToken);
      let list = [];
      if (Array.isArray(res?.queue)) list = res.queue;
      else if (Array.isArray(res?.verifications)) list = res.verifications;
      else if (Array.isArray(res?.items)) list = res.items;
      else if (Array.isArray(res)) list = res;
      setItems(list);
    } catch (e) {
      setError(errText(e, "Failed to load verifications"));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, kind: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (kind === "approve")
        await adminApi.approveVerification(accessToken, id);
      else await adminApi.rejectVerification(accessToken, id);
      await load();
    } catch (e) {
      setError(errText(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <Message tone="error" text={error} />;
  if (items.length === 0)
    return <Message text="No selfies waiting for review." />;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
      {items.map((v) => {
        const id = String(pick(v, "id", "user_id", "userId") ?? Math.random());
        const rawSelfie = pick(
          v,
          "selfie_uri",
          "selfie_url",
          "selfieUrl",
          "selfie",
          "photo",
        );
        const selfie =
          typeof rawSelfie === "string" && /^https?:\/\//i.test(rawSelfie)
            ? rawSelfie
            : undefined;
        const name = String(
          pick(v, "name", "first_name", "firstName", "username") ?? "Member",
        );
        const pose =
          v?.pose && typeof v.pose === "object"
            ? (v.pose as { emoji?: string; text?: string })
            : null;
        const photos: string[] = (Array.isArray(v?.photos) ? v.photos : [])
          .filter(
            (url: unknown): url is string =>
              typeof url === "string" && /^https?:\/\//i.test(url),
          )
          .slice(0, 3);
        return (
          <Card key={id} style={{ width: "100%", maxWidth: 560, gap: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 16,
                  color: COLORS.textMain,
                }}
              >
                {name}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#EAF5FF",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Text style={{ fontSize: 28 }}>{pose?.emoji ?? "❔"}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodySemi,
                    fontSize: 11,
                    color: "#0B6BB3",
                    textTransform: "uppercase",
                  }}
                >
                  Asked pose
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bodySemi,
                    fontSize: 14,
                    color: COLORS.textMain,
                  }}
                >
                  {pose?.text ?? "No pose on file (old submission) - reject and ask them to retake"}
                </Text>
              </View>
            </View>
            {!selfie && (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: COLORS.danger,
                }}
              >
                No uploaded selfie on file. Ask them to submit again.
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodySemi,
                    fontSize: 12,
                    color: COLORS.textMuted,
                  }}
                >
                  Selfie
                </Text>
                {!!selfie && (
                  <Image
                    source={{ uri: String(selfie) }}
                    style={{
                      width: "100%",
                      aspectRatio: 1,
                      borderRadius: 8,
                      backgroundColor: COLORS.bg,
                    }}
                    resizeMode="cover"
                  />
                )}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodySemi,
                    fontSize: 12,
                    color: COLORS.textMuted,
                  }}
                >
                  Profile photos
                </Text>
                {photos.length === 0 ? (
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: COLORS.danger,
                    }}
                  >
                    No profile photo to compare with.
                  </Text>
                ) : (
                  <>
                    <Image
                      source={{ uri: photos[0] }}
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: 8,
                        backgroundColor: COLORS.bg,
                      }}
                      resizeMode="cover"
                    />
                    {photos.length > 1 && (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {photos.slice(1).map((url) => (
                          <Image
                            key={url}
                            source={{ uri: url }}
                            style={{
                              flex: 1,
                              aspectRatio: 1,
                              borderRadius: 6,
                              backgroundColor: COLORS.bg,
                            }}
                            resizeMode="cover"
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: COLORS.textMuted,
              }}
            >
              Approve only if the selfie shows the asked pose AND it is the same
              face as the profile photos.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: "auto" }}>
              <View style={{ flex: 1 }}>
                <SmallButton
                  label="Approve"
                  busy={busyId === id}
                  onPress={() => void act(id, "approve")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SmallButton
                  label="Reject"
                  tone="danger"
                  busy={busyId === id}
                  onPress={() => void act(id, "reject")}
                />
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ---------------- Daily Questions ---------------- */

type AdminQuestion = {
  id: number;
  question: string;
  options: string[];
  active: boolean;
  answers: number;
  today: boolean;
};

function QuestionsTab({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.dailyQuestions(accessToken);
      setItems(Array.isArray(res?.questions) ? res.questions : []);
    } catch (e) {
      setError(errText(e, "Failed to load questions"));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (item: AdminQuestion) => {
    setBusyId(item.id);
    setError("");
    try {
      await adminApi.setDailyQuestionActive(accessToken, item.id, !item.active);
      await load();
    } catch (e) {
      setError(errText(e, "Could not update the question"));
    } finally {
      setBusyId(null);
    }
  };

  const add = async () => {
    setSaving(true);
    setError("");
    try {
      await adminApi.createDailyQuestion(
        accessToken,
        question.trim(),
        options.map((o) => o.trim()).filter(Boolean),
      );
      setQuestion("");
      setOptions(["", "", "", ""]);
      await load();
    } catch (e) {
      setError(errText(e, "Could not add the question"));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: any = {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.card,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  };

  return (
    <View style={{ gap: 20 }}>
      <Card style={{ gap: 12, maxWidth: 640 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: COLORS.textMain }}>
          Add a question
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>
          One question runs per day for everyone, in turn. Members get 1 Spark
          for answering. Give 2 to 4 answers.
        </Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. Your ideal weekend?"
          placeholderTextColor={COLORS.textMuted}
          maxLength={200}
          style={inputStyle}
        />
        {options.map((value, index) => (
          <TextInput
            key={index}
            value={value}
            onChangeText={(text) =>
              setOptions((current) =>
                current.map((o, i) => (i === index ? text : o)),
              )
            }
            placeholder={`Answer ${index + 1}${index >= 2 ? " (optional)" : ""}`}
            placeholderTextColor={COLORS.textMuted}
            maxLength={80}
            style={inputStyle}
          />
        ))}
        <View style={{ alignSelf: "flex-start" }}>
          <SmallButton label="Add question" busy={saving} onPress={() => void add()} />
        </View>
      </Card>

      {!!error && <Message tone="error" text={error} />}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Message text="No questions yet. Add the first one above." />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={{ gap: 10, maxWidth: 640 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {item.today && <Badge text="Today" />}
              {!item.active && <Badge text="Off" danger />}
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: COLORS.textMuted }}>
                {item.answers} answer{item.answers === 1 ? "" : "s"}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: COLORS.textMain }}>
              {item.question}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>
              {item.options.join("  ·  ")}
            </Text>
            <View style={{ alignSelf: "flex-start" }}>
              <SmallButton
                label={item.active ? "Turn off" : "Turn on"}
                tone={item.active ? "plain" : "navy"}
                busy={busyId === item.id}
                onPress={() => void toggle(item)}
              />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

/* ---------------- Reports ---------------- */

function ReportsTab({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Removing a post takes two taps: the first arms it, the second removes.
  const [confirmPost, setConfirmPost] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.reports(accessToken);
      setItems(Array.isArray(res?.reports) ? res.reports : []);
    } catch (e) {
      setError(errText(e, "Failed to load reports"));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  // The server groups reports per reported account; closing one closes all.
  const act = async (id: string, kind: "suspend" | "dismiss") => {
    setBusyId(id);
    setError("");
    try {
      if (kind === "suspend") {
        await adminApi.banUser(accessToken, id);
        await adminApi.resolveReport(accessToken, id, "actioned");
      } else {
        await adminApi.resolveReport(accessToken, id, "dismissed");
      }
      await load();
    } catch (e) {
      setError(errText(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  const actOnPost = async (postId: string, kind: "remove" | "keep") => {
    setBusyId(postId);
    setError("");
    try {
      if (kind === "remove") await adminApi.removePost(accessToken, postId);
      else await adminApi.keepPost(accessToken, postId);
      setConfirmPost(null);
      await load();
    } catch (e) {
      setError(errText(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 16 }}>
      {!!error && <Message tone="error" text={error} />}
      {items.length === 0 && !error && (
        <Message text="No open reports. Nothing to review." />
      )}
      {items.map((r, i) => {
        const id = String(pick(r, "reported_id") ?? i);
        const name = String(
          pick(r, "reported_name", "reported_username") ?? "Member",
        );
        const count = Number(pick(r, "report_count") ?? 1);
        const reasons = String(pick(r, "reasons") ?? "")
          .split(" | ")
          .filter(Boolean);
        const suspended = pick(r, "account_status") === "suspended";
        const meta = [
          r?.reported_username ? `@${r.reported_username}` : "",
          r?.reported_city ?? "",
          r?.last_reported_at
            ? `Last report ${joinedLabel(r.last_reported_at)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Card key={id} style={{ padding: 20, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 16,
                  color: COLORS.textMain,
                }}
              >
                {name}
              </Text>
              <Badge text={`Reported by ${count} ${count === 1 ? "person" : "people"}`} danger />
              {suspended && <Badge text="Suspended" danger />}
            </View>
            {!!meta && (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: COLORS.textMuted,
                }}
              >
                {meta}
              </Text>
            )}
            {reasons.length > 0 && (
              <View style={{ gap: 4 }}>
                {reasons.map((reason, k) => (
                  <Text
                    key={k}
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: COLORS.textMain,
                    }}
                  >
                    • {reason}
                  </Text>
                ))}
              </View>
            )}
            {Array.isArray(r?.reported_posts) && r.reported_posts.length > 0 && (
              <View style={{ gap: 10, marginTop: 4 }}>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>
                  Reported posts
                </Text>
                {r.reported_posts.map((post: any) => {
                  const postId = String(post.post_id);
                  const postCount = Number(post.report_count ?? 1);
                  const armed = confirmPost === postId;
                  return (
                    <View
                      key={postId}
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        padding: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: armed ? COLORS.danger : "#E5E7EB",
                        backgroundColor: "#FAFAFB",
                      }}
                    >
                      <Image
                        source={{ uri: String(post.media_url) }}
                        accessibilityLabel="Reported post photo"
                        style={{ width: 96, height: 96, borderRadius: 8, backgroundColor: "#E5E7EB" }}
                      />
                      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                        <Text numberOfLines={3} style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMain }}>
                          {post.caption ? `"${post.caption}"` : "No caption"}
                        </Text>
                        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: COLORS.danger }}>
                          {`Reported by ${postCount} ${postCount === 1 ? "person" : "people"}`}
                          {post.reasons ? ` · ${String(post.reasons).split(" | ").join(", ")}` : ""}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                          <SmallButton
                            label={armed ? "Tap again to remove" : "Remove post"}
                            tone="danger"
                            busy={busyId === postId}
                            onPress={() => (armed ? void actOnPost(postId, "remove") : setConfirmPost(postId))}
                          />
                          {armed ? (
                            <SmallButton label="Cancel" tone="plain" onPress={() => setConfirmPost(null)} />
                          ) : (
                            <SmallButton
                              label="Keep post"
                              tone="plain"
                              busy={busyId === postId}
                              onPress={() => void actOnPost(postId, "keep")}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 6,
              }}
            >
              {!suspended && (
                <SmallButton
                  label="Suspend account"
                  tone="danger"
                  busy={busyId === id}
                  onPress={() => void act(id, "suspend")}
                />
              )}
              <SmallButton
                label={suspended ? "Mark resolved" : "Dismiss"}
                tone="plain"
                busy={busyId === id}
                onPress={() => void act(id, "dismiss")}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ---------------- Appeals ---------------- */

function AppealsTab({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.appeals(accessToken);
      setItems(Array.isArray(res?.appeals) ? res.appeals : []);
    } catch (e) {
      setError(errText(e, "Failed to load appeals"));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "restore" | "reject") => {
    setBusyId(id);
    setError("");
    try {
      await adminApi.resolveAppeal(accessToken, id, action);
      await load();
    } catch (e) {
      setError(errText(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 16 }}>
      {!!error && <Message tone="error" text={error} />}
      {items.length === 0 && !error && (
        <Message text="No appeals from suspended members." />
      )}
      {items.map((a) => {
        const id = String(a?.id);
        const reports = Number(a?.report_count ?? 0);
        const meta = [
          a?.username ? `@${a.username}` : "",
          a?.phone ?? "",
          a?.city ?? "",
          a?.updated_at ? `Sent ${joinedLabel(a.updated_at)}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <Card key={id} style={{ padding: 20, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 16,
                  color: COLORS.textMain,
                }}
              >
                {displayName(a)}
              </Text>
              <Badge text="Suspended" danger />
              {reports > 0 && (
                <Badge
                  text={`Reported by ${reports} ${reports === 1 ? "person" : "people"}`}
                  danger
                />
              )}
            </View>
            {!!meta && (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: COLORS.textMuted,
                }}
              >
                {meta}
              </Text>
            )}
            <View
              style={{
                backgroundColor: COLORS.bg,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  lineHeight: 20,
                  color: COLORS.textMain,
                }}
              >
                {String(a?.message ?? "")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 6,
              }}
            >
              <SmallButton
                label="Restore account"
                busy={busyId === id}
                onPress={() => void act(id, "restore")}
              />
              <SmallButton
                label="Keep suspended"
                tone="plain"
                busy={busyId === id}
                onPress={() => void act(id, "reject")}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ---------------- UPI payments ---------------- */

const REJECT_REASONS = [
  "We could not find this payment.",
  "The amount paid was different.",
  "This UTR belongs to another payment.",
];

function PaymentsTab({ accessToken }: { accessToken: string }) {
  const [pending, setPending] = useState<any[]>([]);
  const [reviewed, setReviewed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res: any = await adminApi.payments(accessToken);
      setPending(Array.isArray(res?.pending) ? res.pending : []);
      setReviewed(Array.isArray(res?.reviewed) ? res.reviewed : []);
    } catch (e) {
      setError(errText(e, "Failed to load payments"));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject", reason = "") => {
    setBusyId(id);
    setError("");
    try {
      if (action === "approve") await adminApi.approvePayment(accessToken, id);
      else await adminApi.rejectPayment(accessToken, id, reason);
      setRejecting(null);
      await load();
    } catch (e) {
      setError(errText(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;

  const when = (value: unknown) => {
    const date = new Date(String(value ?? ""));
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  };

  const row = (p: any, isPending: boolean) => {
    const id = String(p?.id);
    const amount = `₹${(Number(p?.amountPaise ?? 0) / 100).toLocaleString("en-IN")}`;
    const meta = [p?.username ? `@${p.username}` : "", p?.phone ?? "", p?.city ?? "", when(p?.createdAt)]
      .filter(Boolean)
      .join(" · ");
    return (
      <Card key={id} style={{ padding: 18, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 18, color: COLORS.textMain }}>{amount}</Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: COLORS.textMain }}>
            {String(p?.planTitle ?? p?.planCode ?? "")}
          </Text>
          {!isPending && (
            <Badge text={p?.status === "approved" ? "Approved" : "Rejected"} danger={p?.status !== "approved"} />
          )}
          {!!p?.couponCode && <Badge text={`🎟️ ${p.couponCode}`} />}
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: COLORS.textMain }}>
          {displayName({ first_name: p?.firstName, username: p?.username })}
        </Text>
        {!!meta && (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>{meta}</Text>
        )}
        <View style={{ backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, flexDirection: "row", gap: 8 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>UTR</Text>
          <Text selectable style={{ fontFamily: fonts.bodySemi, fontSize: 15, letterSpacing: 1, color: COLORS.textMain }}>
            {String(p?.utr ?? "")}
          </Text>
        </View>
        {!isPending && !!p?.note && (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>{String(p.note)}</Text>
        )}
        {p?.status !== "approved" && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            <SmallButton
              label={isPending ? "Approve - money received" : "Approve anyway"}
              busy={busyId === id}
              onPress={() => void act(id, "approve")}
            />
            {isPending && (
              <SmallButton
                label="Reject"
                tone="plain"
                busy={busyId === id}
                onPress={() => setRejecting(rejecting === id ? null : id)}
              />
            )}
          </View>
        )}
        {rejecting === id && (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>
              Why? The member sees this.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {REJECT_REASONS.map((reason) => (
                <SmallButton
                  key={reason}
                  label={reason}
                  tone="danger"
                  busy={busyId === id}
                  onPress={() => void act(id, "reject", reason)}
                />
              ))}
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: COLORS.textMuted }}>
        Open your bank or UPI app, find the payment by its UTR and amount, then approve. The plan turns on for the member right away.
      </Text>
      {!!error && <Message tone="error" text={error} />}
      {pending.length === 0 && !error && <Message text="No UPI payments waiting." />}
      {pending.map((p) => row(p, true))}
      {reviewed.length > 0 && (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: COLORS.textMain, marginTop: 8 }}>
          Recently checked
        </Text>
      )}
      {reviewed.map((p) => row(p, false))}
    </View>
  );
}

/* ---------------- Coupons ---------------- */

const COUPON_PERCENTS = [10, 20, 30, 50];

function Toggle({ label, on, onPress, busy }: { label: string; on: boolean; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, busy: !!busy }}
      onPress={onPress}
      disabled={busy}
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <View
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          padding: 3,
          backgroundColor: on ? COLORS.success : COLORS.border,
          alignItems: on ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" }} />
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMain }}>{label}</Text>
    </Pressable>
  );
}

function CouponsTab({ accessToken }: { accessToken: string }) {
  const [coupons, setCoupons] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("50");
  const [untilDay, setUntilDay] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [show, setShow] = useState(true);

  const load = useCallback(async () => {
    try {
      const res: any = await adminApi.coupons(accessToken);
      setCoupons(Array.isArray(res?.coupons) ? res.coupons : []);
    } catch (e) {
      setError(errText(e, "Could not load coupons"));
      setCoupons([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(done);
      await load();
    } catch (e) {
      setError(errText(e, "That did not work"));
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    const cleanCode = code.trim().toUpperCase();
    // Valid until the end of that day, India time.
    const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(untilDay)
      ? new Date(istMidnight(untilDay).getTime() + 86400000 - 1000).toISOString()
      : null;
    void run(
      async () => {
        await adminApi.createCoupon(accessToken, {
          code: cleanCode,
          percent: Number(percent),
          validUntil,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          showAtCheckout: show,
        });
        setCode("");
        setMaxUses("");
      },
      `${cleanCode} is ready${show ? " and shows at payment" : ""}.`,
    );
  };

  if (!coupons) return <Loading />;

  return (
    <View style={{ gap: 18 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: COLORS.textMuted }}>
        Write your own code. Each member can use a coupon once, on Plus or Pro. A coupon set to show at payment
        is already applied for everyone who pays; the others only work for people who type the code.
      </Text>
      {!!error && <Message tone="error" text={error} />}
      {!!notice && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: COLORS.success }}>{notice}</Text>}

      <Card style={{ padding: 18, gap: 14 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: COLORS.textMain }}>New coupon</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <View style={{ gap: 6, minWidth: 220, flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>Code</Text>
            <TextInput
              accessibilityLabel="Coupon code"
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
              placeholder="DIWALI50"
              autoCapitalize="characters"
              style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 16, letterSpacing: 1.5, color: COLORS.textMain }}
            />
          </View>
          <View style={{ gap: 6, minWidth: 220, flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>% off</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {COUPON_PERCENTS.map((value) => (
                <SmallButton
                  key={value}
                  label={`${value}%`}
                  tone={percent === String(value) ? "navy" : "plain"}
                  onPress={() => setPercent(String(value))}
                />
              ))}
              <TextInput
                accessibilityLabel="Custom percent"
                value={percent}
                onChangeText={(text) => setPercent(text.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                style={{ width: 64, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 8, fontSize: 15, textAlign: "center", color: COLORS.textMain }}
              />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>Valid till (empty: no end)</Text>
            <DateField value={untilDay} onChange={setUntilDay} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>How many members (empty: no limit)</Text>
            <TextInput
              accessibilityLabel="How many members can use it"
              value={maxUses}
              onChangeText={(text) => setMaxUses(text.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              placeholder="100"
              style={{ width: 140, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 15, color: COLORS.textMain }}
            />
          </View>
          <Toggle label="Show at payment for everyone" on={show} onPress={() => setShow((v) => !v)} />
        </View>
        <View style={{ flexDirection: "row" }}>
          <SmallButton label="Create coupon" busy={busy} onPress={create} />
        </View>
      </Card>

      {coupons.length === 0 ? (
        <Message text="No coupons yet." />
      ) : (
        coupons.map((c) => (
          <Card key={c.id} style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <Text selectable style={{ fontFamily: fonts.bodySemi, fontSize: 18, letterSpacing: 1.5, color: COLORS.textMain }}>
                🎟️ {c.code}
              </Text>
              <Badge text={`${c.percent}% off`} />
              {!c.active && <Badge text="Off" danger />}
              {c.validUntil && new Date(c.validUntil).getTime() <= Date.now() && <Badge text="Ended" danger />}
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>
              Used {c.uses}
              {c.maxUses ? ` of ${c.maxUses}` : ""} times
              {c.waiting ? ` · ${c.waiting} payment${c.waiting === 1 ? "" : "s"} waiting` : ""}
              {c.validUntil ? ` · till ${istTime(c.validUntil)}` : " · no end date"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
              <Toggle
                label="On"
                on={!!c.active}
                busy={busy}
                onPress={() =>
                  void run(() => adminApi.updateCoupon(accessToken, c.id, { active: !c.active }), `${c.code} turned ${c.active ? "off" : "on"}.`)
                }
              />
              <Toggle
                label="Show at payment"
                on={!!c.showAtCheckout}
                busy={busy}
                onPress={() =>
                  void run(
                    () => adminApi.updateCoupon(accessToken, c.id, { showAtCheckout: !c.showAtCheckout }),
                    c.showAtCheckout ? `${c.code} no longer shows at payment.` : `${c.code} now shows at payment.`,
                  )
                }
              />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

/* ---------------- Offer popup ---------------- */

function PromoTab({ accessToken }: { accessToken: string }) {
  const [active, setActive] = useState<Promo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [headline, setHeadline] = useState("50% OFF");
  const [title, setTitle] = useState("Premium at half price");
  const [message, setMessage] = useState("See who likes you, unlimited likes and the blue tick.");
  const [buttonLabel, setButtonLabel] = useState("Get Premium");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [style, setStyle] = useState("classic");
  const [endDay, setEndDay] = useState("");

  const load = useCallback(async () => {
    try {
      const [promoRes, couponRes]: any[] = await Promise.all([adminApi.promo(accessToken), adminApi.coupons(accessToken)]);
      setActive(promoRes?.active ?? null);
      setCoupons((couponRes?.coupons ?? []).filter((c: any) => c.active));
    } catch (e) {
      setError(errText(e, "Could not load the offer popup"));
    } finally {
      setLoaded(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(done);
      await load();
    } catch (e) {
      setError(errText(e, "That did not work"));
    } finally {
      setBusy(false);
    }
  };

  const endsAt = /^\d{4}-\d{2}-\d{2}$/.test(endDay)
    ? new Date(istMidnight(endDay).getTime() + 86400000 - 1000).toISOString()
    : null;
  const preview: Promo = {
    id: "preview",
    headline: headline.trim() || "50% OFF",
    title: title.trim() || null,
    message: message.trim() || null,
    buttonLabel: buttonLabel.trim() || null,
    couponCode,
    style,
    endsAt,
  };

  if (!loaded) return <Loading />;

  const field = (label: string, value: string, set: (v: string) => void, max: number, placeholder: string) => (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        maxLength={max}
        placeholder={placeholder}
        style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 15, color: COLORS.textMain }}
      />
    </View>
  );

  return (
    <View style={{ gap: 18 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: COLORS.textMuted }}>
        The popup shows each time someone opens the app, until they close it. "Get Premium" opens Premium
        with the coupon already applied.
      </Text>
      {!!error && <Message tone="error" text={error} />}
      {!!notice && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: COLORS.success }}>{notice}</Text>}

      <Card style={{ padding: 18, gap: 10 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: COLORS.textMain }}>On now</Text>
        {active ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: COLORS.textMain }}>
              {active.headline}
              {active.title ? ` · ${active.title}` : ""}
              {active.couponCode ? ` · ${active.couponCode}` : ""}
              {active.endsAt ? ` · ends ${istTime(active.endsAt)}` : ""}
            </Text>
            <SmallButton
              label="Turn off"
              tone="danger"
              busy={busy}
              onPress={() => void run(() => adminApi.stopPromo(accessToken), "Offer popup turned off.")}
            />
          </View>
        ) : (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: COLORS.textMuted }}>No popup on.</Text>
        )}
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <Card style={{ padding: 18, gap: 12, flex: 1, minWidth: 320 }}>
          {field("Big headline", headline, setHeadline, 40, "50% OFF")}
          {field("Title", title, setTitle, 80, "Premium at half price")}
          {field("Message", message, setMessage, 200, "What they get")}
          {field("Button", buttonLabel, setButtonLabel, 40, "Get Premium")}
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>Coupon on the popup</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <SmallButton label="None" tone={couponCode === null ? "navy" : "plain"} onPress={() => setCouponCode(null)} />
              {coupons.map((c) => (
                <SmallButton
                  key={c.id}
                  label={`${c.code} (${c.percent}%)`}
                  tone={couponCode === c.code ? "navy" : "plain"}
                  onPress={() => {
                    setCouponCode(c.code);
                    setHeadline(`${c.percent}% OFF`);
                  }}
                />
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>Look</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Object.values(PROMO_STYLES).map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Look ${item.name}`}
                  accessibilityState={{ selected: style === item.key }}
                  onPress={() => setStyle(item.key)}
                  style={{ borderRadius: 12, borderWidth: 2, borderColor: style === item.key ? COLORS.primary : "transparent", padding: 2 }}
                >
                  <LinearGradient colors={item.colors} style={{ width: 92, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: item.ink }}>{item.name}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>
              Ends (the popup counts down to it; empty: no end)
            </Text>
            <DateField value={endDay} onChange={setEndDay} />
          </View>
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            <SmallButton
              label={active ? "Publish (replaces the one on now)" : "Publish popup"}
              busy={busy}
              onPress={() =>
                void run(
                  () =>
                    adminApi.publishPromo(accessToken, {
                      headline: preview.headline,
                      title: preview.title ?? undefined,
                      message: preview.message ?? undefined,
                      buttonLabel: preview.buttonLabel ?? undefined,
                      couponCode,
                      style,
                      endsAt,
                    }),
                  "The popup is on. Everyone sees it the next time they open the app.",
                )
              }
            />
          </View>
        </Card>
        <View style={{ width: 360, maxWidth: "100%", gap: 8 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>Preview</Text>
          <PromoCard promo={preview} onCta={() => undefined} onClose={() => undefined} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- Festival themes ---------------- */

const FESTIVAL_OFFERS: (number | null)[] = [null, 10, 20, 30];

const FESTIVAL_DAYS: { label: string; days: number | null }[] = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "Until I turn it off", days: null },
];

/** "14 Nov, 5:30 pm" in India time. */
function istTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Midnight India time on a YYYY-MM-DD day. */
function istMidnight(day: string) {
  return new Date(`${day}T00:00:00+05:30`);
}

function FestivalPreview({ theme, greeting, small }: { theme: FestivalTheme; greeting?: string | null; small?: boolean }) {
  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 14, paddingVertical: small ? 12 : 16, paddingHorizontal: 12, alignItems: "center" }}
    >
      <Text style={{ fontSize: small ? 14 : 18, letterSpacing: 2 }} numberOfLines={1}>
        {theme.ornament}
      </Text>
      <Text
        numberOfLines={2}
        style={{ marginTop: 6, textAlign: "center", fontFamily: fonts.display, fontSize: small ? 15 : 20, color: theme.ink }}
      >
        {greeting?.trim() || theme.greeting}
      </Text>
    </LinearGradient>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  if (Platform.OS === "web") {
    // The browser's own date picker.
    return createElement("input", {
      type: "date",
      value,
      min: new Date().toISOString().slice(0, 10),
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      "aria-label": "Start date",
      style: {
        padding: 10,
        borderRadius: 10,
        border: `1px solid ${COLORS.border}`,
        fontSize: 15,
        fontFamily: "inherit",
        background: "#FFFFFF",
        color: COLORS.textMain,
      },
    });
  }
  return (
    <TextInput
      accessibilityLabel="Start date"
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 15 }}
    />
  );
}

function FestivalsTab({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<{ active: ActiveFestival | null; upcoming: ActiveFestival[] } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const [days, setDays] = useState<number | null>(3);
  const [startDay, setStartDay] = useState("");
  const [offer, setOffer] = useState<number | null>(null);
  const [pushText, setPushText] = useState("");
  const [confirmPush, setConfirmPush] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res: any = await adminApi.festivals(accessToken);
      setData({ active: res?.active ?? null, upcoming: Array.isArray(res?.upcoming) ? res.upcoming : [] });
      setFestival(res?.active ?? null);
    } catch (e) {
      setError(errText(e, "Could not load festival themes"));
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(done);
      await load();
    } catch (e) {
      setError(errText(e, "That did not work"));
    } finally {
      setBusy(false);
    }
  };

  const theme = picked ? FESTIVAL_THEMES[picked] : null;

  const applyNow = () => {
    if (!theme) return;
    const endsAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    void run(
      () => adminApi.scheduleFestival(accessToken, { themeKey: theme.key, greeting, endsAt, offerPercent: offer }),
      `${theme.name} is on across the app now.`,
    );
  };

  const scheduleIt = () => {
    if (!theme) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay)) {
      setError("Pick the day it should start.");
      return;
    }
    const start = istMidnight(startDay);
    const endsAt = days ? new Date(start.getTime() + days * 86400000).toISOString() : null;
    void run(
      () =>
        adminApi.scheduleFestival(accessToken, {
          themeKey: theme.key,
          greeting,
          startsAt: start.toISOString(),
          endsAt,
          offerPercent: offer,
        }),
      `${theme.name} will start on ${istTime(start.toISOString())}.`,
    );
  };

  if (!data && !error) return <Loading />;
  const active = data?.active ?? null;
  const activeTheme = active ? FESTIVAL_THEMES[active.themeKey] : null;

  return (
    <View style={{ gap: 18 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: COLORS.textMuted }}>
        Pick a festival and apply it: Home gets the greeting and decoration, text stories get festive
        backgrounds, and everyone online sees it straight away.
      </Text>
      {!!error && <Message tone="error" text={error} />}
      {!!notice && (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: COLORS.success }}>{notice}</Text>
      )}

      <Card style={{ padding: 18, gap: 12 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: COLORS.textMain }}>On now</Text>
        {active && activeTheme ? (
          <>
            <FestivalPreview theme={activeTheme} greeting={active.greeting} />
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.textMuted }}>
              {activeTheme.name} · since {istTime(active.startsAt)} ·{" "}
              {active.endsAt ? `ends ${istTime(active.endsAt)}` : "on until you turn it off"}
              {active.offerPercent ? ` · ${active.offerPercent}% off Premium` : ""}
            </Text>
            <View style={{ gap: 8, backgroundColor: COLORS.bg, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: COLORS.textMain }}>
                Greeting notification to everyone
              </Text>
              {active.pushedAt ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: COLORS.success }}>
                  Sent {istTime(active.pushedAt)}. It goes once per festival.
                </Text>
              ) : (
                <>
                  <TextInput
                    accessibilityLabel="Notification message"
                    value={pushText}
                    onChangeText={setPushText}
                    maxLength={160}
                    placeholder={`Wish your matches today - send a ${activeTheme.name} story or a wish in chat 💌`}
                    style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.textMain, backgroundColor: "#FFFFFF" }}
                  />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <SmallButton
                      label={confirmPush ? "Yes, send to everyone" : "Send greeting to everyone"}
                      tone={confirmPush ? "danger" : "navy"}
                      busy={busy}
                      onPress={() => {
                        if (!confirmPush) {
                          setConfirmPush(true);
                          return;
                        }
                        setConfirmPush(false);
                        void run(async () => {
                          const res: any = await adminApi.pushFestival(accessToken, pushText);
                          setPushText("");
                          return res;
                        }, "Greeting is going out to everyone.");
                      }}
                    />
                    {confirmPush && (
                      <SmallButton label="Not now" tone="plain" onPress={() => setConfirmPush(false)} />
                    )}
                  </View>
                </>
              )}
            </View>
            <View style={{ flexDirection: "row" }}>
              <SmallButton
                label="Turn off"
                tone="danger"
                busy={busy}
                onPress={() => void run(() => adminApi.stopFestival(accessToken), "Festival theme turned off.")}
              />
            </View>
          </>
        ) : (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: COLORS.textMuted }}>
            No festival theme. The app looks as usual.
          </Text>
        )}
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {Object.values(FESTIVAL_THEMES).map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${item.name}`}
            accessibilityState={{ selected: picked === item.key }}
            onPress={() => {
              setPicked(item.key);
              setGreeting("");
              setNotice("");
            }}
            style={{
              width: 200,
              borderRadius: 18,
              padding: 6,
              borderWidth: 2,
              borderColor: picked === item.key ? COLORS.primary : "transparent",
              backgroundColor: COLORS.card,
            }}
          >
            <FestivalPreview theme={item} small />
            <Text style={{ marginTop: 6, textAlign: "center", fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMain }}>
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {theme && (
        <Card style={{ padding: 18, gap: 14 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: COLORS.textMain }}>{theme.name}</Text>
          <FestivalPreview theme={theme} greeting={greeting} />
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>Greeting (optional)</Text>
            <TextInput
              accessibilityLabel="Greeting"
              value={greeting}
              onChangeText={setGreeting}
              maxLength={120}
              placeholder={theme.greeting}
              style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 15, color: COLORS.textMain }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>How long</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FESTIVAL_DAYS.map((choice) => (
                <SmallButton
                  key={choice.label}
                  label={choice.label}
                  tone={days === choice.days ? "navy" : "plain"}
                  onPress={() => setDays(choice.days)}
                />
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>
              Premium offer while it is on
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FESTIVAL_OFFERS.map((percent) => (
                <SmallButton
                  key={String(percent)}
                  label={percent ? `${percent}% off` : "No offer"}
                  tone={offer === percent ? "navy" : "plain"}
                  onPress={() => setOffer(percent)}
                />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <SmallButton label={`Apply ${theme.name} now`} busy={busy} onPress={applyNow} />
          </View>
          <View style={{ height: 1, backgroundColor: COLORS.border }} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: COLORS.textMuted }}>
            Or schedule it (starts at midnight, India time)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <DateField value={startDay} onChange={setStartDay} />
            <SmallButton label="Schedule" tone="plain" busy={busy} onPress={scheduleIt} />
          </View>
        </Card>
      )}

      {!!data?.upcoming.length && (
        <Card style={{ padding: 18, gap: 10 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: COLORS.textMain }}>Coming up</Text>
          {data.upcoming.map((item) => {
            const upcomingTheme = FESTIVAL_THEMES[item.themeKey];
            return (
              <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Text style={{ flex: 1, minWidth: 200, fontFamily: fonts.body, fontSize: 14, color: COLORS.textMain }}>
                  {upcomingTheme?.emoji} {upcomingTheme?.name ?? item.themeKey} · {istTime(item.startsAt)}
                  {item.endsAt ? ` to ${istTime(item.endsAt)}` : " until turned off"}
                  {item.offerPercent ? ` · ${item.offerPercent}% off` : ""}
                </Text>
                <SmallButton
                  label="Cancel"
                  tone="plain"
                  busy={busy}
                  onPress={() => void run(() => adminApi.cancelFestival(accessToken, item.id), "Schedule cancelled.")}
                />
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

/* ---------------- Security (Password Change) ---------------- */

function SecurityTab({ accessToken }: { accessToken: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUpdate = async () => {
    if (!currentPassword || !newPassword) {
      setError("Please fill both fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updatePassword(accessToken, currentPassword, newPassword);
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setError(errText(e, "Failed to update password"));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: any = {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: COLORS.textMain,
    marginBottom: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  };

  return (
    <Card style={{ maxWidth: 500 }}>
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 20,
          color: COLORS.textMain,
          marginBottom: 20,
        }}
      >
        Change Password
      </Text>

      <View>
        <Text
          style={{
            fontFamily: fonts.bodySemi,
            fontSize: 13,
            color: COLORS.textMain,
            marginBottom: 6,
          }}
        >
          Current Password
        </Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          style={inputStyle}
        />
      </View>

      <View>
        <Text
          style={{
            fontFamily: fonts.bodySemi,
            fontSize: 13,
            color: COLORS.textMain,
            marginBottom: 6,
          }}
        >
          New Password
        </Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          style={inputStyle}
        />
      </View>

      {!!error && (
        <Text
          style={{
            color: COLORS.danger,
            fontFamily: fonts.body,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </Text>
      )}
      {!!success && (
        <Text
          style={{
            color: COLORS.success,
            fontFamily: fonts.body,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {success}
        </Text>
      )}

      <SmallButton
        label={loading ? "Updating..." : "Update Password"}
        onPress={handleUpdate}
        busy={loading}
      />
    </Card>
  );
}
