import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import type { ClipPlayer } from "./clipPlayer";

export type { ClipPlayer } from "./clipPlayer";

/** Plays part of a song on a phone (expo-audio), like the browser version. */
export function createClipPlayer(url: string, start: number, length: number, loop = false): ClipPlayer {
  void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  const player = createAudioPlayer({ uri: url });
  const end = start + length;
  let wanted = false;
  let alive = true;
  void player.seekTo(start).catch(() => undefined);
  const timer = setInterval(() => {
    if (!alive || !wanted) return;
    if (player.currentTime >= end) {
      if (loop) void player.seekTo(start).catch(() => undefined);
      else {
        wanted = false;
        player.pause();
      }
    }
  }, 250);
  return {
    play: () => {
      wanted = true;
      player.play();
    },
    pause: () => {
      wanted = false;
      player.pause();
    },
    restart: () => void player.seekTo(start).catch(() => undefined),
    setMuted: (muted) => {
      player.muted = muted;
    },
    stop: () => {
      alive = false;
      wanted = false;
      clearInterval(timer);
      try {
        player.pause();
        player.remove();
      } catch {
        // Already gone.
      }
    },
  };
}

export function audioDuration(_uri: string): Promise<number> {
  return Promise.resolve(0);
}
