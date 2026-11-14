import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ChatMessage } from "../../storage";
import { fonts, palette, radius } from "../../theme";
import { Sheet } from "../posts/PostSheets";

const input = {
  backgroundColor: palette.paperSand,
  borderRadius: radius.md,
  paddingHorizontal: 14,
  minHeight: 46,
  fontFamily: fonts.body,
  fontSize: 15,
  color: palette.ink,
  ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
};
const label = { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate, marginBottom: 6 };
const chip = (on: boolean) => ({
  paddingHorizontal: 12,
  minHeight: 36,
  borderRadius: radius.pill,
  justifyContent: "center" as const,
  backgroundColor: on ? palette.crimson : palette.paperSand,
});
const chipText = (on: boolean) => ({ fontFamily: fonts.bodySemi, fontSize: 13, color: on ? "#FFFFFF" : palette.ink });
const primary = (disabled: boolean) => ({
  minHeight: 48,
  borderRadius: radius.pill,
  backgroundColor: palette.crimson,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  opacity: disabled ? 0.5 : 1,
});

/* ------------------------------------------------------------------ */
/* Date plan                                                           */
/* ------------------------------------------------------------------ */

export type DateDraft = NonNullable<ChatMessage["date"]>;

const DATE_KINDS = [
  { key: "Coffee", emoji: "☕" },
  { key: "Dinner", emoji: "🍽️" },
  { key: "Walk", emoji: "🌳" },
  { key: "Movie", emoji: "🎬" },
  { key: "Activity", emoji: "🎨" },
] as const;
const WHEN = ["Today evening", "Tomorrow evening", "This Saturday", "This Sunday"];

/**
 * Plan a date in the chat: what, where and when. The other person accepts
 * or declines on the card; after the date each of you can check in safe.
 */
export function DatePlannerSheet({
  visible,
  name,
  onClose,
  onSend,
}: {
  visible: boolean;
  name: string;
  onClose: () => void;
  onSend: (date: DateDraft) => void;
}) {
  const [kind, setKind] = useState<string>("Coffee");
  const [venue, setVenue] = useState("");
  const [area, setArea] = useState("");
  const [when, setWhen] = useState("");
  const [safety, setSafety] = useState(true);
  useEffect(() => {
    if (!visible) return;
    setKind("Coffee");
    setVenue("");
    setArea("");
    setWhen("");
    setSafety(true);
  }, [visible]);
  const ready = venue.trim().length > 1 && area.trim().length > 1 && when.trim().length > 1;
  const emoji = DATE_KINDS.find((k) => k.key === kind)?.emoji ?? "📅";
  return (
    <Sheet visible={visible} title="Plan a date" tall onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
          {name} sees it in your chat and can accept or decline. Meet somewhere public.
        </Text>
        <View>
          <Text style={label}>What</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DATE_KINDS.map((k) => (
              <Pressable key={k.key} accessibilityRole="button" accessibilityLabel={`Date: ${k.key}`} accessibilityState={{ selected: kind === k.key }} onPress={() => setKind(k.key)} style={chip(kind === k.key)}>
                <Text style={chipText(kind === k.key)}>{k.emoji} {k.key}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <Text style={label}>Place</Text>
          <TextInput value={venue} onChangeText={setVenue} placeholder="e.g. Blue Tokai Coffee" placeholderTextColor={palette.slate} accessibilityLabel="Place" maxLength={80} style={input} />
        </View>
        <View>
          <Text style={label}>Area</Text>
          <TextInput value={area} onChangeText={setArea} placeholder="e.g. Bandra West, Mumbai" placeholderTextColor={palette.slate} accessibilityLabel="Area" maxLength={80} style={input} />
        </View>
        <View>
          <Text style={label}>When</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {WHEN.map((w) => (
              <Pressable key={w} accessibilityRole="button" accessibilityLabel={`When: ${w}`} onPress={() => setWhen(w)} style={chip(when === w)}>
                <Text style={chipText(when === w)}>{w}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={when} onChangeText={setWhen} placeholder="Or type: Sat 15 Nov, 6 PM" placeholderTextColor={palette.slate} accessibilityLabel="When" maxLength={60} style={input} />
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: safety }}
          accessibilityLabel="Safety check-in"
          onPress={() => setSafety((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: palette.paperSand }}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color={palette.crimson} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Safety check-in</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>After the date, tap "I'm safe" on the card.</Text>
          </View>
          <Ionicons name={safety ? "toggle" : "toggle-outline"} size={34} color={safety ? palette.crimson : palette.slate} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send date plan"
          disabled={!ready}
          onPress={() =>
            onSend({
              venue: venue.trim(),
              area: area.trim(),
              time: when.trim(),
              category: kind,
              packageTitle: `${emoji} ${kind.toUpperCase()} DATE`,
              safetyCheckIn: safety,
            })
          }
          style={primary(!ready)}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>Send date plan</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

export type DateAction = "accepted" | "declined" | "cancelled" | "safe";

/** Accept / Decline (for the person invited), Cancel (for the one who asked), I'm safe after it. */
export function DateActions({ message, onAction }: { message: ChatMessage; onAction?: (action: DateAction) => void }) {
  const date = message.date;
  if (!date?.proposalId || !onAction) return null;
  const status = date.planStatus ?? "proposed";
  const mine = message.mine !== false;
  const button = (text: string, action: DateAction, filled = false) => (
    <Pressable
      key={action}
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={() => onAction(action)}
      style={{
        flex: 1,
        minHeight: 38,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? palette.crimson : "#FFFFFF",
        borderWidth: filled ? 0 : 1,
        borderColor: palette.rule,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: filled ? "#FFFFFF" : palette.ink }}>{text}</Text>
    </Pressable>
  );
  const buttons: React.ReactNode[] = [];
  if (status === "proposed" || status === "countered") {
    if (!mine) buttons.push(button("Accept", "accepted", true), button("Decline", "declined"));
    else buttons.push(button("Cancel plan", "cancelled"));
  } else if (status === "accepted") {
    if (date.safetyCheckIn && !date.safeByMe) buttons.push(button("I'm safe ✓", "safe", true));
    if (mine) buttons.push(button("Cancel plan", "cancelled"));
  } else if (status === "completed" && date.safetyCheckIn && !date.safeByMe) {
    buttons.push(button("I'm safe ✓", "safe", true));
  }
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      {date.safeByMe && (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.emerald }}>✓ You checked in safe</Text>
      )}
      {buttons.length > 0 && <View style={{ flexDirection: "row", gap: 8 }}>{buttons}</View>}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Poll                                                                */
/* ------------------------------------------------------------------ */

/** A question with 2 to 4 options; both of you vote, results show live. */
export function PollComposerSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (poll: { question: string; options: string[] }) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  useEffect(() => {
    if (!visible) return;
    setQuestion("");
    setOptions(["", ""]);
  }, [visible]);
  const filled = options.map((o) => o.trim()).filter(Boolean);
  const ready = question.trim().length > 1 && filled.length >= 2;
  return (
    <Sheet visible={visible} title="Create a poll" tall onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={label}>Question</Text>
          <TextInput value={question} onChangeText={setQuestion} placeholder="e.g. Where should we go first?" placeholderTextColor={palette.slate} accessibilityLabel="Poll question" maxLength={120} style={input} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={label}>Options</Text>
          {options.map((value, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={value}
                onChangeText={(text) => setOptions((list) => list.map((o, j) => (j === i ? text : o)))}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={palette.slate}
                accessibilityLabel={`Option ${i + 1}`}
                maxLength={60}
                style={[input, { flex: 1 }]}
              />
              {options.length > 2 && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove option ${i + 1}`} onPress={() => setOptions((list) => list.filter((_, j) => j !== i))} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={palette.slate} />
                </Pressable>
              )}
            </View>
          ))}
          {options.length < 4 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Add option" onPress={() => setOptions((list) => [...list, ""])} style={{ alignSelf: "flex-start", paddingVertical: 6 }}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.crimson }}>+ Add option</Text>
            </Pressable>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Send poll" disabled={!ready} onPress={() => onSend({ question: question.trim(), options: filled })} style={primary(!ready)}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>Send poll</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

export function PollCard({ message, onVote }: { message: ChatMessage; onVote?: (choice: number) => void }) {
  const poll = message.poll;
  if (!poll) return null;
  const counts = poll.counts ?? poll.options.map(() => 0);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <View style={{ gap: 8, minWidth: 220 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.slate }}>📊 POLL</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>{poll.question}</Text>
      {poll.options.map((option, i) => {
        const mine = poll.myVote === i;
        const share = total ? counts[i]! / total : 0;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Vote ${option}${mine ? ", your vote" : ""}, ${counts[i]} ${counts[i] === 1 ? "vote" : "votes"}`}
            onPress={() => onVote?.(i)}
            style={{ borderRadius: radius.md, borderWidth: 1, borderColor: mine ? palette.crimson : palette.rule, overflow: "hidden", minHeight: 40, justifyContent: "center" }}
          >
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(share * 100)}%`, backgroundColor: mine ? "rgba(163,41,60,0.16)" : "rgba(31,77,122,0.08)" }} />
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
              {mine && <Ionicons name="checkmark-circle" size={16} color={palette.crimson} />}
              <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>{option}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>{counts[i]}</Text>
            </View>
          </Pressable>
        );
      })}
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
        {poll.myVote == null ? "Tap to vote" : "Tap another option to change your vote"}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

/** When the phone's contact picker is not there: type a name and number. */
export function ContactShareSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (contact: { name: string; phone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (!visible) return;
    setName("");
    setPhone("");
  }, [visible]);
  const ready = name.trim().length > 0 && phone.replace(/\D/g, "").length >= 6;
  return (
    <Sheet visible={visible} title="Share a contact" onClose={onClose}>
      <View style={{ padding: 16, gap: 12 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={palette.slate} accessibilityLabel="Contact name" maxLength={60} style={input} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={palette.slate} accessibilityLabel="Contact phone number" keyboardType="phone-pad" maxLength={20} style={input} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send contact" disabled={!ready} onPress={() => onSend({ name: name.trim(), phone: phone.trim() })} style={primary(!ready)}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>Send contact</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

export function ContactCard({ message }: { message: ChatMessage }) {
  const contact = message.contact;
  if (!contact) return null;
  const digits = contact.phone.replace(/[^\d+]/g, "");
  return (
    <View style={{ gap: 10, minWidth: 220 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: palette.paperSand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: palette.navy }}>{(contact.name || "?").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.ink }}>{contact.name}</Text>
          <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>{contact.phone}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(
          [
            ["call", "Call", `tel:${digits}`],
            ["chatbubble-ellipses", "Message", `sms:${digits}`],
          ] as const
        ).map(([icon, text, url]) => (
          <Pressable
            key={text}
            accessibilityRole="button"
            accessibilityLabel={`${text} ${contact.name}`}
            onPress={() => void Linking.openURL(url).catch(() => undefined)}
            style={{ flex: 1, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.rule, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Ionicons name={icon} size={15} color={palette.navy} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.navy }}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** One contact from the phone (app) or Android Chrome's picker; null if there is no picker. */
export async function pickOneContact(): Promise<{ name: string; phone: string } | null | "none"> {
  if (Platform.OS !== "web") {
    try {
      const Contacts = await import("expo-contacts");
      const picked = await Contacts.presentContactPickerAsync();
      if (!picked) return null;
      const phone = picked.phoneNumbers?.find((p) => p.number)?.number ?? "";
      if (!phone) return null;
      return { name: picked.name || phone, phone };
    } catch {
      return "none";
    }
  }
  const api = typeof navigator !== "undefined" ? (navigator as unknown as { contacts?: { select: (p: string[], o?: object) => Promise<Array<{ name?: string[]; tel?: string[] }>> } }).contacts : undefined;
  if (!api || typeof api.select !== "function") return "none";
  try {
    const [entry] = await api.select(["name", "tel"], { multiple: false });
    const phone = entry?.tel?.[0];
    if (!entry || !phone) return null;
    return { name: entry.name?.[0] || phone, phone };
  } catch {
    return null;
  }
}
