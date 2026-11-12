import { useState } from "react";
import { Pressable, ScrollView, Text, View, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { fonts, palette, radius, typeScale } from "../../../theme";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

type FaqItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  question: string;
  answer: string;
};

const FAQS: FaqItem[] = [
  {
    id: "otp",
    icon: "key-outline",
    question: "I did not receive an OTP. What should I do?",
    answer:
      "Wait 2 minutes and check your spam folder. If it still has not arrived, email us with your mobile number and we will send it manually.",
  },
  {
    id: "payment-not-active",
    icon: "card-outline",
    question: "My payment went through but my plan is not active?",
    answer:
      "Wait 5 minutes — Plus, Pro, Boosts and Super Likes are added automatically once Razorpay confirms the payment. If it is still not active after 30 minutes, email us with your Razorpay Payment ID (starts with pay_) and we will verify and activate it right away.",
  },
  {
    id: "refund",
    icon: "cash-outline",
    question: "How do I get a refund?",
    answer:
      "Email us within 7 days with your Order ID. See the full policy at apnajoda.com/refund. Approved refunds are returned to the original payment method in 5–7 working days.",
  },
  {
    id: "verification",
    icon: "shield-checkmark-outline",
    question: "How long does selfie verification take?",
    answer:
      "24–48 hours. Your profile shows as verified as soon as it is approved, and with Pro you also get the blue tick. If it is not approved, take a new pose selfie and try again.",
  },
  {
    id: "harassment",
    icon: "warning-outline",
    question: "Someone harassed me. What should I do?",
    answer:
      "In chat, long-press the message and choose Report. You can also go to Settings → Safety & Privacy → Report. Our team acts within 24 hours. For urgent safety issues, block the person immediately from the app.",
  },
  {
    id: "delete",
    icon: "trash-outline",
    question: "How do I delete my account?",
    answer:
      "Go to Settings → Danger Zone → Delete Account Permanently. There is a 30-day grace period — sign in again before then to restore it. After that your account, photos and matches are permanently deleted. Payment records are kept for 8 years as Indian tax law requires.",
  },
  {
    id: "grievance",
    icon: "document-text-outline",
    question: "How do I raise a complaint with the Grievance Officer?",
    answer:
      "Email our Grievance Officer, Nafees Ahmad, at nafeesahadbly@gmail.com with your username, who or what you are reporting, and what happened. We acknowledge within 24 hours and resolve within 15 days. Photos showing someone in a sexual or intimate way, or someone pretending to be you, are acted on within 24 hours.",
  },
  {
    id: "other",
    icon: "help-circle-outline",
    question: "I have a different problem.",
    answer:
      "Tap 'Email us' below and a pre-filled email will open. We reply within 24 hours.",
  },
];

export function SupportScreen({ onBack }: { onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  const openEmail = () => {
    const to = "nafeesahadbly@gmail.com";
    const subject = encodeURIComponent("Apnajoda Support");
    const body = encodeURIComponent(
      "Hi Apnajoda team,\n\nI need help with:\n\n[Describe your issue here]\n\nApp version: 1.0.0\nMy username: [your username]\nMy mobile number: [your mobile number]",
    );

    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`;

    // Open Gmail web compose in a new tab (works on desktop and mobile browsers).
    if (typeof window !== "undefined") {
      window.open(gmailUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Native fallback (native builds): hand off to the system.
    void Linking.openURL(gmailUrl).catch(() => undefined);
  };

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 60,
            paddingHorizontal: 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              backgroundColor: palette.paper,
              borderRadius: radius.xl,
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={12}
                onPress={onBack}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: palette.paperSand,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="arrow-back" size={18} color={palette.ink} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.title,
                    color: palette.ink,
                  }}
                >
                  Support
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: palette.slate,
                    marginTop: 2,
                  }}
                >
                  We reply within 24 hours
                </Text>
              </View>
            </View>

            {/* Hero card */}
            <View
              style={{
                backgroundColor: palette.paperSand,
                borderRadius: radius.lg,
                padding: 18,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: palette.paper,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={22}
                  color={palette.navy}
                />
              </View>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.section,
                  color: palette.ink,
                  marginBottom: 6,
                }}
              >
                How can we help?
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: palette.slate,
                  lineHeight: 19,
                }}
              >
                Common questions are answered below. If your issue isn't listed,
                email us — we read every message.
              </Text>
            </View>

            {/* FAQ list */}
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: typeScale.section,
                color: palette.ink,
                marginBottom: 10,
              }}
            >
              Common questions
            </Text>

            <View style={{ gap: 8 }}>
              {FAQS.map((faq) => {
                const open = openId === faq.id;
                return (
                  <View
                    key={faq.id}
                    style={{
                      backgroundColor: palette.paperSand,
                      borderRadius: radius.lg,
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      onPress={() => toggle(faq.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      accessibilityLabel={faq.question}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: palette.paper,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name={faq.icon}
                          size={16}
                          color={palette.navy}
                        />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: fonts.bodyMedium,
                          fontSize: 14,
                          color: palette.ink,
                          lineHeight: 20,
                        }}
                      >
                        {faq.question}
                      </Text>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={palette.slate}
                      />
                    </Pressable>

                    {open && (
                      <View
                        style={{
                          paddingHorizontal: 14,
                          paddingBottom: 14,
                          paddingLeft: 58,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            color: palette.slate,
                            lineHeight: 19,
                          }}
                        >
                          {faq.answer}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Contact */}
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: typeScale.section,
                color: palette.ink,
                marginTop: 28,
                marginBottom: 10,
              }}
            >
              Still need help?
            </Text>

            <Pressable
              onPress={openEmail}
              accessibilityRole="button"
              accessibilityLabel="Email Apnajoda support"
              style={{
                backgroundColor: palette.navy,
                borderRadius: radius.pill,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: fonts.bodySemi,
                  fontSize: 15,
                }}
              >
                Email us
              </Text>
            </Pressable>

            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: palette.slate,
                textAlign: "center",
                marginTop: 12,
                lineHeight: 18,
              }}
            >
              nafeesahadbly@gmail.com · We reply within 24 hours
            </Text>

            {/* Legal */}
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: typeScale.section,
                color: palette.ink,
                marginTop: 28,
                marginBottom: 10,
              }}
            >
              Legal
            </Text>

            <View style={{ gap: 8 }}>
              {[
                {
                  icon: "shield-checkmark-outline" as const,
                  label: "Privacy Policy",
                  url: "https://apnajoda.com/privacy.html",
                },
                {
                  icon: "document-text-outline" as const,
                  label: "Terms of Service",
                  url: "https://apnajoda.com/terms.html",
                },
                {
                  icon: "cash-outline" as const,
                  label: "Refund Policy",
                  url: "https://apnajoda.com/refund.html",
                },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => void Linking.openURL(item.url)}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.paperSand,
                    borderRadius: radius.lg,
                    padding: 14,
                    gap: 12,
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={palette.navy} />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: fonts.bodyMedium,
                      fontSize: 14,
                      color: palette.ink,
                    }}
                  >
                    {item.label}
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={palette.slate}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}
