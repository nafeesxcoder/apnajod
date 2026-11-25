import { RTCView, type MediaStream as NativeMediaStream } from "react-native-webrtc";

/**
 * The call's video in the phone app (react-native-webrtc). A voice call
 * needs no element: the phone plays the other person's sound by itself.
 *
 * zOrder 1 lifts a view above the big picture, so the small self view sits on
 * top of the other person's video. Android draws two video surfaces at the
 * same level, and the small one was hidden behind the big one.
 */
export function RTCVideoView({
  stream,
  mirrored,
  zOrder = 0,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  volume?: number;
  sinkId?: string;
  zOrder?: 0 | 1 | 2;
}) {
  if (!stream) return null;
  // RTCView does not redraw when a camera is added to or swapped in a stream
  // it already shows, so the video track ids are part of the key: a camera
  // that turns on mid-call remounts the view and shows straight away.
  const videoIds = stream
    .getVideoTracks()
    .map((track) => track.id)
    .join(",");
  return (
    <RTCView
      key={`${stream.id}:${videoIds}`}
      streamURL={(stream as unknown as NativeMediaStream).toURL()}
      mirror={!!mirrored}
      objectFit="cover"
      zOrder={zOrder}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function RTCAudioSink(_props: { stream: MediaStream | null; volume?: number; sinkId?: string }) {
  return null;
}
