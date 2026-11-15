/**
 * Ludo's sounds: the dice, each step of a token, a cut, a token home, a
 * six, your turn, the clock running out and the win - in seven packs to
 * choose from in Settings. They are our own (made in code, in
 * assets/sounds/ludo), small enough to load at once.
 *
 * Volume (0-1) and mute are kept on the phone. expo-audio plays them on
 * the website and in the app alike.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { clampVolume, type LudoCue } from "./ludoEvents";
import { SOUND_FILES } from "./soundFiles";

export type LudoSoundName = LudoCue | "step" | "tick";

/** The pack in use (Settings): its nine sounds. */
let pack = "classic";
const filesOf = (name: string) => SOUND_FILES[name] ?? SOUND_FILES.classic!;
/** Steps come fast, one per square: a few players take turns. */
const COPIES: Partial<Record<LudoSoundName, number>> = { step: 3, tick: 2 };
const KEY = "apnajoda.ludo.sound";

let players: Partial<Record<LudoSoundName, AudioPlayer[]>> | null = null;
const turnOf: Partial<Record<LudoSoundName, number>> = {};
let volume = 0.8;
let muted = false;
let loaded = false;
const listeners = new Set<() => void>();

function ensure() {
  if (players) return players;
  players = {};
  const FILES = filesOf(pack) as Record<LudoSoundName, number>;
  for (const name of Object.keys(FILES) as LudoSoundName[]) {
    const list: AudioPlayer[] = [];
    for (let i = 0; i < (COPIES[name] ?? 1); i += 1) {
      try {
        list.push(createAudioPlayer(FILES[name]));
      } catch {
        // No sound on this device: the game plays on silently.
      }
    }
    players[name] = list;
  }
  return players;
}

export const ludoSound = {
  /** Read the saved volume once. */
  async load() {
    if (loaded) return;
    loaded = true;
    try {
      const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || "null") as { volume?: number; muted?: boolean } | null;
      if (saved) {
        volume = clampVolume(saved.volume ?? volume);
        muted = !!saved.muted;
        listeners.forEach((l) => l());
      }
    } catch {
      // Keep the defaults.
    }
  },
  get volume() {
    return volume;
  },
  get muted() {
    return muted;
  },
  set(next: { volume?: number; muted?: boolean }) {
    if (next.volume !== undefined) volume = clampVolume(next.volume);
    if (next.muted !== undefined) muted = next.muted;
    if (next.volume !== undefined && next.volume > 0 && next.muted === undefined) muted = false;
    AsyncStorage.setItem(KEY, JSON.stringify({ volume, muted })).catch(() => undefined);
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Load the sounds early (on opening the game), so the first one is not late. */
  warm() {
    ensure();
  },
  play(name: LudoSoundName) {
    if (muted || volume <= 0) return;
    const list = ensure()[name];
    if (!list?.length) return;
    const index = (turnOf[name] ?? 0) % list.length;
    turnOf[name] = index + 1;
    const player = list[index]!;
    try {
      player.volume = volume;
      void player.seekTo(0).catch(() => undefined);
      player.play();
    } catch {
      // A sound that cannot play is skipped.
    }
  },
  /** A sound pack from Settings ("classic", "wood"...). */
  setPack(next: string) {
    if (next === pack || !SOUND_FILES[next]) return;
    this.release();
    pack = next;
  },
  get pack() {
    return pack;
  },
  /** Settings: hear a pack before choosing it. */
  preview(name: string) {
    const before = pack;
    this.setPack(name);
    this.play("dice");
    setTimeout(() => this.play("six"), 950);
    if (before !== name) setTimeout(() => this.setPack(before), 1600);
  },
  /** Leaving the game: free the players. */
  release() {
    if (!players) return;
    for (const list of Object.values(players)) {
      for (const player of list ?? []) {
        try {
          player.remove();
        } catch {
          // Already gone.
        }
      }
    }
    players = null;
  },
};
