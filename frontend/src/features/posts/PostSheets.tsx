import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { chatApi, type ConversationSummary } from "../../api/chatApi";
import { loadChatsAndMatches } from "../social/chatTargets";
import { postApi, postLink, type Post, type PostAuthor, type PostComment } from "../../api/postApi";
import { safetyApi } from "../../api/safetyApi";
import { fonts, palette, radius } from "../../theme";
import { canOpenProfile, openProfile } from "./profileLink";
import { shareText, timeAgo } from "./postFormat";
import { keyboardBehavior } from "../../layout/keyboardBehavior";

/**
 * The height you can actually see. On a phone browser the address bar and
 * the bottom toolbar cover part of the page; a sheet pinned to the page's
 * bottom slid under the toolbar and its last rows were cut off. The visual
 * viewport is the part not covered.
 */
export function useVisibleHeight(): number {
  const { height } = useWindowDimensions();
  const read = () =>
    Platform.OS === "web" && typeof window !== "undefined" && window.visualViewport
      ? Math.round(window.visualViewport.height)
      : height;
  const [visible, setVisible] = useState(read);
  useEffect(() => {
    setVisible(read());
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const update = () => setVisible(Math.round(viewport.height));
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);
  return visible || height;
}

/** Room for the phone's home bar under a sheet. */
const SHEET_BOTTOM =
  Platform.OS === "web"
    ? ({ paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))" } as object)
    : { paddingBottom: Platform.OS === "ios" ? 28 : 14 };

/**
 * A sheet that slides up from the bottom, Instagram-style, on a phone. On a
 * laptop or tablet (wide screen) it opens as a card in the middle instead:
 * pinned to the bottom of a big window it looked cut off.
 */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  tall,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Takes most of the screen (comments) instead of fitting its content. */
  tall?: boolean;
}) {
  const height = useVisibleHeight();
  const { width } = useWindowDimensions();
  const centred = width >= 700;
  return (
    <Modal visible={visible} transparent animationType={centred ? "fade" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={keyboardBehavior}
        // Only as tall as what can be seen, so the sheet's bottom is never
        // under the browser's toolbar.
        style={{ height, justifyContent: centred ? "center" : "flex-end", padding: centred ? 24 : 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,32,46,0.45)" }}
        />
        <View
          style={{
            backgroundColor: palette.paper,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderBottomLeftRadius: centred ? 22 : 0,
            borderBottomRightRadius: centred ? 22 : 0,
            overflow: "hidden",
            maxHeight: centred ? height - 48 : height * 0.9,
            height: tall ? (centred ? Math.min(height - 48, 720) : height * 0.82) : undefined,
            width: "100%",
            maxWidth: centred ? 480 : 640,
            alignSelf: "center",
            ...(centred ? { paddingBottom: 8 } : SHEET_BOTTOM),
          }}
        >
          {!centred && (
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: palette.rule }} />
            </View>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 8,
              minHeight: 48,
              borderBottomWidth: 1,
              borderBottomColor: palette.rule,
            }}
          >
            <View style={{ width: 44 }} />
            <Text
              accessibilityRole="header"
              style={{ flex: 1, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 16, color: palette.ink }}
            >
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Close ${title.toLowerCase()}`}
              onPress={onClose}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={22} color={palette.ink} />
            </Pressable>
          </View>
          {tall ? (
            children
          ) : (
            // Scrolls when it does not fit, instead of cutting off the end.
            <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A round avatar: their photo, or the first letter of their username. */
export function Avatar({ person, size = 36 }: { person: Pick<PostAuthor, "username" | "avatarUrl">; size?: number }) {
  return person.avatarUrl ? (
    <Image
      source={{ uri: person.avatarUrl }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.paperSand }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.crimsonTint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.42, color: palette.crimson }}>
        {(person.username || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

/** Tapping a person on a post: close the sheet first, then open their profile. */
function goToProfile(userId: string, close: () => void) {
  close();
  setTimeout(() => openProfile(userId), 80);
}

function PersonRow({ person, onPress, right }: { person: PostAuthor; onPress?: () => void; right?: ReactNode }) {
  const who = (
    <>
      <Avatar person={person} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>
          {person.username || person.name}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
          {person.name}
        </Text>
      </View>
    </>
  );
  const row = { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 60 } as const;
  // The tappable part and the button on the right (Send) are siblings. The
  // row used to be one disabled button wrapped round the Send button, and on
  // the web a disabled button swallows taps on everything inside it - so
  // "Send in chat" never sent.
  return (
    <View style={row}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open @${person.username}`}
          onPress={onPress}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 }}
        >
          {who}
        </Pressable>
      ) : (
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>{who}</View>
      )}
      {right}
    </View>
  );
}

/** Who liked a post. */
export function LikersSheet({
  visible,
  accessToken,
  postId,
  onClose,
}: {
  visible: boolean;
  accessToken: string;
  postId: string;
  onClose: () => void;
}) {
  const [people, setPeople] = useState<PostAuthor[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!visible) return;
    let live = true;
    setPeople(null);
    setError("");
    postApi
      .likers(accessToken, postId)
      .then((list) => live && setPeople(list))
      .catch((e) => live && setError(e?.message || "Could not load likes."));
    return () => {
      live = false;
    };
  }, [visible, accessToken, postId]);

  return (
    <Sheet visible={visible} title="Likes" onClose={onClose} tall>
      {people === null && !error ? (
        <ActivityIndicator style={{ marginVertical: 30 }} color={palette.crimson} />
      ) : error ? (
        <Text style={{ textAlign: "center", color: palette.crimson, fontFamily: fonts.body, margin: 24 }}>{error}</Text>
      ) : people!.length === 0 ? (
        <Text style={{ textAlign: "center", color: palette.slate, fontFamily: fonts.body, margin: 30 }}>
          No likes yet.
        </Text>
      ) : (
        <FlatList
          data={people!}
          keyExtractor={(person) => person.userId}
          contentContainerStyle={{ paddingVertical: 6 }}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              onPress={canOpenProfile() ? () => goToProfile(item.userId, onClose) : undefined}
            />
          )}
        />
      )}
    </Sheet>
  );
}

/** The comments on a post, with a box to add one. */
export function CommentsSheet({
  visible,
  accessToken,
  post,
  onClose,
  onCountChange,
}: {
  visible: boolean;
  accessToken: string;
  post: Post;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<PostComment>>(null);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setComments(null);
    setError("");
    postApi
      .comments(accessToken, post.id)
      .then((list) => {
        if (!live) return;
        setComments(list);
        onCountChange?.(list.length);
      })
      .catch((e) => live && setError(e?.message || "Could not load comments."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, accessToken, post.id]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const comment = await postApi.addComment(accessToken, post.id, body);
      const next = [...(comments ?? []), comment];
      setComments(next);
      onCountChange?.(next.length);
      setDraft("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    } catch (e: any) {
      setError(e?.message || "Could not post that comment.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: PostComment) => {
    const before = comments ?? [];
    const next = before.filter((c) => c.id !== comment.id);
    setComments(next);
    onCountChange?.(next.length);
    try {
      await postApi.deleteComment(accessToken, post.id, comment.id);
    } catch (e: any) {
      setComments(before);
      onCountChange?.(before.length);
      setError(e?.message || "Could not delete that comment.");
    }
  };

  const author = post.author;
  return (
    <Sheet visible={visible} title="Comments" onClose={onClose} tall>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={comments ?? []}
        keyExtractor={(comment) => comment.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingVertical: 8 }}
        ListHeaderComponent={
          author && post.caption ? (
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: palette.rule,
                marginBottom: 6,
              }}
            >
              <Avatar person={author} size={34} />
              <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>{author.username} </Text>
                {post.caption}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          comments === null && !error ? (
            <ActivityIndicator style={{ marginVertical: 30 }} color={palette.crimson} />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 36, gap: 6 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, color: palette.ink }}>No comments yet</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Start the conversation.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 9 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open @${item.author.username}`}
              disabled={!canOpenProfile()}
              onPress={() => goToProfile(item.author.userId, onClose)}
            >
              <Avatar person={item.author} size={34} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 }}>
                <Text
                  accessibilityRole="link"
                  onPress={canOpenProfile() ? () => goToProfile(item.author.userId, onClose) : undefined}
                  style={{ fontFamily: fonts.bodyBold }}
                >
                  {item.author.username}{" "}
                </Text>
                {item.body}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, marginTop: 2 }}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
            {item.canDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete comment"
                onPress={() => void remove(item)}
                style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="trash-outline" size={17} color={palette.slate} />
              </Pressable>
            )}
          </View>
        )}
      />
      {!!error && (
        <Text style={{ color: palette.crimson, fontFamily: fonts.body, fontSize: 13, textAlign: "center", paddingHorizontal: 16 }}>
          {error}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: palette.rule,
        }}
      >
        <TextInput
          accessibilityLabel="Add a comment"
          value={draft}
          onChangeText={setDraft}
          placeholder={author ? `Add a comment for ${author.username}...` : "Add a comment..."}
          placeholderTextColor={palette.slate}
          multiline
          maxLength={500}
          style={[
            {
              flex: 1,
              minHeight: 42,
              maxHeight: 120,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 21,
              backgroundColor: palette.paperSand,
              fontFamily: fonts.body,
              fontSize: 14,
              color: palette.ink,
            },
            Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null,
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          disabled={!draft.trim() || sending}
          onPress={() => void send()}
          style={{ minWidth: 56, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          {sending ? (
            <ActivityIndicator color={palette.crimson} />
          ) : (
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 15,
                color: draft.trim() ? palette.crimson : palette.crimsonSoft,
              }}
            >
              Post
            </Text>
          )}
        </Pressable>
      </View>
    </Sheet>
  );
}

/** Share a post: send it to one of your matches in chat, or as a link. */
export function ShareSheet({
  visible,
  accessToken,
  post,
  onClose,
}: {
  visible: boolean;
  accessToken: string;
  post: Post;
  onClose: () => void;
}) {
  const [chats, setChats] = useState<ConversationSummary[] | null>(null);
  const [sent, setSent] = useState<Record<string, "sending" | "sent" | "error">>({});
  const [note, setNote] = useState("");
  const link = postLink(post.id);
  const text = shareText(post.author?.username || "apnajoda", post.caption || "", link);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setSent({});
    setNote("");
    setChats(null);
    // Your chats and new matches you have not written to yet - the same
    // list as the Chats tab.
    loadChatsAndMatches(accessToken)
      .then((list) => live && setChats(list.slice(0, 40)))
      .catch(() => live && setChats([]));
    return () => {
      live = false;
    };
  }, [visible, accessToken]);

  const sendTo = async (chat: ConversationSummary) => {
    setSent((s) => ({ ...s, [chat.conversationId]: "sending" }));
    const result = await chatApi
      .sendMessage(accessToken, chat.conversationId, {
        id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "text",
        text,
        mine: true,
        createdAt: Date.now(),
        status: "sent",
      } as never)
      .catch((e: any) => ({ saved: false, error: e?.message }));
    setSent((s) => ({ ...s, [chat.conversationId]: result.saved ? "sent" : "error" }));
    if (!result.saved) {
      setNote(
        (result as { error?: string }).error ||
          `Could not send to ${chat.user.username || chat.user.name}. Please try again.`,
      );
    }
  };

  const copy = async () => {
    try {
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(link);
        setNote("Link copied.");
        return;
      }
      await Share.share({ message: link });
    } catch {
      setNote(link);
    }
  };

  const more = async () => {
    try {
      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      if (Platform.OS === "web" && nav?.share) {
        await nav.share({ title: "Apnajoda", text, url: link });
        return;
      }
      if (Platform.OS === "web") {
        await copy();
        return;
      }
      await Share.share({ message: text });
    } catch {
      // Cancelled.
    }
  };

  const whatsApp = () => {
    void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <Sheet visible={visible} title="Share" onClose={onClose}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate, paddingHorizontal: 16, paddingTop: 12 }}>
        Send in chat
      </Text>
      {chats === null ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color={palette.crimson} />
      ) : chats.length === 0 ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate, paddingHorizontal: 16, paddingVertical: 14 }}>
          Your chats show here once you match with someone.
        </Text>
      ) : (
        <View>
          {chats.map((item) => {
            const state = sent[item.conversationId];
            return (
              <PersonRow
                key={item.conversationId}
                person={item.user}
                right={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Send to ${item.user.username}`}
                    disabled={state === "sending" || state === "sent"}
                    onPress={() => void sendTo(item)}
                    style={{
                      minWidth: 72,
                      minHeight: 36,
                      paddingHorizontal: 14,
                      borderRadius: radius.pill,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: state === "sent" ? palette.paperSand : palette.crimson,
                    }}
                  >
                    {state === "sending" ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          fontFamily: fonts.bodySemi,
                          fontSize: 13,
                          color: state === "sent" ? palette.slate : "#FFFFFF",
                        }}
                      >
                        {state === "sent" ? "Sent" : state === "error" ? "Retry" : "Send"}
                      </Text>
                    )}
                  </Pressable>
                }
              />
            );
          })}
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: palette.rule,
          marginTop: 6,
        }}
      >
        <ShareOption icon="link" label="Copy link" onPress={() => void copy()} />
        <ShareOption icon="logo-whatsapp" label="WhatsApp" onPress={whatsApp} />
        <ShareOption icon="share-outline" label="More" onPress={() => void more()} />
      </View>
      {!!note && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: palette.navy, paddingBottom: 10 }}
        >
          {note}
        </Text>
      )}
    </Sheet>
  );
}

function ShareOption({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ alignItems: "center", gap: 6, minWidth: 80 }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: palette.paperSand,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={palette.ink} />
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.ink }}>{label}</Text>
    </Pressable>
  );
}

export const REPORT_REASONS = [
  "Spam",
  "Nudity or sexual content",
  "Harassment or bullying",
  "Hate speech",
  "Fake account or scam",
  "Something else",
] as const;

/** Report a post: goes to the same review queue as any other report. */
export function ReportSheet({
  visible,
  accessToken,
  post,
  onClose,
}: {
  visible: boolean;
  accessToken: string;
  post: Post;
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
    if (!post.author) return;
    setError("");
    try {
      const result = await safetyApi.report(
        accessToken,
        post.author.userId,
        reason,
        `Post ${post.id}${post.caption ? `: "${post.caption.slice(0, 200)}"` : ""}`,
        `report-${Date.now()}`,
        post.id,
      );
      // The safety API answers instead of throwing; a refusal is a failure.
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
            Our team will look at this post. They will not know who reported it.
          </Text>
        </View>
      ) : (
        <View style={{ paddingVertical: 6 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink, paddingHorizontal: 16, paddingVertical: 10 }}>
            Why are you reporting this post?
          </Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              accessibilityRole="button"
              accessibilityLabel={reason}
              onPress={() => void report(reason)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                minHeight: 50,
                borderTopWidth: 1,
                borderTopColor: palette.rule,
              }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: palette.ink }}>{reason}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.slate} />
            </Pressable>
          ))}
          {!!error && (
            <Text style={{ color: palette.crimson, fontFamily: fonts.body, fontSize: 13, textAlign: "center", padding: 10 }}>
              {error}
            </Text>
          )}
        </View>
      )}
    </Sheet>
  );
}
