import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const GAP = 4;
const MAX_WIDTH = 430;
const LINE = "#F0EAE0";

/**
 * Three square photos per row, like Instagram. Tapping one opens it full
 * screen; swipe (or use the arrows / arrow keys on desktop) to move between
 * photos, and close with the X.
 */
export function PhotoGrid({ photos }: { photos: string[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginHorizontal: -GAP / 2,
        }}
      >
        {photos.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open photo ${index + 1} of ${photos.length}`}
            onPress={() => setOpenAt(index)}
            style={({ pressed }) => ({
              width: "33.3333%",
              aspectRatio: 1,
              padding: GAP / 2,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Image
              source={{ uri }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 6,
                backgroundColor: LINE,
              }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>

      <PhotoViewer
        photos={photos}
        startIndex={openAt}
        onClose={() => setOpenAt(null)}
      />
    </>
  );
}

function PhotoViewer({
  photos,
  startIndex,
  onClose,
}: {
  photos: string[];
  startIndex: number | null;
  onClose: () => void;
}) {
  const visible = startIndex !== null && photos.length > 0;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = photos.length - 1;

  // Open on the photo that was tapped.
  useEffect(() => {
    if (startIndex === null) return;
    setPage(startIndex);
    if (!size.width) return;
    const timer = setTimeout(
      () =>
        scroller.current?.scrollTo({ x: startIndex * size.width, animated: false }),
      0,
    );
    return () => clearTimeout(timer);
  }, [startIndex, size.width]);

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(last, target));
    scroller.current?.scrollTo({ x: next * size.width, animated: true });
    setPage(next);
  };

  // Desktop keyboard: left / right arrows and Escape.
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(page + 1);
      if (event.key === "ArrowLeft") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!size.width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / size.width);
    if (next >= 0 && next <= last && next !== page) setPage(next);
  };

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: MAX_WIDTH }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Top bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close photo"
                hitSlop={12}
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}
              >
                {`${page + 1} / ${photos.length}`}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Photos */}
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scroller}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={onScroll}
                onLayout={(event) =>
                  setSize({
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                  })
                }
                style={{ flex: 1 }}
              >
                {size.width > 0 &&
                  photos.map((uri, index) => (
                    <View
                      key={`${uri}-${index}`}
                      style={{
                        width: size.width,
                        height: size.height,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: size.width, height: size.height }}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
              </ScrollView>

              {page > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous photo"
                  onPress={() => goTo(page - 1)}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    marginTop: -20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </Pressable>
              )}
              {page < last && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next photo"
                  onPress={() => goTo(page + 1)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    marginTop: -20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
