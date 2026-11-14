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

/** A song's length in seconds, read by loading it (0 if it cannot be read). */
export function audioDuration(uri: string): Promise<number> {
  return new Promise((resolve) => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      player = createAudioPlayer({ uri });
    } catch {
      resolve(0);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const seconds = Number(player?.duration) || 0;
      if (seconds > 0 || tries > 60) {
        clearInterval(timer);
        try {
          player?.remove();
        } catch {
          // Already gone.
        }
        resolve(seconds > 0 ? seconds : 0);
      }
    }, 250);
  });
}
