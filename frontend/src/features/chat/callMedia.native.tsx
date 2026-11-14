import { RTCView, type MediaStream as NativeMediaStream } from "react-native-webrtc";

/**
 * The call's video in the phone app (react-native-webrtc). A voice call
 * needs no element: the phone plays the other person's sound by itself.
 */
export function RTCVideoView({
  stream,
  mirrored,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  volume?: number;
  sinkId?: string;
}) {
  if (!stream) return null;
  return (
    <RTCView
      streamURL={(stream as unknown as NativeMediaStream).toURL()}
      mirror={!!mirrored}
      objectFit="cover"
      zOrder={0}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function RTCAudioSink(_props: { stream: MediaStream | null; volume?: number; sinkId?: string }) {
  return null;
}
