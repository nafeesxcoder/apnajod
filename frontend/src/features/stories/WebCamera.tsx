import { createElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts, palette, radius } from "../../theme";
import { useVisibleHeight } from "../posts/PostSheets";

/**
 * On a laptop the browser's "take a photo" only opens the file chooser, so
 * the webcam is opened here instead: a live preview and a shutter button.
 * Phones keep their own camera app.
 */
export function needsWebCamera(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return !coarse && !!navigator.mediaDevices?.getUserMedia;
}

export function WebCamera({
  visible,
  onClose,
  onCapture,
  onGallery,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (photo: { uri: string; width: number; height: number }) => void;
  /** No camera, or it was not allowed: pick a photo instead. */
  onGallery: () => void;
}) {
  const height = useVisibleHeight();
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"starting" | "ready" | "denied" | "none">("starting");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameras, setCameras] = useState(0);

  const stop = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };

  useEffect(() => {
    if (!visible) {
      stop();
      return;
    }
    let live = true;
    setState("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async (media) => {
        if (!live) return media.getTracks().forEach((t) => t.stop());
        stop();
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play().catch(() => undefined);
        }
        setState("ready");
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (live) setCameras(devices.filter((d) => d.kind === "videoinput").length);
      })
      .catch((error: { name?: string }) => {
        if (!live) return;
        setState(error?.name === "NotAllowedError" || error?.name === "SecurityError" ? "denied" : "none");
      });
    return () => {
      live = false;
    };
  }, [visible, facing]);

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    // The front camera is shown like a mirror; the photo is saved the way you saw it.
    if (facing === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const { width, height: h } = canvas;
        stop();
        onCapture({ uri: URL.createObjectURL(blob), width, height: h });
      },
      "image/jpeg",
      0.92,
    );
  };

  const close = () => {
    stop();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close}>
      <View style={{ height, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        {createElement("video", {
          ref: video,
          autoPlay: true,
          playsInline: true,
          muted: true,
          "aria-label": "Camera preview",
          style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: facing === "user" ? "scaleX(-1)" : "none",
            opacity: state === "ready" ? 1 : 0,
          },
        })}

        {state === "starting" && <ActivityIndicator color="#FFFFFF" />}
        {(state === "denied" || state === "none") && (
          <View style={{ alignItems: "center", gap: 12, paddingHorizontal: 30, maxWidth: 420 }}>
            <Ionicons name="videocam-off-outline" size={40} color="#FFFFFF" />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: "#FFFFFF", textAlign: "center" }}>
              {state === "denied" ? "Camera access is blocked" : "No camera found"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
              {state === "denied"
                ? "Allow the camera for this site in your browser (the camera icon in the address bar), then try again."
                : "Connect a camera, or choose a photo from your computer."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery instead"
              onPress={() => {
                stop();
                onGallery();
              }}
              style={{ minHeight: 44, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: "#FFFFFF", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: palette.ink }}>Choose from gallery</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          onPress={close}
          style={{ position: "absolute", top: 14, left: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </Pressable>

        {state === "ready" && (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery instead"
              onPress={() => {
                stop();
                onGallery();
              }}
              style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="images-outline" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              onPress={shoot}
              style={{ width: 74, height: 74, borderRadius: 37, borderWidth: 5, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
            >
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFFFFF" }} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
              disabled={cameras < 2}
              onPress={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", opacity: cameras < 2 ? 0.35 : 1 }}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
