import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { GrowthTab } from "./GrowthTab";
import { fonts, radius } from "../../../theme";

// 👇 Naya tab "security" add kiya
type Tab =
  | "overview"
  | "growth"
  | "users"
  | "verifications"
  | "reports"
  | "appeals"
  | "questions"
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
  { key: "questions", label: "Daily Questions", icon: "help-circle-outline" },
  { key: "security", label: "Security", icon: "lock-closed-outline" }, // 👈 New
];

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
  const [tab, setTab] = useState<Tab>("overview");
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
          {tab === "users" && <UsersTab accessToken={accessToken} />}
          {tab === "verifications" && (
            <VerificationsTab accessToken={accessToken} />
          )}
          {tab === "reports" && <ReportsTab accessToken={accessToken} />}
          {tab === "appeals" && <AppealsTab accessToken={accessToken} />}
          {tab === "questions" && <QuestionsTab accessToken={accessToken} />}
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
  onNavigate: (t: Tab) => void;
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
        />
        <StatCard
          title="Blue Tick Members"
          value={String(blueTickUsers)}
          icon="ribbon"
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

function UsersTab({ accessToken }: { accessToken: string }) {
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
        const res: any = await adminApi.users(accessToken, q);
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
    [accessToken],
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

      {loading ? (
        <Loading />
      ) : error ? (
        <Message tone="error" text={error} />
      ) : users.length === 0 ? (
        <Message text="No users match that search." />
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
                    {verified && <Badge text="Verified" />}
                    {blueTick && <Badge text="Blue tick" />}
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
