/**
 * Plays part of a song - from `start`, for `length` seconds - then stops
 * (or starts the part again, with loop). The browser's own audio player.
 */
export type ClipPlayer = {
  play: () => void;
  pause: () => void;
  /** Back to the clip's start (paused or playing as before). */
  restart: () => void;
  setMuted: (muted: boolean) => void;
  stop: () => void;
};

export function createClipPlayer(url: string, start: number, length: number, loop = false): ClipPlayer {
  if (typeof window === "undefined" || typeof window.Audio === "undefined") {
    const none = () => undefined;
    return { play: none, pause: none, restart: none, setMuted: none, stop: none };
  }
  const audio = new window.Audio();
  audio.preload = "auto";
  audio.src = url;
  let wanted = false;
  let ready = false;
  const end = start + length;
  const seekStart = () => {
    try {
      audio.currentTime = start;
    } catch {
      // Not seekable yet: done on loadedmetadata.
    }
  };
  const go = () => {
    if (wanted && ready) audio.play().catch(() => undefined);
  };
  const onMeta = () => {
    ready = true;
    seekStart();
    go();
  };
  const onTime = () => {
    if (audio.currentTime >= end || audio.currentTime < start - 1) {
      if (loop) seekStart();
      else {
        audio.pause();
        wanted = false;
      }
    }
  };
  audio.addEventListener("loadedmetadata", onMeta);
  audio.addEventListener("timeupdate", onTime);
  return {
    play: () => {
      wanted = true;
      go();
    },
    pause: () => {
      wanted = false;
      audio.pause();
    },
    restart: () => {
      if (ready) seekStart();
    },
    setMuted: (muted) => {
      audio.muted = muted;
    },
    stop: () => {
      wanted = false;
      audio.pause();
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeAttribute("src");
      audio.load();
    },
  };
}

/** A song file's length in seconds, read in the browser (0 if it cannot tell). */
export function audioDuration(uri: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.Audio === "undefined") return resolve(0);
    const audio = new window.Audio();
    audio.preload = "metadata";
    let done = false;
    const finish = (value: number) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };
    // Some MP3s report Infinity until the end is reached: jump there to learn it.
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) finish(audio.duration);
      else audio.currentTime = 1e7;
    };
    audio.ondurationchange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) finish(audio.duration);
    };
    audio.onerror = () => finish(0);
    const timer = setTimeout(() => finish(0), 15000);
    audio.src = uri;
  });
}
