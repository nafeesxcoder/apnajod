import type { RefObject } from "react";
import { captureRef } from "react-native-view-shot";

import type { EditorState } from "./model";

export type BakeInput = {
  uri: string;
  state: EditorState;
  backdrop: [string, string];
  frameRef?: RefObject<unknown>;
};

/** On a phone the finished story is a picture of the editor's frame. */
export async function bakeStory({ frameRef }: BakeInput): Promise<string> {
  if (!frameRef?.current) throw new Error("Your story could not be made.");
  // 0.8: a screen-sized story is about a third of the size at 0.92, which is what a small upload limit lets through.
  return captureRef(frameRef as RefObject<never>, { format: "jpg", quality: 0.8, result: "tmpfile" });
}

export async function backdropFor(_uri: string): Promise<[string, string]> {
  return ["#1B1B1F", "#0B0B0D"];
}
