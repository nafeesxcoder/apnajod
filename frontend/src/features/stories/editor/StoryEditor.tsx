import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { storyApi } from "../../../api/storyApi";
import { fonts, palette, radius } from "../../../theme";
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
  photoRect,
  pushHistory,
  isLive,
  liveStickers,
  MAX_MENTIONS,
  removeItem,
  setMusic,
  toFront,
  updateItem,
  type EditorState,
  type PollItem,
  type QuestionItem,
  type Stroke,
  type TextItem,
} from "./model";
import { StickerSheet } from "./StickerSheet";
import { MusicSheet } from "../music/MusicSheet";
import { LiveComposer, type PollDraft, type QuestionDraft } from "./LiveComposer";
import { MentionSheet } from "./MentionSheet";
import { createClipPlayer } from "../music/clipPlayer";
import { TextComposer, type TextDraft } from "./TextComposer";

export type PickedStoryPhoto = { uri: string; width: number; height: number };

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
    void backdropFor(photo.uri).then(setBackdrop);
  }, [photo]);

  // The story's song plays (on repeat) while you edit, like Instagram.
  const song = state.music;
  useEffect(() => {
    if (!photo || !song || musicOpen) return;
    const clip = createClipPlayer(song.url, song.start, song.length, true);
    clip.play();
    return () => clip.stop();
  }, [photo, song?.trackId, song?.start, song?.length, musicOpen]);

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
    const index = FILTERS.findIndex((f) => f.id === stateRef.current.filter);
    const next = FILTERS[(index + direction + FILTERS.length) % FILTERS.length]!;
    setFilter(next.id);
  };
  const stepRef = useRef(stepFilter);
  stepRef.current = stepFilter;

  // Swipe left / right on the photo for the next filter.
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) > 50) stepRef.current(g.dx < 0 ? 1 : -1);
        },
      }),
    [],
  );

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
      commit(addItem(stateRef.current, { id: newId(), kind: "text", ...draft, text: value, x: 0.5, y: 0.42, scale: 1, rotation: 0 }));
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

  const share = async () => {
    if (!photo || busy) return;
    setBusy(true);
    setError("");
    let made: string | null = null;
    try {
      // Nothing changed: the photo goes up exactly as picked.
      let uri = photo.uri;
      if (isEdited(state)) {
        setHideLive(true);
        await new Promise((resolve) => setTimeout(resolve, 80));
        uri = made = await bakeStory({ uri: photo.uri, state, backdrop, frameRef });
        setHideLive(false);
      }
      await storyApi.create(accessToken, uri, state.music, liveStickers(state));
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

  const rect = photo ? photoRect(photo.width, photo.height) : { x: 0, y: 0, width: 1, height: 1 };
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
      <View style={{ height: screenHeight, backgroundColor: "#000", alignItems: "center", justifyContent: "flex-start" }}>
        <View style={{ width: fw, height: screenHeight }}>
          {/* Everything inside this frame is the story; the buttons are outside it. */}
          <View ref={frameRef} collapsable={false} style={{ width: fw, height: fh, overflow: "hidden", backgroundColor: backdrop[1] }}>
            <View {...(mode === "idle" || mode === "filters" ? swipe.panHandlers : {})} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              <LinearGradient colors={backdrop} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              {!!photo && (
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
                    } else if (tapped?.kind === "music") setMusicOpen(true);
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

          {/* Top: close, and the tools. */}
          {!dragging && mode === "idle" && (
            <View style={{ position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", alignItems: "center" }}>
              {iconButton("Close story editor", close, <Ionicons name="close" size={26} color="#FFFFFF" />)}
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {historyCount > 0 && iconButton("Undo", undo, <Ionicons name="arrow-undo" size={21} color="#FFFFFF" />)}
                {iconButton("Filters", () => setMode("filters"), <Ionicons name="color-filter-outline" size={22} color="#FFFFFF" />)}
                {iconButton("Draw", () => setMode("draw"), <MaterialCommunityIcons name="draw" size={22} color="#FFFFFF" />)}
                {iconButton("Music", () => setMusicOpen(true), <Ionicons name="musical-notes" size={21} color="#FFFFFF" />)}
                {iconButton("Stickers", () => setStickers(true), <Ionicons name="happy-outline" size={23} color="#FFFFFF" />)}
                {iconButton(
                  "Add text",
                  () => {
                    setEditing(null);
                    setMode("text");
                  },
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: "#FFFFFF" }}>Aa</Text>,
                )}
              </View>
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
          {mode === "filters" && !!photo && (
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
              {state.items.length === 0 && state.strokes.length === 0 && (
                <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: fonts.body, fontSize: 12, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }}>
                  Swipe the photo for filters · disappears after 24 hours
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share to your story"
                onPress={() => void share()}
                disabled={busy}
                style={{ minHeight: 48, paddingHorizontal: 24, borderRadius: radius.pill, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 8, opacity: busy ? 0.8 : 1 }}
              >
                {busy ? <ActivityIndicator color={palette.crimson} /> : <Ionicons name="add-circle" size={22} color={palette.crimson} />}
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>{busy ? "Sharing..." : "Your story"}</Text>
              </Pressable>
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
              size={TEXT_SIZE * fw}
              onDone={textDone}
            />
          )}
        </View>
      </View>

      <StickerSheet
        visible={stickers}
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
          commit(setMusic(stateRef.current, music, newId()));
        }}
        onRemove={() => {
          setMusicOpen(false);
          const sticker = stateRef.current.items.find((item) => item.kind === "music");
          commit(sticker ? removeItem(stateRef.current, sticker.id) : { ...stateRef.current, music: null });
        }}
      />

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
    </Modal>
  );
}
