import { startRingback } from "./ringback";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Match } from "../../data";
import { chatStyles, callStyles } from "../../theme/appStyles";
import { useCallEngine } from "./useCallEngine";
import { setActiveCallMinimizer } from "./activeCallBackGuard";

// How long the full-screen video controls stay visible after the last tap,
// before auto-hiding — matches WhatsApp's tap-to-reveal call screen.
const CONTROLS_AUTO_HIDE_MS = 4000;

// Points a media element's audio OUTPUT at a specific device (e.g. a
// paired Bluetooth headset) via the Audio Output Devices API. Only a
// handful of browsers support setSinkId (Chrome/Edge do; Safari/Firefox
// don't), so this is always a best-effort no-op fallback to whatever the
// OS currently treats as the default output.
// Device labels that clearly mean "Bluetooth audio device". Android Chrome
// labels it "Bluetooth headset"; desktop browsers use the product name plus
// "Hands-Free" / "(Bluetooth)". A plain "Wired headset" must NOT match.
const BLUETOOTH_LABEL = /bluetooth|airpods|\bbuds\b|hands-?free|\bhfp\b|\ba2dp\b/i;
// Labels for the phone's own audio (speaker, earpiece, wired or USB
// accessories, generic virtual devices). Anything else on a phone is a
// named external device — in practice a Bluetooth earbud/headset that the
// browser lists by product name ("Realme Buds Air 3") without the word
// "Bluetooth".
const NON_BLUETOOTH_LABEL =
  /^default\b|communications|speaker|earpiece|handset|built-?in|internal|wired|usb|line|hdmi|display|digital|spdif|virtual|monitor|realtek|nvidia|intel|stereo mix|microphone|^phone$|^mic\b/i;
const IS_ANDROID =
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

function isBluetoothDeviceLabel(label: string) {
  const text = label.trim();
  if (!text) return false;
  if (BLUETOOTH_LABEL.test(text)) return true;
  return IS_ANDROID && !NON_BLUETOOTH_LABEL.test(text);
}

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

function RTCVideoView({
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
function RTCAudioSink({
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

/** "Phone" mode: a normal talking level, loud enough to hear, quiet enough
 * that little of it leaks back into the microphone as an echo. */
export const PHONE_VOLUME = 0.45;

function CircleButton({
  icon,
  onPress,
  danger,
  active,
  big,
  compact,
  label,
}: {
  label?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
  big?: boolean;
  // Slightly smaller buttons, used when the Bluetooth button joins the bar
  // so six controls still fit on a narrow phone.
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        callStyles.circleBtn,
        active && callStyles.circleBtnOn,
        danger && callStyles.circleBtnDanger,
        big && callStyles.circleBtnBig,
        compact && callStyles.circleBtnCompact,
        compact && big && callStyles.circleBtnBigCompact,
      ]}
    >
      <Ionicons
        name={icon}
        size={danger ? 28 : 24}
        color={danger ? "#FDFDFD" : active ? "#D49AA6" : "#FDFDFD"}
      />
    </Pressable>
  );
}

export function CallModal({
  mode,
  match,
  // No longer shown in the call UI (the "Private couple call"/"Mutual-match
  // call" label was removed from the top bar), but kept in the prop
  // signature since the caller still passes it.
  isCoupleMode: _isCoupleMode,
  accessToken,
  callId,
  isCaller,
  minimized,
  onMinimizedChange,
  onClose,
}: {
  mode: "audio" | "video" | null;
  match: Match;
  isCoupleMode: boolean;
  accessToken: string;
  callId: string | null;
  isCaller: boolean;
  // Controlled from the chat screen so its own header "back" button (a
  // plain onPress, not a browser back/history action) can minimize the
  // call too -- not just the browser/gesture back-press guard below.
  minimized: boolean;
  onMinimizedChange: (value: boolean) => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  // Minimizing (vs. hanging up) on back-press: the call itself keeps
  // running in the background -- this just swaps the full-screen UI for a
  // small pill so the person can go use the rest of the app (e.g. message
  // someone else) while still on the call.
  const setMinimized = onMinimizedChange;
  // WhatsApp-style swap: tapping the small PIP box makes it the main
  // full-screen view and moves the other feed into the PIP box.
  const [mainView, setMainView] = useState<"remote" | "self">("remote");
  // WhatsApp-style tap-to-reveal: the top/bottom bars auto-hide a few
  // seconds into a connected video call and reappear on tap, so the video
  // itself fills the whole screen instead of sitting in a boxed preview.
  const [controlsVisible, setControlsVisible] = useState(true);
  // A voice call starts in "phone" mode - a normal, quieter level - and a
  // video call on the loudspeaker, like WhatsApp. A web page cannot pick the
  // earpiece (the phone's browser decides that), so phone mode is a lower
  // volume: the other person's voice comes out softer and far less of it
  // reaches the microphone and goes back to them as an echo.
  const [speakerOn, setSpeakerOn] = useState(mode === "video");
  // Audio OUTPUT device for this call (speaker, earpiece, or a paired
  // Bluetooth headset). Lets someone route call audio to Bluetooth even
  // when the OS doesn't default to it for this page.
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  // True while a Bluetooth audio device is connected. Drives the WhatsApp-
  // style Bluetooth button: shown while connected, gone when it is removed.
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
  // Troubleshooting aid: open the app with ?btdebug=1 and the call screen
  // lists every audio device the browser reports, so a headset that is not
  // being recognised can be diagnosed from a screenshot.
  const btDebug =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("btdebug") === "1";
  const [deviceDebugLines, setDeviceDebugLines] = useState<string[]>([]);
  // Whether call audio is currently sent to the Bluetooth device (default
  // on when one connects, like WhatsApp); tapping the button flips it back
  // to the phone's own speaker/earpiece.
  const [routeBluetooth, setRouteBluetooth] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engine = useCallEngine({
    accessToken,
    callId,
    mode: mode ?? "audio",
    isCaller,
    onEnded: () => onClose(),
  });

  // This modal stays mounted for the whole chat screen (across many calls,
  // not just one), so `seconds` was never reset between calls — after a
  // call ended and a new one started, the timer picked up right where the
  // previous call's timer had left off instead of starting back at 0:00.
  useEffect(() => {
    setSeconds(0);
    setMinimized(false);
    setSpeakerOn(mode === "video");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // The caller hears the same ringing tone on every call until the other
  // person answers or the call ends.
  const callerWaiting =
    !!mode &&
    isCaller &&
    (engine.phase === "connecting" || engine.phase === "ringing");
  useEffect(() => {
    if (!callerWaiting) return;
    const ringback = startRingback();
    return () => ringback.stop();
  }, [callerWaiting, callId]);

  useEffect(() => {
    if (engine.phase !== "connected") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [engine.phase]);

  // Watches the audio devices for the whole call (ringing included, not just
  // once connected) and re-checks whenever one is plugged in or removed.
  // Labels are only filled in once the mic permission is granted, so this
  // also re-runs when the call phase changes.
  useEffect(() => {
    if (
      !callId ||
      Platform.OS !== "web" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      setBluetoothAvailable(false);
      return;
    }
    let active = true;
    const refresh = () => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          if (!active) return;
          setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
          if (btDebug)
            setDeviceDebugLines(
              devices
                .filter((d) => d.kind !== "videoinput")
                .map(
                  (d) =>
                    `${d.kind === "audioinput" ? "in" : "out"}: "${d.label || "(no label)"}" ${isBluetoothDeviceLabel(d.label) ? "=> BT" : ""}`,
                ),
            );
          setBluetoothAvailable(
            devices.some(
              (d) =>
                (d.kind === "audiooutput" || d.kind === "audioinput") &&
                isBluetoothDeviceLabel(d.label),
            ),
          );
        })
        .catch(() => undefined);
    };
    refresh();
    navigator.mediaDevices.addEventListener?.("devicechange", refresh);
    return () => {
      active = false;
      navigator.mediaDevices.removeEventListener?.("devicechange", refresh);
    };
  }, [callId, engine.phase, btDebug]);

  // A newly connected Bluetooth device gets the call audio by default.
  useEffect(() => {
    if (!bluetoothAvailable) setRouteBluetooth(true);
  }, [bluetoothAvailable]);

  const bluetoothOutputId = audioOutputs.find((d) =>
    isBluetoothDeviceLabel(d.label),
  )?.deviceId;
  const bluetoothRouted = bluetoothAvailable && routeBluetooth;
  // Where the call audio plays on browsers that support picking an output
  // (setSinkId). On Android Chrome the OS routes to the connected Bluetooth
  // headset by itself; this just keeps desktop/other browsers in step.
  const selectedSinkId: string | undefined = bluetoothAvailable
    ? bluetoothRouted
      ? bluetoothOutputId
      : "default"
    : undefined;

  // On Android (and installed-PWA/webview) Chrome, the hardware/gesture
  // back button is a browser "go back" by default — while a call is open
  // that was closing the whole app instead of just the call screen.
  //
  // This used to push its OWN history entry and listen for popstate right
  // here, stacked on top of the app-wide back guard's entry (MilaanApp,
  // via screen navigation). That worked for a single isolated back press,
  // but a real device's back gesture can pop more than one history entry in
  // one motion -- when it did, the second pop skipped straight past this
  // component (it had already stopped listening after minimizing once) and
  // landed on the app-wide guard, which navigated the screen and unmounted
  // this whole call. Now there's a single shared history entry owned by the
  // app-wide guard; this just registers *that a call wants first claim* on
  // the next back press, via activeCallBackGuard, instead of managing its
  // own history state.
  useEffect(() => {
    // This component stays mounted for the whole chat screen (it just
    // renders null when no call is active), so only the full-screen call
    // view needs to claim the back press -- once minimized, a back press
    // should behave normally (navigate the app), not get caught here again.
    if (!mode || minimized) {
      setActiveCallMinimizer(null);
      return;
    }
    setActiveCallMinimizer(() => setMinimized(true));
    return () => setActiveCallMinimizer(null);
  }, [mode, minimized]);

  // The call is a video call as soon as either person has a camera on, and a
  // voice call again when both are off, so the screen follows the engine.
  const kind = engine.kind;
  // A voice call that turns into a video call moves to the loudspeaker,
  // like WhatsApp - the phone is no longer at your ear.
  useEffect(() => {
    if (kind === "video") setSpeakerOn(true);
  }, [kind]);
  const isFullScreenVideo =
    kind === "video" &&
    engine.phase !== "permission-error" &&
    engine.phase !== "unsupported";

  const scheduleAutoHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (kind === "video" && engine.phase === "connected") {
      hideTimer.current = setTimeout(
        () => setControlsVisible(false),
        CONTROLS_AUTO_HIDE_MS,
      );
    }
  };

  useEffect(() => {
    // Always show controls while connecting/ringing; only start the
    // auto-hide clock once a video call is actually connected.
    if (kind === "video" && engine.phase === "connected") {
      scheduleAutoHide();
    } else {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase, kind]);

  const handleTapVideo = () => {
    setControlsVisible((visible) => {
      const next = !visible;
      if (next) scheduleAutoHide();
      else if (hideTimer.current) clearTimeout(hideTimer.current);
      return next;
    });
  };

  if (!mode) return null;

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const stateLabel =
    engine.phase === "permission-error" || engine.phase === "unsupported"
      ? "Connection needs attention"
      : engine.phase === "connecting"
        ? isCaller
          ? "Creating secure connection…"
          : "Answering securely…"
        : engine.phase === "ringing"
          ? `Ringing ${match.name}…`
          : engine.phase === "declined"
            ? "Call declined"
            : engine.phase === "ended"
              ? "Call ended"
              : engine.phase === "connected"
                ? elapsed
                : "";

  const hasRemoteVideo =
    engine.remoteVideo && !!engine.remoteStream && engine.phase === "connected";
  const hasSelfVideo = !!engine.localStream && engine.cameraEnabled;

  /**
   * The self view, with the microphone taken out of it.
   *
   * A preview of yourself has no business carrying your own mic: if it
   * ever plays - because `muted` did not take, or the element was
   * recreated - you hear your own voice a fraction of a second late,
   * which is exactly what an echo is. Muting the element is the first
   * guard; handing it a stream with no audio in it at all is the one
   * that cannot fail.
   */
  const selfPreview = useMemo(() => {
    const source = engine.localStream;
    if (!source) return null;
    if (typeof MediaStream === "undefined") return source;
    return new MediaStream(source.getVideoTracks());
  }, [engine.localStream]);

  const mainIsSelf = mainView === "self" && hasSelfVideo;
  const mainStream = mainIsSelf
    ? selfPreview
    : hasRemoteVideo
      ? engine.remoteStream
      : null;
  const pipIsSelf = !mainIsSelf;
  const pipStream = mainIsSelf
    ? hasRemoteVideo
      ? engine.remoteStream
      : null
    : hasSelfVideo
      ? selfPreview
      : null;

  // There is no browser API to actually switch a phone's physical output
  // between its loudspeaker and earpiece - that routing is controlled by
  // the OS, not the page. So "speaker" is full volume and "phone" is a
  // normal talking level (PHONE_VOLUME), still clearly audible.
  const remoteVolume = speakerOn || bluetoothRouted ? 1 : PHONE_VOLUME;
  const showControls = controlsVisible || !isFullScreenVideo;

  return (
    <>
      {/* Rendered unconditionally (outside the Modal) so the call's audio
          keeps playing while minimized -- the Modal below, which normally
          carries the audio for a voice call or rides along with the
          full-screen <video> for a video call, unmounts when minimized. */}
      {(kind === "audio" || minimized || !hasRemoteVideo) && (
        <RTCAudioSink
          stream={engine.remoteStream}
          volume={remoteVolume}
          sinkId={selectedSinkId}
        />
      )}
      {minimized && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Return to call with ${match.name}`}
          onPress={() => setMinimized(false)}
          style={callStyles.minimizedCallPill}
        >
          <Ionicons name="call" size={14} color="#FFFFFF" />
          <Text style={callStyles.minimizedCallText} numberOfLines={1}>
            {match.name} · {stateLabel}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End call"
            hitSlop={8}
            onPress={() => engine.hangUp("hangup")}
            style={callStyles.minimizedCallEnd}
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      )}
      {!minimized && (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={callStyles.fullScreenRoot}>
        {/* Full-bleed background: the remote (or self) video feed for a
            video call, or a plain gradient behind the centered avatar for
            an audio call. */}
        {isFullScreenVideo ? (
          <View style={StyleSheet.absoluteFill}>
            {mainStream ? (
              <RTCVideoView
                stream={mainStream}
                mirrored={mainIsSelf}
                muted={mainIsSelf}
                volume={mainIsSelf ? undefined : remoteVolume}
                sinkId={mainIsSelf ? undefined : selectedSinkId}
              />
            ) : match.photo ? (
              <Image
                source={{ uri: match.photo }}
                style={callStyles.fullScreenMedia}
              />
            ) : (
              <View
                style={[callStyles.fullScreenMedia, chatStyles.initialAvatar]}
              >
                <Text style={[chatStyles.initialAvatarText, { fontSize: 72 }]}>
                  {match.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={["#121315", "#0F1011", "#0D0E0F"]}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Gradient so the top/bottom bar text and icons stay legible over
            busy video, without fully darkening the middle of the frame. */}
        <LinearGradient
          colors={[
            "rgba(13,14,15,.6)",
            "transparent",
            "transparent",
            "rgba(13,14,15,.7)",
          ]}
          locations={[0, 0.22, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Tap anywhere on the video to toggle the bars — only relevant for
            a connected video call; this sits beneath the bars/PIP so taps on
            those controls are unaffected (siblings, not nested Pressables). */}
        {isFullScreenVideo && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              controlsVisible ? "Hide call controls" : "Show call controls"
            }
            style={StyleSheet.absoluteFill}
            onPress={handleTapVideo}
          />
        )}

        <SafeAreaView style={callStyles.fullScreenSafe} pointerEvents="box-none">
          {btDebug && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 110,
                left: 8,
                right: 8,
                zIndex: 50,
                backgroundColor: "rgba(0,0,0,.75)",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#4D5156", fontSize: 11 }}>
                {`BT debug · bluetoothAvailable=${bluetoothAvailable} · android=${IS_ANDROID}`}
              </Text>
              {deviceDebugLines.length === 0 ? (
                <Text style={{ color: "#141618", fontSize: 11 }}>
                  no audio devices reported
                </Text>
              ) : (
                deviceDebugLines.map((line, index) => (
                  <Text key={index} style={{ color: "#141618", fontSize: 11 }}>
                    {line}
                  </Text>
                ))
              )}
            </View>
          )}
          {showControls && (
            <View style={callStyles.topBarFull}>
              <Text style={callStyles.topBarNameFull}>{match.name}</Text>
              {!!stateLabel && (
                <Text style={callStyles.topBarStatusFull}>{stateLabel}</Text>
              )}
            </View>
          )}

          {!!engine.notice && (
            <View style={callStyles.noticeToast} pointerEvents="none">
              <Text style={callStyles.noticeToastText}>{engine.notice}</Text>
            </View>
          )}

          {!isFullScreenVideo && (
            <View style={callStyles.audioCenter} pointerEvents="box-none">
              <View style={callStyles.avatarWrap}>
                {match.photo ? (
                  <Image
                    source={{ uri: match.photo }}
                    style={callStyles.callAvatar}
                  />
                ) : (
                  <View
                    style={[callStyles.callAvatar, chatStyles.initialAvatar]}
                  >
                    <Text
                      style={[chatStyles.initialAvatarText, { fontSize: 42 }]}
                    >
                      {match.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    callStyles.callPulse,
                    engine.phase === "connected" &&
                      callStyles.callPulseConnected,
                  ]}
                />
              </View>
              {engine.phase === "connected" && !bluetoothAvailable && (
                <Text style={callStyles.echoTip}>
                  {speakerOn
                    ? "On speaker. Hearing an echo? Use earphones or switch to phone."
                    : "Hearing an echo? Earphones stop it completely."}
                </Text>
              )}
              {(engine.phase === "permission-error" ||
                engine.phase === "unsupported") && (
                <View style={callStyles.permissionCard}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#D8DBDE"
                  />
                  <Text style={callStyles.permissionText}>
                    {engine.error || "Calling is unavailable right now."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={onClose}
                    style={callStyles.retryPermission}
                  >
                    <Text style={callStyles.retryPermissionText}>Close</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          <View style={{ flex: 1 }} pointerEvents="none" />

          {isFullScreenVideo && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Swap main and preview video"
              style={[
                callStyles.pipBoxFull,
                { top: showControls ? 104 : 54 },
              ]}
              onPress={() => setMainView(pipIsSelf ? "self" : "remote")}
            >
              {pipStream ? (
                <RTCVideoView
                  stream={pipStream}
                  mirrored={pipIsSelf}
                  muted={pipIsSelf}
                  volume={pipIsSelf ? undefined : remoteVolume}
                />
              ) : (
                <Ionicons name="person" size={28} color="#FDFDFD" />
              )}
            </Pressable>
          )}

          {showControls && (
            <View
              style={[
                callStyles.bottomBarFull,
                bluetoothAvailable && callStyles.bottomBarCompact,
              ]}
            >
              <CircleButton
                compact={bluetoothAvailable}
                icon={engine.cameraEnabled ? "videocam" : "videocam-off"}
                active={!engine.cameraEnabled}
                onPress={engine.toggleCamera}
              />
              {engine.cameraEnabled && engine.canSwitchCamera && (
                <CircleButton
                  compact={bluetoothAvailable}
                  icon="camera-reverse-outline"
                  active={!engine.isFrontCamera}
                  onPress={engine.switchCamera}
                />
              )}
              {bluetoothAvailable ? (
                <>
                  {/* Both routes are always offered while a Bluetooth device
                      is connected: tap the speaker to leave Bluetooth, tap
                      Bluetooth to go back. The active one is highlighted. */}
                  <CircleButton
                    compact
                    icon="volume-high"
                    active={!routeBluetooth}
                    onPress={() => {
                      setRouteBluetooth(false);
                      setSpeakerOn(true);
                    }}
                  />
                  <CircleButton
                    compact
                    icon="bluetooth"
                    active={routeBluetooth}
                    onPress={() => setRouteBluetooth(true)}
                  />
                </>
              ) : (
                <CircleButton
                  label={speakerOn ? "Speaker on. Switch to phone" : "Phone mode. Switch to speaker"}
                  icon={speakerOn ? "volume-high" : "volume-low"}
                  active={speakerOn}
                  onPress={() => setSpeakerOn((value) => !value)}
                />
              )}
              <CircleButton
                compact={bluetoothAvailable}
                icon={engine.micEnabled ? "mic" : "mic-off"}
                active={!engine.micEnabled}
                onPress={engine.toggleMic}
              />
              <CircleButton
                big
                compact={bluetoothAvailable}
                danger
                icon="call"
                onPress={() => engine.hangUp("hangup")}
              />
            </View>
          )}

        </SafeAreaView>
      </View>
      </Modal>
      )}
    </>
  );
}
