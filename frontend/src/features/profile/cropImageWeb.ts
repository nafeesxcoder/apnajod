import { outputSize } from "./postCrop";

/**
 * Cuts the chosen part out of a photo in the browser and returns it as a
 * local blob: URL, ready for uploadPhoto. Saved 1080 pixels wide as a JPEG,
 * like Instagram, so a phone's 12-megapixel original is not uploaded whole.
 */
export async function cropImageWeb(
  uri: string,
  rect: { x: number; y: number; width: number; height: number },
  aspect: number,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("That photo could not be opened."));
    element.src = uri;
  });
  const out = outputSize(aspect);
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot crop photos.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("That photo could not be cropped.");
  return URL.createObjectURL(blob);
}
