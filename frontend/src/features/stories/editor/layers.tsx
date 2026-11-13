import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Text, View, type GestureResponderEvent } from "react-native";

import { fonts, palette } from "../../../theme";
import { EMOJI_CSS, PILL_PAD, STORY_FONTS, TEXT_PAD, textLines } from "./fonts";
import {
  EMOJI_SIZE,
  LINE_HEIGHT,
  MUSIC_SIZE,
  PILL_SIZE,
  TEXT_SIZE,
  clampScale,
  type Item,
  type Stroke,
  textColors,
} from "./model";

type Frame = { width: number; height: number };
type Pose = { x: number; y: number; scale: number; rotation: number };

/** One text or sticker, unscaled, centred on its own middle. */
export function ItemBody({ item, frame }: { item: Item; frame: Frame }) {
  if (item.kind === "text") {
    const size = TEXT_SIZE * frame.width;
    const { text, box } = textColors(item);
    const font = STORY_FONTS[item.font];
    return (
      <View style={{ alignItems: "center" }}>
        {textLines(item.font, item.text, size, frame.width).map((line, index) => (
          <View
            key={index}
            style={{
              backgroundColor: box ?? "transparent",
              paddingHorizontal: TEXT_PAD.x * size,
              paddingVertical: TEXT_PAD.y * size,
              borderRadius: TEXT_PAD.radius * size,
            }}
          >
            <Text
              style={{
                fontFamily: font.family,
                fontSize: size,
                lineHeight: size * LINE_HEIGHT,
                color: text,
                textAlign: "center",
                ...(Platform.OS === "web" ? ({ whiteSpace: "pre" } as object) : { maxWidth: frame.width * 0.86 }),
              }}
            >
              {line || " "}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  if (item.kind === "emoji") {
    const size = EMOJI_SIZE * frame.width;
    return (
      <Text style={{ fontSize: size, lineHeight: size * 1.2, ...(Platform.OS === "web" ? ({ fontFamily: EMOJI_CSS } as object) : null) }}>
        {item.value}
      </Text>
    );
  }
  const size = (item.kind === "music" ? MUSIC_SIZE : PILL_SIZE) * frame.width;
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        paddingHorizontal: PILL_PAD.x * size,
        paddingVertical: PILL_PAD.y * size,
        borderRadius: size,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: size,
          lineHeight: size * LINE_HEIGHT,
          color: palette.ink,
          ...(Platform.OS === "web" ? ({ whiteSpace: "pre" } as object) : null),
        }}
      >
        {item.value}
      </Text>
    </View>
  );
}

/**
 * A text or sticker you can move with one finger, and size and turn with two
 * (or the mouse wheel on a computer; Shift + wheel turns it). A quick tap
 * without moving is a tap (edit the text).
 */
export function DraggableItem({
  item,
  frame,
  disabled,
  onGrab,
  onMove,
  onCommit,
  onTap,
}: {
  item: Item;
  frame: Frame;
  disabled?: boolean;
  onGrab: (id: string) => void;
  onMove: (pose: Pose) => void;
  onCommit: (id: string, pose: Pose, gesture: "drag" | "wheel") => void;
  onTap: (id: string) => void;
}) {
  const [live, setLive] = useState<Pose | null>(null);
  const props = useRef({ item, frame, onGrab, onMove, onCommit, onTap });
  props.current = { item, frame, onGrab, onMove, onCommit, onTap };
  const gesture = useRef({ start: item as Pose, pose: item as Pose, at: 0, pinch: null as null | { dist: number; angle: number; scale: number; rotation: number }, pinched: false });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const { item: current } = props.current;
          gesture.current = { start: { ...current }, pose: { ...current }, at: Date.now(), pinch: null, pinched: false };
          props.current.onGrab(current.id);
        },
        onPanResponderMove: (event: GestureResponderEvent, state) => {
          const g = gesture.current;
          const { frame: f } = props.current;
          const next: Pose = { ...g.pose, x: g.start.x + state.dx / f.width, y: g.start.y + state.dy / f.height };
          const touches = event.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const [a, b] = touches as unknown as { pageX: number; pageY: number }[];
            const dist = Math.hypot(b!.pageX - a!.pageX, b!.pageY - a!.pageY);
            const angle = Math.atan2(b!.pageY - a!.pageY, b!.pageX - a!.pageX);
            if (!g.pinch) g.pinch = { dist: Math.max(dist, 1), angle, scale: g.pose.scale, rotation: g.pose.rotation };
            next.scale = clampScale((g.pinch.scale * dist) / g.pinch.dist);
            next.rotation = g.pinch.rotation + ((angle - g.pinch.angle) * 180) / Math.PI;
            g.pinched = true;
          } else g.pinch = null;
          g.pose = next;
          setLive(next);
          props.current.onMove(next);
        },
        onPanResponderRelease: (_event, state) => finish(state.dx, state.dy),
        onPanResponderTerminate: (_event, state) => finish(state.dx, state.dy),
      }),
    [],
  );

  function finish(dx: number, dy: number) {
    const g = gesture.current;
    setLive(null);
    const still = Math.abs(dx) + Math.abs(dy) < 6 && !g.pinched;
    if (still && Date.now() - g.at < 350) props.current.onTap(props.current.item.id);
    else props.current.onCommit(props.current.item.id, g.pose, "drag");
  }

  // Computer: the wheel sizes it, Shift + wheel turns it.
  const ref = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const { item: current } = props.current;
      const pose: Pose = event.shiftKey
        ? { ...current, rotation: current.rotation + (event.deltaY > 0 ? 6 : -6) }
        : { ...current, scale: clampScale(current.scale * (event.deltaY > 0 ? 0.94 : 1.06)) };
      props.current.onCommit(current.id, pose, "wheel");
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);

  const pose = live ?? item;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: pose.x * frame.width - frame.width,
        top: pose.y * frame.height,
        width: frame.width * 2,
        height: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        ref={ref}
        {...(disabled ? {} : responder.panHandlers)}
        accessibilityLabel={item.kind === "text" ? `Text: ${item.text}` : `Sticker ${item.value}`}
        style={{
          transform: [{ rotate: `${pose.rotation}deg` }, { scale: pose.scale }],
          ...(Platform.OS === "web" ? ({ cursor: disabled ? "default" : "move", touchAction: "none", userSelect: "none" } as object) : null),
        }}
      >
        <ItemBody item={item} frame={frame} />
      </View>
    </View>
  );
}

/** A drawn line, as round-ended segments (no drawing library needed). */
export function StrokeView({ stroke, frame }: { stroke: Stroke; frame: Frame }) {
  const size = stroke.size * frame.width;
  const points = stroke.points;
  const pieces = [];
  if (points.length === 2) {
    pieces.push(
      <View
        key="dot"
        style={{
          position: "absolute",
          left: points[0]! * frame.width - size / 2,
          top: points[1]! * frame.height - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: stroke.color,
        }}
      />,
    );
  }
  for (let i = 2; i < points.length; i += 2) {
    const x1 = points[i - 2]! * frame.width;
    const y1 = points[i - 1]! * frame.height;
    const x2 = points[i]! * frame.width;
    const y2 = points[i + 1]! * frame.height;
    const length = Math.hypot(x2 - x1, y2 - y1);
    pieces.push(
      <View
        key={i}
        style={{
          position: "absolute",
          left: (x1 + x2) / 2 - (length + size) / 2,
          top: (y1 + y2) / 2 - size / 2,
          width: length + size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: stroke.color,
          transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
        }}
      />,
    );
  }
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: stroke.tool === "marker" ? 0.5 : 1 }}>
      {pieces}
    </View>
  );
}

/** While drawing: catches the finger (or mouse) over the whole frame. */
export function DrawCapture({
  frame,
  onPoint,
  onEnd,
}: {
  frame: Frame;
  onPoint: (x: number, y: number, first: boolean) => void;
  onEnd: () => void;
}) {
  const props = useRef({ frame, onPoint, onEnd });
  props.current = { frame, onPoint, onEnd };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          props.current.onPoint(locationX / props.current.frame.width, locationY / props.current.frame.height, true);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          props.current.onPoint(locationX / props.current.frame.width, locationY / props.current.frame.height, false);
        },
        onPanResponderRelease: () => props.current.onEnd(),
        onPanResponderTerminate: () => props.current.onEnd(),
      }),
    [],
  );
  return (
    <View
      {...responder.panHandlers}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        ...(Platform.OS === "web" ? ({ cursor: "crosshair", touchAction: "none" } as object) : null),
      }}
    />
  );
}
