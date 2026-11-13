import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, whiteCard } from "../../../components/brand";
import { PressScale, SpinRing } from "../../../components/motion";
import { profileApi, type DailyPicks } from "../../../api/profileApi";
import { TrustBadge } from "../../../components/TrustBadge";
import type { Match } from "../../../data";
import { fonts, palette, radius } from "../../../theme";

/** "3h 20m" until the next set, or "soon" in the last minute. */
function timeUntil(iso: string, now = Date.now()) {
  const ms = Date.parse(iso) - now;
  if (!Number.isFinite(ms) || ms <= 60 * 1000) return "soon";
  const mins = Math.round(ms / 60000);
  const hours = Math.floor(mins / 60);
  return hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
}

/**
 * Aaj ke 5 on Home.
 *
 * Five profiles picked for this member, new every night at 9 PM. The row
 * shows which ones they have already acted on, and when the next five
 * arrive - that countdown is what brings people back in the evening.
 * Nothing renders if the picks cannot load. With no picks today it still
 * shows the card, so members know the feature is there and when to look.
 */
export function DailyPicksRow({
  accessToken,
  onOpen,
}: {
  accessToken?: string;
  onOpen: (match: Match) => void;
}) {
  const [data, setData] = useState<DailyPicks | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    profileApi
      .dailyPicks(accessToken)
      .then((result) => {
        if (live) setData(result);
      })
      .catch(() => {
        if (live) setData(null);
      });
    return () => {
      live = false;
    };
  }, [accessToken]);

  // Keep the countdown honest while Home stays open.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!accessToken || !data) return null;

  const header = (label: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 19, color: palette.ink }}>Aaj ke 5</Text>
      <View style={{ backgroundColor: brand.pillBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: brand.pillText }}>{label}</Text>
      </View>
    </View>
  );

  if (data.picks.length === 0) {
    return (
      <View
        accessibilityLabel="Aaj ke 5, no picks right now"
        style={{ ...whiteCard, marginBottom: 16, padding: 16, gap: 8 }}
      >
        {header(`Next in ${timeUntil(data.nextAt)}`)}
        <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.inkSoft }}>
          No new picks for you right now. Five handpicked profiles land here
          every night at 9 PM as new people join.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ ...whiteCard, marginBottom: 16, padding: 16, gap: 12 }}>
      {header(`New in ${timeUntil(data.nextAt)}`)}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {data.picks.map((pick) => {
          const liked = pick.pickStatus === "interested";
          const passed = pick.pickStatus === "pass";
          const firstName = String(pick.name || "").split(" ")[0] ?? "";
          return (
            <PressScale
              key={pick.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${pick.name}'s profile, one of today's picks${liked ? ", liked" : passed ? ", passed" : ""}`}
              onPress={() => onOpen(pick as unknown as Match)}
              style={{ width: 56, alignItems: "center", gap: 4, opacity: passed ? 0.5 : 1 }}
            >
              <View>
                <SpinRing size={54} spin={!liked && !passed}>
                  {pick.photo ? (
                    <Image source={{ uri: pick.photo }} style={{ width: "100%", height: "100%", backgroundColor: palette.paperSand }} />
                  ) : (
                    <View style={{ width: "100%", height: "100%", backgroundColor: palette.paperSand, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: palette.navy }}>{firstName.charAt(0)}</Text>
                    </View>
                  )}
                </SpinRing>
                {liked && (
                  <View
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -2,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: palette.crimson,
                      borderWidth: 2,
                      borderColor: palette.paper,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="heart" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, maxWidth: 56 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: palette.ink }}>
                  {firstName}
                </Text>
                {pick.verified && <TrustBadge blueTick={pick.blueTick} size={11} />}
              </View>
            </PressScale>
          );
        })}
      </ScrollView>
    </View>
  );
}
