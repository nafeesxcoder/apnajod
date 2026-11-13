import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
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
  muted: "#6B7280",
  primary: "#1E3A8A",
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
      await adminApi.musicAdd(accessToken, blob, picked.name, title.trim(), artist.trim(), picked.duration);
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
          Songs here show up under Music when members make a story; a story plays 15 or 30 seconds of one. Only add music you
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
            <View key={track.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}>
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
                  {[track.artist, track.durationSec ? clock(track.durationSec) : ""].filter(Boolean).join(" · ") || " "}
                </Text>
              </View>
              {button(confirmId === track.id ? "Confirm remove" : "Remove", () => void remove(track), confirmId === track.id ? "danger" : "plain", busyId === track.id)}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
