/**
 * "Have a pass code?" on Premium, on the website and in the app.
 *
 * The admin makes codes that give a free pass (Plus, Pro or Everything for
 * some months). Typing one starts the pass at once - nothing is paid, so it
 * works the same everywhere. A code from the offer popup is filled in here.
 */
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { type BillingSummary, billingApi } from "../../api/billingApi";
import { PressScale } from "../../components/motion";
import { fonts, palette, radius } from "../../theme";
import { takePendingCoupon } from "./couponStore";

export function PassCodeBox({
  accessToken,
  onRedeemed,
}: {
  accessToken: string;
  onRedeemed: (billing: BillingSummary) => void;
}) {
  const [code, setCode] = useState(() => takePendingCoupon() ?? "");
  const [open, setOpen] = useState(() => !!code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const redeem = async () => {
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const result = await billingApi.redeemCode(accessToken, value);
      const until = result.pass?.expiresAt
        ? new Date(result.pass.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "";
      setDone(result.pass ? `${result.pass.planLabel} is on, free${until ? ` till ${until}` : ""}. Enjoy!` : "Your pass is on.");
      onRedeemed(result.billing);
      setCode("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <View style={{ alignItems: "center", marginTop: 18, gap: 6 }}>
      {!!done && (
        <Text accessibilityRole="alert" style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.emerald, textAlign: "center" }}>
          {done}
        </Text>
      )}
      <PressScale
        accessibilityRole="button"
        accessibilityLabel="Have a pass code?"
        onPress={() => setOpen(true)}
        containerStyle={{ alignSelf: "center" }}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
      >
        <Ionicons name="gift-outline" size={17} color={palette.crimson} />
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.crimson }}>Have a pass code?</Text>
      </PressScale>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 18, gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Pass code</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          accessibilityLabel="Pass code"
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
            if (error) setError("");
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={!code}
          placeholder="CODE"
          placeholderTextColor="#9AA5B1"
          onSubmitEditing={() => void redeem()}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: palette.rule,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontFamily: fonts.bodySemi,
            fontSize: 16,
            letterSpacing: 1.5,
            color: palette.ink,
            backgroundColor: "#FFFFFF",
          }}
        />
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Use pass code"
          disabled={busy || !code.trim()}
          onPress={() => void redeem()}
          style={{
            minHeight: 44,
            paddingHorizontal: 18,
            borderRadius: radius.pill,
            backgroundColor: palette.crimson,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy || !code.trim() ? 0.6 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>Use code</Text>
          )}
        </PressScale>
      </View>
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>
          {error}
        </Text>
      )}
    </View>
  );
}
