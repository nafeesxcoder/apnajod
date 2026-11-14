import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Your own microphone must never come back out of your own speaker.
 *
 * The self view on a call is a preview of your camera. If its audio ever
 * plays, you hear your own voice a fraction of a second late - which is
 * what people report as echo, and it is indistinguishable from an echo
 * coming from the other end.
 *
 * There were two guards and both could fail quietly. `muted` is passed as
 * a prop to <video>, and React has never applied that one reliably. So
 * the self view is now handed a stream with the microphone removed: if
 * muting fails there is nothing left to play.
 */
const source = readFileSync('src/features/chat/CallModalReal.tsx', 'utf8');

describe('the self view on a call', () => {
  it('is built from video tracks only', () => {
    expect(source).toContain('new MediaStream(source.getVideoTracks())');
  });

  it('is what both the main and the small view use for yourself', () => {
    // Either slot can hold the self view, depending on which one the
    // member swapped to, so both have to use the stripped stream.
    expect(source).toContain('? selfPreview');
    expect(source).toContain('? selfPreview\n      : null;');
    expect(source).not.toContain('? engine.localStream\n    : hasRemoteVideo');
  });

  it('still mutes the element, and does it on the element itself', () => {
    // The <video> element moved to callMedia.tsx (the phone app draws an
    // RTCView instead, which never plays local audio).
    const media = readFileSync('src/features/chat/callMedia.tsx', 'utf8');
    expect(media).toContain('ref.current.muted = true');
  });

  it('keeps echo cancellation on the microphone it does send', () => {
    const engine = readFileSync('src/features/chat/useCallEngine.ts', 'utf8');
    expect(engine).toContain('echoCancellation: true');
    expect(engine).toContain('noiseSuppression: true');
  });
});
