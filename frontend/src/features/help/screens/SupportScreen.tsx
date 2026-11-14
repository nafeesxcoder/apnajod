import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { LinearGradient } from "expo-linear-gradient";
import { AppCanvas } from "../../../components/AppCanvas";
import { brand, cardShadow, whiteCard } from "../../../components/brand";
import { GlowPulse, PressScale, Reveal } from "../../../components/motion";
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

    // The website: Gmail's compose in a new tab (works on desktop and mobile browsers).
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.open === "function") {
      window.open(gmailUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // The phone app: the phone's own email app. (React Native has a
    // "window" but no window.open, so the web path used to crash here.)
    void Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`).catch(() =>
      Linking.openURL(gmailUrl).catch(() => undefined),
    );
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
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 12,
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
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={8}
                onPress={onBack}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: palette.paper,
                  justifyContent: "center",
                  alignItems: "center",
                  ...cardShadow,
                }}
              >
                <Ionicons name="arrow-back" size={20} color={palette.ink} />
              </PressScale>
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

            {/* Hero: the navy card of this screen, with the way to reach us */}
            <Reveal>
              <LinearGradient
                colors={brand.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, padding: 20, marginBottom: 24 }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(255,255,255,0.14)",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="chatbubbles-outline" size={22} color={brand.onHero} />
                </View>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.section,
                    color: brand.onHero,
                    marginBottom: 6,
                  }}
                >
                  How can we help?
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: brand.onHeroSoft,
                    lineHeight: 19,
                    marginBottom: 16,
                  }}
                >
                  Common questions are answered below. If your issue isn't listed,
                  email us - we read every message and reply within 24 hours.
                </Text>
                <PressScale
                  onPress={openEmail}
                  accessibilityRole="button"
                  accessibilityLabel="Email Apnajoda support"
                  containerStyle={{ alignSelf: "flex-start" }}
                  style={{
                    backgroundColor: palette.crimson,
                    borderRadius: radius.pill,
                    minHeight: 46,
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <GlowPulse color={palette.crimson} radius={radius.pill} spread={1.12} />
                  <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodySemi, fontSize: 15 }}>Email us</Text>
                </PressScale>
              </LinearGradient>
            </Reveal>

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

            <View style={{ gap: 10 }}>
              {FAQS.map((faq, index) => {
                const open = openId === faq.id;
                return (
                  <Reveal
                    key={faq.id}
                    delay={60 + Math.min(index, 8) * 50}
                    style={{
                      ...whiteCard,
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
                        minHeight: 56,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: brand.pillBg,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name={faq.icon}
                          size={17}
                          color={palette.crimson}
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
                        color={open ? palette.crimson : palette.slate}
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
                  </Reveal>
                );
              })}
            </View>

            {/* Contact */}
            <Reveal delay={200} style={{ ...whiteCard, marginTop: 24, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: brand.pillBg,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="mail-outline" size={17} color={palette.crimson} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>Still need help?</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate, marginTop: 2 }}>
                  nafeesahadbly@gmail.com · We reply within 24 hours
                </Text>
              </View>
              <PressScale
                onPress={openEmail}
                accessibilityRole="button"
                accessibilityLabel="Email us"
                style={{
                  minHeight: 40,
                  paddingHorizontal: 16,
                  borderRadius: radius.pill,
                  backgroundColor: palette.crimson,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: "#FFFFFF" }}>Email</Text>
              </PressScale>
            </Reveal>

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

            <Reveal delay={260} style={{ ...whiteCard, overflow: "hidden" }}>
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
                {
                  icon: "pricetag-outline" as const,
                  label: "Pricing",
                  url: "https://apnajoda.com/pricing.html",
                },
                {
                  icon: "flash-outline" as const,
                  label: "Shipping & Delivery",
                  url: "https://apnajoda.com/shipping.html",
                },
                {
                  icon: "mail-outline" as const,
                  label: "Contact Us",
                  url: "https://apnajoda.com/contact.html",
                },
              ].map((item, index, all) => (
                <PressScale
                  key={item.label}
                  onPress={() => void Linking.openURL(item.url)}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  scaleTo={0.985}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    minHeight: 52,
                    gap: 12,
                    borderBottomWidth: index === all.length - 1 ? 0 : 1,
                    borderBottomColor: palette.rule,
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={palette.crimson} />
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
                </PressScale>
              ))}
            </Reveal>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}
