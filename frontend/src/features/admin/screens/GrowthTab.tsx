import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, type Growth, type GrowthDays, type GrowthSeriesKey } from "../../../api/adminApi";
import { fonts } from "../../../theme";
import { average, dayLabel, percent, rupees, total } from "../growthFormat";

/**
 * Admin → Growth.
 *
 * One small bar chart per number (small multiples), all in one navy hue -
 * every chart is a single series, so the title names it and no legend is
 * needed. Hovering or tapping a day picks that day in every chart at once,
 * so the same day can be compared across signups, matches and revenue.
 */
const C = {
  card: "#FFFFFF",
  border: "#E5E7EB",
  textMain: "#111827",
  textMuted: "#6B7280",
  primary: "#1E3A8A", // the picked day (10.4:1 on white)
  bar: "#6B83C4", // other days (3.7:1 on white)
  primaryLight: "#EFF6FF",
};

const CHART_HEIGHT = 72;

type ChartSpec = {
  key: GrowthSeriesKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** How the headline sums the period: a total, or an average per day. */
  summary: "total" | "average";
  money?: boolean;
  note?: string;
};

const CHARTS: ChartSpec[] = [
  { key: "active", title: "Daily active members", icon: "pulse", summary: "average" },
  { key: "signups", title: "New signups", icon: "person-add", summary: "total" },
  { key: "likes", title: "Likes sent", icon: "heart", summary: "total" },
  { key: "matches", title: "New matches", icon: "people", summary: "total" },
  { key: "messages", title: "Messages sent", icon: "chatbubbles", summary: "total" },
  { key: "revenuePaise", title: "Revenue", icon: "cash", summary: "total", money: true },
  { key: "payments", title: "Payments", icon: "card", summary: "total" },
  { key: "invites", title: "Joined from invites", icon: "gift", summary: "total" },
  { key: "dailyQuestion", title: "Daily Question answers", icon: "help-circle", summary: "total" },
  { key: "sparks", title: "Sparks & Super Likes", icon: "flash", summary: "total" },
  { key: "games", title: "Chat games started", icon: "game-controller", summary: "total" },
];

const PERIODS: GrowthDays[] = [7, 14, 30];

const shadow: any =
  Platform.OS === "web" ? { boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" } : {};

export function GrowthTab({ accessToken }: { accessToken: string }) {
  const [period, setPeriod] = useState<GrowthDays>(14);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // The day picked across every chart; null means "today" (the last bar).
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    adminApi
      .growth(accessToken, period)
      .then((res) => {
        if (!active) return;
        setGrowth(res.growth);
        setPicked(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load growth"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [accessToken, period]);

  const lastIndex = growth ? growth.days.length - 1 : 0;
  const index = picked ?? lastIndex;

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, color: C.textMain }}>Growth</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: C.textMuted }}>
            India days (IST). Hover or tap a bar to see that day in every chart.
          </Text>
        </View>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: "hidden" }}
        >
          {PERIODS.map((days) => {
            const on = days === period;
            return (
              <Pressable
                key={days}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Last ${days} days`}
                onPress={() => setPeriod(days)}
                style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: on ? C.primary : C.card }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? "#FFF" : C.textMain }}>
                  {days} days
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading && !growth ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ fontFamily: fonts.body, color: "#B91C1C" }}>{error}</Text>
      ) : growth ? (
        <>
          <TodayStrip growth={growth} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, opacity: loading ? 0.5 : 1 }}>
            {CHARTS.map((spec) => (
              <ChartCard
                key={spec.key}
                spec={spec}
                growth={growth}
                index={index}
                onPick={setPicked}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <FunnelCard growth={growth} />
            <PlansCard growth={growth} />
          </View>
        </>
      ) : null}
    </View>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 18, gap: 10 },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function TodayStrip({ growth }: { growth: Growth }) {
  const tiles = [
    { label: "Active today", value: String(growth.active.today) },
    { label: "Active in 7 days", value: String(growth.active.last7Days) },
    { label: "Active in 30 days", value: String(growth.active.last30Days) },
    { label: "Signups today", value: String(growth.today.signups) },
    { label: "Revenue today", value: rupees(growth.today.revenuePaise) },
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {tiles.map((tile) => (
        <Panel key={tile.label} style={{ flexGrow: 1, flexBasis: 150, paddingVertical: 14 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>{tile.label}</Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 24, color: C.textMain }}>{tile.value}</Text>
        </Panel>
      ))}
    </View>
  );
}

function ChartCard({
  spec,
  growth,
  index,
  onPick,
}: {
  spec: ChartSpec;
  growth: Growth;
  index: number;
  onPick: (i: number) => void;
}) {
  const values = growth.series[spec.key] || [];
  const format = (n: number) => (spec.money ? rupees(n) : String(n));
  // Daily active counting started on deploy day; average only the days it
  // has data for, or a new install reads "0.1 / day".
  const counted =
    spec.key === "active" && growth.activeTrackingSince
      ? values.filter((_, i) => (growth.days[i] ?? "") >= (growth.activeTrackingSince ?? ""))
      : values;
  const headline = spec.summary === "average" ? `${average(counted)} / day` : format(total(values));
  const max = Math.max(1, ...values);
  const since =
    spec.key === "active" && growth.activeTrackingSince && growth.activeTrackingSince > (growth.days[0] ?? "")
      ? `Counting since ${dayLabel(growth.activeTrackingSince)}`
      : "";

  return (
    <Panel style={{ flexGrow: 1, flexBasis: 260, maxWidth: Platform.OS === "web" ? 420 : undefined }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: C.primaryLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={spec.icon} size={15} color={C.primary} />
        </View>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: C.textMain, flex: 1 }}>{spec.title}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 22, color: C.textMain }}>{headline}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>
          {dayLabel(growth.days[index])}: <Text style={{ fontFamily: fonts.bodySemi, color: C.textMain }}>{format(values[index] || 0)}</Text>
        </Text>
      </View>
      <View
        style={{
          height: CHART_HEIGHT,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        {values.map((value, i) => {
          const height = value > 0 ? Math.max(3, Math.round((value / max) * CHART_HEIGHT)) : 0;
          return (
            <Pressable
              key={growth.days[i] ?? i}
              onPress={() => onPick(i)}
              onHoverIn={() => onPick(i)}
              accessibilityRole="button"
              accessibilityLabel={`${spec.title}, ${dayLabel(growth.days[i])}: ${format(value)}`}
              // The whole column is the hit target, not just the bar.
              style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}
            >
              <View
                style={{
                  height,
                  backgroundColor: i === index ? C.primary : C.bar,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted }}>{dayLabel(growth.days[0])}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted }}>
          {since || dayLabel(growth.days[growth.days.length - 1])}
        </Text>
      </View>
    </Panel>
  );
}

function FunnelCard({ growth }: { growth: Growth }) {
  const { members, withProfile, withPhoto, verified, paidEver } = growth.funnel;
  const steps = [
    { label: "Members", value: members },
    { label: "Name & age filled", value: withProfile },
    { label: "Added a photo", value: withPhoto },
    { label: "Selfie verified", value: verified },
    { label: "Paid at least once", value: paidEver },
  ];
  return (
    <Panel style={{ flexGrow: 2, flexBasis: 320 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: C.textMain }}>Member funnel</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>
        All current members. The biggest drop shows where people get stuck.
      </Text>
      {steps.map((step) => {
        const share = percent(step.value, members);
        return (
          <View key={step.label} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: C.textMain }}>{step.label}</Text>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: C.textMain }}>
                {step.value} <Text style={{ fontFamily: fonts.body, color: C.textMuted }}>· {share}%</Text>
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: "#F1F3F7", overflow: "hidden" }}>
              <View style={{ width: `${share}%`, height: "100%", backgroundColor: C.primary, borderRadius: 4 }} />
            </View>
          </View>
        );
      })}
    </Panel>
  );
}

function PlansCard({ growth }: { growth: Growth }) {
  return (
    <Panel style={{ flexGrow: 1, flexBasis: 220 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: C.textMain }}>Active plans now</Text>
      {[
        { label: "Plus", value: growth.plans.plus },
        { label: "Pro (blue tick)", value: growth.plans.pro },
      ].map((row) => (
        <View
          key={row.label}
          style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: C.textMain }}>{row.label}</Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: C.textMain }}>{row.value}</Text>
        </View>
      ))}
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>
        Revenue in this period: {rupees(total(growth.series.revenuePaise || []))}
      </Text>
    </Panel>
  );
}
