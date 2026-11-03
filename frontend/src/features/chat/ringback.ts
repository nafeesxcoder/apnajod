// The sound the person who is calling hears while the other phone rings.
// It is the same for every call (the other person can pick their own ringtone).
// Generated with the Web Audio API, so no audio file is needed:
// two tones (440 Hz + 480 Hz), 2 seconds on and 4 seconds off.
type Ringback = { stop: () => void };

export function startRingback(): Ringback {
  const AudioCtx =
    typeof window !== "undefined"
      ? (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
      : undefined;
  if (!AudioCtx) return { stop: () => undefined };

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return { stop: () => undefined };
  }
  void ctx.resume?.().catch(() => undefined);

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  [440, 480].forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start();
  });

  const ring = () => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
    gain.gain.setValueAtTime(0.12, t + 1.95);
    gain.gain.linearRampToValueAtTime(0, t + 2);
  };
  ring();
  const timer = setInterval(ring, 6000);

  return {
    stop: () => {
      clearInterval(timer);
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        void ctx.close();
      } catch {
        // already closed
      }
    },
  };
}
