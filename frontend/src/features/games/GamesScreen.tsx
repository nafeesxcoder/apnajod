import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../components/AppCanvas";
import { whiteCard } from "../../components/brand";
import { PressScale, Reveal } from "../../components/motion";
import { BottomNav, useNavInset } from "../../components/navigation/BottomNav";
import { matchApi, type MutualMatchSummary } from "../../api/matchApi";
import type { GameKind } from "../../api/gamesApi";
import type { Screen } from "../../app/navigation/types";
import { LIVE_GAMES } from "../chat/games/LiveGames";
import { colors, fonts, palette, radius, typeScale } from "../../theme";

/**
 * The Games tab: pick a game, pick a match, and the chat opens with the
 * game already started. Games are only ever played with a match, inside
 * your chat with them - so with no matches yet it says so plainly.
 */
export function GamesScreen({
  navigate,
  accessToken,
  onPlay,
}: {
  navigate: (screen: Screen) => void;
  accessToken?: string;
  onPlay: (match: MutualMatchSummary, kind: GameKind) => void;
}) {
  const navInset = useNavInset();
  const [game, setGame] = useState<GameKind | null>(null);
  const [matches, setMatches] = useState<MutualMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    let live = true;
    matchApi
      .getMatches(accessToken)
      .then((result) => {
        if (live) setMatches((result.matches as MutualMatchSummary[]) || []);
      })
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [accessToken]);

  const picked = LIVE_GAMES.find((g) => g.kind === game) ?? null;

  return (
    <AppCanvas>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.paperBase,
          paddingLeft: navInset.paddingLeft,
        }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {picked && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to games"
                onPress={() => setGame(null)}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.title,
                  color: colors.text,
                }}
              >
                {picked ? picked.title : "Games"}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.label,
                  color: colors.muted,
                  marginTop: 4,
                }}
              >
                {picked ? "Who do you want to play with?" : "Play together with your matches"}
              </Text>
            </View>
          </View>

          {loading && (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <ActivityIndicator size="large" color={palette.crimson} />
            </View>
          )}

          {!loading && matches.length === 0 && (
            <View style={{ alignItems: "center", paddingHorizontal: 24, marginTop: 50 }}>
              <Ionicons name="game-controller-outline" size={64} color={palette.crimson} />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: colors.text,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                Match with someone first
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: typeScale.body,
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 8,
                  maxWidth: 300,
                  lineHeight: 22,
                }}
              >
                Games are played with your matches, right inside your chat.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Find people"
                onPress={() => navigate("home")}
                style={{
                  marginTop: 20,
                  paddingVertical: 13,
                  paddingHorizontal: 28,
                  borderRadius: radius.pill,
                  backgroundColor: palette.navy,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodySemi, fontSize: typeScale.body }}>
                  Find people
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && matches.length > 0 && !picked && (
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {LIVE_GAMES.map((g, idx) => (
                <Reveal key={g.kind} delay={idx * 60}>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${g.title}`}
                    onPress={() => setGame(g.kind)}
                    style={[
                      whiteCard,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        padding: 14,
                        borderRadius: radius.md,
                        minHeight: 72,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: palette.ink }}>
                        {g.title}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, marginTop: 2 }}>
                        {g.blurb}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={palette.slate} />
                  </PressScale>
                </Reveal>
              ))}
            </View>
          )}

          {!loading && matches.length > 0 && picked && (
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {matches.map((match, idx) => (
                <Reveal key={match.id} delay={Math.min(idx, 6) * 50}>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${picked.title} with ${match.name}`}
                    onPress={() => onPlay(match, picked.kind)}
                    style={[
                      whiteCard,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    {match.photo ? (
                      <Image
                        source={{ uri: match.photo }}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: palette.paper,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.text }}>
                          {(match.name || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
                        {match.name}
                      </Text>
                      {!!match.city && (
                        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
                          {match.city}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="play-circle" size={28} color={palette.crimson} />
                  </PressScale>
                </Reveal>
              ))}
            </View>
          )}
        </ScrollView>

        <BottomNav active="games" navigate={navigate} />
      </SafeAreaView>
    </AppCanvas>
  );
}
