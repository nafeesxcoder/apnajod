import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts, palette } from "../../theme";
import { MENTION_SIZE, POLL_WIDTH, QUESTION_WIDTH, type LiveItem } from "./editor/model";

/** What a live sticker can do when someone watches the story (not while editing). */
export type LiveActions = {
  /** The person watching made this story (they see results, not buttons). */
  mine: boolean;
  /** Poll: votes so far for each answer, and yours (null before you vote). */
  counts?: [number, number];
  myVote?: number | null;
  onVote?: (choice: 0 | 1) => void;
  onAsk?: () => void;
  onOpenProfile?: () => void;
  onResponses?: () => void;
};

const shadow = { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 } as const;

/** A poll, question box or @mention, sized to a story `width` pixels wide. */
export function LiveSticker({ item, width, actions }: { item: LiveItem; width: number; actions?: LiveActions }) {
  const u = width; // every size below is a fraction of the story's width

  if (item.kind === "mention") {
    const size = MENTION_SIZE * u;
    const body = (
      <View style={{ backgroundColor: "#FFFFFF", borderRadius: size, paddingHorizontal: size * 0.55, paddingVertical: size * 0.22, ...shadow }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: size, lineHeight: size * 1.25, color: palette.crimson }}>@{item.username}</Text>
      </View>
    );
    return actions?.onOpenProfile ? (
      <Pressable accessibilityRole="button" accessibilityLabel={`Open @${item.username}`} onPress={actions.onOpenProfile}>
        {body}
      </Pressable>
    ) : (
      body
    );
  }

  if (item.kind === "question") {
    const w = QUESTION_WIDTH * u;
    const pad = 0.04 * u;
    const reply = actions && !actions.mine;
    return (
      <View style={{ width: w, borderRadius: 0.045 * u, backgroundColor: "#FFFFFF", overflow: "hidden", ...shadow }}>
        <View style={{ backgroundColor: palette.crimson, paddingHorizontal: pad, paddingVertical: pad * 0.8 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 0.05 * u, lineHeight: 0.064 * u, color: "#FFFFFF", textAlign: "center" }}>{item.prompt}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reply ? "Answer the question" : actions?.mine ? "See answers" : "Question box"}
          disabled={!actions}
          onPress={reply ? actions?.onAsk : actions?.onResponses}
          style={{ margin: pad * 0.7, borderRadius: 0.03 * u, backgroundColor: palette.paperSand, paddingVertical: pad * 0.75, alignItems: "center" }}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 0.04 * u, color: palette.slate }}>
            {actions?.mine ? "See answers" : "Type something..."}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Poll.
  const w = POLL_WIDTH * u;
  const pad = 0.035 * u;
  const counts = actions?.counts ?? [0, 0];
  const total = counts[0] + counts[1];
  const voted = actions?.myVote ?? null;
  const showResults = !!actions && (actions.mine || voted !== null);
  return (
    <View style={{ width: w, borderRadius: 0.045 * u, backgroundColor: "#FFFFFF", padding: pad, gap: pad * 0.7, ...shadow }}>
      {!!item.question && (
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 0.05 * u, lineHeight: 0.064 * u, color: palette.ink, textAlign: "center" }}>
          {item.question}
        </Text>
      )}
      {item.options.map((option, index) => {
        const share = total ? Math.round((counts[index]! / total) * 100) : 0;
        const chosen = voted === index;
        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={showResults ? `${option}, ${share} percent` : `Vote ${option}`}
            disabled={!actions || (!actions.mine && showResults)}
            onPress={() => (actions?.mine ? actions.onResponses?.() : !showResults && actions?.onVote?.(index as 0 | 1))}
            style={{
              minHeight: 0.11 * u,
              borderRadius: 0.055 * u,
              borderWidth: 1.5,
              borderColor: chosen ? palette.crimson : palette.rule,
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
            }}
          >
            {showResults && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${share}%`,
                  backgroundColor: chosen ? "rgba(185,28,60,0.22)" : "rgba(20,32,46,0.08)",
                }}
              />
            )}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: pad, gap: 6 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 0.045 * u, color: chosen ? palette.crimson : palette.ink, textAlign: showResults ? "left" : "center" }}>
                {option}
              </Text>
              {showResults && (
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 0.042 * u, color: chosen ? palette.crimson : palette.slate }}>{share}%</Text>
              )}
              {chosen && <Ionicons name="checkmark-circle" size={0.045 * u} color={palette.crimson} />}
            </View>
          </Pressable>
        );
      })}
      {showResults && (
        <Text style={{ fontFamily: fonts.body, fontSize: 0.034 * u, color: palette.slate, textAlign: "center" }}>
          {total} {total === 1 ? "vote" : "votes"}
          {actions?.mine ? " · tap to see who" : ""}
        </Text>
      )}
    </View>
  );
}
