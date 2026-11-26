/**
 * The story's bottom dock, a frosted glass card over the photo: the song's
 * title (its design, or none), who the story goes to, and the share button.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { fonts, palette } from "../../../theme";
import { CLOSE_GREEN } from "../CloseFriendsSheet";
import type { LyricFont } from "../music/lyrics";
import type { SongLook } from "./model";

export type Audience = "all" | "close";

type Design = {
  key: "card" | "pill" | "lyrics" | "none";
  label: string;
  icon: "card-outline" | "ellipse-outline" | "text-outline" | "eye-off-outline";
  look: SongLook | null;
  available: boolean;
};

export function StoryDock({
  width,
  song,
  look,
  lookName,
  hasWords,
  onLook,
  audience,
  onAudience,
  closeCount,
  onEditClose,
  onShare,
  busy,
  hint,
}: {
  width: number;
  /** A song is on the story, so its title is offered. */
  song: boolean;
  /** The title's look now, or null for no title. */
  look: SongLook | null;
  /** The look's name, as the title row shows it. */
  lookName: string;
  /** The song's clip has words, so the Lyrics design can be used. */
  hasWords: boolean;
  onLook: (look: SongLook | null) => void;
  audience: Audience;
  onAudience: (audience: Audience) => void;
  /** How many are on the close friends list (null until known). */
  closeCount: number | null;
  onEditClose: () => void;
  onShare: (audience: Audience) => void;
  busy: boolean;
  hint: string;
}) {
  const [titleOpen, setTitleOpen] = useState(false);
  const wordsFont: LyricFont = (look?.style === "lyrics" && look.lyricFont) || "classic";
  const designs: Design[] = [
    { key: "card", label: "Card", icon: "card-outline", look: { style: "card" }, available: true },
    { key: "pill", label: "Small", icon: "ellipse-outline", look: { style: "pill" }, available: true },
    { key: "lyrics", label: "Lyrics", icon: "text-outline", look: { style: "lyrics", lyricFont: wordsFont }, available: hasWords },
    { key: "none", label: "No title", icon: "eye-off-outline", look: null, available: true },
  ];
  const chosen = look ? look.style : "none";
  const closeLabel = closeCount ? `Close friends · ${closeCount}` : "Close friends";

  return (
    <View style={[styles.dock, { width }]}>
      <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={styles.inner}>
        {song && (
          <View style={styles.titleBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Song title"
              accessibilityState={{ expanded: titleOpen }}
              onPress={() => setTitleOpen((open) => !open)}
              style={styles.titleRow}
            >
              <View style={styles.disc}>
                <Ionicons name="musical-notes" size={15} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titleKicker}>Song title</Text>
                <Text numberOfLines={1} style={styles.titleValue}>
                  {lookName}
                </Text>
              </View>
              <Ionicons name={titleOpen ? "chevron-up" : "chevron-down"} size={18} color="#FFFFFF" />
            </Pressable>
            {titleOpen && (
              <View style={styles.designRow}>
                {designs.map((design) => {
                  const on = design.key === chosen;
                  const ink = on ? palette.ink : "#FFFFFF";
                  return (
                    <Pressable
                      key={design.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Title: ${design.label}`}
                      accessibilityState={{ selected: on, disabled: !design.available }}
                      disabled={!design.available}
                      onPress={() => {
                        onLook(design.look);
                        setTitleOpen(false);
                      }}
                      style={[styles.design, on && styles.designOn, !design.available && styles.unavailable]}
                    >
                      <Ionicons name={design.icon} size={18} color={ink} />
                      <Text style={[styles.designLabel, { color: ink }]}>{design.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={styles.segment}>
          {(["all", "close"] as const).map((who) => {
            const on = audience === who;
            const ink = on ? palette.ink : "#FFFFFF";
            return (
              <Pressable
                key={who}
                accessibilityRole="button"
                accessibilityLabel={who === "all" ? "Audience: your story" : "Audience: close friends"}
                accessibilityState={{ selected: on }}
                onPress={() => onAudience(who)}
                onLongPress={who === "close" ? onEditClose : undefined}
                style={[styles.segmentItem, on && styles.segmentOn]}
              >
                <Ionicons name={who === "all" ? "globe-outline" : "star"} size={15} color={ink} />
                <Text style={[styles.segmentLabel, { color: ink }]}>{who === "all" ? "Your story" : closeLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={audience === "all" ? "Share to your story" : "Share to close friends"}
          onPress={() => onShare(audience)}
          disabled={busy}
          style={[styles.shareWrap, busy && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={audience === "all" ? [palette.crimson, palette.navyDeep] : [CLOSE_GREEN, "#0E8A44"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.share}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name={audience === "all" ? "paper-plane" : "star"} size={18} color="#FFFFFF" />}
            <Text style={styles.shareLabel}>{busy ? "Sharing..." : audience === "all" ? "Share to your story" : "Share to close friends"}</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.captionRow}>
          <Text style={styles.caption}>{hint}</Text>
          {audience === "close" && closeCount !== null && (
            <Pressable accessibilityRole="button" accessibilityLabel="Edit close friends list" onPress={onEditClose} hitSlop={8}>
              <Text style={styles.edit}>{closeCount === 0 ? "Choose friends" : "Edit list"}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  tint: { backgroundColor: "rgba(20,16,46,0.42)" },
  inner: { padding: 12, gap: 10 },
  titleBlock: { gap: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  disc: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.crimson, alignItems: "center", justifyContent: "center" },
  titleKicker: { fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.7)" },
  titleValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" },
  designRow: { flexDirection: "row", gap: 6 },
  design: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  designOn: { backgroundColor: "#FFFFFF" },
  unavailable: { opacity: 0.35 },
  designLabel: { fontFamily: fonts.bodySemi, fontSize: 12 },
  segment: { flexDirection: "row", padding: 4, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)" },
  segmentItem: { flex: 1, height: 40, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  segmentOn: { backgroundColor: "#FFFFFF" },
  segmentLabel: { fontFamily: fonts.bodyBold, fontSize: 14 },
  shareWrap: { borderRadius: 27, overflow: "hidden" },
  share: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFFFFF" },
  captionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 4 },
  caption: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.8)" },
  edit: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#FFFFFF", textDecorationLine: "underline" },
});
