/**
 * Your Ludo settings, kept on the phone: the board, the sounds, the dice,
 * the tokens and how fast tokens move. Only things you have unlocked can
 * be chosen (the store checks).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { cleanPrefs, DEFAULT_PREFS, type LudoPrefs } from "./ludoLooks";

const KEY = "apnajoda.ludo.prefs";
let prefs: LudoPrefs = DEFAULT_PREFS;
let loaded = false;
const listeners = new Set<() => void>();

export const ludoPrefs = {
  get: () => prefs,
  async load() {
    if (loaded) return prefs;
    loaded = true;
    try {
      prefs = cleanPrefs(JSON.parse((await AsyncStorage.getItem(KEY)) || "null"));
      listeners.forEach((l) => l());
    } catch {
      // Keep the defaults.
    }
    return prefs;
  },
  set(patch: Partial<LudoPrefs>) {
    prefs = cleanPrefs({ ...prefs, ...patch });
    AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => undefined);
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
