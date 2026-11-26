import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, PanResponder, Platform, Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { clock, musicApi, type MusicTrack, type StoryMusic } from "../../../api/musicApi";
import { fonts, palette, radius } from "../../../theme";
import { Sheet } from "../../posts/PostSheets";
import { clampStart, clipLengths, nudgeStart } from "./clip";
import { audioDuration, createClipPlayer, type ClipPlayer } from "./clipPlayer";
import { loadSavedMusic, saveSavedMusic } from "./savedMusic";

/** The picker's own colours: the app's ink, with light text and the lilac / rose accents. */
const WHITE_SOFT = "rgba(255,255,255,0.6)";
const CHIP = "rgba(255,255,255,0.1)";
const LILAC = "#F3E8FF";
const ROSE = "#F2B6CF";

/**
 * Music for a story: search the library, tap a song (it plays), drag the
 * window to the part you want (or nudge it 5 seconds at a time), pick 5 to
 * 30 seconds, then "Use this song". Songs can be saved with the bookmark.
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
  // Lengths read from the song itself, for songs the library saved without one.
  const [measured, setMeasured] = useState<Record<string, number>>({});
  // "For you" is every song; "Saved" is the ones bookmarked on this device.
  const [filter, setFilter] = useState<"for-you" | "saved">("for-you");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    void loadSavedMusic().then(setSaved);
  }, []);

  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter((each) => each !== id) : [...saved, id];
    setSaved(next);
    void saveSavedMusic(next);
  };

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
  const duration = chosen
    ? chosen.durationSec || tracks.find((t) => t.id === chosen.id)?.durationSec || measured[chosen.id] || 0
    : 0;

  // No length on record: read it from the song, so any part of it can be chosen.
  useEffect(() => {
    if (!chosen || duration || measured[chosen.id] !== undefined) return;
    let live = true;
    setMeasured((m) => ({ ...m, [chosen.id]: 0 }));
    void audioDuration(chosen.url).then((seconds) => {
      if (live && seconds) setMeasured((m) => ({ ...m, [chosen.id]: Math.floor(seconds) }));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen?.id, duration]);

  const nudge = (by: number) => {
    if (!chosen) return;
    const from = nudgeStart(start, by, length, duration);
    setStart(from);
    preview(chosen, from, length);
  };

  const choose = (track: MusicTrack) => {
    const lengths = clipLengths(track.durationSec || measured[track.id] || 0);
    // 15 seconds to begin with, like Instagram (or the longest the song allows).
    const seconds = lengths.includes(15) ? 15 : lengths[lengths.length - 1]!;
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
  const shown = filter === "saved" ? tracks.filter((track) => saved.includes(track.id)) : tracks;

  return (
    <Sheet
      visible={visible}
      title="Music"
      tall
      dark
      onClose={() => {
        stopPreview();
        onClose();
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ padding: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CHIP, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 44 }}>
            <Ionicons name="search" size={18} color={WHITE_SOFT} />
            <TextInput
              value={words}
              onChangeText={setWords}
              placeholder="Search music"
              placeholderTextColor="rgba(255,255,255,0.5)"
              accessibilityLabel="Search music"
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: "#FFFFFF", ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) }}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>
          {(["for-you", "saved"] as const).map((key) => {
            const on = filter === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === "for-you" ? "For you" : "Saved"}
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(key)}
                style={{ height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: "center", backgroundColor: on ? LILAC : CHIP }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: on ? palette.ink : "#FFFFFF" }}>
                  {key === "for-you" ? "For you" : "Saved"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={shown}
          keyExtractor={(track) => track.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={ROSE} style={{ marginTop: 24 }} />
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: WHITE_SOFT, textAlign: "center", padding: 24 }}>
                {error ||
                  (filter === "saved"
                    ? "No saved songs yet. Tap the bookmark on a song to keep it."
                    : words.trim()
                      ? "No songs found."
                      : "No songs yet.")}
              </Text>
            )
          }
          renderItem={({ item }) => {
            const on = chosen?.id === item.id;
            const isSaved = saved.includes(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Song ${item.title}${item.artist ? ` by ${item.artist}` : ""}`}
                onPress={() => choose(item)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 64, backgroundColor: on ? "rgba(176,36,95,0.28)" : "transparent" }}
              >
                <Cover track={item} playing={on && playing} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{item.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: WHITE_SOFT }}>
                    {[item.artist, item.durationSec ? clock(item.durationSec) : ""].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isSaved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
                  accessibilityState={{ selected: isSaved }}
                  hitSlop={10}
                  onPress={() => toggleSaved(item.id)}
                  style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={isSaved ? ROSE : "#FFFFFF"} />
                </Pressable>
              </Pressable>
            );
          }}
        />

        {chosen && (
          <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={playing ? "Pause preview" : "Play preview"}
                onPress={() => (playing ? (player.current?.pause(), setPlaying(false)) : preview(chosen, start, length))}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name={playing ? "pause" : "play"} size={18} color={palette.ink} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>{chosen.title}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: WHITE_SOFT }}>
                  Plays {clock(start)} – {clock(start + length)}
                </Text>
              </View>
            </View>

            {/* How long: 5 to 30 seconds. */}
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
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
                  style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: "center", backgroundColor: length === seconds ? palette.crimson : CHIP }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>{seconds}s</Text>
                </Pressable>
              ))}
            </View>

            {/* The song as a bar; drag the highlighted part to choose what plays. */}
            {duration > length && (
              <View style={{ gap: 6 }}>
              <View
                onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
                style={{ height: 40, borderRadius: 8, backgroundColor: CHIP, justifyContent: "center" }}
              >
                <View style={{ position: "absolute", left: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, height: 40 }}>
                  {Array.from({ length: 40 }, (_, i) => (
                    <View key={i} style={{ flex: 1, height: 8 + ((i * 37) % 22), borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)" }} />
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
                    borderColor: ROSE,
                    backgroundColor: "rgba(242,182,207,0.22)",
                    ...(Platform.OS === "web" ? ({ cursor: "grab", touchAction: "none" } as object) : null),
                  }}
                />
              </View>
              {/* The song's start and end, and 5 seconds back or forward. */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: WHITE_SOFT }}>0:00</Text>
                <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 10 }}>
                  {([-5, 5] as const).map((by) => (
                    <Pressable
                      key={by}
                      accessibilityRole="button"
                      accessibilityLabel={by < 0 ? "5 seconds earlier" : "5 seconds later"}
                      onPress={() => nudge(by)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: CHIP }}
                    >
                      <Ionicons name={by < 0 ? "play-back" : "play-forward"} size={14} color="#FFFFFF" />
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>{by < 0 ? "−5s" : "+5s"}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: WHITE_SOFT }}>{clock(duration)}</Text>
              </View>
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
                  style={{ flex: 1, minHeight: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: ROSE }}>Remove music</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use this song"
                onPress={() => {
                  stopPreview();
                  onPick({
                    trackId: chosen.id,
                    title: chosen.title,
                    artist: chosen.artist,
                    url: chosen.url,
                    start: clampStart(start, length, duration),
                    length,
                    coverUrl: chosen.coverUrl ?? null,
                    lyrics: chosen.lyrics ?? [],
                  });
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

/** A song's cover: its picture, or the app's rose gradient with a note. */
function Cover({ track, playing }: { track: MusicTrack; playing: boolean }) {
  const size = 48;
  if (track.coverUrl) return <Image source={{ uri: track.coverUrl }} style={{ width: size, height: size, borderRadius: 8, backgroundColor: CHIP }} />;
  return (
    <LinearGradient colors={[palette.crimson, palette.navyDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={playing ? "volume-high" : "musical-notes"} size={20} color="#FFFFFF" />
    </LinearGradient>
  );
}
