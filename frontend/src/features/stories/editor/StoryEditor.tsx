import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { Modal } from "../../../components/BackModal";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { storyApi } from "../../../api/storyApi";
import { fonts, palette } from "../../../theme";
import { Sheet, useVisibleHeight } from "../../posts/PostSheets";
import { backdropFor, bakeStory } from "./bake";
import { FILTERS, cssFilter, filterById, nativeFilter } from "./filters";
import { DraggableItem, DrawCapture, StrokeView } from "./layers";
import {
  COLORS,
  EMPTY_STATE,
  FRAME_ASPECT,
  STROKE_SIZES,
  TEXT_SIZE,
  addItem,
  addStroke,
  eraseAt,
  isEdited,
  newId,
  overTrash,
  clampCrop,
  coverZoom,
  cropRect,
  NO_CROP,
  pushHistory,
  isLive,
  liveStickers,
  MAX_MENTIONS,
  removeItem,
  setMusic,
  setSongLook,
  songLook,
  songLookLabel,
  toFront,
  updateItem,
  type Crop,
  type EditorState,
  type PollItem,
  type QuestionItem,
  type Stroke,
  type TextItem,
} from "./model";
import { StickerSheet } from "./StickerSheet";
import { MusicSheet } from "../music/MusicSheet";
import { StoryDock, type Audience } from "./StoryDock";
import { LiveComposer, type PollDraft, type QuestionDraft } from "./LiveComposer";
import { MentionSheet } from "./MentionSheet";
import { createClipPlayer } from "../music/clipPlayer";
import { clipLines, nextMusicLook } from "../music/lyrics";
import { TextComposer, type TextDraft } from "./TextComposer";
import { TEXT_STORY_SCALE, stepTheme, textThemesWith } from "./themes";
import { currentFestival } from "../../festival/festivalStore";
import { CloseFriendsSheet } from "../CloseFriendsSheet";
import { closeFriendsApi } from "../../../api/closeFriendsApi";

/** The photo picked for a story - or, with `text`, a text story on a coloured background. */
export type PickedStoryPhoto = { uri: string; width: number; height: number; text?: boolean };

type Mode = "idle" | "text" | "draw" | "filters" | "live";
type Tool = "pen" | "marker" | "eraser";
type Pose = { x: number; y: number; scale: number; rotation: number };

const filterStyle = (id: string): object => {
  const steps = filterById(id).steps;
  if (!steps.length) return {};
  return Platform.OS === "web" ? { filter: cssFilter(steps) } : { filter: nativeFilter(steps) };
};

/**
 * Making a story, Instagram's way: swipe the photo for a filter, add text
 * (Aa), stickers and emoji, draw on it, undo, then share. Everything is put
 * together on the phone into one photo; only that photo goes to the server.
 */
export function StoryEditor({
  photo,
  accessToken,
  onClose,
  onShared,
}: {
  photo: PickedStoryPhoto | null;
  accessToken: string;
  onClose: () => void;
  onShared: () => void;
}) {
  const screenHeight = useVisibleHeight();
  const { width: screenWidth } = useWindowDimensions();
  let fw = Math.min(screenWidth, screenHeight * FRAME_ASPECT);
  let fh = fw / FRAME_ASPECT;
  if (fh > screenHeight) {
    fh = screenHeight;
    fw = fh * FRAME_ASPECT;
  }
  const frame = { width: fw, height: fh };
  /** Room under the story on a tall screen - the share button goes there. */
  const below = screenHeight - fh;

  const [state, setState] = useState<EditorState>(EMPTY_STATE);
  const stateRef = useRef(state);
  // Undo steps live in a ref (changed outside React's updaters); the count is state so the button shows.
  const historyRef = useRef<EditorState[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const setHistory = (next: EditorState[]) => {
    historyRef.current = next;
    setHistoryCount(next.length);
  };
  const remember = () => setHistory(pushHistory(historyRef.current, stateRef.current));
  const [mode, setMode] = useState<Mode>("idle");
  const [editing, setEditing] = useState<string | null>(null);
  const [stickers, setStickers] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  // Who the story goes to: everyone who follows you, or your close friends.
  const [audience, setAudience] = useState<Audience>("all");
  const [mentionOpen, setMentionOpen] = useState(false);
  // The poll / question being made or changed (with the sticker's id when changing one).
  const [liveDraft, setLiveDraft] = useState<{ kind: "poll" | "question"; id: string | null } | null>(null);
  // While the photo is put together, live stickers are hidden (they stay live, not drawn in).
  const [hideLive, setHideLive] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<Pose | null>(null);
  const [backdrop, setBackdrop] = useState<[string, string]>(["#1B1B1F", "#0B0B0D"]);
  // A text story: no photo, a coloured background you swipe through.
  const textStory = !!photo?.text;
  const [theme, setTheme] = useState(0);
  // Close friends: how many are on your list (null until known), and the list sheet.
  const [closeCount, setCloseCount] = useState<number | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#FFFFFF");
  const [penSize, setPenSize] = useState<keyof typeof STROKE_SIZES>("M");
  const [live, setLive] = useState<Stroke | null>(null);
  const liveRef = useRef<Stroke | null>(null);
  const lastWheel = useRef(0);
  const frameRef = useRef<View>(null);
  const toast = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState("");


  useEffect(() => {
    if (!photo) return;
    stateRef.current = EMPTY_STATE;
    setState(EMPTY_STATE);
    setHistory([]);
    setMode("idle");
    setEditing(null);
    setError("");
    setBusy(false);
    setCloseCount(null);
    void closeFriendsApi
      .list(accessToken)
      .then((list) => setCloseCount(list.filter((p) => p.closeFriend).length))
      .catch(() => undefined);
    if (photo.text) {
      // Straight to typing, like Instagram's Create mode.
      themeRef.current = 0;
      setTheme(0);
      // A festival on now puts its backgrounds first.
      textThemesRef.current = textThemesWith(currentFestival());
      setBackdrop(textThemesRef.current[0]!.colors);
      setMode("text");
    } else void backdropFor(photo.uri).then(setBackdrop);
  }, [photo]);

  const themeRef = useRef(0);
  const textThemesRef = useRef(textThemesWith(null));
  const changeTheme = (direction: 1 | -1) => {
    const list = textThemesRef.current;
    const next = stepTheme(themeRef.current, direction, list.length);
    themeRef.current = next;
    setTheme(next);
    setBackdrop(list[next]!.colors);
    showToast(list[next]!.name);
  };

  // The story's song plays (on repeat) while you edit, like Instagram.
  const song = state.music;
  const [songTime, setSongTime] = useState(0);
  useEffect(() => {
    if (!photo || !song || musicOpen) return;
    const clip = createClipPlayer(song.url, song.start, song.length, true);
    clip.play();
    // A clock for the words on the song's sticker, in step with the repeat.
    const began = Date.now();
    const timer = setInterval(() => setSongTime(song.start + (((Date.now() - began) / 1000) % song.length)), 200);
    return () => {
      clip.stop();
      clearInterval(timer);
    };
  }, [photo, song?.trackId, song?.start, song?.length, musicOpen]);
  // The song's sticker shows only the words of the part the story plays.
  const stickerMusic = song ? { title: song.title, artist: song.artist, coverUrl: song.coverUrl, lyrics: clipLines(song.lyrics, song.start, song.length) } : null;

  const commit = (next: EditorState, keep = true) => {
    if (next === stateRef.current) return;
    if (keep) remember();
    stateRef.current = next;
    setState(next);
  };
  const undo = () => {
    const h = historyRef.current;
    const previous = h[h.length - 1];
    if (!previous) return;
    setHistory(h.slice(0, -1));
    stateRef.current = previous;
    setState(previous);
  };

  const showToast = (text: string) => {
    setToastText(text);
    toast.setValue(1);
    Animated.timing(toast, { toValue: 0, duration: 1100, delay: 400, useNativeDriver: Platform.OS !== "web" }).start();
  };
  const setFilter = (id: string) => {
    commit({ ...stateRef.current, filter: id });
    showToast(filterById(id).name);
  };
  const stepFilter = (direction: 1 | -1) => {
    // On a text story the swipe changes the background instead.
    if (textStory) return changeTheme(direction);
    const index = FILTERS.findIndex((f) => f.id === stateRef.current.filter);
    const next = FILTERS[(index + direction + FILTERS.length) % FILTERS.length]!;
    setFilter(next.id);
  };
  const stepRef = useRef(stepFilter);
  stepRef.current = stepFilter;

  // The photo: pinch it to zoom, drag it to move it once it is zoomed in, and swipe left or right for the next filter.
  // The gestures come from react-native-gesture-handler, which reads two fingers from the phone's own touch system.
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const photoSizeRef = useRef<{ w: number; h: number } | null>(null);
  photoSizeRef.current = photo && !photo.text ? { w: photo.width, h: photo.height } : null;
  const frameSizeRef = useRef({ w: fw, h: fh });
  frameSizeRef.current = { w: fw, h: fh };
  const photoStart = useRef<Crop>(NO_CROP);
  const photoChanged = useRef(false);
  const photoFingers = useRef(1);
  const photoGesture = useMemo(() => {
    // Only on the photo itself: while drawing or typing, the touches belong to those.
    const live = mode === "idle" || mode === "filters";
    // The first change keeps the photo as it was before the gesture, for undo.
    const beginChange = () => {
      if (!photoChanged.current) {
        remember();
        photoChanged.current = true;
      }
    };
    const pinch = Gesture.Pinch()
      .enabled(live)
      .onStart(() => {
        photoStart.current = stateRef.current.crop;
        photoChanged.current = false;
      })
      .onUpdate((e) => {
        const size = photoSizeRef.current;
        if (!size) return;
        beginChange();
        const start = photoStart.current;
        const crop = clampCrop(size.w, size.h, { ...start, zoom: start.zoom * e.scale });
        stateRef.current = { ...stateRef.current, crop };
        setState(stateRef.current);
      });
    const pan = Gesture.Pan()
      .enabled(live)
      .minDistance(8)
      .onStart(() => {
        photoStart.current = stateRef.current.crop;
        photoChanged.current = false;
        photoFingers.current = 1;
      })
      .onUpdate((e) => {
        photoFingers.current = Math.max(photoFingers.current, e.numberOfPointers);
        const size = photoSizeRef.current;
        // Once it is zoomed in, a drag moves the photo. When it is whole, the swipe below changes the filter.
        if (!size || stateRef.current.crop.zoom <= 1) return;
        beginChange();
        const frame = frameSizeRef.current;
        const start = photoStart.current;
        const crop = clampCrop(size.w, size.h, { zoom: start.zoom, x: start.x + e.translationX / frame.w, y: start.y + e.translationY / frame.h });
        stateRef.current = { ...stateRef.current, crop };
        setState(stateRef.current);
      })
      .onEnd((e) => {
        // A plain swipe with one finger, on a whole photo, changes the filter.
        if (photoFingers.current === 1 && photoSizeRef.current && stateRef.current.crop.zoom <= 1 && Math.abs(e.translationX) > 50) {
          stepRef.current(e.translationX < 0 ? 1 : -1);
        }
      });
    return Gesture.Simultaneous(pinch, pan);
  }, [mode]);

  // Fill the frame with the photo, or give back the whole photo.
  const fillFrame = () => {
    const size = photoSizeRef.current;
    if (!size) return;
    const fill = coverZoom(size.w, size.h);
    const filled = Math.abs(stateRef.current.crop.zoom - fill) < 0.01;
    commit({ ...stateRef.current, crop: filled ? NO_CROP : { zoom: fill, x: 0, y: 0 } });
    showToast(filled ? "Whole photo" : "Filled");
  };

  // Drawing.
  const onPoint = (x: number, y: number, first: boolean) => {
    if (tool === "eraser") {
      if (first) remember();
      const next = eraseAt(stateRef.current, x, y, 0.03);
      if (next !== stateRef.current) {
        stateRef.current = next;
        setState(next);
      }
      return;
    }
    if (first || !liveRef.current) {
      liveRef.current = {
        id: newId(),
        tool,
        color: penColor,
        size: STROKE_SIZES[penSize] * (tool === "marker" ? 1.8 : 1),
        points: [x, y],
      };
    } else {
      const p = liveRef.current.points;
      const dx = (x - p[p.length - 2]!) * fw;
      const dy = (y - p[p.length - 1]!) * fh;
      if (dx * dx + dy * dy < 9) return;
      liveRef.current = { ...liveRef.current, points: [...p, x, y] };
    }
    setLive(liveRef.current);
  };
  const onDrawEnd = () => {
    if (liveRef.current) commit(addStroke(stateRef.current, liveRef.current));
    liveRef.current = null;
    setLive(null);
  };

  const editingItem = editing ? (state.items.find((item) => item.id === editing) as TextItem | undefined) : undefined;
  const textDone = (draft: TextDraft) => {
    const value = draft.text.trim() ? draft.text.replace(/\s+$/, "") : "";
    if (editing) {
      commit(value ? updateItem(stateRef.current, editing, { ...draft, text: value }) : removeItem(stateRef.current, editing));
    } else if (value) {
      // On a text story the words are the story: bigger, in the middle.
      commit(
        addItem(stateRef.current, {
          id: newId(),
          kind: "text",
          ...draft,
          text: value,
          x: 0.5,
          y: textStory ? 0.45 : 0.42,
          scale: textStory ? TEXT_STORY_SCALE : 1,
          rotation: 0,
        }),
      );
    }
    setEditing(null);
    setMode("idle");
  };

  const close = () => {
    if (busy) return;
    if (mode === "text") return textDone(editingItem ?? { text: "", font: "classic", color: "#FFFFFF", bg: "none" });
    if (mode !== "idle") return setMode("idle");
    if (isEdited(stateRef.current)) setDiscard(true);
    else onClose();
  };

  const share = async (audience: "all" | "close" = "all") => {
    if (!photo || busy) return;
    // Nobody on the list yet: pick them first, like Instagram.
    if (audience === "close" && closeCount === 0) {
      setCloseOpen(true);
      return;
    }
    if (textStory && !state.items.length && !state.strokes.length) {
      setError("Write something first.");
      return;
    }
    setBusy(true);
    setError("");
    let made: string | null = null;
    try {
      // Nothing changed: the photo goes up exactly as picked.
      let uri = photo.uri;
      if (textStory || isEdited(state)) {
        setHideLive(true);
        await new Promise((resolve) => setTimeout(resolve, 80));
        uri = made = await bakeStory({ uri: photo.uri, state, backdrop, frameRef });
        setHideLive(false);
      }
      await storyApi.create(accessToken, uri, state.music, liveStickers(state), audience);
      onShared();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Your story could not be shared.");
    } finally {
      if (made && Platform.OS === "web") URL.revokeObjectURL(made);
      setHideLive(false);
      setBusy(false);
    }
  };

  const rect = photo ? cropRect(photo.width, photo.height, state.crop) : { x: 0, y: 0, width: 1, height: 1 };
  // Whether the photo already fills the frame (the Fill button then gives back the whole photo).
  const filled = !!photo && Math.abs(state.crop.zoom - coverZoom(photo.width, photo.height)) < 0.01;
  // The line under the share buttons: how to use the story now, or how long it stays.
  const emptyStory = state.items.length === 0 && state.strokes.length === 0;
  const hint = emptyStory
    ? `${textStory ? "Swipe for colours" : "Pinch to zoom · swipe for filters"} · disappears after 24 hours`
    : "Disappears after 24 hours";
  // A tool on the right: its name, then a round button.
  const railItem = (label: string, onPress: () => void, child: ReactNode) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 13,
          color: "#FFFFFF",
          backgroundColor: "rgba(20,16,46,0.55)",
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(20,16,46,0.6)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.28)",
        }}
      >
        {child}
      </View>
    </Pressable>
  );
  const dragging = !!drag;
  const trashHot = drag ? overTrash(drag.x, drag.y) : false;

  const iconButton = (label: string, onPress: () => void, child: ReactNode, active = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#FFFFFF" : "rgba(0,0,0,0.35)",
      }}
    >
      {child}
    </Pressable>
  );

  return (
    <Modal visible={!!photo} animationType="fade" onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ height: screenHeight, backgroundColor: "#000", alignItems: "center", justifyContent: "flex-start" }}>
        <View style={{ width: fw, height: screenHeight }}>
          {/* Everything inside this frame is the story; the buttons are outside it. */}
          <View ref={frameRef} collapsable={false} style={{ width: fw, height: fh, overflow: "hidden", backgroundColor: backdrop[1] }}>
            <GestureDetector gesture={photoGesture}>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              <LinearGradient colors={backdrop} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              {/* A text story with nothing on it yet: tap anywhere to type. */}
              {textStory && mode === "idle" && !state.items.length && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tap to type"
                  onPress={() => {
                    setEditing(null);
                    setMode("text");
                  }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 30, color: "rgba(255,255,255,0.85)" }}>Tap to type</Text>
                </Pressable>
              )}
              {!!photo && !textStory && (
                <View
                  style={{
                    position: "absolute",
                    left: rect.x * fw,
                    top: rect.y * fh,
                    width: rect.width * fw,
                    height: rect.height * fh,
                    // On the wrapper, not the Image: react-native-web's Image would apply it twice.
                    ...filterStyle(state.filter),
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    resizeMode="cover"
                    accessibilityLabel="Story photo"
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>
              )}
            </View>
            </GestureDetector>
            {state.strokes.map((stroke) => (
              <StrokeView key={stroke.id} stroke={stroke} frame={frame} />
            ))}
            {live && <StrokeView stroke={live} frame={frame} />}
            {state.items.map((item) =>
              item.id === editing || (hideLive && isLive(item)) ? null : (
                <DraggableItem
                  key={item.id}
                  item={item}
                  frame={frame}
                  music={stickerMusic}
                  time={songTime}
                  disabled={mode !== "idle" || busy}
                  onGrab={(id) => {
                    const next = toFront(stateRef.current, id);
                    stateRef.current = next;
                    setState(next);
                  }}
                  onMove={setDrag}
                  onCommit={(id, pose, gesture) => {
                    setDrag(null);
                    if (gesture === "drag" && overTrash(pose.x, pose.y)) return commit(removeItem(stateRef.current, id));
                    const remember = gesture === "drag" || Date.now() - lastWheel.current > 700;
                    if (gesture === "wheel") lastWheel.current = Date.now();
                    commit(updateItem(stateRef.current, id, pose), remember);
                  }}
                  onTap={(id) => {
                    setDrag(null);
                    const tapped = stateRef.current.items.find((each) => each.id === id);
                    if (tapped?.kind === "text") {
                      setEditing(id);
                      setMode("text");
                    } else if (tapped?.kind === "music") {
                      // Tap: the next look (card, pill, the words), like Instagram.
                      const look = nextMusicLook(tapped, !!stickerMusic?.lyrics.length);
                      commit(updateItem(stateRef.current, id, { style: look.style, lyricFont: look.lyricFont }));
                      showToast(look.style === "card" ? "Card" : look.style === "pill" ? "Small" : `Lyrics · ${look.lyricFont === "box" ? "Box" : look.lyricFont === "glow" ? "Glow" : "Classic"}`);
                    }
                    else if (tapped?.kind === "poll" || tapped?.kind === "question") {
                      setLiveDraft({ kind: tapped.kind, id });
                      setMode("live");
                    }
                  }}
                />
              ),
            )}
            {mode === "draw" && <DrawCapture frame={frame} onPoint={onPoint} onEnd={onDrawEnd} />}
          </View>

          {/* The filter's name, for a moment after it changes. */}
          <Animated.View pointerEvents="none" style={{ position: "absolute", top: fh * 0.4, left: 0, right: 0, alignItems: "center", opacity: toast }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 8 }}>
              {toastText}
            </Text>
          </Animated.View>

          {/* Drag a text or sticker here to delete it. */}
          {dragging && (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: fh * 0.9 - 28, alignItems: "center" }}>
              <View
                style={{
                  width: trashHot ? 64 : 52,
                  height: trashHot ? 64 : 52,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  backgroundColor: trashHot ? palette.crimson : "rgba(0,0,0,0.4)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="trash-outline" size={trashHot ? 30 : 24} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Top left: back. The tools run down the right side, each with its name, like Instagram's editor. */}
          {!dragging && mode === "idle" && (
            <View style={{ position: "absolute", top: 10, left: 10 }}>
              {iconButton("Close story editor", close, <Ionicons name="arrow-back" size={24} color="#FFFFFF" />)}
            </View>
          )}
          {!dragging && mode === "idle" && (
            <View pointerEvents="box-none" style={{ position: "absolute", right: 10, top: 64, alignItems: "flex-end", gap: 12 }}>
              {historyCount > 0 && railItem("Undo", undo, <Ionicons name="arrow-undo" size={21} color="#FFFFFF" />)}
              {railItem(
                "Text",
                () => {
                  setEditing(null);
                  setMode("text");
                },
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: "#FFFFFF" }}>Aa</Text>,
              )}
              {railItem("Stickers", () => setStickers(true), <Ionicons name="happy-outline" size={23} color="#FFFFFF" />)}
              {railItem("Music", () => setMusicOpen(true), <Ionicons name="musical-notes" size={21} color="#FFFFFF" />)}
              {textStory
                ? railItem(
                    "Background",
                    () => changeTheme(1),
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#FFFFFF", overflow: "hidden" }}>
                      <LinearGradient colors={textThemesRef.current[stepTheme(theme, 1, textThemesRef.current.length)]!.colors} style={{ flex: 1 }} />
                    </View>,
                  )
                : railItem("Filters", () => setMode("filters"), <Ionicons name="color-filter-outline" size={22} color="#FFFFFF" />)}
              {railItem("Draw", () => setMode("draw"), <MaterialCommunityIcons name="draw" size={22} color="#FFFFFF" />)}
              {!textStory &&
                !!photo &&
                railItem(
                  filled ? "Whole photo" : "Fill the story",
                  fillFrame,
                  <Ionicons name={filled ? "contract-outline" : "expand-outline"} size={20} color="#FFFFFF" />,
                )}
            </View>
          )}

          {/* Drawing tools. */}
          {mode === "draw" && (
            <>
              <View style={{ position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                {historyCount > 0 && iconButton("Undo", undo, <Ionicons name="arrow-undo" size={21} color="#FFFFFF" />)}
                <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                  {iconButton("Pen", () => setTool("pen"), <MaterialCommunityIcons name="pen" size={20} color={tool === "pen" ? "#000" : "#FFF"} />, tool === "pen")}
                  {iconButton("Marker", () => setTool("marker"), <MaterialCommunityIcons name="marker" size={20} color={tool === "marker" ? "#000" : "#FFF"} />, tool === "marker")}
                  {iconButton("Eraser", () => setTool("eraser"), <MaterialCommunityIcons name="eraser" size={20} color={tool === "eraser" ? "#000" : "#FFF"} />, tool === "eraser")}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Done drawing" onPress={() => setMode("idle")} style={{ paddingHorizontal: 10, height: 42, justifyContent: "center" }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFFFFF" }}>Done</Text>
                </Pressable>
              </View>
              <View style={{ position: "absolute", left: 10, top: 64, gap: 8 }}>
                {(Object.keys(STROKE_SIZES) as (keyof typeof STROKE_SIZES)[]).map((size) => (
                  <Pressable
                    key={size}
                    accessibilityRole="button"
                    accessibilityLabel={`Brush size ${size}`}
                    onPress={() => setPenSize(size)}
                    style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: penSize === size ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" }}
                  >
                    <View style={{ width: { S: 6, M: 12, L: 20 }[size], height: { S: 6, M: 12, L: 20 }[size], borderRadius: 10, backgroundColor: "#FFFFFF" }} />
                  </Pressable>
                ))}
              </View>
              {tool !== "eraser" && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ position: "absolute", left: 0, right: 0, bottom: below + 14 }}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 14 }}
                >
                  {COLORS.map((color) => (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Brush colour ${color}`}
                      onPress={() => setPenColor(color)}
                      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: color, borderWidth: penColor === color ? 3 : 2, borderColor: penColor === color ? "#FFFFFF" : "rgba(255,255,255,0.6)" }}
                    />
                  ))}
                </ScrollView>
              )}
            </>
          )}

          {/* Filters: a strip of the photo in each one. */}
          {mode === "filters" && !!photo && !textStory && (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: below + 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, marginBottom: 6 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Done with filters" onPress={() => setMode("idle")} style={{ paddingHorizontal: 10, height: 40, justifyContent: "center" }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFFFFF" }}>Done</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 12 }}>
                {FILTERS.map((filter) => {
                  const on = state.filter === filter.id;
                  return (
                    <Pressable key={filter.id} accessibilityRole="button" accessibilityLabel={`Filter ${filter.name}`} accessibilityState={{ selected: on }} onPress={() => setFilter(filter.id)} style={{ alignItems: "center", gap: 4 }}>
                      <View style={{ width: 56, height: 76, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: on ? "#FFFFFF" : "transparent" }}>
                        <View style={{ width: "100%", height: "100%", ...filterStyle(filter.id) }}>
                          <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
                        </View>
                      </View>
                      <Text style={{ fontFamily: on ? fonts.bodyBold : fonts.body, fontSize: 12, color: "#FFFFFF" }}>{filter.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Bottom: share. */}
          {!dragging && mode === "idle" && (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: below >= 76 ? Math.max(12, (below - 48) / 2) : 16, alignItems: "center", gap: 8 }}>
              {!!error && (
                <Text style={{ color: "#FFFFFF", backgroundColor: "rgba(179,38,30,0.92)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, fontFamily: fonts.body, fontSize: 13, maxWidth: fw - 30, textAlign: "center" }}>
                  {error}
                </Text>
              )}
              <StoryDock
                width={fw - 24}
                song={!!song}
                look={songLook(state)}
                lookName={songLookLabel(state)}
                hasWords={!!stickerMusic?.lyrics.length}
                onLook={(look) => commit(setSongLook(stateRef.current, look, newId()))}
                audience={audience}
                onAudience={setAudience}
                closeCount={closeCount}
                onEditClose={() => setCloseOpen(true)}
                onShare={(who) => void share(who)}
                busy={busy}
                hint={hint}
              />
            </View>
          )}

          {mode === "live" && liveDraft && (
            <LiveComposer
              kind={liveDraft.kind}
              poll={(() => {
                const item = state.items.find((each) => each.id === liveDraft.id) as PollItem | undefined;
                return item?.kind === "poll" ? { question: item.question, options: item.options } : null;
              })()}
              question={(() => {
                const item = state.items.find((each) => each.id === liveDraft.id) as QuestionItem | undefined;
                return item?.kind === "question" ? { prompt: item.prompt } : null;
              })()}
              onCancel={() => {
                setLiveDraft(null);
                setMode("idle");
              }}
              onDone={(draft) => {
                const id = liveDraft.id;
                if (id) commit(updateItem(stateRef.current, id, draft as Record<string, unknown>));
                else if (liveDraft.kind === "poll") {
                  const d = draft as PollDraft;
                  commit(addItem(stateRef.current, { id: newId(), kind: "poll", question: d.question, options: d.options, x: 0.5, y: 0.4, scale: 1, rotation: 0 }));
                } else {
                  const d = draft as QuestionDraft;
                  commit(addItem(stateRef.current, { id: newId(), kind: "question", prompt: d.prompt, x: 0.5, y: 0.4, scale: 1, rotation: 0 }));
                }
                setLiveDraft(null);
                setMode("idle");
              }}
            />
          )}

          {mode === "text" && (
            <TextComposer
              initial={editingItem ? { text: editingItem.text, font: editingItem.font, color: editingItem.color, bg: editingItem.bg } : null}
              size={TEXT_SIZE * fw * (textStory ? Math.min(1.6, editingItem?.scale ?? TEXT_STORY_SCALE) : 1)}
              dim={!textStory}
              onDone={textDone}
            />
          )}
        </View>
      </View>

      <StickerSheet
        visible={stickers}
        festival={stickers ? currentFestival() : null}
        onClose={() => setStickers(false)}
        onLive={(kind) => {
          setStickers(false);
          if (kind === "mention") {
            if (stateRef.current.items.filter((item) => item.kind === "mention").length >= MAX_MENTIONS) {
              setError(`You can mention up to ${MAX_MENTIONS} people.`);
              return;
            }
            setMentionOpen(true);
            return;
          }
          // One poll and one question per story: tapping again changes it.
          const existing = stateRef.current.items.find((item) => item.kind === kind);
          setLiveDraft({ kind, id: existing?.id ?? null });
          setMode("live");
        }}
        onPick={(kind, value) => {
          setStickers(false);
          commit(addItem(stateRef.current, { id: newId(), kind, value, x: 0.5, y: 0.45, scale: 1, rotation: 0 }));
        }}
      />

      <MentionSheet
        visible={mentionOpen}
        accessToken={accessToken}
        onClose={() => setMentionOpen(false)}
        onPick={(user) => {
          setMentionOpen(false);
          if (stateRef.current.items.some((item) => item.kind === "mention" && item.userId === user.userId)) return;
          const count = stateRef.current.items.filter((item) => item.kind === "mention").length;
          commit(
            addItem(stateRef.current, {
              id: newId(),
              kind: "mention",
              userId: user.userId,
              username: user.username,
              x: 0.5,
              y: 0.72 + 0.06 * count,
              scale: 1,
              rotation: 0,
            }),
          );
        }}
      />

      <MusicSheet
        visible={musicOpen}
        accessToken={accessToken}
        current={state.music}
        onClose={() => setMusicOpen(false)}
        onPick={(music) => {
          setMusicOpen(false);
          commit(setMusic(stateRef.current, music));
        }}
        onRemove={() => {
          setMusicOpen(false);
          const sticker = stateRef.current.items.find((item) => item.kind === "music");
          commit(sticker ? removeItem(stateRef.current, sticker.id) : { ...stateRef.current, music: null });
        }}
      />

      <CloseFriendsSheet visible={closeOpen} accessToken={accessToken} onClose={() => setCloseOpen(false)} onCount={setCloseCount} />

      <Sheet visible={discard} title="Discard story?" onClose={() => setDiscard(false)}>
        <View style={{ paddingVertical: 6 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, textAlign: "center", paddingHorizontal: 20, paddingVertical: 10 }}>
            Your edits will be lost.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard"
            onPress={() => {
              setDiscard(false);
              onClose();
            }}
            style={{ minHeight: 52, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: palette.rule }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.crimson }}>Discard</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keep editing"
            onPress={() => setDiscard(false)}
            style={{ minHeight: 52, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: palette.rule }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>Keep editing</Text>
          </Pressable>
        </View>
      </Sheet>
      </GestureHandlerRootView>
    </Modal>
  );
}
