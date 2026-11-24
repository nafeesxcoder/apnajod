/**
 * Chat files on the phone: a file is downloaded to the phone, a photo or a
 * video also goes to the gallery, and any file can be opened from the share
 * sheet. What is saved is remembered, so a file is never downloaded twice.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

import type { SavedFile } from "./chatDownloads";

const KEY = "apnajoda-chat-downloads";

async function readAll(): Promise<Record<string, SavedFile>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || "{}");
  } catch {
    return {};
  }
}

export async function readSaved(messageId: string): Promise<SavedFile | null> {
  return (await readAll())[messageId] ?? null;
}

/** Downloads the file; a photo or video is also put in the gallery. */
export async function saveFile(
  messageId: string,
  uri: string,
  name: string,
  kind: "image" | "video" | "file",
): Promise<SavedFile> {
  const safeName = name.replace(/[^A-Za-z0-9._ -]+/g, "_").slice(0, 120) || "file";
  const target = `${FileSystem.cacheDirectory}${messageId}-${safeName}`;
  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists) {
    const result = await FileSystem.downloadAsync(uri, target);
    if (result.status >= 400) throw new Error("Could not download this file. Try again.");
  }
  let inGallery = false;
  if (kind !== "file") {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (permission.granted) {
      await MediaLibrary.saveToLibraryAsync(target);
      inGallery = true;
    }
  }
  const saved: SavedFile = { localUri: target, inGallery };
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...(await readAll()), [messageId]: saved }));
  return saved;
}

/** Opens a saved file from the share sheet. False if the phone no longer has it. */
export async function openSaved(saved: SavedFile): Promise<boolean> {
  if (!saved.localUri) return false;
  const info = await FileSystem.getInfoAsync(saved.localUri);
  if (!info.exists) return false;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(saved.localUri);
  return true;
}
