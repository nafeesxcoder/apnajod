import { useState, type ReactNode } from "react";
import { Image, Pressable, View } from "react-native";

import { Modal } from "./BackModal";

/**
 * Hold a photo to see it large, like Instagram: it shows while the finger is
 * down and goes when it lifts.
 */
export function ZoomPhoto({ uri, label, children }: { uri: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!uri) return <>{children}</>;
  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`${label}. Hold to enlarge`}
        delayLongPress={220}
        onLongPress={() => setOpen(true)}
        onPressOut={() => setOpen(false)}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center" }}>
          <Image source={{ uri }} resizeMode="cover" style={{ width: "86%", aspectRatio: 1, borderRadius: 999 }} />
        </View>
      </Modal>
    </>
  );
}
