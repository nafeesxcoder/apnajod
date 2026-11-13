import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { palette } from "../../../theme";

/** Tallest a post is shown: 9:16, a phone photo held upright. */
const TALLEST = 9 / 16;
/** Widest: 1.91:1, Instagram's landscape. */
const WIDEST = 1.91;

/**
 * Real shapes already read, by photo URL. Reading them before a list of posts
 * is opened (primePostSizes) means each post is laid out at its final height
 * from the start, so the list does not jump while photos load.
 */
const shapes = new Map<string, number>();

export function primePostSizes(uris: string[]) {
  for (const uri of uris) {
    if (!uri || shapes.has(uri)) continue;
    Image.getSize(
      uri,
      (width, height) => shapes.set(uri, shownAspect(width, height)),
      () => undefined,
    );
  }
}

/** The shape to show a post at, from its real width / height. */
export function shownAspect(width: number, height: number, fallback = 1): number {
  if (!width || !height) return fallback;
  return Math.min(WIDEST, Math.max(TALLEST, width / height));
}

/**
 * A post shown whole, at its own shape.
 *
 * Posts made since the size picker were cropped to their saved shape, so
 * that is used straight away. Older posts were uploaded as they came off the
 * phone and all say "square"; showing them square cut the top and bottom off
 * a tall photo. So the photo's real size is read, and it is shown at that
 * shape - nothing cut away (within 9:16 and 1.91:1).
 */
export function PostImage({
  uri,
  aspect,
  style,
  accessibilityLabel,
}: {
  uri: string;
  /** The shape the post was saved at, if known. */
  aspect?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}) {
  const [ratio, setRatio] = useState(() => shapes.get(uri) ?? aspect ?? 1);

  useEffect(() => {
    let live = true;
    const known = shapes.get(uri);
    if (known) {
      setRatio(known);
      return;
    }
    setRatio(aspect || 1);
    Image.getSize(
      uri,
      (width, height) => {
        const shape = shownAspect(width, height, aspect || 1);
        shapes.set(uri, shape);
        if (live) setRatio(shape);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [uri, aspect]);

  return (
    <Image
      source={{ uri }}
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      style={[{ width: "100%", aspectRatio: ratio, backgroundColor: palette.paperSand }, style]}
    />
  );
}
