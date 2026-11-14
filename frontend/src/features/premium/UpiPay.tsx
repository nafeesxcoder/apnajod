/**
 * Pay by UPI while the payment gateway waits on KYC.
 *
 * The member pays our UPI ID from any app - scanning the QR (from another
 * phone, or saved and picked from the gallery in the UPI app) or by typing
 * the UPI ID - then sends the 12 digit UTR. An admin checks the bank app
 * and approves it; the plan turns on then. Nothing here grants anything by
 * itself.
 *
 * No "open UPI app" link: UPI apps decline a link with the amount filled in
 * when it pays a personal UPI ID ("declined for security reasons"). It
 * comes back once we have a merchant UPI ID.
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { cleanUtr, UPI_STATUS_LABEL, utrValid } from "./upiLink";

const QR = require("../../../assets/upi-qr.jpg");
const QR_WIDTH = 220;
const QR_RATIO = 770 / 640;

const canDownload = Platform.OS === "web" && typeof document !== "undefined";

/** Saves the QR as a photo, to pick from the gallery in the UPI app. */
async function downloadQr() {
  const src = typeof QR === "string" ? QR : (QR?.uri ?? QR?.default ?? "");
  if (!src) return false;
  const blob = await (await fetch(src)).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "apnajoda-upi-qr.jpg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

/** One of the two ways to pay: a heading and a line on how. */
function Way({ icon, title, hint }: { icon: "qr-code-outline" | "at"; title: string; hint: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={palette.crimson} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{title}</Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.slate }}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

const wayBox = {
  marginTop: 12,
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#EADDD2",
  padding: 14,
} as const;

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
  const [saved, setSaved] = useState(false);
  const amount = rupees(plan.amount_paise);

  const saveQr = async () => {
    try {
      if (await downloadQr()) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Could not save the QR. Take a screenshot instead.");
    }
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
    <View accessibilityLabel={`Pay ${amount} by UPI`}>
      <Step n={1} text={`Pay exactly ${amount}, either way`} />

      {/* Way 1: the QR - from another phone, or saved and picked from the gallery. */}
      <View style={wayBox}>
        <Way
          icon="qr-code-outline"
          title="Scan the QR"
          hint="Scan it from another phone. On this phone: save it, then in your UPI app tap Scan and pick it from the gallery."
        />
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <Image
            accessibilityLabel="UPI QR code"
            source={QR}
            style={{ width: QR_WIDTH, height: QR_WIDTH * QR_RATIO, borderRadius: 12 }}
            resizeMode="contain"
          />
        </View>
        {canDownload ? (
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Download QR"
            onPress={() => void saveQr()}
            containerStyle={{ marginTop: 12 }}
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: palette.crimson,
              borderRadius: radius.pill,
              paddingVertical: 11,
            }}
          >
            <Ionicons name={saved ? "checkmark" : "download-outline"} size={17} color={palette.crimson} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.crimson }}>
              {saved ? "QR saved" : "Download QR"}
            </Text>
          </PressScale>
        ) : (
          <Text style={{ marginTop: 10, textAlign: "center", fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
            Take a screenshot to save it.
          </Text>
        )}
      </View>

      <Text style={{ marginTop: 10, textAlign: "center", fontFamily: fonts.bodySemi, fontSize: 12, color: palette.slate }}>
        OR
      </Text>

      {/* Way 2: type the UPI ID into the UPI app. */}
      <View style={wayBox}>
        <Way
          icon="at"
          title="Pay to the UPI ID"
          hint={`Open your UPI app, choose Pay to UPI ID (To Mobile / UPI ID), paste this ID and enter ${amount}.`}
        />
        <Text
          selectable
          style={{
            marginTop: 12,
            textAlign: "center",
            fontFamily: fonts.bodySemi,
            fontSize: 18,
            letterSpacing: 0.3,
            color: palette.ink,
            backgroundColor: palette.paperBase,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 10,
          }}
        >
          {upi.upiId}
        </Text>
        {Platform.OS === "web" && (
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Copy UPI ID"
            onPress={() => void copyId()}
            containerStyle={{ marginTop: 10 }}
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: copied ? palette.emerald : palette.ink,
              borderRadius: radius.pill,
              paddingVertical: 12,
            }}
          >
            <Ionicons name={copied ? "checkmark" : "copy-outline"} size={17} color="#FFFFFF" />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: "#FFFFFF" }}>
              {copied ? "UPI ID copied" : "Copy UPI ID"}
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

/**
 * The UPI payment opens from the plan's Pay button, in its own window -
 * the plan list stays a list of plans.
 */
export function UpiPaySheet({
  visible,
  onClose,
  plan,
  upi,
  accessToken,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  plan: BillingPlan;
  upi: PayOptions["upi"];
  accessToken: string;
  onSent: (payment: UpiPayment) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        />
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            maxHeight: "100%",
            backgroundColor: palette.paper,
            borderRadius: 22,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#EFE6DE",
            }}
          >
            <Ionicons name="qr-code-outline" size={20} color={palette.crimson} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: palette.ink }}>
                Pay {rupees(plan.amount_paise)} by UPI
              </Text>
              <Text style={{ marginTop: 2, color: palette.slate, fontFamily: fonts.body, fontSize: 12 }}>
                {plan.title} · Google Pay, PhonePe, Paytm or any UPI app
              </Text>
            </View>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel="Close UPI payment"
              hitSlop={10}
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: palette.paperBase,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={palette.ink} />
            </PressScale>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }}
          >
            <UpiPay key={plan.code} plan={plan} upi={upi} accessToken={accessToken} onSent={onSent} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
