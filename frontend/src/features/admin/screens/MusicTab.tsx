import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

import { adminApi } from "../../../api/adminApi";
import { clock, type MusicTrack } from "../../../api/musicApi";
import { audioDuration, createClipPlayer, type ClipPlayer } from "../../stories/music/clipPlayer";
import { fonts } from "../../../theme";

const C = {
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#5B5478",
  primary: "#8A1E4B",
  danger: "#EF4444",
};

type Picked = { uri: string; name: string; file: Blob | null; duration: number };

/**
 * The story music library. Songs added here show up in the Music button
 * when members make a story. Only add songs you are allowed to use - for
 * example royalty-free music from the YouTube Audio Library or Pixabay
 * Music - until a licensed music service is connected.
 */
export function MusicTab({ accessToken }: { accessToken: string }) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The song whose words are open for editing, and the text in the box.
  const [lyricsFor, setLyricsFor] = useState<string | null>(null);
  const [lyricsDraft, setLyricsDraft] = useState("");
  const player = useRef<ClipPlayer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.musicList(accessToken);
      setTracks(Array.isArray(res?.tracks) ? res.tracks : []);
    } catch (e: any) {
      setError(e?.message || "Could not load the music library");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
    return () => player.current?.stop();
  }, [load]);

  const stop = () => {
    player.current?.stop();
    player.current = null;
    setPlayingId(null);
  };
  const play = (track: MusicTrack) => {
    stop();
    player.current = createClipPlayer(track.url, 0, 30);
    player.current.play();
    setPlayingId(track.id);
  };

  const choose = async () => {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac"],
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      setError("That file is too big (10 MB at most).");
      return;
    }
    const duration = await audioDuration(asset.uri);
    setPicked({ uri: asset.uri, name: asset.name, file: (asset as { file?: Blob }).file ?? null, duration });
    setTitle((current) => current || asset.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
  };

  const save = async () => {
    if (!picked || !title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const blob: Blob = picked.file ?? (await fetch(picked.uri).then((r) => r.blob()));
      const added: any = await adminApi.musicAdd(accessToken, blob, picked.name, title.trim(), artist.trim(), picked.duration);
      // The file could not tell its length before upload: read it from the saved song.
      const track = added?.track;
      if (track?.id && !picked.duration && track.url) {
        const seconds = Math.round(await audioDuration(track.url));
        if (seconds) await adminApi.musicDuration(accessToken, track.id, seconds).catch(() => undefined);
      }
      setPicked(null);
      setTitle("");
      setArtist("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not add the song");
    } finally {
      setSaving(false);
    }
  };

  // A song saved without its length (stories could only use its start):
  // read the length here and save it.
  const fixLength = async (track: MusicTrack) => {
    setBusyId(track.id);
    setError("");
    try {
      const seconds = Math.round(await audioDuration(track.url));
      if (!seconds) throw new Error("This browser could not read the song's length.");
      await adminApi.musicDuration(accessToken, track.id, seconds);
      setTracks((list) => list.map((t) => (t.id === track.id ? { ...t, durationSec: seconds } : t)));
    } catch (e: any) {
      setError(e?.message || "Could not fix the length");
    } finally {
      setBusyId(null);
    }
  };

  /** The words as the box shows them: "[mm:ss.xx] line" each. */
  const lyricsText = (track: MusicTrack) =>
    (track.lyrics ?? [])
      .map((line) => {
        const m = Math.floor(line.at / 60);
        return `[${String(m).padStart(2, "0")}:${(line.at - m * 60).toFixed(2).padStart(5, "0")}] ${line.text}`;
      })
      .join("\n");

  const openLyrics = (track: MusicTrack) => {
    if (lyricsFor === track.id) return setLyricsFor(null);
    setLyricsFor(track.id);
    setLyricsDraft(lyricsText(track));
  };

  const saveLyrics = async (track: MusicTrack) => {
    setBusyId(track.id);
    setError("");
    try {
      const res: any = await adminApi.musicLyrics(accessToken, track.id, lyricsDraft);
      setTracks((list) => list.map((t) => (t.id === track.id ? { ...t, lyrics: res?.lyrics ?? [] } : t)));
      setLyricsFor(null);
    } catch (e: any) {
      setError(e?.message || "Could not save the words");
    } finally {
      setBusyId(null);
    }
  };

  const chooseCover = async (track: MusicTrack) => {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"], copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    if (asset.size && asset.size > 3 * 1024 * 1024) return setError("That picture is too big (3 MB at most).");
    setBusyId(track.id);
    try {
      const blob: Blob = (asset as { file?: Blob }).file ?? (await fetch(asset.uri).then((r) => r.blob()));
      const res = await adminApi.musicCover(accessToken, track.id, blob, asset.name);
      setTracks((list) => list.map((t) => (t.id === track.id ? { ...t, coverUrl: res.coverUrl } : t)));
    } catch (e: any) {
      setError(e?.message || "Could not save the cover");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (track: MusicTrack) => {
    if (confirmId !== track.id) return setConfirmId(track.id);
    setBusyId(track.id);
    setError("");
    try {
      if (playingId === track.id) stop();
      await adminApi.musicDelete(accessToken, track.id);
      setConfirmId(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not remove the song");
    } finally {
      setBusyId(null);
    }
  };

  const input: any = {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.card,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  };
  const card = { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, maxWidth: 640 } as const;
  const button = (label: string, onPress: () => void, tone: "navy" | "plain" | "danger" = "navy", busy = false, icon?: any) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        height: 36,
        borderRadius: 8,
        backgroundColor: tone === "navy" ? C.primary : tone === "danger" ? C.danger : "#F3F4F6",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? <ActivityIndicator size="small" color={tone === "plain" ? C.text : "#FFF"} /> : icon ? <Ionicons name={icon} size={16} color={tone === "plain" ? C.text : "#FFF"} /> : null}
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: tone === "plain" ? C.text : "#FFFFFF" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 20 }}>
      <View style={[card, { gap: 12 }]}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: C.text }}>Add a song</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: C.muted, lineHeight: 19 }}>
          Songs here show up under Music when members make a story; a story plays any 5 to 30 seconds of one, the part the member picks. Only add music you
          are allowed to use, such as royalty-free tracks from the YouTube Audio Library or Pixabay Music. MP3, M4A or AAC, up
          to 10 MB.
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {button(picked ? "Choose another file" : "Choose a song file", () => void choose(), "plain", false, "musical-notes-outline")}
          {!!picked && (
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.body, fontSize: 13, color: C.text }}>
              {picked.name}
              {picked.duration ? ` · ${clock(picked.duration)}` : ""}
            </Text>
          )}
        </View>
        <TextInput value={title} onChangeText={setTitle} placeholder="Song title" placeholderTextColor={C.muted} maxLength={120} style={input} accessibilityLabel="Song title" />
        <TextInput value={artist} onChangeText={setArtist} placeholder="Artist (optional)" placeholderTextColor={C.muted} maxLength={120} style={input} accessibilityLabel="Artist" />
        <View style={{ alignSelf: "flex-start" }}>{button("Add to library", () => void save(), "navy", saving, "add")}</View>
      </View>

      {!!error && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: C.danger }}>{error}</Text>}

      {loading ? (
        <ActivityIndicator color={C.primary} />
      ) : tracks.length === 0 ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: C.muted }}>No songs yet. Add the first one above.</Text>
      ) : (
        <View style={[card, { padding: 0 }]}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: C.muted, padding: 14 }}>
            {tracks.length} song{tracks.length === 1 ? "" : "s"} in the library
          </Text>
          {tracks.map((track) => (
            <View key={track.id} style={{ borderTopWidth: 1, borderTopColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, flexWrap: "wrap" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={track.coverUrl ? `Change the cover of ${track.title}` : `Add a cover to ${track.title}`}
                onPress={() => void chooseCover(track)}
                style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border }}
              >
                {track.coverUrl ? <Image source={{ uri: track.coverUrl }} style={{ width: 44, height: 44 }} /> : <Ionicons name="image-outline" size={18} color={C.muted} />}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={playingId === track.id ? `Stop ${track.title}` : `Play ${track.title}`}
                onPress={() => (playingId === track.id ? stop() : play(track))}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name={playingId === track.id ? "stop" : "play"} size={16} color="#FFFFFF" />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: C.text }}>{track.title}</Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: C.muted }}>
                  {[track.artist, track.durationSec ? clock(track.durationSec) : "length unknown"].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {!track.durationSec && button("Fix length", () => void fixLength(track), "plain", busyId === track.id)}
              {button(track.lyrics?.length ? `Lyrics ✓ (${track.lyrics.length})` : "Add lyrics", () => openLyrics(track), "plain", false, "text-outline")}
              {button(confirmId === track.id ? "Confirm remove" : "Remove", () => void remove(track), confirmId === track.id ? "danger" : "plain", busyId === track.id)}
            </View>
            {lyricsFor === track.id && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: C.muted, lineHeight: 18 }}>
                  One line each, with the time it starts: [minutes:seconds] then the words, e.g. [00:12.5] for 12.5 seconds in. A time with no
                  words is a gap. These show on the song's lyrics sticker as it plays. Only add words you have the rights to use.
                </Text>
                <TextInput
                  accessibilityLabel={`Lyrics of ${track.title}`}
                  value={lyricsDraft}
                  onChangeText={setLyricsDraft}
                  multiline
                  placeholder={"[00:05] First line\n[00:09.5] Second line\n[00:15]"}
                  placeholderTextColor={C.muted}
                  style={[input, { minHeight: 160, textAlignVertical: "top", fontFamily: Platform.OS === "web" ? "monospace" : fonts.body }]}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {button("Save lyrics", () => void saveLyrics(track), "navy", busyId === track.id, "checkmark")}
                  {button("Cancel", () => setLyricsFor(null), "plain")}
                </View>
              </View>
            )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
