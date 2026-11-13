import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safetyApi } from "../../api/safetyApi";
import { storyApi, type StoryPerson } from "../../api/storyApi";
import { fonts, palette } from "../../theme";
import { Avatar, REPORT_REASONS, Sheet, useVisibleHeight } from "../posts/PostSheets";
import { timeAgo } from "../posts/postFormat";
import { openProfile } from "../posts/profileLink";
import { markSeen } from "./storySeen";
import { storySeconds } from "./music/clip";
import { LiveSticker } from "./LiveSticker";
import { AnswerSheet, ResponsesSheet } from "./StoryResponses";
import { StoryReplyBar } from "./StoryReplyBar";
import { FRAME_ASPECT } from "./editor/model";
import { createClipPlayer, type ClipPlayer } from "./music/clipPlayer";

export { STORY_SECONDS } from "./music/clip";

/**
 * Stories full screen, Instagram's way: bars along the top fill as each
 * photo plays, tap the right side for the next, the left for the one before,
 * hold to pause. After someone's last story the next person's begin.
 */
export function StoryViewer({
  people,
  start,
  seen,
  accessToken,
  onClose,
  onSeen,
  onDeleted,
}: {
  people: StoryPerson[];
  /** Index into people of the person tapped; null when closed. */
  start: number | null;
  seen: Set<string>;
  accessToken: string;
  onClose: () => void;
  onSeen: (storyId: string) => void;
  onDeleted: (storyId: string) => void;
}) {
  const height = useVisibleHeight();
  const [p, setP] = useState(0);
  const [s, setS] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [held, setHeld] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [muted, setMuted] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  // Poll results after you vote, by "story|sticker".
  const [results, setResults] = useState<Record<string, { counts: [number, number]; myVote: number | null }>>({});
  const [asking, setAsking] = useState<{ storyId: string; stickerId: string; prompt: string } | null>(null);
  const [responsesFor, setResponsesFor] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const done = useRef(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => (done.current = value));
    return () => progress.removeListener(id);
  }, [progress]);

  const open = start !== null;
  const person = open ? people[p] : undefined;
  const stories = person?.stories ?? [];
  const story = stories[s];

  /** A person's stories start at the first one you have not seen. */
  const firstUnseen = (index: number) => {
    const list = people[index]?.stories ?? [];
    const at = list.findIndex((item) => !seen.has(item.id));
    return at < 0 ? 0 : at;
  };
  const goPerson = (index: number) => {
    setP(index);
    setS(firstUnseen(index));
  };

  useEffect(() => {
    if (start !== null) goPerson(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  // A story deleted (or the list reloaded) under the viewer: stay in range.
  useEffect(() => {
    if (!open) return;
    if (!person || !stories.length) onClose();
    else if (s >= stories.length) setS(stories.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person, stories.length, s]);

  const next = () => {
    if (s < stories.length - 1) setS(s + 1);
    else if (p < people.length - 1) goPerson(p + 1);
    else onClose();
  };
  const prev = () => {
    if (s > 0) setS(s - 1);
    else if (p > 0) goPerson(p - 1);
    else progress.setValue(0);
  };
  const nextRef = useRef(next);
  nextRef.current = next;

  // A new photo: bar back to empty, wait for it to load, note it as seen.
  useEffect(() => {
    progress.setValue(0);
    done.current = 0;
    setLoaded(false);
    if (!story) return;
    markSeen(story.id, story.expiresAt);
    onSeen(story.id);
    const after = stories[s + 1]?.mediaUrl ?? people[p + 1]?.stories[0]?.mediaUrl;
    if (after) Image.prefetch(after).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const paused = !loaded || held || menu || reporting || deleting || !!asking || !!responsesFor || replying;

  // The story's song: from its start, for as long as the story plays.
  const clip = useRef<ClipPlayer | null>(null);
  useEffect(() => {
    const music = open ? story?.music : null;
    if (!music) return;
    const player = createClipPlayer(music.url, music.start, music.length);
    player.setMuted(muted);
    clip.current = player;
    return () => {
      player.stop();
      if (clip.current === player) clip.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, story?.id]);
  useEffect(() => {
    if (!clip.current) return;
    if (paused) clip.current.pause();
    else clip.current.play();
  }, [paused, story?.id]);
  useEffect(() => {
    clip.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!story || paused) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: storySeconds(story) * 1000 * (1 - done.current),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => finished && nextRef.current());
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, paused]);

  const remove = async () => {
    if (!story) return;
    setDeleting(true);
    // Already gone (it ran out) counts as deleted too - it comes off the screen either way.
    await storyApi.remove(accessToken, story.id).catch(() => undefined);
    setDeleting(false);
    setMenu(false);
    // Your last story: close, rather than sliding on to someone else's.
    if (stories.length <= 1) onClose();
    onDeleted(story.id);
  };

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose}>
      <View style={{ height, backgroundColor: "#000" }}>
        {story ? (
          <>
            <Image
              key={story.id}
              source={{ uri: story.mediaUrl }}
              resizeMode="contain"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {!loaded && <ActivityIndicator color="#FFFFFF" style={{ position: "absolute", top: height / 2 - 12, alignSelf: "center" }} />}

            {/* Tap left: back. Tap right: forward. Hold anywhere: pause. */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous story"
                onPress={prev}
                onLongPress={() => setHeld(true)}
                onPressOut={() => setHeld(false)}
                delayLongPress={220}
                style={{ flex: 3 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next story"
                onPress={next}
                onLongPress={() => setHeld(true)}
                onPressOut={() => setHeld(false)}
                delayLongPress={220}
                style={{ flex: 7 }}
              />
            </View>

            {/* Poll, question and @mention stickers - live, so they can be tapped.
                They sit where they were put on the 9:16 story, which is shown whole. */}
            {loaded && !!story.stickers?.length && (() => {
              const fw = Math.min(screenWidth, height * FRAME_ASPECT);
              const fh = fw / FRAME_ASPECT;
              return (
                <View
                  pointerEvents="box-none"
                  style={{ position: "absolute", left: (screenWidth - fw) / 2, top: (height - fh) / 2, width: fw, height: fh }}
                >
                  {story.stickers!.map((sticker) => {
                    const key = `${story.id}|${sticker.id}`;
                    const result = sticker.kind === "poll" ? results[key] ?? { counts: sticker.counts ?? [0, 0], myVote: sticker.myVote ?? null } : null;
                    return (
                      <View
                        key={sticker.id}
                        pointerEvents="box-none"
                        style={{ position: "absolute", left: sticker.x * fw - fw, top: sticker.y * fh, width: fw * 2, height: 0, alignItems: "center", justifyContent: "center" }}
                      >
                        <View style={{ transform: [{ rotate: `${sticker.rotation}deg` }, { scale: sticker.scale }] }}>
                          <LiveSticker
                            item={sticker}
                            width={fw}
                            actions={{
                              mine: !!person?.mine,
                              counts: result?.counts,
                              myVote: result?.myVote,
                              onVote: (choice) => {
                                if (!result || result.myVote !== null) return;
                                const counts: [number, number] = [...result.counts] as [number, number];
                                counts[choice] += 1;
                                setResults((r) => ({ ...r, [key]: { counts, myVote: choice } }));
                                storyApi
                                  .vote(accessToken, story.id, sticker.id, choice)
                                  .then((answer) => setResults((r) => ({ ...r, [key]: { counts: answer.counts, myVote: answer.myVote } })))
                                  .catch(() => undefined);
                              },
                              onAsk: () => sticker.kind === "question" && setAsking({ storyId: story.id, stickerId: sticker.id, prompt: sticker.prompt }),
                              onResponses: () => setResponsesFor(story.id),
                              onOpenProfile:
                                sticker.kind === "mention"
                                  ? () => {
                                      onClose();
                                      setTimeout(() => openProfile(sticker.userId), 80);
                                    }
                                  : undefined,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* Your own story with a poll or question: see who voted and the answers. */}
            {loaded && person?.mine && story.stickers?.some((s) => s.kind === "poll" || s.kind === "question") && (
              <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 22, alignItems: "center" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Responses"
                onPress={() => setResponsesFor(story.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 18,
                  minHeight: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>Responses</Text>
              </Pressable>
              </View>
            )}

            {/* Someone else's story: reply or react in chat. */}
            {person && !person.mine && (
              <StoryReplyBar
                storyId={story.id}
                ownerId={person.user.userId}
                username={person.user.username}
                canReply={!!person.canReply}
                accessToken={accessToken}
                onBusy={setReplying}
              />
            )}

            {/* Top: one bar per story, then who and when. */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: 10, paddingHorizontal: 8, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {stories.map((item, index) => (
                  <View key={item.id} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" }}>
                    {index < s ? (
                      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
                    ) : index === s ? (
                      <Animated.View
                        style={{
                          height: 3,
                          backgroundColor: "#FFFFFF",
                          width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                        }}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={person?.mine ? "Your story" : `Open @${person?.user.username}`}
                  disabled={person?.mine}
                  onPress={() => {
                    if (!person) return;
                    onClose();
                    setTimeout(() => openProfile(person.user.userId), 80);
                  }}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
                >
                  {person && <Avatar person={person.user} size={34} />}
                  <View style={{ flexShrink: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text numberOfLines={1} style={{ flexShrink: 1, color: "#FFFFFF", fontFamily: fonts.bodyBold, fontSize: 14 }}>
                        {person?.mine ? "Your story" : person?.user.username}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: fonts.body, fontSize: 13 }}>
                        {timeAgo(story.createdAt)}
                      </Text>
                    </View>
                    {!!story.music && (
                      <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.9)", fontFamily: fonts.body, fontSize: 12 }}>
                        ♫ {story.music.title}
                        {story.music.artist ? ` · ${story.music.artist}` : ""}
                      </Text>
                    )}
                  </View>
                </Pressable>
                {!!story.music && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={muted ? "Sound on" : "Sound off"}
                    onPress={() => setMuted((m) => !m)}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name={muted ? "volume-mute" : "volume-high"} size={22} color="#FFFFFF" />
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Story options"
                  onPress={() => setMenu(true)}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close stories"
                  onPress={onClose}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </View>

      <Sheet visible={menu} title="Story" onClose={() => setMenu(false)}>
        <View style={{ paddingVertical: 6 }}>
          {person?.mine ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete story"
              onPress={() => void remove()}
              disabled={deleting}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 54 }}
            >
              {deleting ? <ActivityIndicator color={palette.crimson} /> : <Ionicons name="trash-outline" size={20} color={palette.crimson} />}
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.crimson }}>Delete story</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report story"
              onPress={() => {
                setMenu(false);
                setReporting(true);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 54 }}
            >
              <Ionicons name="flag-outline" size={20} color={palette.crimson} />
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.crimson }}>Report story</Text>
            </Pressable>
          )}
        </View>
      </Sheet>

      <AnswerSheet target={asking} accessToken={accessToken} onClose={() => setAsking(null)} />
      <ResponsesSheet
        storyId={responsesFor}
        stickers={story?.stickers ?? []}
        accessToken={accessToken}
        onClose={() => setResponsesFor(null)}
      />

      {person && story && !person.mine && (
        <StoryReportSheet
          visible={reporting}
          accessToken={accessToken}
          userId={person.user.userId}
          storyId={story.id}
          mediaUrl={story.mediaUrl}
          onClose={() => setReporting(false)}
        />
      )}
    </Modal>
  );
}

/** Report a story: the same review queue as everything else. */
function StoryReportSheet({
  visible,
  accessToken,
  userId,
  storyId,
  mediaUrl,
  onClose,
}: {
  visible: boolean;
  accessToken: string;
  userId: string;
  storyId: string;
  mediaUrl: string;
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (visible) {
      setDone(false);
      setError("");
    }
  }, [visible]);

  const report = async (reason: string) => {
    setError("");
    try {
      // The photo's link goes with it, so a moderator can open it before it expires.
      const result = await safetyApi.report(accessToken, userId, reason, `Story ${storyId}: ${mediaUrl}`, `report-${Date.now()}`);
      if (!result?.saved) throw new Error(result?.error || "Could not send that report.");
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Could not send that report.");
    }
  };

  return (
    <Sheet visible={visible} title="Report" onClose={onClose}>
      {done ? (
        <View style={{ alignItems: "center", padding: 28, gap: 8 }}>
          <Ionicons name="checkmark-circle" size={44} color={palette.emerald} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: palette.ink }}>Thanks for telling us</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, textAlign: "center" }}>
            Our team will look at this story. They will not know who reported it.
          </Text>
        </View>
      ) : (
        <View style={{ paddingVertical: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink, paddingHorizontal: 16, paddingVertical: 10 }}>
            Why are you reporting this story?
          </Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              accessibilityRole="button"
              accessibilityLabel={reason}
              onPress={() => void report(reason)}
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, minHeight: 50, borderTopWidth: 1, borderTopColor: palette.rule }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.ink }}>{reason}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.slate} />
            </Pressable>
          ))}
          {!!error && (
            <Text style={{ color: palette.crimson, fontFamily: fonts.body, fontSize: 13, textAlign: "center", padding: 10 }}>{error}</Text>
          )}
        </View>
      )}
    </Sheet>
  );
}
