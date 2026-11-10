import { createElement, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Live selfie from a laptop webcam.
 *
 * On the web, expo-image-picker's camera falls back to a file chooser on a
 * desktop browser (the capture hint is only honoured by phones), so members on
 * a laptop could only pick an old photo, never take a live one. This opens the
 * webcam with getUserMedia and hands back a blob: URL of the captured frame,
 * which the normal upload path already knows how to send.
 */
export function WebSelfieCamera({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    const media =
      typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      setError("This browser cannot open the camera. Try Chrome or Edge.");
      return;
    }
    media
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => undefined);
        }
      })
      .catch(() =>
        setError(
          "Camera access was blocked. Allow the camera in your browser's address bar and try again.",
        ),
      );
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [visible]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Square crop from the centre, mirrored so it matches the preview.
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(side, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(URL.createObjectURL(blob));
        onClose();
      },
      "image/jpeg",
      0.85,
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.85)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            width: 320,
            height: 320,
            borderRadius: 160,
            overflow: "hidden",
            backgroundColor: "#111",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {createElement("video", {
            ref: videoRef,
            autoPlay: true,
            playsInline: true,
            muted: true,
            onLoadedMetadata: () => setReady(true),
            style: {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
            },
          })}
        </View>

        {error ? (
          <Text
            style={{
              color: "#FFB4B4",
              textAlign: "center",
              marginTop: 18,
              maxWidth: 320,
              fontSize: 14,
            }}
          >
            {error}
          </Text>
        ) : (
          <Text style={{ color: "#DDD", marginTop: 18, fontSize: 14 }}>
            Look at the camera and keep your face in the circle.
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 14, marginTop: 22 }}>
          <Pressable
            onPress={onClose}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#888",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={capture}
            disabled={!ready || !!error}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 12,
              backgroundColor: ready && !error ? "#FFFFFF" : "#555",
            }}
          >
            <Ionicons name="camera" size={18} color="#151719" />
            <Text style={{ color: "#151719", fontWeight: "700" }}>Capture</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
