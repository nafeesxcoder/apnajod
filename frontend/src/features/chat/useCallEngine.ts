import { useCallback, useEffect, useRef, useState } from "react";

/** Turns echo cancellation back on for any mic track that came up without it. */
export async function ensureEchoCancellation(stream: MediaStream): Promise<void> {
  for (const track of stream.getAudioTracks()) {
    const settings = typeof track.getSettings === "function" ? track.getSettings() : null;
    if (!settings || settings.echoCancellation !== false) continue;
    try {
      await track.applyConstraints({ echoCancellation: true, noiseSuppression: true });
    } catch {
      // Nothing more a web page can do; the call goes on as it is.
    }
  }
}
import { callApi } from "../../api/callApi";
import { webrtcReady } from "./webrtcGlobals";

export type CallPhase =
  | "connecting"
  | "ringing"
  | "connected"
  | "ended"
  | "declined"
  | "permission-error"
  | "unsupported";

export type UseCallEngineArgs = {
  accessToken: string;
  callId: string | null;
  mode: "audio" | "video";
  isCaller: boolean;
  onEnded: (reason: string) => void;
};

export type CallEngine = {
  phase: CallPhase;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  // True while MY camera is on.
  cameraEnabled: boolean;
  // True while the OTHER person's camera is on.
  remoteVideo: boolean;
  // "video" as soon as either side has a camera on, otherwise "audio". A voice
  // call becomes a video call (and back) by turning cameras on and off.
  kind: "audio" | "video";
  // Short message when switching to video fails (e.g. camera blocked).
  notice: string | null;
  canSwitchCamera: boolean;
  isFrontCamera: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  hangUp: (reason?: string) => void;
};

export function useCallEngine({
  accessToken,
  callId,
  mode,
  isCaller,
  onEnded,
}: UseCallEngineArgs): CallEngine {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(mode === "video");
  const [remoteVideo, setRemoteVideo] = useState(mode === "video");
  const [notice, setNotice] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sinceMsRef = useRef(0);
  const remoteDescriptionSetRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const endedRef = useRef(false);
  const cameraEnabledRef = useRef(mode === "video");
  const cameraBusyRef = useRef(false);
  const makingOfferRef = useRef(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = useCallback(
    (reason: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase(reason === "declined" ? "declined" : "ended");
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      onEnded(reason);
    },
    [onEnded],
  );

  const hangUp = useCallback(
    (reason: string = "hangup") => {
      if (endedRef.current) return;
      if (callId) {
        void callApi.sendSignal(accessToken, callId, "hangup", {});
        void callApi.end(accessToken, callId, reason);
      }
      finish(reason);
    },
    [accessToken, callId, finish],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((current) => {
      const next = !current;
      localStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = next));
      return next;
    });
  }, []);

  const setCamera = useCallback((on: boolean) => {
    cameraEnabledRef.current = on;
    setCameraEnabled(on);
  }, []);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4500);
  }, []);

  const refreshCameraCount = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCanSwitchCamera(devices.filter((d) => d.kind === "videoinput").length > 1);
    } catch {
      // Some browsers hide the device list; then the switch-camera button stays hidden.
    }
  }, []);

  const sendModeSignal = useCallback(
    (video: boolean) => {
      if (callId) void callApi.sendSignal(accessToken, callId, "mode", { video });
    },
    [accessToken, callId],
  );

  // Sends a fresh offer to the other side (used when a video track is added mid-call).
  const negotiate = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !callId || endedRef.current) return;
    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      // An offer from the other side arrived first: let that one win.
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);
      await callApi.sendSignal(accessToken, callId, "offer", offer);
    } catch {
      // The next camera toggle retries.
    } finally {
      makingOfferRef.current = false;
    }
  }, [accessToken, callId]);

  // Turns MY camera on or off. On a voice call this is the switch to video:
  // the video track is added and renegotiated with the other person.
  const toggleCamera = useCallback(() => {
    if (cameraBusyRef.current) return;
    cameraBusyRef.current = true;
    void (async () => {
      try {
        const stream = localStreamRef.current;
        const pc = pcRef.current;
        if (!stream || !pc || endedRef.current) return;
        const videoTransceiver = pc
          .getTransceivers()
          .find((transceiver) => transceiver.receiver.track?.kind === "video");
        if (cameraEnabledRef.current) {
          const sender = videoTransceiver?.sender;
          if (sender) await sender.replaceTrack(null).catch(() => undefined);
          stream.getVideoTracks().forEach((track) => {
            stream.removeTrack(track);
            track.stop();
          });
          setLocalStream(new MediaStream(stream.getTracks()));
          setCamera(false);
          sendModeSignal(false);
          return;
        }
        let video: MediaStream;
        try {
          video = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: "user",
            },
          });
        } catch {
          showNotice("Camera access is blocked. Allow it in your browser settings to switch to video.");
          return;
        }
        const track = video.getVideoTracks()[0];
        if (!track) return;
        stream.addTrack(track);
        if (videoTransceiver) {
          await videoTransceiver.sender.replaceTrack(track);
          if (videoTransceiver.direction !== "sendrecv") {
            videoTransceiver.direction = "sendrecv";
            await negotiate();
          }
        } else {
          pc.addTrack(track, stream);
          await negotiate();
        }
        setLocalStream(new MediaStream(stream.getTracks()));
        setIsFrontCamera(true);
        setCamera(true);
        sendModeSignal(true);
        void refreshCameraCount();
      } finally {
        cameraBusyRef.current = false;
      }
    })();
  }, [negotiate, refreshCameraCount, sendModeSignal, setCamera, showNotice]);

  const switchCamera = useCallback(() => {
    if (!cameraEnabledRef.current) return;
    void (async () => {
      const nextFacingMode = isFrontCamera ? "environment" : "user";
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: { exact: nextFacingMode },
          },
        });
      } catch {
        // Some devices/browsers reject `exact` (e.g. a laptop with only
        // one camera, or a browser that doesn't support the constraint
        // the way we asked for it) — fall back to a non-strict request
        // before giving up on the switch entirely.
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: nextFacingMode,
            },
          });
        } catch {
          return;
        }
      }
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;
      newTrack.enabled = cameraEnabled;

      const pc = pcRef.current;
      const sender = pc
        ?.getSenders()
        .find((candidate) => candidate.track?.kind === "video");
      if (sender) {
        try {
          await sender.replaceTrack(newTrack);
        } catch {
          newTrack.stop();
          return;
        }
      }

      const current = localStreamRef.current;
      if (current) {
        current.getVideoTracks().forEach((track) => {
          current.removeTrack(track);
          track.stop();
        });
        current.addTrack(newTrack);
        setLocalStream(new MediaStream(current.getTracks()));
      }
      setIsFrontCamera((prev) => !prev);
    })();
  }, [isFrontCamera, cameraEnabled]);

  useEffect(() => {
    if (!callId) return;
    // The website has WebRTC built in; the phone app gets it from
    // react-native-webrtc (see webrtcGlobals.native.ts).
    if (
      !webrtcReady ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof RTCPeerConnection === "undefined"
    ) {
      setPhase("unsupported");
      setError("Calling is not available on this device.");
      return;
    }
    let active = true;

    // This hook's refs live on the CallModal component instance, which
    // stays mounted for the whole chat screen — it isn't remounted between
    // one call and the next. endedRef in particular used to stay `true`
    // forever after the FIRST call ended, so on every call after that,
    // hangUp()/finish() would see it already "ended" and silently return
    // without closing the peer connection, stopping the mic track, or
    // calling onEnded. That's what made a second call need a full page
    // refresh before audio worked again. remoteDescriptionSetRef and
    // pendingCandidatesRef are likewise per-call signaling state that must
    // start clean for each new callId, not carry over from the last call.
    endedRef.current = false;
    remoteDescriptionSetRef.current = false;
    pendingCandidatesRef.current = [];
    sinceMsRef.current = 0;
    // Same carry-over problem as the refs above: phase/error are component
    // state, so without resetting them here, a new call's very first render
    // still shows whatever phase the PREVIOUS call ended on (usually
    // "ended"), and only flips to "ringing"/"connected" once this effect's
    // async flow catches up -- that's what caused "Call Ended" to flash
    // briefly before "Ringing" when placing a new call.
    setPhase("connecting");
    setError(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;
    makingOfferRef.current = false;
    cameraBusyRef.current = false;
    cameraEnabledRef.current = mode === "video";
    setCameraEnabled(mode === "video");
    setRemoteVideo(mode === "video");
    setNotice(null);

    const run = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // Explicit constraints instead of a bare `true`: on several mobile
          // browsers (notably iOS Safari / in-app webviews), requesting
          // audio+video together without explicit audio processing
          // constraints can silently disable echo cancellation, which is
          // what caused the very loud mic feedback/noise heard during
          // video calls even when nobody was speaking.
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            // autoGainControl automatically boosts the mic's gain when the
            // input is quiet — which is exactly what was making distant
            // background sound (a fan, people talking across the room,
            // traffic outside) come through loudly: the AGC was turning it
            // up to compensate for the speaker not being right next to the
            // mic. Turning it off keeps the mic at a fixed sensitivity, so
            // only sound close to the phone comes through at a normal
            // volume and everything farther away stays quiet.
            autoGainControl: false,
            channelCount: 1,
            // Legacy Chrome-prefixed equivalents. Several Android WebViews
            // and older Chrome builds only actually enable acoustic echo
            // cancellation when these are present alongside the standard
            // constraints above — without them, the other side can hear
            // their own voice looped back (the "hello hello" echo), mainly
            // when the call is on speakerphone instead of an earpiece/
            // headset.
            ...({
              googEchoCancellation: true,
              googAutoGainControl: false,
              googNoiseSuppression: true,
              googHighpassFilter: true,
            } as MediaTrackConstraints),
          },
          video:
            mode === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30, max: 30 },
                  facingMode: "user",
                }
              : false,
        });
      } catch {
        if (!active) return;
        setPhase("permission-error");
        setError(
          "Camera/microphone access was blocked. Allow access in your browser settings and try again.",
        );
        return;
      }
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      // Some phone browsers accept the echo-cancellation request above and
      // then quietly run the mic without it. Ask the track what it is
      // really doing, and if echo cancellation is off, ask again - without
      // it the other person hears their own voice come back.
      await ensureEchoCancellation(stream);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsFrontCamera(true);

      // `enumerateDevices` is always defined on the MediaDevices interface, so
      // testing the method itself was always true. What actually varies is
      // whether `navigator.mediaDevices` exists at all (it is absent on
      // insecure origins and in some embedded webviews).
      if (mode === "video" && typeof navigator.mediaDevices?.enumerateDevices === "function") {
        // Some browsers only report device labels/count after a stream has been
        // granted, and a handful block enumeration entirely; in that case the
        // switch-camera button just stays hidden.
        void refreshCameraCount();
      }

      const { iceServers } = await callApi.getIceServers(accessToken);
      if (!active) return;
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (!active) return;
        // A track added mid-call (voice -> video) may arrive without a stream
        // attached, so keep our own stream and add the track to it.
        let stream = remoteStreamRef.current;
        if (event.streams[0]) {
          stream = event.streams[0];
        } else {
          stream = stream ?? new MediaStream();
          if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
        }
        remoteStreamRef.current = stream;
        if (event.track.kind === "video") setRemoteVideo(true);
        setRemoteStream(stream);
        setPhase("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && callId) {
          void callApi.sendSignal(
            accessToken,
            callId,
            "ice-candidate",
            event.candidate.toJSON(),
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (!active) return;
        if (pc.connectionState === "connected") setPhase("connected");
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          finish("connection-lost");
        }
      };

      const flushPendingCandidates = async () => {
        const queued = pendingCandidatesRef.current;
        pendingCandidatesRef.current = [];
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            // ignore malformed/late candidates
          }
        }
      };

      if (isCaller) {
        setPhase("ringing");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (callId) await callApi.sendSignal(accessToken, callId, "offer", offer);
      }

      const poll = async () => {
        if (!active || !callId) return;
        try {
          const signals = await callApi.pollSignals(
            accessToken,
            callId,
            sinceMsRef.current,
          );
          for (const signal of signals) {
            sinceMsRef.current = Math.max(sinceMsRef.current, signal.createdAtMs);
            if (signal.type === "offer") {
              // Either side can offer once the call is up (voice -> video).
              // If both offer at once the caller keeps its offer and the callee
              // rolls back and answers.
              const collision =
                makingOfferRef.current || pc.signalingState !== "stable";
              if (collision && isCaller) continue;
              if (collision) {
                await pc
                  .setLocalDescription({ type: "rollback" })
                  .catch(() => undefined);
              }
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload),
              );
              remoteDescriptionSetRef.current = true;
              await flushPendingCandidates();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await callApi.sendSignal(accessToken, callId, "answer", answer);
            } else if (signal.type === "answer") {
              if (pc.signalingState !== "have-local-offer") continue;
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload),
              );
              remoteDescriptionSetRef.current = true;
              await flushPendingCandidates();
            } else if (signal.type === "mode") {
              setRemoteVideo(!!(signal.payload as { video?: boolean })?.video);
            } else if (signal.type === "ice-candidate") {
              if (remoteDescriptionSetRef.current) {
                try {
                  await pc.addIceCandidate(signal.payload);
                } catch {
                  // ignore
                }
              } else {
                pendingCandidatesRef.current.push(signal.payload);
              }
            } else if (signal.type === "hangup") {
              finish("remote-hangup");
            }
          }
        } catch {
          // transient network hiccup; next poll will retry
        }
      };
      pollTimerRef.current = setInterval(() => void poll(), 1200);
      void poll();

      if (!isCaller) {
        statusTimerRef.current = setInterval(async () => {
          if (!active || !callId) return;
          try {
            const { status } = await callApi.getStatus(accessToken, callId);
            if (status === "ended") finish("remote-hangup");
            if (status === "declined") finish("declined");
          } catch {
            // ignore
          }
        }, 2500);
      } else {
        statusTimerRef.current = setInterval(async () => {
          if (!active || !callId) return;
          try {
            const { status } = await callApi.getStatus(accessToken, callId);
            if (status === "declined") finish("declined");
            if (status === "ended") finish("remote-hangup");
          } catch {
            // ignore
          }
        }, 1500);
      }
    };

    void run();

    return () => {
      active = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  return {
    phase,
    error,
    localStream,
    remoteStream,
    micEnabled,
    cameraEnabled,
    remoteVideo,
    kind: cameraEnabled || remoteVideo ? "video" : "audio",
    notice,
    canSwitchCamera,
    isFrontCamera,
    toggleMic,
    toggleCamera,
    switchCamera,
    hangUp,
  };
}
