import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { chatApi } from "../../api/chatApi";
import { fonts } from "../../theme";
import { keyboardBehavior } from "../../layout/keyboardBehavior";

export const STORY_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"] as const;

/** "Replied to your story" over a chat message that answered a story. */
export function StoryReplyLabel({ mine, reaction, plain = false }: { mine: boolean; reaction: boolean; plain?: boolean }) {
  // On your own coloured bubble the label is light; a big emoji has no bubble, so it stays grey.
  const light = mine && !plain;
  const text = mine
    ? reaction
      ? "You reacted to their story"
      : "You replied to their story"
    : reaction
      ? "Reacted to your story"
      : "Replied to your story";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 }}>
      <Ionicons name={reaction ? "heart" : "arrow-undo"} size={12} color={light ? "rgba(255,255,255,0.8)" : "#6B7280"} />
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: light ? "rgba(255,255,255,0.85)" : "#6B7280" }}>{text}</Text>
    </View>
  );
}

/**
 * At the bottom of someone else's story: write a reply or send a reaction.
 * It goes to your chat with them as a normal message - only matches can
 * chat, so only matches see the box.
 */
export function StoryReplyBar({
  storyId,
  ownerId,
  username,
  canReply,
  accessToken,
  onBusy,
}: {
  storyId: string;
  ownerId: string;
  username: string;
  canReply: boolean;
  accessToken: string;
  /** True while typing or sending, so the story waits. */
  onBusy: (busy: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<TextInput>(null);

  // A new story: start empty.
  useEffect(() => {
    setText("");
    setState("idle");
  }, [storyId]);
  useEffect(() => {
    onBusy(focused || state === "sending" || !!text.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, state, text]);
  useEffect(() => () => onBusy(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canReply) {
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 18, alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Match with @{username} to reply</Text>
      </View>
    );
  }

  const send = async (body: string, reaction: boolean) => {
    const value = body.trim();
    if (!value || state === "sending") return;
    setState("sending");
    const result = await chatApi
      .sendMessage(accessToken, ownerId, {
        id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "text",
        text: value.slice(0, 1000),
        storyReply: { reaction },
        createdAt: Date.now(),
        status: "sent",
      })
      .catch(() => null);
    if (result?.saved) {
      setText("");
      setState("sent");
      input.current?.blur();
      setFocused(false);
      setTimeout(() => setState((s) => (s === "sent" ? "idle" : s)), 1400);
    } else setState("error");
  };

  return (
    <KeyboardAvoidingView
      pointerEvents="box-none"
      behavior={keyboardBehavior}
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, justifyContent: "flex-end" }}
    >
      <View style={{ paddingHorizontal: 12, paddingBottom: 14, gap: 10 }}>
        {state === "sent" && (
          <Text style={{ alignSelf: "center", fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 }}>
            Sent
          </Text>
        )}
        {state === "error" && (
          <Text style={{ alignSelf: "center", fontFamily: fonts.body, fontSize: 13, color: "#FFFFFF", backgroundColor: "rgba(179,38,30,0.9)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 }}>
            Could not send. Try again.
          </Text>
        )}
        {focused && (
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {STORY_REACTIONS.map((emoji) => (
              <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`React ${emoji}`} onPress={() => void send(emoji, true)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 30 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: "rgba(255,255,255,0.75)", paddingHorizontal: 16, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" }}>
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              onFocus={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                setFocused(true);
              }}
              // A moment's wait, so tapping a reaction still lands.
              onBlur={() => {
                blurTimer.current = setTimeout(() => setFocused(false), 200);
              }}
              onSubmitEditing={() => void send(text, false)}
              returnKeyType="send"
              maxLength={1000}
              placeholder={`Reply to @${username}...`}
              placeholderTextColor="rgba(255,255,255,0.75)"
              accessibilityLabel={`Reply to @${username}`}
              style={{ fontFamily: fonts.body, fontSize: 15, color: "#FFFFFF", paddingVertical: 8, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) }}
            />
          </View>
          {text.trim() ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Send reply" onPress={() => void send(text, false)} style={{ height: 46, justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{state === "sending" ? "..." : "Send"}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="React ❤️" onPress={() => void send("❤️", true)} style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="heart-outline" size={28} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
