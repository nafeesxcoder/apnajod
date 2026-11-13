import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, PanResponder, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { clock, musicApi, type MusicTrack, type StoryMusic } from "../../../api/musicApi";
import { fonts, palette, radius } from "../../../theme";
import { Sheet } from "../../posts/PostSheets";
import { clampStart, clipLengths } from "./clip";
import { createClipPlayer, type ClipPlayer } from "./clipPlayer";

/**
 * Music for a story: search the library, tap a song (it plays), drag the
 * window to the part you want, 15 or 30 seconds, then "Use this song".
 */
export function MusicSheet({
  visible,
  accessToken,
  current,
  onClose,
  onPick,
  onRemove,
}: {
  visible: boolean;
  accessToken: string;
  current: StoryMusic | null;
  onClose: () => void;
  onPick: (music: StoryMusic) => void;
  onRemove: () => void;
}) {
  const [words, setWords] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<MusicTrack | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(15);
  const [playing, setPlaying] = useState(false);
  const [barWidth, setBarWidth] = useState(1);
  const player = useRef<ClipPlayer | null>(null);

  const stopPreview = () => {
    player.current?.stop();
    player.current = null;
    setPlaying(false);
  };
  const preview = (track: MusicTrack, from: number, seconds: number) => {
    stopPreview();
    player.current = createClipPlayer(track.url, from, seconds, true);
    player.current.play();
    setPlaying(true);
  };

  // Search as you type (a moment after you stop).
  useEffect(() => {
    if (!visible) return;
    let live = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      musicApi
        .search(accessToken, words)
        .then((found) => live && setTracks(found))
        .catch((e) => live && setError(e?.message || "Could not load music."))
        .finally(() => live && setLoading(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [visible, words, accessToken]);

  // Opening again on a story that has a song: that song, at its part.
  useEffect(() => {
    if (!visible) {
      stopPreview();
      return;
    }
    setChosen(current ? { id: current.trackId, title: current.title, artist: current.artist, url: current.url, durationSec: 0 } : null);
    setStart(current?.start ?? 0);
    setLength(current?.length ?? 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // The library knows the song's length; fill it in for a song chosen earlier.
  const duration = chosen ? chosen.durationSec || tracks.find((t) => t.id === chosen.id)?.durationSec || 0 : 0;

  const choose = (track: MusicTrack) => {
    const lengths = clipLengths(track.durationSec);
    const seconds = lengths[0]!;
    setChosen(track);
    setLength(seconds);
    setStart(0);
    preview(track, 0, seconds);
  };

  // Dragging the highlighted window along the song.
  const drag = useRef({ from: 0 });
  const live = useRef({ start, length, duration, barWidth, chosen });
  live.current = { start, length, duration, barWidth, chosen };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          drag.current.from = live.current.start;
          player.current?.pause();
        },
        onPanResponderMove: (_e, g) => {
          const { length: l, duration: d, barWidth: w } = live.current;
          if (!d) return;
          setStart(clampStart(drag.current.from + (g.dx / w) * d, l, d));
        },
        onPanResponderRelease: () => {
          const { chosen: track, length: l } = live.current;
          if (track) preview(track, live.current.start, l);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const windowLeft = duration ? (start / duration) * barWidth : 0;
  const windowWidth = duration ? Math.max(14, (Math.min(length, duration) / duration) * barWidth) : barWidth;

  return (
    <Sheet
      visible={visible}
      title="Music"
      tall
      onClose={() => {
        stopPreview();
        onClose();
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ padding: 12, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: palette.paperSand, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 42 }}>
            <Ionicons name="search" size={18} color={palette.slate} />
            <TextInput
              value={words}
              onChangeText={setWords}
              placeholder="Search music"
              placeholderTextColor={palette.slate}
              accessibilityLabel="Search music"
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) }}
            />
          </View>
        </View>

        <FlatList
          data={tracks}
          keyExtractor={(track) => track.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={palette.crimson} style={{ marginTop: 24 }} />
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, textAlign: "center", padding: 24 }}>
                {error || (words.trim() ? "No songs found." : "No songs yet.")}
              </Text>
            )
          }
          renderItem={({ item }) => {
            const on = chosen?.id === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Song ${item.title}${item.artist ? ` by ${item.artist}` : ""}`}
                onPress={() => choose(item)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 58, backgroundColor: on ? palette.crimsonTint : "transparent" }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: on ? palette.crimson : palette.paperSand, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={on && playing ? "volume-high" : "musical-notes"} size={20} color={on ? "#FFFFFF" : palette.crimson} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{item.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
                    {[item.artist, item.durationSec ? clock(item.durationSec) : ""].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />

        {chosen && (
          <View style={{ borderTopWidth: 1, borderTopColor: palette.rule, padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={playing ? "Pause preview" : "Play preview"}
                onPress={() => (playing ? (player.current?.pause(), setPlaying(false)) : preview(chosen, start, length))}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name={playing ? "pause" : "play"} size={18} color="#FFFFFF" />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>{chosen.title}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
                  Plays {clock(start)} – {clock(start + length)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {clipLengths(duration).map((seconds) => (
                  <Pressable
                    key={seconds}
                    accessibilityRole="button"
                    accessibilityLabel={`${seconds} seconds`}
                    accessibilityState={{ selected: length === seconds }}
                    onPress={() => {
                      const from = clampStart(start, seconds, duration);
                      setLength(seconds);
                      setStart(from);
                      preview(chosen, from, seconds);
                    }}
                    style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: "center", backgroundColor: length === seconds ? palette.crimson : palette.paperSand }}
                  >
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: length === seconds ? "#FFFFFF" : palette.ink }}>{seconds}s</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* The song as a bar; drag the highlighted part to choose what plays. */}
            {duration > length && (
              <View
                onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
                style={{ height: 40, borderRadius: 8, backgroundColor: palette.paperSand, justifyContent: "center" }}
              >
                <View style={{ position: "absolute", left: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, height: 40 }}>
                  {Array.from({ length: 40 }, (_, i) => (
                    <View key={i} style={{ flex: 1, height: 8 + ((i * 37) % 22), borderRadius: 2, backgroundColor: palette.rule }} />
                  ))}
                </View>
                <View
                  {...responder.panHandlers}
                  accessibilityLabel="Choose the part of the song"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: windowLeft,
                    width: windowWidth,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: palette.crimson,
                    backgroundColor: "rgba(185,28,60,0.18)",
                    ...(Platform.OS === "web" ? ({ cursor: "grab", touchAction: "none" } as object) : null),
                  }}
                />
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              {current && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove music"
                  onPress={() => {
                    stopPreview();
                    onRemove();
                  }}
                  style={{ flex: 1, minHeight: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.rule, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.crimson }}>Remove music</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use this song"
                onPress={() => {
                  stopPreview();
                  onPick({ trackId: chosen.id, title: chosen.title, artist: chosen.artist, url: chosen.url, start: clampStart(start, length, duration), length });
                }}
                style={{ flex: 2, minHeight: 46, borderRadius: radius.pill, backgroundColor: palette.crimson, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>Use this song</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Sheet>
  );
}
