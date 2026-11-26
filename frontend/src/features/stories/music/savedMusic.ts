import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@apnajoda/saved_music";

/** The songs a person saved for later (the bookmark in the music picker), on this device. */
export async function loadSavedMusic(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function saveSavedMusic(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Not kept after this visit; the list still works until the app closes.
  }
}
