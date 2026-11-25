import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Modal } from "../../components/BackModal";
import { Pressable } from "../../components/Pressable";

/**
 * A photo, video or file opened from a chat, full screen. The top bar is the
 * one WhatsApp uses: back on the left, who sent it and when in the middle, and
 * save and forward on the right. An action with no handler is left off the bar.
 */
export function MediaViewer({
  visible,
  title,
  subtitle,
  onClose,
  onDownload,
  onForward,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  onDownload?: () => void;
  onForward?: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.bar}>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.titleBox}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {!!subtitle && (
                <Text numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              )}
            </View>
            {onDownload && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save"
                hitSlop={8}
                onPress={onDownload}
                style={styles.iconButton}
              >
                <Ionicons name="download-outline" size={24} color="#FFFFFF" />
              </Pressable>
            )}
            {onForward && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward"
                hitSlop={8}
                onPress={onForward}
                style={styles.iconButton}
              >
                <Ionicons name="arrow-redo-outline" size={24} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
        <View style={styles.body}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  bar: { backgroundColor: "rgba(0,0,0,0.6)" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBox: { flex: 1, paddingHorizontal: 4 },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  subtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
});
