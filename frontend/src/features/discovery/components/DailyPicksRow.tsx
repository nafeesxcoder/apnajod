import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { profileApi, type DailyPicks } from "../../../api/profileApi";
import { TrustBadge } from "../../../components/TrustBadge";
import type { Match } from "../../../data";
import { fonts, palette, radius, typeScale } from "../../../theme";

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

  if (data.picks.length === 0) {
    return (
      <View
        accessibilityLabel="Aaj ke 5, no picks right now"
        style={{
          marginBottom: 24,
          borderRadius: radius.lg,
          backgroundColor: palette.paperSand,
          padding: 16,
          gap: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: palette.ink }}>
            ✨ Aaj ke 5
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: palette.slate }}>
            Next picks in {timeUntil(data.nextAt)}
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink }}>
          No new picks for you right now. Five handpicked profiles land here
          every night at 9 PM as new people join.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: palette.ink }}>
          ✨ Aaj ke 5
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: typeScale.caption, color: palette.slate }}>
          New picks in {timeUntil(data.nextAt)}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 8 }}
      >
        {data.picks.map((pick) => {
          const acted = pick.pickStatus !== "new";
          return (
            <Pressable
              key={pick.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${pick.name}'s profile, one of today's picks`}
              onPress={() => onOpen(pick as unknown as Match)}
              style={({ pressed }) => ({
                width: 132,
                borderRadius: radius.lg,
                overflow: "hidden",
                backgroundColor: palette.paperSand,
                opacity: pressed ? 0.85 : pick.pickStatus === "pass" ? 0.55 : 1,
              })}
            >
              {pick.photo ? (
                <Image source={{ uri: pick.photo }} style={{ width: 132, height: 160 }} />
              ) : (
                <View style={{ width: 132, height: 160, backgroundColor: palette.paperCool }} />
              )}
              {acted && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    borderRadius: radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor:
                      pick.pickStatus === "interested" ? palette.emerald : palette.slate,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: "#FFFFFF" }}>
                    {pick.pickStatus === "interested" ? "Liked ✓" : "Passed"}
                  </Text>
                </View>
              )}
              <View style={{ padding: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text
                    numberOfLines={1}
                    style={{ flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}
                  >
                    {pick.name}
                    {pick.age ? `, ${pick.age}` : ""}
                  </Text>
                  {pick.verified && <TrustBadge blueTick={pick.blueTick} size={14} />}
                </View>
                {!!pick.city && (
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}
                  >
                    {String(pick.city).split(",")[0]}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
