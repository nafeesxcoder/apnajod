import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

import { fonts, palette } from "../../../theme";
import { keyboardBehavior } from "../../../layout/keyboardBehavior";

export type PollDraft = { question: string; options: [string, string] };
export type QuestionDraft = { prompt: string };

const input = (size: number, color: string): object => ({
  fontFamily: fonts.bodySemi,
  fontSize: size,
  color,
  textAlign: "center",
  paddingVertical: 8,
  ...(Platform.OS === "web" ? { outlineStyle: "none" } : null),
});

/** Making (or changing) a poll or a question box for the story. */
export function LiveComposer({
  kind,
  poll,
  question,
  onDone,
  onCancel,
}: {
  kind: "poll" | "question";
  poll?: PollDraft | null;
  question?: QuestionDraft | null;
  onDone: (draft: PollDraft | QuestionDraft) => void;
  onCancel: () => void;
}) {
  const [ask, setAsk] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [prompt, setPrompt] = useState("");
  useEffect(() => {
    setAsk(poll?.question ?? "");
    setA(poll?.options[0] ?? "");
    setB(poll?.options[1] ?? "");
    setPrompt(question?.prompt ?? "");
  }, [poll, question, kind]);

  const done = () => {
    if (kind === "poll") onDone({ question: ask.trim().slice(0, 80), options: [a.trim().slice(0, 25) || "Yes", b.trim().slice(0, 25) || "No"] });
    else onDone({ prompt: prompt.trim().slice(0, 80) || "Ask me a question" });
  };

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} style={{ height: 44, justifyContent: "center", paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: "#FFFFFF" }}>Cancel</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={done} style={{ height: 44, justifyContent: "center", paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#FFFFFF" }}>Done</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        {kind === "poll" ? (
          <View style={{ width: "100%", maxWidth: 320, borderRadius: 18, backgroundColor: "#FFFFFF", padding: 14, gap: 10 }}>
            <TextInput
              autoFocus
              value={ask}
              onChangeText={setAsk}
              maxLength={80}
              placeholder="Ask a question..."
              placeholderTextColor={palette.slate}
              accessibilityLabel="Poll question"
              style={input(18, palette.ink)}
            />
            {(
              [
                [a, setA, "Yes", "First answer"],
                [b, setB, "No", "Second answer"],
              ] as const
            ).map(([value, set, hint, label]) => (
              <View key={label} style={{ borderRadius: 22, borderWidth: 1.5, borderColor: palette.rule }}>
                <TextInput
                  value={value}
                  onChangeText={set}
                  maxLength={25}
                  placeholder={hint}
                  placeholderTextColor={palette.slate}
                  accessibilityLabel={label}
                  style={input(16, palette.ink)}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ width: "100%", maxWidth: 320, borderRadius: 18, overflow: "hidden", backgroundColor: "#FFFFFF" }}>
            <View style={{ backgroundColor: palette.crimson, padding: 12 }}>
              <TextInput
                autoFocus
                value={prompt}
                onChangeText={setPrompt}
                maxLength={80}
                placeholder="Ask me a question"
                placeholderTextColor="rgba(255,255,255,0.75)"
                accessibilityLabel="Question"
                style={input(18, "#FFFFFF")}
              />
            </View>
            <View style={{ margin: 10, borderRadius: 12, backgroundColor: palette.paperSand, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate }}>People type their answer here</Text>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
