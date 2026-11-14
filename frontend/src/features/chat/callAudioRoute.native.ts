import InCallManager from "react-native-incall-manager";

/**
 * The phone app: a call puts the phone in call mode (screen off at the ear,
 * Bluetooth headsets work), a video call starts on the loudspeaker, a voice
 * call at the earpiece, and the speaker button switches between them.
 */
export function startCallAudio(video: boolean) {
  try {
    InCallManager.start({ media: video ? "video" : "audio" });
    InCallManager.setForceSpeakerphoneOn(video);
  } catch {
    // The call still works, through the phone's default output.
  }
}
export function setCallSpeaker(on: boolean) {
  try {
    InCallManager.setForceSpeakerphoneOn(on);
  } catch {
    // Not in a call any more.
  }
}
export function stopCallAudio() {
  try {
    InCallManager.stop();
  } catch {
    // Already stopped.
  }
}
