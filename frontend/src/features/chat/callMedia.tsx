import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * The call's video and sound on the website: a <video> for a picture and an
 * <audio> for a voice call. The phone app has its own (callMedia.native.tsx).
 */
function applySinkId(
  element: HTMLMediaElement | null,
  sinkId: string | undefined,
) {
  if (!element || !sinkId) return;
  const withSink = element as HTMLMediaElement & {
    setSinkId?: (id: string) => Promise<void>;
  };
  if (typeof withSink.setSinkId === "function") {
    void withSink.setSinkId(sinkId).catch(() => undefined);
  }
}

export function RTCVideoView({
  stream,
  mirrored,
  muted,
  volume,
  sinkId,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  volume?: number;
  sinkId?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream as any;
      // Belt to the muted prop's braces. React does not reliably apply
      // `muted` to a <video> - it is a long-standing quirk - and a self
      // view that is not muted plays your own microphone back at you,
      // which is heard as an echo on a call.
      if (muted) ref.current.muted = true;
    }
  }, [stream, muted]);
  useEffect(() => {
    if (ref.current && typeof volume === "number") {
      ref.current.volume = volume;
    }
  }, [volume]);
  useEffect(() => {
    applySinkId(ref.current, sinkId);
  }, [sinkId]);
  if (Platform.OS !== "web") return null;
  return React.createElement("video", {
    ref,
    autoPlay: true,
    playsInline: true,
    muted: !!muted,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: mirrored ? "scaleX(-1)" : undefined,
    },
  });
}

// Plays the remote audio track. This is attached for EVERY audio-only call
// (a MediaStream must be attached to a media element to actually be heard).
// A video call's audio plays through the full-screen <video> element itself.
export function RTCAudioSink({
  stream,
  volume,
  sinkId,
}: {
  stream: MediaStream | null;
  volume?: number;
  sinkId?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream as any;
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current && typeof volume === "number") {
      ref.current.volume = volume;
    }
  }, [volume]);
  useEffect(() => {
    applySinkId(ref.current, sinkId);
  }, [sinkId]);
  if (Platform.OS !== "web") return null;
  return React.createElement("audio", {
    ref,
    autoPlay: true,
    playsInline: true,
  });
}
