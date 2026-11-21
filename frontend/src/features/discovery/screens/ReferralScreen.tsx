import { useEffect, useState } from "react";
import { View, ScrollView, Text, Pressable, Share, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../../../theme";
import { referralApi } from "../../../api/referralApi";
import type { Screen } from "../../../app/navigation/types";

export function ReferralScreen({
  accessToken,
  navigate,
}: {
  accessToken: string;
  navigate: (s: Screen) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [summ, link] = await Promise.all([
          referralApi.getSummary(accessToken),
          referralApi.getInviteLink(accessToken),
        ]);
        setSummary(summ);
        setInviteLink(link.link);
      } catch (err) {
        console.error("Failed to load referral data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken]);

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `अपनाजोड़ा पर मेरे साथ जुड़ें! 💕\n\nअपनाजोड़ा - भारतीय डेटिंग ऐप\n\n${inviteLink}`,
        title: "अपनाजोड़ा",
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={() => navigate("Home" as Screen)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Text style={[fonts.heading, { marginTop: 16, marginBottom: 24 }]}>
          दोस्तों को आमंत्रित करें
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[fonts.heading, { textAlign: "center" }]}>
              {summary?.joined || 0}
            </Text>
            <Text style={[fonts.caption, { color: colors.muted, textAlign: "center" }]}>
              शामिल हुए
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[fonts.heading, { textAlign: "center", color: colors.accent }]}>
              {summary?.boostsEarned || 0}
            </Text>
            <Text style={[fonts.caption, { color: colors.muted, textAlign: "center" }]}>
              Boosts कमाए
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[fonts.heading, { textAlign: "center" }]}>
              {summary?.pending || 0}
            </Text>
            <Text style={[fonts.caption, { color: colors.muted, textAlign: "center" }]}>
              इंतजार में
            </Text>
          </View>
        </View>

        {/* Cap Info */}
        {summary && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.accent} />
            <Text style={[fonts.caption, { flex: 1, color: colors.muted, marginLeft: 8 }]}>
              महीने में सर्वाधिक {summary.monthlyCap} दोस्तों को आमंत्रित कर सकते हैं
            </Text>
          </View>
        )}

        {/* How It Works */}
        <View style={{ marginTop: 32, gap: 16 }}>
          <Text style={[fonts.label, { marginBottom: 8 }]}>यह कैसे काम करता है</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={[fonts.body, { color: colors.buttonText, fontWeight: "bold" }]}>1</Text>
            </View>
            <Text style={fonts.body}>अपने लिंक से दोस्तों को आमंत्रित करें</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={[fonts.body, { color: colors.buttonText, fontWeight: "bold" }]}>2</Text>
            </View>
            <Text style={fonts.body}>जब वे साइन अप करते हैं, तो आप अंक पाते हैं</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={[fonts.body, { color: colors.buttonText, fontWeight: "bold" }]}>3</Text>
            </View>
            <Text style={fonts.body}>Free Boosts पाएं और डेक के शीर्ष पर जाएं</Text>
          </View>
        </View>

        {/* Share Button */}
        <Pressable
          style={styles.button}
          onPress={handleShare}
        >
          <Ionicons name="share-social" size={20} color={colors.buttonText} style={{ marginRight: 8 }} />
          <Text style={[fonts.buttonText, { color: colors.buttonText }]}>
            शेयर करें
          </Text>
        </Pressable>

        {/* Copy Link */}
        <Pressable
          style={[styles.button, { backgroundColor: colors.secondary, marginTop: 12 }]}
          onPress={() => {
            // Copy to clipboard
            console.log("Copy:", inviteLink);
          }}
        >
          <Ionicons name="copy" size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[fonts.buttonText, { color: colors.text }]}>
            लिंक कॉपी करें
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  statsContainer: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    backgroundColor: colors.card,
  },
  infoBox: {
    flexDirection: "row" as const,
    padding: 12,
    backgroundColor: colors.secondary,
    borderRadius: radius.small,
    alignItems: "center",
    marginBottom: 24,
  },
  step: {
    flexDirection: "row" as const,
    gap: 12,
    alignItems: "center",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.small,
    padding: 14,
    flexDirection: "row" as const,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
};
