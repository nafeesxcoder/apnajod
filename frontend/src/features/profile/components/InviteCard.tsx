import { useEffect, useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../../../api/authApi";
import { profileApi, type ReferralSummary } from "../../../api/profileApi";
import { brand, whiteCard } from "../../../components/brand";
import { PressScale } from "../../../components/motion";
import { fonts, palette, radius } from "../../../theme";
import { referralLine } from "../referralLine";

// Invite links point at the public site. ?invite=<username> is read by
// captureInviteFromUrl, so a signup that comes from this link credits you.
export const SHARE_BASE = "https://apnajoda.com/";
export const SHARE_TEXT =
  "Join me on Apnajoda. Meaningful connections, meaningful futures. Sign up with my link and get a free Super Like.";

/**
 * Invite & earn, on Home (and only on Home): one tap shares the invite
 * link; the card shows how many friends joined and Boosts were earned.
 */
export function InviteCard({ accessToken }: { accessToken?: string }) {
  const [username, setUsername] = useState("");
  const [referrals, setReferrals] = useState<ReferralSummary | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    authApi
      .me(accessToken)
      .then((res: any) => active && setUsername(String(res?.user?.username ?? "")))
      .catch(() => undefined);
    void profileApi.referrals(accessToken).then((summary) => {
      if (active && summary) setReferrals(summary);
    });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(""), 4000);
    return () => clearTimeout(timer);
  }, [note]);

  if (!accessToken) return null;

  const link = username ? `${SHARE_BASE}?invite=${encodeURIComponent(username)}` : SHARE_BASE;

  const share = async () => {
    try {
      if (Platform.OS === "web") {
        const nav: any = typeof navigator !== "undefined" ? navigator : null;
        if (nav?.share) {
          await nav.share({ title: "Apnajoda", text: SHARE_TEXT, url: link });
          return;
        }
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(`${SHARE_TEXT} ${link}`);
          setNote("Link copied. Paste it in WhatsApp, Instagram or Facebook.");
          return;
        }
        setNote(link);
        return;
      }
      await Share.share({ message: `${SHARE_TEXT} ${link}` });
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setNote("Could not share. Please try again.");
    }
  };

  const totals = referralLine(referrals);

  return (
    <View style={{ ...whiteCard, marginBottom: 16, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: brand.pillBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="gift" size={20} color={palette.crimson} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
            Invite friends · earn Boosts
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.slate }}>
            {totals || "A free Boost for you when a friend joins and adds a photo. They get a free Super Like."}
          </Text>
        </View>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Invite friends"
          onPress={() => void share()}
          style={{
            minHeight: 40,
            paddingHorizontal: 16,
            borderRadius: radius.pill,
            backgroundColor: palette.crimson,
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>Invite</Text>
        </PressScale>
      </View>
      {!!note && (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.body, fontSize: 12, color: palette.navy }}>
          {note}
        </Text>
      )}
    </View>
  );
}
