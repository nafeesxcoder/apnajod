/**
 * The song's sticker on a story, like Instagram: a card (cover, title,
 * artist and moving sound bars), a small pill, or the words as the song
 * plays, in three looks. Sized to a story `width` pixels wide.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { fonts, palette } from "../../theme";
import { STORY_FONTS } from "./editor/fonts";
import { lineAt, type LyricFont, type LyricLine, type MusicStyle } from "./music/lyrics";

export type StickerMusic = { title: string; artist: string; coverUrl?: string | null; lyrics?: LyricLine[] };

const shadow = { shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 } as const;

/** Three little bars that bounce while the song plays. */
function SoundBars({ size, color, playing }: { size: number; color: string; playing: boolean }) {
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current;
  useEffect(() => {
    if (!playing) return;
    const loops = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration: 260 + i * 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.25, duration: 260 + i * 70, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [playing, bars]);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: size * 0.14, height: size }}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: size * 0.2,
            height: size,
            borderRadius: size,
            backgroundColor: color,
            // Grows from the bottom: scale around the middle, then move it down by the same amount.
            transform: [
              { scaleY: bar },
              { translateY: bar.interpolate({ inputRange: [0, 1], outputRange: [size / 2, 0] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function Cover({ music, size }: { music: StickerMusic; size: number }) {
  if (music.coverUrl) return <Image source={{ uri: music.coverUrl }} style={{ width: size, height: size, borderRadius: size * 0.14 }} />;
  return (
    <LinearGradient colors={["#B91C3C", "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.14, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.5 }}>♫</Text>
    </LinearGradient>
  );
}

/** The words: the line playing now, changing with a small rise and fade. */
function Lyrics({ music, time, font, u }: { music: StickerMusic; time: number; font: LyricFont; u: number }) {
  const lines = music.lyrics ?? [];
  const index = lineAt(lines, time);
  const line = index >= 0 ? lines[index]!.text : "";
  const shown = line || (index >= 0 ? "♪ ♪ ♪" : `♫ ${music.title}`);
  const appear = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, appear]);

  const size = 0.068 * u;
  const width = 0.8 * u;
  const text =
    font === "box" ? (
      <View style={{ alignItems: "center", gap: size * 0.12 }}>
        <Text
          style={{
            fontFamily: STORY_FONTS.typewriter.family,
            fontSize: size * 0.92,
            lineHeight: size * 1.35,
            color: palette.ink,
            backgroundColor: "#FFFFFF",
            paddingHorizontal: size * 0.4,
            borderRadius: size * 0.2,
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          {shown}
        </Text>
      </View>
    ) : (
      <Text
        style={{
          fontFamily: font === "glow" ? fonts.display : fonts.bodyBold,
          fontSize: font === "glow" ? size * 1.08 : size,
          lineHeight: size * 1.3,
          color: "#FFFFFF",
          textAlign: "center",
          textShadowColor: font === "glow" ? "rgba(255,80,160,0.95)" : "rgba(0,0,0,0.55)",
          textShadowRadius: font === "glow" ? size * 0.45 : size * 0.12,
          textShadowOffset: { width: 0, height: font === "glow" ? 0 : size * 0.04 },
          ...(Platform.OS === "web" && font === "glow" ? ({ textShadow: `0 0 ${size * 0.35}px #FF4FA0, 0 0 ${size * 0.8}px #A855F7` } as object) : null),
        }}
      >
        {shown}
      </Text>
    );
  return (
    <View accessibilityLabel={line ? `Lyrics: ${line}` : `Song: ${music.title}`} style={{ width, alignItems: "center", gap: size * 0.35 }}>
      <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [size * 0.5, 0] }) }] }}>{text}</Animated.View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.2, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: size, paddingHorizontal: size * 0.35, paddingVertical: size * 0.08 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: size * 0.36, color: "#FFFFFF" }} numberOfLines={1}>
          ♫ {music.title}
          {music.artist ? ` · ${music.artist}` : ""}
        </Text>
      </View>
    </View>
  );
}

export function MusicSticker({
  music,
  style,
  lyricFont = "classic",
  width,
  time,
  playing = true,
}: {
  music: StickerMusic;
  style: MusicStyle;
  lyricFont?: LyricFont;
  width: number;
  /** Seconds into the song now (for the words). */
  time: number;
  playing?: boolean;
}) {
  const u = width;
  if (style === "lyrics" && music.lyrics?.length) return <Lyrics music={music} time={time} font={lyricFont} u={u} />;

  if (style === "pill") {
    const size = 0.042 * u;
    return (
      <View accessibilityLabel={`Song: ${music.title}`} style={{ flexDirection: "row", alignItems: "center", gap: size * 0.5, backgroundColor: "#FFFFFF", borderRadius: size * 2, paddingHorizontal: size * 0.8, paddingVertical: size * 0.45, maxWidth: 0.72 * u, ...shadow }}>
        <SoundBars size={size * 0.9} color={palette.crimson} playing={playing} />
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: size, lineHeight: size * 1.25, color: palette.ink }}>
          {music.title}
          {music.artist ? <Text style={{ fontFamily: fonts.body, color: palette.slate }}>{` · ${music.artist}`}</Text> : null}
        </Text>
      </View>
    );
  }

  // Card.
  const cover = 0.15 * u;
  return (
    <View
      accessibilityLabel={`Song: ${music.title}${music.artist ? ` by ${music.artist}` : ""}`}
      style={{ width: 0.64 * u, flexDirection: "row", alignItems: "center", gap: 0.03 * u, backgroundColor: "#FFFFFF", borderRadius: 0.04 * u, padding: 0.022 * u, ...shadow }}
    >
      <Cover music={music} size={cover} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 0.045 * u, lineHeight: 0.056 * u, color: palette.ink }}>
          {music.title}
        </Text>
        {!!music.artist && (
          <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 0.036 * u, lineHeight: 0.046 * u, color: palette.slate }}>
            {music.artist}
          </Text>
        )}
      </View>
      <View style={{ paddingRight: 0.015 * u }}>
        <SoundBars size={0.04 * u} color={palette.crimson} playing={playing} />
      </View>
    </View>
  );
}
