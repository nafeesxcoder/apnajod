import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { storyApi, type StoryResponses, type StorySticker } from "../../api/storyApi";
import { fonts, palette, radius } from "../../theme";
import { Avatar, Sheet } from "../posts/PostSheets";
import { timeAgo } from "../posts/postFormat";

/** Typing an answer to someone's question sticker. */
export function AnswerSheet({
  target,
  accessToken,
  onClose,
}: {
  target: { storyId: string; stickerId: string; prompt: string } | null;
  accessToken: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    if (target) {
      setBody("");
      setState("idle");
      setError("");
    }
  }, [target]);

  const send = async () => {
    if (!target || !body.trim() || state === "sending") return;
    setState("sending");
    setError("");
    try {
      await storyApi.answer(accessToken, target.storyId, target.stickerId, body.trim());
      setState("sent");
      setTimeout(onClose, 900);
    } catch (e: any) {
      setError(e?.message || "Could not send your answer.");
      setState("idle");
    }
  };

  return (
    <Sheet visible={!!target} title={target?.prompt || "Answer"} onClose={onClose}>
      {state === "sent" ? (
        <View style={{ alignItems: "center", padding: 28, gap: 8 }}>
          <Ionicons name="checkmark-circle" size={44} color={palette.emerald} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: palette.ink }}>Sent</Text>
        </View>
      ) : (
        <View style={{ padding: 14, gap: 10 }}>
          <TextInput
            autoFocus
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={300}
            placeholder="Type your answer..."
            placeholderTextColor={palette.slate}
            accessibilityLabel="Your answer"
            style={{
              minHeight: 90,
              borderRadius: 14,
              backgroundColor: palette.paperSand,
              padding: 12,
              fontFamily: fonts.body,
              fontSize: 15,
              color: palette.ink,
              textAlignVertical: "top",
              ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
            }}
          />
          {!!error && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send answer"
            onPress={() => void send()}
            disabled={!body.trim() || state === "sending"}
            style={{ minHeight: 46, borderRadius: radius.pill, backgroundColor: palette.crimson, alignItems: "center", justifyContent: "center", opacity: body.trim() ? 1 : 0.5 }}
          >
            {state === "sending" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>Send</Text>}
          </Pressable>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, textAlign: "center" }}>Only they can see your answer.</Text>
        </View>
      )}
    </Sheet>
  );
}

/** Your story's poll votes (who voted what) and answers. Only you see this. */
export function ResponsesSheet({
  storyId,
  stickers,
  accessToken,
  onClose,
}: {
  storyId: string | null;
  stickers: StorySticker[];
  accessToken: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<StoryResponses | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!storyId) return;
    setData(null);
    setError("");
    storyApi
      .responses(accessToken, storyId)
      .then(setData)
      .catch((e) => setError(e?.message || "Could not load responses."));
  }, [storyId, accessToken]);

  const polls = stickers.filter((s) => s.kind === "poll") as Extract<StorySticker, { kind: "poll" }>[];
  const hasQuestion = stickers.some((s) => s.kind === "question");
  const row = (user: StoryResponses["votes"][number]["user"], right: string, below?: string, key?: string) => (
    <View key={key} style={{ flexDirection: "row", alignItems: below ? "flex-start" : "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
      <Avatar person={user} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>@{user.username}</Text>
        {!!below && <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.ink, marginTop: 2 }}>{below}</Text>}
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>{right}</Text>
    </View>
  );

  return (
    <Sheet visible={!!storyId} title="Responses" tall onClose={onClose}>
      {!data ? (
        error ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.crimson, textAlign: "center", padding: 24 }}>{error}</Text>
        ) : (
          <ActivityIndicator color={palette.crimson} style={{ marginTop: 30 }} />
        )
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {polls.map((poll) => {
            const votes = data.votes.filter((v) => v.stickerId === poll.id);
            return (
              <View key={poll.id} style={{ paddingTop: 12 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink, paddingHorizontal: 16 }}>
                  📊 {poll.question || "Poll"} · {votes.length} {votes.length === 1 ? "vote" : "votes"}
                </Text>
                {poll.options.map((option, index) => {
                  const these = votes.filter((v) => v.choice === index);
                  return (
                    <View key={index} style={{ marginTop: 8 }}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.crimson, paddingHorizontal: 16, paddingVertical: 4 }}>
                        {option} ({these.length})
                      </Text>
                      {these.map((v) => row(v.user, timeAgo(v.at), undefined, `${poll.id}-${v.user.userId}`))}
                    </View>
                  );
                })}
              </View>
            );
          })}
          {hasQuestion && (
            <View style={{ paddingTop: 16 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink, paddingHorizontal: 16 }}>
                ❓ Answers · {data.answers.length}
              </Text>
              {data.answers.length === 0 ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, paddingHorizontal: 16, paddingVertical: 8 }}>No answers yet.</Text>
              ) : (
                data.answers.map((a) => row(a.user, timeAgo(a.at), a.body, a.id))
              )}
            </View>
          )}
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, textAlign: "center", padding: 16 }}>
            Only you can see this. It goes with your story after 24 hours.
          </Text>
        </ScrollView>
      )}
    </Sheet>
  );
}
