import { API_URL } from "./config";

/**
 * Put an image the member picked onto the server and return its public URL.
 *
 * The picker hands back a local reference â€” `file:///â€¦` on a phone,
 * `blob:â€¦` in a browser â€” which means something only on that device. Storing
 * one is how a selfie could be "submitted" without ever leaving the handset:
 * the row looked fine and the reviewer had nothing to open.
 *
 * Throws if the upload does not land, so a caller that needs the file to
 * really exist can say so instead of carrying on with a dead reference.
 */
export async function uploadPhoto(
  uri: string,
  accessToken: string,
): Promise<string> {
  const body = new FormData();
  const file = await fetch(uri).then((response) => response.blob());
  body.append("photo", file, "photo.jpg");

  const response = await fetch(`${API_URL}/profile/upload-photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) {
    throw new Error(data.error || "The photo could not be uploaded.");
  }
  return data.url as string;
}

/**
 * The same upload, for profile photos, where a failure is not worth blocking
 * on: the member keeps seeing their picture and the next save tries again.
 * Verification must not use this â€” a selfie nobody can open is worse than no
 * selfie, because it still looks like a submission.
 */
export async function uploadPhotoOrKeepLocal(
  uri: string,
  accessToken?: string,
): Promise<string> {
  if (!accessToken) return uri;
  try {
    return await uploadPhoto(uri, accessToken);
  } catch (error) {
    console.log("Photo upload failed, keeping the local copy", error);
    return uri;
  }
}
