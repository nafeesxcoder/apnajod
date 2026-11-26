/**
 * The bottom of the story editor, like Instagram's: the song's title (its
 * design, or none) above, then who the story goes to - Your stories or Close
 * Friends - and the round send button, in the app's colours.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
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
  /** The look's name, as the title chip shows it. */
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
  const closeLabel = closeCount ? `Close Friends · ${closeCount}` : "Close Friends";
  const sendColors: [string, string] = audience === "all" ? [palette.crimson, palette.navyDeep] : [CLOSE_GREEN, "#0E8A44"];

  return (
    <View style={[styles.wrap, { width }]}>
      {song && (
        <View style={styles.titleBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Song title"
            accessibilityState={{ expanded: titleOpen }}
            onPress={() => setTitleOpen((open) => !open)}
            style={styles.titleChip}
          >
            <View style={styles.disc}>
              <Ionicons name="musical-notes" size={13} color="#FFFFFF" />
            </View>
            <Text numberOfLines={1} style={styles.titleText}>
              {lookName}
            </Text>
            <Ionicons name={titleOpen ? "chevron-up" : "chevron-down"} size={16} color="#FFFFFF" />
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
                    <Ionicons name={design.icon} size={15} color={ink} />
                    <Text style={[styles.designLabel, { color: ink }]}>{design.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={styles.hintRow}>
        <Text style={styles.hint}>{hint}</Text>
        {audience === "close" && closeCount !== null && (
          <Pressable accessibilityRole="button" accessibilityLabel="Edit close friends list" onPress={onEditClose} hitSlop={8}>
            <Text style={styles.edit}>{closeCount === 0 ? "Choose friends" : "Edit list"}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.bar}>
        {(["all", "close"] as const).map((who) => {
          const on = audience === who;
          const ink = on ? palette.ink : "#FFFFFF";
          return (
            <Pressable
              key={who}
              accessibilityRole="button"
              accessibilityLabel={who === "all" ? "Audience: Your stories" : "Audience: Close Friends"}
              accessibilityState={{ selected: on }}
              onPress={() => onAudience(who)}
              onLongPress={who === "close" ? onEditClose : undefined}
              style={[styles.pill, on && styles.pillOn]}
            >
              {who === "all" ? (
                <Ionicons name="person-circle" size={24} color={on ? palette.crimson : "#FFFFFF"} />
              ) : (
                <View style={styles.starDisc}>
                  <Ionicons name="star" size={12} color="#FFFFFF" />
                </View>
              )}
              <Text numberOfLines={1} style={[styles.pillText, { color: ink }]}>
                {who === "all" ? "Your stories" : closeLabel}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={audience === "all" ? "Share to your story" : "Share to close friends"}
          onPress={() => onShare(audience)}
          disabled={busy}
          style={[styles.send, busy && { opacity: 0.85 }]}
        >
          <LinearGradient colors={sendColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendFill}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="arrow-forward" size={26} color="#FFFFFF" />}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = { textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 } as const;

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  titleBlock: { gap: 8, alignItems: "flex-start" },
  titleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingLeft: 5,
    paddingRight: 12,
    maxWidth: "90%",
    borderRadius: 20,
    backgroundColor: "rgba(20,16,46,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  disc: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.crimson, alignItems: "center", justifyContent: "center" },
  titleText: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" },
  designRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  design: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: "rgba(20,16,46,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  designOn: { backgroundColor: "#F3E8FF", borderColor: "#F3E8FF" },
  unavailable: { opacity: 0.35 },
  designLabel: { fontFamily: fonts.bodySemi, fontSize: 13 },
  hintRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 18 },
  hint: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.9)", ...shadow },
  edit: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#FFFFFF", textDecorationLine: "underline", ...shadow },
  bar: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 25,
    backgroundColor: "rgba(20,16,46,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillOn: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  pillText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14 },
  starDisc: { width: 22, height: 22, borderRadius: 11, backgroundColor: CLOSE_GREEN, alignItems: "center", justifyContent: "center" },
  send: { width: 56, height: 56, borderRadius: 28, overflow: "hidden" },
  sendFill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
