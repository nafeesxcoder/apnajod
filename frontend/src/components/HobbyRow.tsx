import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Modal } from "./BackModal";
import { Ionicons } from "@expo/vector-icons";

import { MASTER_HOBBIES } from "../features/onboarding/screens/ProfileSetupScreen";
import { fonts, palette, radius, typeScale } from "../theme";

/** How many hobbies stay on the line; the rest sit behind "+N". */
const SHOWN = 3;

function hobbyIcon(label: string) {
  const wanted = String(label).trim().toLowerCase();
  return MASTER_HOBBIES.find((h) => h.label.toLowerCase() === wanted)?.icon;
}

function Chip({ label }: { label: string }) {
  const icon = hobbyIcon(label);
  return (
    <View
      style={{
        maxWidth: 130,
        flexShrink: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderColor: palette.rule,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
      }}
    >
      {!!icon && <Ionicons name={icon as any} size={12} color={palette.ink} />}
      <Text numberOfLines={1} style={{ fontSize: 11, color: palette.ink, fontFamily: fonts.bodySemi, flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Hobbies on one line. Extra ones sit behind "+N"; tapping it lists them all
 * in a small sheet, so the line never wraps.
 */
export function HobbyRow({ hobbies }: { hobbies: string[] }) {
  const [open, setOpen] = useState(false);
  const shown = hobbies.slice(0, SHOWN);
  const more = hobbies.length - shown.length;
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 16,
          overflow: "hidden",
        }}
      >
        {shown.map((hobby) => (
          <Chip key={hobby} label={hobby} />
        ))}
        {more > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show all ${hobbies.length} hobbies`}
            onPress={() => setOpen(true)}
            hitSlop={6}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: palette.paperSand,
            }}
          >
            <Text style={{ fontSize: 11, color: palette.navy, fontFamily: fonts.bodyBold }}>+{more}</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close hobbies"
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}
        >
          <Pressable
            onPress={() => undefined}
            style={{ backgroundColor: palette.paper, borderRadius: radius.lg, padding: 18, gap: 12 }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: typeScale.section, color: palette.ink }}>Hobbies</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {hobbies.map((hobby) => (
                <Chip key={hobby} label={hobby} />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
