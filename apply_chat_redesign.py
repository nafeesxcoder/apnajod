#!/usr/bin/env python3
"""
Applies the Chat Screen redesign to ChatFeature.tsx (header, bubbles, composer).

Usage:
    python apply_chat_redesign.py path/to/ChatFeature.tsx

- A backup is saved as ChatFeature.tsx.bak
- The file is edited in place only if ALL patterns are found exactly once.
- Functionality is untouched; only the 3 visual blocks change.
"""
import re
import shutil
import sys

HEADER = r'''<View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: "#FFFFFF",
              borderBottomWidth: 1,
              borderBottomColor: "#E2D9CB",
              gap: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isCoupleMode ? "Back to our space" : "Back to matches"
              }
              hitSlop={accessibilityHitSlop}
              onPress={() => {
                // A full-screen call minimizes instead of hanging up.
                if (callMode && !callMinimized) {
                  callSession.setMinimized(true);
                  return;
                }
                navigate("home");
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1416" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${match.name}'s profile`}
              disabled={!onOpenPartnerProfile}
              onPress={onOpenPartnerProfile}
            >
              {match.photo ? (
                <Image
                  accessible
                  accessibilityLabel={`${match.name} profile photo`}
                  source={{ uri: match.photo }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    borderWidth: 2,
                    borderColor: "#8A6722",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "#8A6722",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}
                  >
                    {match.name[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Conversation with ${displayName}`}
              accessibilityHint="Edit chat nickname"
              hitSlop={accessibilityHitSlop}
              onPress={() => setSettingsOpen(true)}
              style={{ flex: 1 }}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize: 17, fontWeight: "700", color: "#1A1416" }}
              >
                {displayName}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: partnerTyping
                      ? "#AA812A"
                      : partnerIsOnline
                        ? "#2E7D32"
                        : "#A0A0A0",
                  }}
                />
                <Text numberOfLines={1} style={{ fontSize: 12, color: "#635A5D" }}>
                  {presenceLabel || "Online"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Audio call"
              hitSlop={accessibilityHitSlop}
              onPress={() => void startRealCall("audio")}
            >
              <Ionicons name="call-outline" size={22} color="#8A1B35" />
            </Pressable>
            {chatWidth >= 340 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Video call"
                hitSlop={accessibilityHitSlop}
                onPress={() => void startRealCall("video")}
              >
                <Ionicons name="videocam-outline" size={24} color="#8A1B35" />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chat options"
              hitSlop={accessibilityHitSlop}
              onPress={() => setOptionsOpen(true)}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#635A5D" />
            </Pressable>
          </View>
          '''

BUBBLE_CONSTS = r'''const isMediaBubble =
    message.type === "image" ||
    message.type === "gif" ||
    message.type === "snap";
  const bubbleStyle = [
    {
      maxWidth: "80%" as const,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      marginBottom: 8,
      alignSelf: mine ? ("flex-end" as const) : ("flex-start" as const),
    },
    mine
      ? { backgroundColor: "#8A1B35", borderBottomRightRadius: 4 }
      : {
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E2D9CB",
          borderBottomLeftRadius: 4,
        },
    !!gamePayload && chatStyles.gameMessageBubble,
    !!gamePayload && !mine && chatStyles.gameMessageBubbleTheirs,
    message.type === "sticker" && chatStyles.stickerBubble,
    message.type === "date" && dateStyles.dateBubble,
    message.type === "voice" && chatStyles.voiceBubble,
    message.type === "voice" && !mine && chatStyles.voiceBubbleTheirs,
    message.type === "location" && chatStyles.locationBubble,
    message.type === "document" && chatStyles.documentBubble,
    message.type === "document" && !mine && chatStyles.documentBubbleTheirs,
    isMediaBubble && { padding: 6 },
    (emojiOnly || isJustEmoji) && {
      backgroundColor: "transparent",
      borderWidth: 0,
      borderColor: "transparent",
      elevation: 0,
      shadowOpacity: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
  ];
  '''

COMPOSER = r'''{recordingUiActive ? (
              <VoiceRecordingComposer
                durationMs={recordingDurationMs}
                onCancel={() => {
                  setRecordingPreviewVisible(false);
                  void cancelVoiceNote();
                }}
                onSend={() => {
                  if (recordingPreviewVisible) {
                    setRecordingPreviewVisible(false);
                    return;
                  }
                  void sendVoiceNote();
                }}
              />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: "#FFFFFF",
                  borderTopWidth: 1,
                  borderTopColor: "#E2D9CB",
                  gap: 10,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showEmoji ? "Show keyboard" : "Emoji, GIFs and stickers"
                  }
                  hitSlop={accessibilityHitSlop}
                  onPress={() => {
                    setShowAttachments(false);
                    setAttachmentPage("main");
                    if (showEmoji) {
                      setShowEmoji(false);
                      chatInputRef.current?.focus();
                    } else {
                      chatInputRef.current?.blur();
                      setShowEmoji(true);
                    }
                  }}
                >
                  <Ionicons
                    name={showEmoji ? "keypad-outline" : "happy-outline"}
                    size={24}
                    color="#8A6722"
                  />
                </Pressable>

                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F8F3E9",
                    borderWidth: 1,
                    borderColor: "#E2D9CB",
                    borderRadius: 24,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    gap: 8,
                  }}
                >
                  <TextInput
                    ref={chatInputRef}
                    accessibilityLabel="Type a message"
                    value={text}
                    onChangeText={updateText}
                    onSelectionChange={(event) => {
                      textSelectionRef.current = event.nativeEvent.selection;
                    }}
                    onFocus={() => {
                      setShowEmoji(false);
                      setShowAttachments(false);
                      setAttachmentPage("main");
                    }}
                    placeholder="Message…"
                    placeholderTextColor="#A0A0A0"
                    multiline
                    maxLength={4000}
                    style={[
                      {
                        flex: 1,
                        fontSize: 15,
                        color: "#1A1416",
                        maxHeight: 110,
                        paddingVertical: 0,
                      },
                      Platform.OS === "web"
                        ? ({ outlineStyle: "none" } as never)
                        : null,
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Attach"
                    accessibilityState={{ expanded: showAttachments }}
                    hitSlop={accessibilityHitSlop}
                    onPress={() => {
                      setShowEmoji(false);
                      setAttachmentPage("main");
                      setShowAttachments((value) => !value);
                    }}
                  >
                    <Ionicons name="attach" size={22} color="#8A6722" />
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    text.trim() ? "Send message" : "Record voice message"
                  }
                  onPress={sendOrRecord}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#8A1B35",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={text.trim() ? "send" : "mic"}
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            )}'''


def sub_once(pattern, replacement, source, label, flags=re.S):
    matches = list(re.finditer(pattern, source, flags))
    if len(matches) != 1:
        sys.exit(f"[ABORT] '{label}': expected 1 match, found {len(matches)}. "
                 "File was NOT changed.")
    m = matches[0]
    print(f"[ok] {label}")
    return source[: m.start()] + m.expand(replacement) + source[m.end():]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        src = f.read()

    # 3. Composer: replace the duplicate header sitting inside KeyboardAvoidingView
    src = sub_once(
        r'<View\s+style=\{\{\s*flexDirection: "row",\s*alignItems: "center",\s*'
        r'paddingHorizontal: 16,\s*paddingVertical: 12,\s*'
        r'backgroundColor: "#FFFFFF",\s*borderBottomWidth: 1,\s*'
        r'borderBottomColor: "#F0EAE0",.*?(?=\s*</KeyboardAvoidingView>)',
        COMPOSER, src, "Block 3: composer (duplicate header removed)")

    # 1. Header
    src = sub_once(
        r'<View\s+style=\{\[\s*styles\.chatHead,.*?(?=\{searchOpen && \()',
        HEADER, src, "Block 1: chat header")

    # 2a. Bubble consts
    marker = "if (message.deletedForEveryone) return null;"
    if src.count(marker) != 1:
        sys.exit(f"[ABORT] bubble marker found {src.count(marker)} times. "
                 "File was NOT changed.")
    src = src.replace(marker, BUBBLE_CONSTS + marker)
    print("[ok] Block 2a: bubble consts")

    # 2b. Bubble style prop
    src = sub_once(
        r'style=\{\[\s*mine \? styles\.myBubble : styles\.theirBubble,.*?\]\}'
        r'(?=\s*>\s*\{selected &&)',
        "style={bubbleStyle}", src, "Block 2b: bubble style prop")

    # 2c. Disable old bubble tail (does not match new 18/4 radii)
    src = sub_once(
        r'(!gamePayload &&\s*!emojiOnly &&\s*)!isJustEmoji'
        r'(\s*&&\s*\(\s*<View\s+pointerEvents="none"\s+style=\{\[\s*'
        r'chatStyles\.messageTail)',
        r'\1false\2', src, "Block 2c: bubble tail disabled")

    # 2d. Timestamp 11px
    src = sub_once(
        r'style=\{\[\s*styles\.time,',
        "style={[styles.time, { fontSize: 11 },", src, "Block 2d: time 11px")

    shutil.copyfile(path, path + ".bak")
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"\nDone. Backup: {path}.bak")
    print("Next: run  npx prettier --write " + path + "  and  npx tsc --noEmit")


if __name__ == "__main__":
    main()
