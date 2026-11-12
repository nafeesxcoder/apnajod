import { useState } from "react";
import { Linking, Platform, Pressable, Share, Text, View } from "react-native";
import { shareApi } from "../api/shareApi";
import { fonts, palette, radius } from "../theme";

/**
 * "Show my family" - makes a 7-day link to a profile and hands it to
 * WhatsApp (or the phone's share sheet). Family can open it without an
 * account. Your own profile any time; someone else's once you are a match
 * - the server enforces that, this only shows what it says.
 */
export function FamilyShareButton({
  accessToken,
  targetId,
  name,
  label,
}: {
  accessToken?: string;
  /** Leave out to share your own profile. */
  targetId?: string;
  /** Whose profile, for the message text. */
  name: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (!accessToken) return null;

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const link = await shareApi.create(accessToken, targetId);
      // On the web the link should point back at whichever site is open.
      const url =
        Platform.OS === "web" && typeof window !== "undefined"
          ? `${window.location.origin}/?share=${link.token}`
          : link.url;
      const message = link.own
        ? `Please have a look at my profile on Apnajoda: ${url} (link works for 7 days)`
        : `Please have a look at ${name}'s profile on Apnajoda: ${url} (link works for 7 days)`;

      const nav: any = Platform.OS === "web" && typeof navigator !== "undefined" ? navigator : null;
      if (Platform.OS !== "web") {
        await Share.share({ message });
      } else if (nav?.share) {
        await nav.share({ title: "Apnajoda", text: message });
      } else {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      }
      setNote("Link ready. It works for 7 days.");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setNote(error instanceof Error ? error.message : "Could not make the link. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ alignItems: "center", marginTop: 12, gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={busy}
        onPress={() => void share()}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: palette.emerald,
          backgroundColor: pressed ? palette.paperSand : "transparent",
          paddingHorizontal: 16,
          paddingVertical: 9,
          opacity: busy ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 15 }}>👨‍👩‍👧</Text>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.emerald }}>
          {busy ? "Making link..." : label}
        </Text>
      </Pressable>
      {!!note && (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: palette.slate,
            textAlign: "center",
          }}
        >
          {note}
        </Text>
      )}
    </View>
  );
}
