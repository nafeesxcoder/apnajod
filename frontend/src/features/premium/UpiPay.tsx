/**
 * Pay by UPI while the payment gateway waits on KYC.
 *
 * The member pays our UPI ID from any app (scan the QR, or tap to open the
 * UPI app on a phone), then sends the 12 digit UTR. An admin checks the
 * bank app and approves it; the plan turns on then. Nothing here grants
 * anything by itself.
 */
import { useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  type BillingPlan,
  type PayOptions,
  type UpiPayment,
  billingApi,
  rupees,
} from "../../api/billingApi";
import { fonts, palette, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { cleanUtr, UPI_STATUS_LABEL, upiLink, utrValid } from "./upiLink";

const QR = require("../../../assets/upi-qr.jpg");
const QR_WIDTH = 220;
const QR_RATIO = 770 / 640;

/** A phone, where a upi:// link opens the payment apps. */
function onPhone() {
  if (Platform.OS !== "web") return true;
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 14 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: palette.crimson,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodySemi, fontSize: 12 }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, color: palette.ink, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

export function UpiPay({
  plan,
  upi,
  accessToken,
  onSent,
}: {
  plan: BillingPlan;
  upi: PayOptions["upi"];
  accessToken: string;
  onSent: (payment: UpiPayment) => void;
}) {
  const [utr, setUtr] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const amount = rupees(plan.amount_paise);

  const openApp = () => {
    const link = upiLink({
      upiId: upi.upiId,
      payeeName: upi.payeeName,
      amountPaise: plan.amount_paise,
      note: `Apnajoda ${plan.title}`,
    });
    Linking.openURL(link).catch(() =>
      setError("No UPI app opened. Scan the QR or pay to the UPI ID instead."),
    );
  };

  const copyId = async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(upi.upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The ID is selectable text as well.
    }
  };

  const send = async () => {
    if (!utrValid(utr) || sending) {
      setError("Enter the 12 digit UTR / UPI Ref No. from your payment app.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const payment = await billingApi.submitUpi(accessToken, plan.code, utr);
      setUtr("");
      onSent(payment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View
      accessibilityLabel={`Pay ${amount} by UPI`}
      style={{
        marginTop: 18,
        backgroundColor: palette.paper,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#EADDD2",
        padding: 18,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="qr-code-outline" size={20} color={palette.crimson} />
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: palette.ink }}>
          Pay {amount} by UPI
        </Text>
      </View>
      <Text style={{ marginTop: 4, color: palette.slate, fontFamily: fonts.body, fontSize: 13 }}>
        {plan.title} · Google Pay, PhonePe, Paytm or any UPI app
      </Text>

      <Step n={1} text={`Pay exactly ${amount} to this UPI`} />
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <Image
          accessibilityLabel="UPI QR code"
          source={QR}
          style={{ width: QR_WIDTH, height: QR_WIDTH * QR_RATIO, borderRadius: 12 }}
          resizeMode="contain"
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            backgroundColor: palette.paperBase,
            borderRadius: radius.pill,
            paddingLeft: 14,
            paddingRight: 6,
            paddingVertical: 6,
          }}
        >
          <Text selectable style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
            {upi.upiId}
          </Text>
          {Platform.OS === "web" && (
            <PressScale
              accessibilityRole="button"
              accessibilityLabel="Copy UPI ID"
              onPress={() => void copyId()}
              style={{
                backgroundColor: palette.paper,
                borderRadius: radius.pill,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.crimson }}>
                {copied ? "Copied" : "Copy"}
              </Text>
            </PressScale>
          )}
        </View>
        {onPhone() && (
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Open UPI app"
            onPress={openApp}
            containerStyle={{ marginTop: 12, alignSelf: "stretch" }}
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: palette.crimson,
              borderRadius: radius.pill,
              paddingVertical: 12,
            }}
          >
            <Ionicons name="open-outline" size={17} color={palette.crimson} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.crimson }}>
              Open UPI app
            </Text>
          </PressScale>
        )}
      </View>

      <Step n={2} text="Copy the 12 digit UTR from the payment details" />
      <Text style={{ marginTop: 4, marginLeft: 32, color: palette.slate, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }}>
        PhonePe: UTR · Google Pay: UPI transaction ID · Paytm: UPI Ref No.
      </Text>

      <Step n={3} text="Paste it here and send" />
      <TextInput
        accessibilityLabel="UTR number"
        value={utr}
        onChangeText={(text) => {
          setUtr(cleanUtr(text));
          if (error) setError("");
        }}
        placeholder="12 digit UTR"
        placeholderTextColor="#9AA5B1"
        keyboardType="number-pad"
        inputMode="numeric"
        style={{
          marginTop: 10,
          borderWidth: 1,
          borderColor: "#D9CFC6",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 17,
          letterSpacing: 1.5,
          color: palette.ink,
          fontFamily: fonts.bodySemi,
          backgroundColor: "#FFFFFF",
        }}
      />

      {!!error && (
        <Text accessibilityRole="alert" style={{ marginTop: 10, color: palette.crimson, fontFamily: fonts.body, fontSize: 13 }}>
          {error}
        </Text>
      )}

      <PressScale
        accessibilityRole="button"
        accessibilityLabel="Send for approval"
        onPress={() => void send()}
        disabled={sending}
        containerStyle={{ marginTop: 14 }}
        style={{
          backgroundColor: palette.crimson,
          borderRadius: radius.pill,
          paddingVertical: 15,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          minHeight: 50,
          opacity: utrValid(utr) && !sending ? 1 : 0.55,
        }}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="send" size={16} color="#FFFFFF" />
        )}
        <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodySemi, fontSize: 16 }}>
          {sending ? "Sending..." : "Send for approval"}
        </Text>
      </PressScale>

      <Text style={{ marginTop: 12, color: palette.slate, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, textAlign: "center" }}>
        We check every payment by hand. {plan.title} turns on within {upi.approvalHours} hours,
        usually much sooner, and you get a notification.
      </Text>
    </View>
  );
}

/** The member's recent UPI payments and where each one stands. */
export function UpiPayments({ payments, approvalHours }: { payments: UpiPayment[]; approvalHours: number }) {
  if (payments.length === 0) return null;
  return (
    <View
      style={{
        backgroundColor: palette.paper,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Your UPI payments</Text>
      {payments.map((payment) => {
        const color =
          payment.status === "approved" ? palette.emerald : payment.status === "rejected" ? palette.crimson : "#B45309";
        return (
          <View key={payment.id} style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: palette.ink }}>
                {rupees(payment.amountPaise)} · {payment.planTitle} · UTR {payment.utr}
              </Text>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color }}>
                {UPI_STATUS_LABEL[payment.status]}
              </Text>
            </View>
            {payment.status === "pending" && (
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
                We are checking it. It turns on within {approvalHours} hours.
              </Text>
            )}
            {payment.status === "rejected" && !!payment.note && (
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
                {payment.note} Wrong UTR? Write to us from Help.
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
