import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, PanResponder, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Modal } from "../../../components/BackModal";
import { whiteCard } from "../../../components/brand";
import { PressScale } from "../../../components/motion";
import { fonts, palette, radius } from "../../../theme";
import { cropImageWeb } from "../cropImageWeb";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centredOffset,
  clampOffset,
  clampZoom,
  cropRect,
  refit,
  touchDistance,
  type Offset,
  type Size,
} from "../postCrop";

/**
 * Choosing the part of a photo that becomes the profile picture, in the
 * browser (the phone app uses the phone's own crop screen). The photo sits
 * behind a round window; drag it, pinch or use - / + to zoom, then "Use photo".
 */
export function DpCropSheet({
  uri,
  onCancel,
  onDone,
}: {
  /** The picked photo, or null when the sheet is closed. */
  uri: string | null;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
}) {
  // The top bar sits below the status bar on every phone (Android 15+ draws under it).
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const side = Math.round(Math.max(200, Math.min(windowWidth - 32, 420, windowHeight * 0.55)));
  const frame: Size = useMemo(() => ({ width: side, height: side }), [side]);

  const [photo, setPhoto] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFit = useRef<{ frame: Size; zoom: number } | null>(null);

  // Read the photo's size each time a new one comes in.
  useEffect(() => {
    setPhoto(null);
    setZoom(1);
    setError(null);
    setBusy(false);
    lastFit.current = null;
    if (!uri) return;
    let active = true;
    Image.getSize(
      uri,
      (width, height) => active && setPhoto({ width, height }),
      () => active && setError("That photo could not be opened."),
    );
    return () => {
      active = false;
    };
  }, [uri]);

  // Centre it first; afterwards keep the same point in the middle on zoom.
  useEffect(() => {
    if (!photo) return;
    if (!lastFit.current) setOffset(centredOffset(photo, frame, zoom));
    else setOffset((current) => refit(current, photo, lastFit.current!, { frame, zoom }));
    lastFit.current = { frame, zoom };
  }, [photo, frame, zoom]);

  const live = useRef({ photo, frame, zoom, offset });
  live.current = { photo, frame, zoom, offset };
  const gesture = useRef<{ start: Offset; pinch: number | null; pinchZoom: number }>({
    start: { x: 0, y: 0 },
    pinch: null,
    pinchZoom: 1,
  });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gesture.current = { start: live.current.offset, pinch: null, pinchZoom: live.current.zoom };
          setDragging(true);
        },
        onPanResponderMove: (event, state) => {
          const { photo: current, frame: currentFrame } = live.current;
          if (!current) return;
          const touches = event.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const distance = touchDistance(touches[0]!, touches[1]!);
            if (gesture.current.pinch == null) {
              gesture.current.pinch = distance;
              gesture.current.pinchZoom = live.current.zoom;
              return;
            }
            setZoom(clampZoom(gesture.current.pinchZoom * (distance / gesture.current.pinch)));
            return;
          }
          if (gesture.current.pinch != null) {
            gesture.current = { start: live.current.offset, pinch: null, pinchZoom: live.current.zoom };
            return;
          }
          const start = gesture.current.start;
          setOffset(clampOffset({ x: start.x + state.dx, y: start.y + state.dy }, current, currentFrame, live.current.zoom));
        },
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
      }),
    [],
  );

  const scale = photo ? Math.max(frame.width / photo.width, frame.height / photo.height) * zoom : 1;

  const done = async () => {
    if (!uri || !photo || busy) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await cropImageWeb(uri, cropRect(offset, photo, frame, zoom), 1));
    } catch (err: any) {
      setError(err?.message || "That photo could not be cropped.");
      setBusy(false);
    }
  };

  // The dim area round the circle: a ring whose hole is the circle.
  const ring = side;

  return (
    <Modal visible={!!uri} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: palette.paperBase }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
            paddingTop: Math.max(insets.top, Platform.OS === "android" ? 24 : 0) + 8,
            minHeight: 56,
            borderBottomWidth: 1,
            borderBottomColor: palette.rule,
            backgroundColor: palette.paper,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onCancel}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={24} color={palette.ink} />
          </Pressable>
          <Text accessibilityRole="header" style={{ flex: 1, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}>
            Profile photo
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use photo"
            disabled={!photo || busy}
            onPress={() => void done()}
            style={{ minWidth: 64, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            {busy ? (
              <ActivityIndicator color={palette.crimson} />
            ) : (
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: photo ? palette.crimson : palette.slate }}>Done</Text>
            )}
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: "center", padding: 16, gap: 18 }}>
          <View
            {...responder.panHandlers}
            accessibilityLabel="Photo. Drag to choose the part inside the circle."
            style={{
              width: side,
              height: side,
              overflow: "hidden",
              backgroundColor: palette.ink,
              ...(Platform.OS === "web"
                ? ({ cursor: dragging ? "grabbing" : "grab", touchAction: "none", userSelect: "none" } as object)
                : null),
            }}
          >
            {photo && uri ? (
              <View
                pointerEvents="none"
                style={{ position: "absolute", left: offset.x, top: offset.y, width: photo.width * scale, height: photo.height * scale }}
              >
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
              </View>
            ) : (
              !error && <ActivityIndicator color="#FFFFFF" style={{ flex: 1 }} />
            )}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: -ring,
                top: -ring,
                width: side + ring * 2,
                height: side + ring * 2,
                borderRadius: (side + ring * 2) / 2,
                borderWidth: ring,
                borderColor: "rgba(0,0,0,0.55)",
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: side,
                height: side,
                borderRadius: side / 2,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.85)",
              }}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <ZoomButton icon="remove" label="Zoom out" disabled={!photo || zoom <= MIN_ZOOM} onPress={() => setZoom(clampZoom(zoom - 0.25))} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink, minWidth: 52, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </Text>
            <ZoomButton icon="add" label="Zoom in" disabled={!photo || zoom >= MAX_ZOOM} onPress={() => setZoom(clampZoom(zoom + 0.25))} />
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, textAlign: "center" }}>
            Drag the photo to choose what shows in the circle. Pinch or use - / + to zoom.
          </Text>

          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Use photo"
            disabled={!photo || busy}
            onPress={() => void done()}
            style={{
              minHeight: 48,
              paddingHorizontal: 32,
              borderRadius: radius.pill,
              backgroundColor: palette.crimson,
              alignItems: "center",
              justifyContent: "center",
              opacity: !photo || busy ? 0.6 : 1,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#FFFFFF" }}>Use photo</Text>
          </PressScale>

          {!!error && (
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson, textAlign: "center" }}>
              {error}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ZoomButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: "add" | "remove";
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        ...whiteCard,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={22} color={palette.crimson} />
    </PressScale>
  );
}
