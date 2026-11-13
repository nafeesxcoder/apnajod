import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { postApi } from "../../../api/postApi";
import { uploadPhoto } from "../../../api/uploadPhoto";
import { whiteCard } from "../../../components/brand";
import { PressScale } from "../../../components/motion";
import { fonts, palette, radius } from "../../../theme";
import { cropImageWeb } from "../cropImageWeb";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  POST_SHAPES,
  centredOffset,
  clampOffset,
  clampZoom,
  cropRect,
  frameSize,
  refit,
  touchDistance,
  type Offset,
  type PostShape,
  type Size,
} from "../postCrop";
import { MAX_CAPTION } from "./CaptionEditor";

export type PickedPhoto = { uri: string; width: number; height: number };

/**
 * Making a post, the Instagram way.
 *
 * 1. Size: Square 1:1, Portrait 4:5 or Landscape 1.91:1. On the web the
 *    photo sits in a frame of that shape; drag it, pinch or use - / + to
 *    zoom, until the part you want is inside. In the phone app the phone's
 *    own crop screen opens at the chosen shape.
 * 2. Caption, with the cropped photo beside it.
 * 3. Share - only now is anything uploaded, so backing out leaves nothing
 *    behind on the server.
 */
export function NewPostSheet({
  visible,
  accessToken,
  photos,
  onClose,
  onPosted,
}: {
  visible: boolean;
  accessToken: string;
  /**
   * The photos picked on the web (up to 5 - one post you swipe through).
   * Empty in the phone app, which picks inside the sheet.
   */
  photos: PickedPhoto[];
  onClose: () => void;
  onPosted?: () => void;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const [shape, setShape] = useState<PostShape>(POST_SHAPES[0]!);
  const [step, setStep] = useState<"crop" | "caption">("crop");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  // Which picked photo is being set in the frame, and how each one was set
  // (moved/zoomed), so going back to a photo finds it where you left it.
  const [index, setIndex] = useState(0);
  const photo: PickedPhoto | null = photos[index] ?? null;
  const placed = useRef(new Map<string, { offset: Offset; zoom: number }>());
  const [croppedUris, setCroppedUris] = useState<string[]>([]);
  const croppedUri = croppedUris[0] ?? null;
  const [nativePhoto, setNativePhoto] = useState<PickedPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frame: Size = useMemo(
    () => frameSize(shape.aspect, Math.min(windowWidth - 32, 480), Math.max(220, windowHeight * 0.52)),
    [shape.aspect, windowWidth, windowHeight],
  );

  // Fresh start every time the sheet opens with a new photo.
  useEffect(() => {
    if (!visible) return;
    setShape(POST_SHAPES[0]!);
    setStep("crop");
    setZoom(1);
    setCaption("");
    setError(null);
    setNativePhoto(null);
    setCroppedUris([]);
    setIndex(0);
    placed.current.clear();
    lastFit.current = null;
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, photos[0]?.uri]);

  // A new size changes every frame: each photo is centred again.
  useEffect(() => {
    placed.current.clear();
  }, [shape.id]);

  /** Switch the frame to another picked photo, keeping how this one was set. */
  const showPhoto = (next: number) => {
    if (next === index || !photos[next]) return;
    if (photo) placed.current.set(photo.uri, { offset, zoom });
    const saved = placed.current.get(photos[next]!.uri);
    lastFit.current = null;
    setZoom(saved?.zoom ?? 1);
    if (saved) {
      setOffset(saved.offset);
      lastFit.current = { frame, zoom: saved.zoom };
    }
    setIndex(next);
  };

  // Centre the photo whenever the frame first fits it.
  const lastFit = useRef<{ frame: Size; zoom: number } | null>(null);
  useEffect(() => {
    if (!photo) return;
    if (!lastFit.current) {
      setOffset(centredOffset(photo, frame, zoom));
    } else {
      setOffset((current) => refit(current, photo, lastFit.current!, { frame, zoom }));
    }
    lastFit.current = { frame, zoom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.uri, frame.width, frame.height, zoom]);
  useEffect(() => {
    lastFit.current = null;
  }, [visible]);

  // Latest values for the gesture handlers, which are made once.
  const live = useRef({ photo, frame, zoom, offset });
  live.current = { photo, frame, zoom, offset };
  const gesture = useRef<{ start: Offset; pinch: number | null; pinchZoom: number }>({
    start: { x: 0, y: 0 },
    pinch: null,
    pinchZoom: 1,
  });
  const [dragging, setDragging] = useState(false);

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
            // A finger lifted mid-pinch: carry on dragging from here.
            gesture.current = { start: live.current.offset, pinch: null, pinchZoom: live.current.zoom };
            return;
          }
          const start = gesture.current.start;
          setOffset(
            clampOffset({ x: start.x + state.dx, y: start.y + state.dy }, current, currentFrame, live.current.zoom),
          );
        },
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
      }),
    [],
  );

  const shownPhoto = isWeb ? photo : nativePhoto;
  const scale = photo ? Math.max(frame.width / photo.width, frame.height / photo.height) * zoom : 1;

  const pickOnPhone = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to post a picture.");
      return;
    }
    const aspect: [number, number] = shape.id === "portrait" ? [4, 5] : shape.id === "landscape" ? [191, 100] : [1, 1];
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect,
      quality: 0.85,
    });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    setNativePhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    setCroppedUris([asset.uri]);
    setStep("caption");
  };

  const next = async () => {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      // Every photo is cut to the same size, each as it was set in the frame
      // (or centred, if it was never opened).
      if (photo) placed.current.set(photo.uri, { offset, zoom });
      const cut: string[] = [];
      for (const item of photos) {
        const set = placed.current.get(item.uri) ?? { offset: centredOffset(item, frame, 1), zoom: 1 };
        cut.push(await cropImageWeb(item.uri, cropRect(set.offset, item, frame, set.zoom), shape.aspect));
      }
      setCroppedUris(cut);
      setStep("caption");
    } catch (err: any) {
      setError(err?.message || "That photo could not be cropped.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!croppedUri || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Uploaded first: the server stores URLs, never device paths. One at a
      // time, so a small server is not hit with five uploads at once.
      const urls: string[] = [];
      for (const uri of croppedUris) urls.push(await uploadPhoto(uri, accessToken));
      await postApi.create(accessToken, urls[0]!, caption.trim(), shape.aspect, urls);
      onPosted?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not post that photo.");
    } finally {
      setBusy(false);
    }
  };

  const title = step === "crop" ? "New post" : "Caption";
  const canNext = !!photo && !busy;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.paperBase }}>
        {/* Top bar: back / title / next or share - Instagram's layout. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
            paddingTop: Platform.OS === "ios" ? 48 : 8,
            minHeight: 56,
            borderBottomWidth: 1,
            borderBottomColor: palette.rule,
            backgroundColor: palette.paper,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step === "crop" ? "Cancel post" : "Back to size"}
            onPress={() => {
              if (step === "caption" && isWeb) setStep("crop");
              else if (step === "caption") {
                setStep("crop");
                setNativePhoto(null);
              } else onClose();
            }}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={step === "crop" ? "close" : "arrow-back"} size={24} color={palette.ink} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{ flex: 1, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 17, color: palette.ink }}
          >
            {title}
          </Text>
          {step === "crop" && !isWeb ? (
            <View style={{ minWidth: 64 }} />
          ) : step === "crop" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              disabled={!canNext}
              onPress={() => void next()}
              style={{ minWidth: 64, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              {busy ? (
                <ActivityIndicator color={palette.crimson} />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    fontSize: 16,
                    color: canNext ? palette.crimson : palette.slate,
                  }}
                >
                  Next
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share post"
              disabled={busy}
              onPress={() => void share()}
              style={{ minWidth: 64, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              {busy ? (
                <ActivityIndicator color={palette.crimson} />
              ) : (
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: palette.crimson }}>Share</Text>
              )}
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ alignItems: "center", padding: 16, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!dragging}
        >
          {step === "crop" ? (
            <>
              {isWeb && photo ? (
                <View
                  {...responder.panHandlers}
                  accessibilityLabel="Photo. Drag to move it inside the frame."
                  style={{
                    width: frame.width,
                    height: frame.height,
                    overflow: "hidden",
                    borderRadius: 4,
                    backgroundColor: palette.ink,
                    ...(Platform.OS === "web" ? ({ cursor: dragging ? "grabbing" : "grab", touchAction: "none", userSelect: "none" } as object) : null),
                  }}
                >
                  {/* Wrapped so the browser never starts its own image drag. */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: offset.x,
                      top: offset.y,
                      width: photo.width * scale,
                      height: photo.height * scale,
                    }}
                  >
                    <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} />
                  </View>
                  {/* Rule-of-thirds grid while dragging, as Instagram shows. */}
                  {dragging && (
                    <View pointerEvents="none" style={{ position: "absolute", inset: 0 } as never}>
                      {[1, 2].map((n) => (
                        <View
                          key={`v${n}`}
                          style={{ position: "absolute", top: 0, bottom: 0, left: (frame.width * n) / 3, width: 1, backgroundColor: "rgba(255,255,255,0.55)" }}
                        />
                      ))}
                      {[1, 2].map((n) => (
                        <View
                          key={`h${n}`}
                          style={{ position: "absolute", left: 0, right: 0, top: (frame.height * n) / 3, height: 1, backgroundColor: "rgba(255,255,255,0.55)" }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View
                  style={{
                    width: frame.width,
                    height: frame.height,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: palette.crimsonSoft,
                    backgroundColor: palette.paper,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="image-outline" size={34} color={palette.crimson} />
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.slate }}>
                    {shape.label} {shape.ratio}
                  </Text>
                </View>
              )}

              {isWeb && photos.length > 1 && (
                // The picked photos: tap one to set it in the frame. They all
                // share the size chosen below.
                <View style={{ gap: 6, alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.slate }}>
                    Photo {index + 1} of {photos.length} · tap one to set it
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {photos.map((item, i) => (
                      <Pressable
                        key={item.uri}
                        accessibilityRole="button"
                        accessibilityState={{ selected: i === index }}
                        accessibilityLabel={`Photo ${i + 1}`}
                        onPress={() => showPhoto(i)}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          overflow: "hidden",
                          borderWidth: 2,
                          borderColor: i === index ? palette.crimson : "transparent",
                        }}
                      >
                        <Image source={{ uri: item.uri }} style={{ width: "100%", height: "100%" }} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate }}>
                Choose a size
              </Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {POST_SHAPES.map((item) => {
                  const selected = item.id === shape.id;
                  return (
                    <PressScale
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${item.label} ${item.ratio}`}
                      onPress={() => setShape(item)}
                      style={{
                        minHeight: 48,
                        minWidth: 96,
                        paddingHorizontal: 14,
                        borderRadius: radius.md,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        ...(selected ? { backgroundColor: palette.crimson } : whiteCard),
                      }}
                    >
                      <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                        <View
                          style={{
                            width: item.aspect >= 1 ? 22 : 22 * item.aspect,
                            height: item.aspect >= 1 ? 22 / item.aspect : 22,
                            borderWidth: 2,
                            borderRadius: 3,
                            borderColor: selected ? "#FFFFFF" : palette.crimson,
                          }}
                        />
                      </View>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: selected ? "#FFFFFF" : palette.ink }}>
                        {item.label}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, fontSize: 11, color: selected ? "#FFFFFF" : palette.slate }}>
                        {item.ratio}
                      </Text>
                    </PressScale>
                  );
                })}
              </View>

              {isWeb && photo ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <ZoomButton icon="remove" label="Zoom out" disabled={zoom <= MIN_ZOOM} onPress={() => setZoom(clampZoom(zoom - 0.25))} />
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink, minWidth: 52, textAlign: "center" }}>
                      {Math.round(zoom * 100)}%
                    </Text>
                    <ZoomButton icon="add" label="Zoom in" disabled={zoom >= MAX_ZOOM} onPress={() => setZoom(clampZoom(zoom + 0.25))} />
                  </View>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, textAlign: "center" }}>
                    Drag the photo to move it. Pinch or use - / + to zoom.
                  </Text>
                </>
              ) : (
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="Choose photo"
                  onPress={() => void pickOnPhone()}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: 28,
                    borderRadius: radius.pill,
                    backgroundColor: palette.crimson,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#FFFFFF" }}>Choose photo</Text>
                </PressScale>
              )}
            </>
          ) : (
            <View style={{ width: "100%", maxWidth: 520, gap: 14 }}>
              <View style={{ ...whiteCard, flexDirection: "row", gap: 12, padding: 12 }}>
                {!!croppedUri && (
                  <Image
                    source={{ uri: croppedUri }}
                    style={{
                      width: 72,
                      aspectRatio: shape.aspect,
                      borderRadius: 6,
                      backgroundColor: palette.paperSand,
                    }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <TextInput
                    accessibilityLabel="Post caption"
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Write a caption..."
                    placeholderTextColor={palette.slate}
                    multiline
                    maxLength={MAX_CAPTION}
                    style={[
                      { minHeight: 84, fontSize: 15, fontFamily: fonts.body, color: palette.ink, textAlignVertical: "top" },
                      Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null,
                    ]}
                  />
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: palette.slate, textAlign: "right" }}>
                    {caption.length}/{MAX_CAPTION}
                  </Text>
                </View>
              </View>
              {!!shownPhoto && (
                <Image
                  source={{ uri: croppedUri ?? shownPhoto.uri }}
                  accessibilityLabel={`Preview, ${shape.label} ${shape.ratio}`}
                  style={{ width: "100%", aspectRatio: shape.aspect, borderRadius: 6, backgroundColor: palette.paperSand }}
                />
              )}
              {croppedUris.length > 1 && (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.slate }}>
                    {croppedUris.length} photos · people swipe through them in your post
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {croppedUris.map((uri, i) => (
                      <Image
                        key={uri}
                        source={{ uri }}
                        accessibilityLabel={`Photo ${i + 1}`}
                        style={{ width: 56, aspectRatio: shape.aspect, borderRadius: 6, backgroundColor: palette.paperSand }}
                      />
                    ))}
                  </View>
                </View>
              )}
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Share"
                disabled={busy}
                onPress={() => void share()}
                style={{
                  minHeight: 50,
                  borderRadius: radius.pill,
                  backgroundColor: palette.crimson,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy && <ActivityIndicator color="#FFFFFF" size="small" />}
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: "#FFFFFF" }}>
                  {busy ? "Sharing..." : "Share"}
                </Text>
              </PressScale>
            </View>
          )}

          {!!error && (
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson, textAlign: "center" }}>
              {error}
            </Text>
          )}
        </ScrollView>
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
