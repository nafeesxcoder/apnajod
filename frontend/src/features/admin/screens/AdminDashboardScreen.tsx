import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../api/adminApi";
import { fonts, radius } from "../../../theme";

// 👇 Naya tab "security" add kiya
type Tab = "overview" | "users" | "verifications" | "reports" | "security";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: "grid-outline" },
  { key: "users", label: "Users", icon: "people-outline" },
  {
    key: "verifications",
    label: "Verifications",
    icon: "shield-checkmark-outline",
  },
  { key: "reports", label: "Reports", icon: "flag-outline" },
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
}: {
  accessToken: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.bg, flexDirection: "row" }}
    >
      {/* ================= LEFT SIDEBAR ================= */}
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
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.bg,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 13,
                color: COLORS.textMain,
              }}
            >
              Need help?
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: COLORS.textMuted,
                marginTop: 4,
                marginBottom: 12,
              }}
            >
              Check our docs or contact support.
            </Text>
            <Pressable
              style={{
                backgroundColor: COLORS.card,
                paddingVertical: 8,
                borderRadius: 6,
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 12,
                  color: COLORS.textMain,
                }}
              >
                Support
              </Text>
            </Pressable>
          </View>

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
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 15,
                color: COLORS.danger,
              }}
            >
              Logout
            </Text>
          </Pressable>
        </View>
      </View>

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
            paddingHorizontal: 32,
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
          contentContainerStyle={{ padding: 32, gap: 24, flexGrow: 1 }}
        >
          {tab === "overview" && (
            <OverviewTab accessToken={accessToken} onNavigate={setTab} />
          )}
          {tab === "users" && <UsersTab accessToken={accessToken} />}
          {tab === "verifications" && (
            <VerificationsTab accessToken={accessToken} />
          )}
          {tab === "reports" && <ReportsTab accessToken={accessToken} />}
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

  const totalUsers = stats?.users ?? 0;
  const pendingVerifications = stats?.pendingVerifications ?? 0;
  const revenue = (stats?.revenuePaise ?? 0) / 100;

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
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Pending Verifications"
          value={String(pendingVerifications)}
          icon="shield-checkmark"
          trend="Needs attention"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${revenue.toFixed(2)}`}
          icon="cash"
          trend="+8%"
          trendUp
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
              const rawName =
                pick(u, "name", "full_name", "first_name", "firstName") ??
                pick(u, "username") ??
                "Unnamed";
              const nameStr = typeof rawName === "string" ? rawName : "Member";
              const contactStr = String(
                pick(u, "phone", "email", "username") ?? "",
              );
              const initial = nameStr.charAt(0).toUpperCase();

              return (
                <View
                  key={i}
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
              label="Review Verifications"
              onPress={() => onNavigate("verifications")}
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
}: {
  title: string;
  value: string;
  icon: any;
  trend?: string;
  trendUp?: boolean;
}) {
  const shadowStyle: any =
    Platform.OS === "web"
      ? { boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }
      : {};
  return (
    <View
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
    </View>
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
            const name = String(
              pick(u, "name", "full_name", "first_name", "firstName") ??
                pick(u, "username") ??
                "Unnamed",
            );
            const contact = String(
              pick(u, "phone", "email", "username") ?? "No contact info",
            );
            const role = String(pick(u, "role") ?? "user");
            const banned =
              Boolean(pick(u, "banned", "is_banned", "isBanned")) ||
              pick(u, "status") === "banned";
            const userId = String(u?.id || Math.random());

            return (
              <Card
                key={userId}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
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
                    {banned && <Badge text="Banned" danger />}
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
                <SmallButton
                  label={banned ? "Unban" : "Ban"}
                  tone={banned ? "plain" : "danger"}
                  busy={busyId === userId}
                  onPress={() => void toggleBan(u, banned)}
                />
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
        const selfie = pick(v, "selfie_url", "selfieUrl", "selfie", "photo");
        const name = String(
          pick(v, "name", "first_name", "firstName", "username") ?? "Member",
        );
        return (
          <Card key={id} style={{ width: 300, gap: 16 }}>
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

/* ---------------- Reports ---------------- */

function ReportsTab({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .reports(accessToken)
      .then((res: any) => {
        let list = [];
        if (Array.isArray(res?.reports)) list = res.reports;
        else if (Array.isArray(res?.items)) list = res.items;
        else if (Array.isArray(res)) list = res;
        setItems(list);
      })
      .catch((e) => setError(errText(e, "Failed to load reports")))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <Loading />;
  if (error) return <Message tone="error" text={error} />;
  if (items.length === 0) return <Message text="No reports to review." />;

  return (
    <View style={{ gap: 16 }}>
      {items.map((r, i) => (
        <Card key={String(pick(r, "id") ?? i)} style={{ padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.danger,
              }}
            />
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 16,
                color: COLORS.textMain,
              }}
            >
              {String(pick(r, "reason") ?? "Report")}
            </Text>
          </View>
          {!!pick(r, "details") && (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: COLORS.textMuted,
                marginTop: 4,
              }}
            >
              {String(pick(r, "details"))}
            </Text>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
            }}
          >
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: COLORS.textMuted,
              }}
            >
              Status: {String(pick(r, "status") ?? "open")}
            </Text>
          </View>
        </Card>
      ))}
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
