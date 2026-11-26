import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The notifications this phone has deleted, or marked "not interested". They are
 * kept on this phone only; the list itself is not changed on the server.
 */
const KEY = "apnajoda-hidden-notifications";
const MAX = 300;

export async function loadHiddenNotifications(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Adds one notification to the hidden list, saves it, and returns the new list. */
export async function hideNotification(current: string[], key: string): Promise<string[]> {
  const next = [...new Set([...current, key])].slice(-MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage is blocked: the row stays hidden for this visit only.
  }
  return next;
}
