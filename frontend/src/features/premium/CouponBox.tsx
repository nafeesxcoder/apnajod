/**
 * "Have a coupon?" above the Pay button.
 *
 * A coupon the admin shows at payment, or one picked from the offer popup,
 * is put on by itself; anyone can also type a code. The server works out
 * the price - this only shows it.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { type BillingPlan, billingApi, rupees } from "../../api/billingApi";
import { fonts, palette, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { type AppliedCoupon, takePendingCoupon } from "./couponStore";

export function CouponBox({
  plan,
  accessToken,
  shown,
  applied,
  onApplied,
}: {
  plan: BillingPlan;
  accessToken: string;
  /** The coupon the admin shows at payment. */
  shown: { code: string; percent: number } | null;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  // A coupon the member took off stays off for this visit.
  const removed = useRef<string | null>(null);
  const pending = useRef<string | null>(takePendingCoupon());
  const forPremium = plan.kind === "subscription";

  const apply = async (raw: string, quiet = false) => {
    const value = raw.trim().toUpperCase();
    if (!value) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const price = await billingApi.checkCoupon(accessToken, plan.code, value);
      if (price.couponCode) {
        onApplied({ code: price.couponCode, percent: price.percent ?? 0, amountPaise: price.amountPaise, originalPaise: price.originalPaise });
        setOpen(false);
        setCode("");
      } else {
        onApplied(null);
        if (!quiet) setNote("The festival price is lower than this coupon, so you get that.");
      }
    } catch (e) {
      onApplied(null);
      if (!quiet) setError(e instanceof Error ? e.message : "That coupon did not work.");
    } finally {
      setBusy(false);
    }
  };

  // A new plan: put the coupon on again for its price.
  useEffect(() => {
    onApplied(null);
    setError("");
    setNote("");
    if (!forPremium) return;
    const candidate = applied?.code ?? pending.current ?? (shown && shown.code !== removed.current ? shown.code : null);
    pending.current = null;
    if (candidate) void apply(candidate, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.code, shown?.code]);

  if (!forPremium) return null;

  if (applied) {
    return (
      <View
        accessibilityLabel={`Coupon ${applied.code} applied, ${applied.percent}% off`}
        style={{
          marginTop: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#ECFDF5",
          borderWidth: 1,
          borderColor: "#6EE7B7",
          borderStyle: "dashed",
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 20 }}>🎟️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#065F46" }}>
            {applied.code} applied · {applied.percent}% off
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: "#047857" }}>
            You save {rupees(applied.originalPaise - applied.amountPaise)}
          </Text>
        </View>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Remove coupon"
          hitSlop={8}
          onPress={() => {
            removed.current = applied.code;
            onApplied(null);
          }}
        >
          <Ionicons name="close-circle" size={22} color="#047857" />
        </PressScale>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      {!open ? (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Have a coupon?"
          onPress={() => setOpen(true)}
          containerStyle={{ alignSelf: "flex-start" }}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}
        >
          <Ionicons name="pricetag-outline" size={16} color={palette.crimson} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.crimson }}>Have a coupon?</Text>
        </PressScale>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            accessibilityLabel="Coupon code"
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
              if (error) setError("");
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="COUPON CODE"
            placeholderTextColor="#9AA5B1"
            onSubmitEditing={() => void apply(code)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#D9CFC6",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 11,
              fontSize: 15,
              letterSpacing: 1.5,
              color: palette.ink,
              fontFamily: fonts.bodySemi,
              backgroundColor: "#FFFFFF",
            }}
          />
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Apply coupon"
            onPress={() => void apply(code)}
            disabled={busy || code.length < 3}
            style={{
              backgroundColor: palette.ink,
              borderRadius: radius.pill,
              paddingHorizontal: 18,
              paddingVertical: 12,
              opacity: busy || code.length < 3 ? 0.5 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>Apply</Text>
            )}
          </PressScale>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>
          {error}
        </Text>
      )}
      {!!note && (
        <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>{note}</Text>
      )}
    </View>
  );
}
