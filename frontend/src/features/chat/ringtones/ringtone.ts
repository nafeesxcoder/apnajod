/**
 * Your call ringtone: which one, and your own from your phone (kept only on
 * this phone, never sent anywhere). It rings, on repeat, while a call is
 * coming in; Settings can play a few seconds of each to choose.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { RINGTONE_FILES } from "./ringtoneFiles";
import { cleanRingtone, DEFAULT_RINGTONE } from "./ringtoneList";

const KEY = "apnajoda.ringtone";
const CUSTOM_KEY = "apnajoda.ringtone.custom";
const RING_MAX_MS = 15_000;

type Custom = { name: string; dataUrl: string };
let selected = DEFAULT_RINGTONE;
let custom: Custom | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function sourceOf(key: string) {
  if (key === "custom" && custom) return { uri: custom.dataUrl };
  return RINGTONE_FILES[key] ?? RINGTONE_FILES[DEFAULT_RINGTONE]!;
}

let preview: { player: AudioPlayer; timer: ReturnType<typeof setTimeout> } | null = null;

export const ringtone = {
  async load() {
    if (loaded) return;
    loaded = true;
    try {
      const [key, saved] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(CUSTOM_KEY)]);
      custom = saved ? (JSON.parse(saved) as Custom) : null;
      selected = cleanRingtone(key, !!custom);
      emit();
    } catch {
      // Keep the default.
    }
  },
  get selected() {
    return selected;
  },
  get customName() {
    return custom?.name ?? null;
  },
  choose(key: string) {
    selected = cleanRingtone(key, !!custom);
    AsyncStorage.setItem(KEY, selected).catch(() => undefined);
    emit();
  },
  /** Your own sound, as a data address (kept on this phone). */
  async setCustom(name: string, dataUrl: string) {
    custom = { name, dataUrl };
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    this.choose("custom");
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Settings: a few seconds of one ringtone (another tap stops it). */
  preview(key: string, seconds = 6) {
    this.stopPreview();
    try {
      const player = createAudioPlayer(sourceOf(key));
      player.setActiveForLockScreen(false);
      player.volume = 1;
      player.play();
      preview = { player, timer: setTimeout(() => this.stopPreview(), seconds * 1000) };
    } catch {
      // Cannot play here.
    }
  },
  stopPreview() {
    if (!preview) return;
    clearTimeout(preview.timer);
    try {
      preview.player.pause();
      preview.player.remove();
    } catch {
      // Already gone.
    }
    preview = null;
  },
  /** A call is coming in: ring until stop() is called, for at most 15 seconds. */
  startRinging(): { stop: () => void } {
    this.stopPreview();
    let player: AudioPlayer | null = null;
    try {
      player = createAudioPlayer(sourceOf(selected));
      player.setActiveForLockScreen(false);
      player.loop = true;
      player.volume = 1;
      player.play();
    } catch {
      player = null;
    }
    const cap = setTimeout(() => stopRing(), RING_MAX_MS);
    function stopRing() {
      clearTimeout(cap);
      try {
        player?.pause();
        player?.remove();
      } catch {
        // Already gone.
      }
      player = null;
    }
    return { stop: stopRing };
  },
};
