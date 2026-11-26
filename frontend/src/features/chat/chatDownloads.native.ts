/**
 * Chat files on the phone. A photo or video goes to the gallery. A document goes
 * to the phone's Downloads folder: on Android the person picks that folder once,
 * and after that every document lands there by itself; on iPhone it goes to the
 * share sheet, where "Save to Files" is. What is saved is remembered, so a file
 * is never downloaded twice.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

import { mimeTypeFor } from "../../api/chatApi";
import type { SavedFile } from "./chatDownloads";

const KEY = "apnajoda-chat-downloads";
const FOLDER_KEY = "apnajoda-downloads-folder";

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

/** Downloads the file to the app's cache, once. Returns where it is. */
async function fetchToCache(messageId: string, uri: string, name: string): Promise<string> {
  const safeName = name.replace(/[^A-Za-z0-9._ -]+/g, "_").slice(0, 120) || "file";
  const target = `${FileSystem.cacheDirectory}${messageId}-${safeName}`;
  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists) {
    const result = await FileSystem.downloadAsync(uri, target);
    if (result.status >= 400) throw new Error("Could not download this file. Try again.");
  }
  return target;
}

/** The Downloads folder the person picked once. Asks again if it was not picked yet. */
async function downloadsFolder(askAgain = false): Promise<string | null> {
  if (!askAgain) {
    const kept = await AsyncStorage.getItem(FOLDER_KEY).catch(() => null);
    if (kept) return kept;
  }
  const picked = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!picked.granted) return null;
  await AsyncStorage.setItem(FOLDER_KEY, picked.directoryUri);
  return picked.directoryUri;
}

/** Writes a document into the Downloads folder the person chose. */
async function writeToDownloads(source: string, name: string): Promise<void> {
  const mime = mimeTypeFor(name);
  const base = name.replace(/\.[^.]+$/, "") || "file";
  const contents = await FileSystem.readAsStringAsync(source, {
    encoding: FileSystem.EncodingType.Base64,
  });
  let folder = await downloadsFolder();
  if (!folder) throw new Error("Choose a Downloads folder to save documents to.");
  let fileUri: string;
  try {
    fileUri = await FileSystem.StorageAccessFramework.createFileAsync(folder, base, mime);
  } catch {
    // The folder permission ran out: ask for the folder again, once.
    folder = await downloadsFolder(true);
    if (!folder) throw new Error("Choose a Downloads folder to save documents to.");
    fileUri = await FileSystem.StorageAccessFramework.createFileAsync(folder, base, mime);
  }
  await FileSystem.writeAsStringAsync(fileUri, contents, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Saves the file: a photo or video to the gallery, a document to Downloads. */
export async function saveFile(
  messageId: string,
  uri: string,
  name: string,
  kind: "image" | "video" | "file",
): Promise<SavedFile> {
  const target = await fetchToCache(messageId, uri, name);
  let inGallery = false;
  if (kind !== "file") {
    const permission = await MediaLibrary.requestPermissionsAsync(false, ["photo", "video"]);
    if (!permission.granted) {
      throw new Error(
        "Photos ki permission chahiye. Settings mein Apnajoda ko Photos allow karein, phir dobara try karein.",
      );
    }
    await MediaLibrary.saveToLibraryAsync(target);
    inGallery = true;
  } else if (Platform.OS === "android") {
    await writeToDownloads(target, name);
  } else if (await Sharing.isAvailableAsync()) {
    // iPhone: the share sheet has "Save to Files".
    await Sharing.shareAsync(target);
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
