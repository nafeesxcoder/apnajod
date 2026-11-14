import { registerGlobals } from "react-native-webrtc";

/**
 * The phone app: react-native-webrtc puts RTCPeerConnection and
 * navigator.mediaDevices where the browser has them, so the same call
 * engine runs on the website and in the app.
 */
registerGlobals();
export const webrtcReady = true;
