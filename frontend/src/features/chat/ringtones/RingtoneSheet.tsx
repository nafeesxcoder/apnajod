/**
 * Settings > Call ringtone: twelve of our own, each with a play button, and
 * "Choose from my phone" for your own (MP3 or M4A, up to 2 MB, kept on
 * this phone).
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

import { Sheet } from "../../posts/PostSheets";
import { fonts, palette } from "../../../theme";
import { ringtone } from "./ringtone";
import { MAX_CUSTOM_BYTES, RINGTONES, ringtoneName } from "./ringtoneList";

export function useRingtone() {
  const [, setN] = useState(0);
  useEffect(() => {
    void ringtone.load();
    return ringtone.subscribe(() => setN((n) => n + 1));
  }, []);
  return { selected: ringtone.selected, name: ringtoneName(ringtone.selected, ringtone.customName), customName: ringtone.customName };
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(blob);
  });
}

export function RingtoneSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { selected, customName } = useRingtone();
  const [playing, setPlaying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      ringtone.stopPreview();
      setPlaying(null);
    }
  }, [visible]);

  const play = (key: string) => {
    if (playing === key) {
      ringtone.stopPreview();
      setPlaying(null);
      return;
    }
    ringtone.preview(key);
    setPlaying(key);
    setTimeout(() => setPlaying((now) => (now === key ? null : now)), 6000);
  };

  const pickOwn = async () => {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({ type: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac"], copyToCacheDirectory: true });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    if (asset.size && asset.size > MAX_CUSTOM_BYTES) return setError("That file is too big. Choose one up to 2 MB.");
    setBusy(true);
    try {
      const blob: Blob = (asset as { file?: Blob }).file ?? (await fetch(asset.uri).then((r) => r.blob()));
      if (blob.size > MAX_CUSTOM_BYTES) throw new Error("That file is too big. Choose one up to 2 MB.");
      await ringtone.setCustom(asset.name, await readAsDataUrl(blob));
      play("custom");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use that file.");
    } finally {
      setBusy(false);
    }
  };

  const row = (key: string, name: string, extra?: React.ReactNode) => {
    const on = selected === key;
    return (
      <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 58 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing === key ? `Stop ${name}` : `Play ${name}`}
          onPress={() => play(key)}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: playing === key ? palette.crimson : palette.paperSand, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={playing === key ? "stop" : "play"} size={16} color={playing === key ? "#FFFFFF" : palette.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: on }}
          accessibilityLabel={`Ringtone: ${name}`}
          onPress={() => ringtone.choose(key)}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", minHeight: 58 }}
        >
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: on ? fonts.bodyBold : fonts.body, fontSize: 15, color: palette.ink }}>
            {name}
          </Text>
          <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={on ? palette.crimson : palette.slate} />
        </Pressable>
        {extra}
      </View>
    );
  };

  return (
    <Sheet visible={visible} title="Call ringtone" onClose={onClose} tall>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, paddingHorizontal: 16, paddingVertical: 8 }}>
          What you hear when someone calls you on Apnajoda.
        </Text>
        {RINGTONES.map((r) => row(r.key, r.name))}

        <View style={{ height: 1, backgroundColor: palette.rule, marginVertical: 8, marginHorizontal: 16 }} />
        {customName &&
          row(
            "custom",
            ringtoneName("custom", customName),
            <Pressable accessibilityRole="button" accessibilityLabel="Remove my ringtone" onPress={() => void ringtone.removeCustom()} hitSlop={8} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={18} color={palette.slate} />
            </Pressable>,
          )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a ringtone from my phone"
          onPress={() => void pickOwn()}
          disabled={busy}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 58 }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: palette.crimsonTint, alignItems: "center", justifyContent: "center" }}>
            {busy ? <ActivityIndicator color={palette.crimson} /> : <Ionicons name="folder-open-outline" size={18} color={palette.crimson} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.crimson }}>{customName ? "Choose another from my phone" : "Choose from my phone"}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>MP3 or M4A, up to 2 MB. It stays on this phone.</Text>
          </View>
        </Pressable>
        {!!error && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson, paddingHorizontal: 16 }}>{error}</Text>}
      </ScrollView>
    </Sheet>
  );
}
