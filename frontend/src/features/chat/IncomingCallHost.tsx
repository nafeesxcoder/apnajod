import { useEffect, useState } from "react";
import { Platform, Pressable, Text, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { callApi } from "../../api/callApi";
import { chatApi } from "../../api/chatApi";
import { getChatSocket } from "../../api/chatSocket";
import { PremiumIcon } from "../../components/premium/PremiumIcon";
import { matchFromSocialUser } from "../../domain/socialMatch";
import { chatStyles } from "../../theme/appStyles";
import { colors, fonts, radius } from "../../theme";
import type { ChatMessage } from "../../storage";
import { callSession, useCallSession } from "./callSession";
import { ringtone } from "./ringtones/ringtone";

type Incoming = {
  id: string;
  callerId: string;
  callerName: string;
  mode: "audio" | "video";
};

const REPLIES = [
  "I'm busy right now, I'll call you back.",
  "I'll call you in a little while.",
  "I can't talk now. Please message me.",
  "Call me later, please.",
];

/**
 * An incoming call, wherever you are in the app: it rings, shows the banner
 * at the top and stays on the screen you were on. Accepting opens the call
 * over that screen; nothing redirects you to the chat thread.
 */
export function IncomingCallHost({ accessToken }: { accessToken: string }) {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const session = useCallSession();
  const insets = useSafeAreaInsets();
  const busy = !!session.mode;
  const incomingId = incoming?.id ?? null;

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    const check = () => {
      void callApi
        .getIncoming(accessToken)
        .then((call) => {
          if (!active) return;
          if (!call) {
            setIncoming(null);
            return;
          }
          setIncoming((current) =>
            current?.id === call.id
              ? current
              : {
                  id: call.id,
                  callerId: call.callerId,
                  callerName: call.callerName,
                  mode: call.mode,
                },
          );
        })
        .catch(() => undefined);
    };

    const socket = getChatSocket();
    const onSocketCall = () => check();
    socket?.on("call:incoming", onSocketCall);
    check();
    const timer = setInterval(check, 3000);

    return () => {
      active = false;
      socket?.off("call:incoming", onSocketCall);
      clearInterval(timer);
    };
  }, [accessToken]);

  useEffect(() => {
    if (!incomingId || busy) return;
    const ring = ringtone.startRinging();
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    } else if (Platform.OS !== "web") {
      Vibration.vibrate([0, 400, 200, 400], true);
    }
    return () => {
      ring.stop();
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(0);
      else if (Platform.OS !== "web") Vibration.cancel();
    };
  }, [incomingId, busy]);

  if (!incoming || busy) return null;

  const close = () => {
    setIncoming(null);
    setReplyOpen(false);
  };

  const decline = (reply?: string) => {
    void callApi.respond(accessToken, incoming.id, false).catch(() => undefined);
    if (reply) {
      const message: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "text",
        text: reply,
        createdAt: Date.now(),
        status: "sent",
      };
      void chatApi.sendMessage(accessToken, incoming.callerId, message).catch(() => undefined);
    }
    close();
  };

  const accept = () => {
    void callApi.respond(accessToken, incoming.id, true).catch(() => undefined);
    callSession.begin({
      mode: incoming.mode,
      callId: incoming.id,
      isCaller: false,
      match: matchFromSocialUser({
        userId: incoming.callerId,
        username: "",
        name: incoming.callerName || "Someone",
        avatarUrl: null,
        isPrivate: false,
      }),
      isCoupleMode: false,
    });
    close();
  };

  return (
    <View
      accessibilityRole="alert"
      style={{ position: "absolute", top: insets.top + 8, left: 10, right: 10, zIndex: 1000 }}
    >
      <View style={[chatStyles.incomingCall, { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line }]}>
        <PremiumIcon
          name={incoming.mode === "video" ? "videocam" : "call"}
          tone="ruby"
          size={40}
          iconSize={19}
        />
        <View style={{ flex: 1 }}>
          <Text style={chatStyles.incomingCallTitle}>Incoming {incoming.mode} call</Text>
          <Text style={chatStyles.incomingCallBody}>{incoming.callerName || "Someone"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reply with a message"
          onPress={() => setReplyOpen((open) => !open)}
          style={chatStyles.callDecline}
        >
          <Ionicons name="chatbubble-ellipses" size={17} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decline call"
          onPress={() => decline()}
          style={chatStyles.callDecline}
        >
          <Ionicons name="call" size={17} color={colors.danger} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accept call"
          onPress={accept}
          style={chatStyles.callAccept}
        >
          <Ionicons name="call" size={17} color={colors.textInverse} />
        </Pressable>
      </View>
      {replyOpen && (
        <View
          style={{
            marginTop: 8,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 14,
              color: colors.text,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            Reply with a message
          </Text>
          {REPLIES.map((line, index) => (
            <Pressable
              key={line}
              accessibilityRole="button"
              accessibilityLabel={`Send reply: ${line}`}
              onPress={() => decline(line)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderBottomWidth: index < REPLIES.length - 1 ? 1 : 0,
                borderBottomColor: colors.lineSoft,
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.accent} />
              <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text }}>{line}</Text>
              <Ionicons name="send" size={16} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
