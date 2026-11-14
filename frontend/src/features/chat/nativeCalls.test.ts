import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Calls in the phone app. The browser has WebRTC built in; the Android and
 * iOS apps get it from react-native-webrtc, which has to be registered as
 * globals before the call engine looks for RTCPeerConnection.
 */
const read = (name: string) => readFileSync(join(__dirname, name), 'utf8');

describe('calls in the phone app', () => {
  it('registers react-native-webrtc before the engine checks for it', () => {
    expect(read('webrtcGlobals.native.ts')).toContain('registerGlobals()');
    expect(read('webrtcGlobals.ts')).toContain('webrtcReady = true');
    const engine = read('useCallEngine.ts');
    expect(engine).toContain('from "./webrtcGlobals"');
    expect(engine).toContain('!webrtcReady');
  });

  it('draws video with RTCView in the app and <video> on the web', () => {
    expect(read('callMedia.native.tsx')).toContain('.toURL()}');
    expect(read('callMedia.native.tsx')).toContain('<RTCView');
    expect(read('callMedia.tsx')).toContain('createElement("video"');
    expect(read('CallModalReal.tsx')).toContain('from "./callMedia"');
  });

  it('routes call audio through the phone earpiece or speaker', () => {
    const route = read('callAudioRoute.native.ts');
    expect(route).toContain('InCallManager.start(');
    expect(route).toContain('setForceSpeakerphoneOn');
    expect(route).toContain('InCallManager.stop()');
    const modal = read('CallModalReal.tsx');
    expect(modal).toContain('startCallAudio(mode === "video")');
    expect(modal).toContain('setCallSpeaker(speakerOn)');
  });

  it('asks for camera and microphone in the app build', () => {
    const app = readFileSync(join(__dirname, '../../../app.json'), 'utf8');
    expect(app).toContain('@config-plugins/react-native-webrtc');
    expect(app).toContain('microphonePermission');
  });
});
