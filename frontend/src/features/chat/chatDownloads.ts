/**
 * Chat files on the web: a download starts the browser's own download. What
 * is saved is remembered, so the card shows "Open" after the first download.
 * (The phone app has its own version: chatDownloads.native.ts.)
 */
export type SavedFile = { localUri: string | null; inGallery: boolean };

const KEY = "apnajoda-chat-downloads";

function readAll(): Record<string, SavedFile> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export async function readSaved(messageId: string): Promise<SavedFile | null> {
  return readAll()[messageId] ?? null;
}

export async function saveFile(
  messageId: string,
  uri: string,
  name: string,
  _kind: "image" | "video" | "file",
): Promise<SavedFile> {
  const link = document.createElement("a");
  link.href = uri;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  const saved: SavedFile = { localUri: uri, inGallery: false };
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [messageId]: saved }));
  } catch {
    // Private browsing: the card just asks again next time.
  }
  return saved;
}

/** Opens a saved file in a new tab. */
export async function openSaved(saved: SavedFile): Promise<boolean> {
  if (!saved.localUri) return false;
  window.open(saved.localUri, "_blank", "noopener");
  return true;
}
