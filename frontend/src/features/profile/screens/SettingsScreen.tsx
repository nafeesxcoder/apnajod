import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";

const GOLD = "#8A6722";
// const RUBY = "#8A1B35";
const LINE = "#E2D9CB";
const PAPER = "#F8F3E9";
const DANGER = "#B00020";

export function SettingsScreen({
  navigate,
  isPrivate,
  onPrivacyChange,
  onLogout,
  onDeactivate,
  onDeletePermanently,
}: {
  navigate: (screen: any) => void;
  isPrivate: boolean;
  onPrivacyChange: (next: boolean) => Promise<void>;
  onLogout: () => void;
  onDeactivate: () => void;
  onDeletePermanently: () => void;
}) {
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const Row = ({
    icon,
    label,
    onPress,
    danger = false,
    isLast = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    danger?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F0EAE0",
      }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={danger ? DANGER : GOLD}
        style={{ marginRight: 16 }}
      />
      <Text
        style={{
          flex: 1,
          fontSize: 16,
          fontWeight: "500",
          color: danger ? DANGER : "#1A1416",
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        color: "#635A5D",
        letterSpacing: 1,
        textTransform: "uppercase",
        marginLeft: 24,
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {title}
    </Text>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LINE,
        marginHorizontal: 20,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );

  return (
    <AppCanvas>
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: LINE,
          }}
        >
          <TouchableOpacity
            onPress={() => navigate("profile")}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1416" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#1A1416" }}>
            Settings
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* App Info */}
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: GOLD,
                letterSpacing: 1,
              }}
            >
              APNAJOD
            </Text>
            <Text style={{ fontSize: 12, color: "#635A5D", marginTop: 4 }}>
              Version 1.0.0
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#635A5D",
                fontStyle: "italic",
                marginTop: 4,
              }}
            >
              Meaningful connections. Meaningful futures.
            </Text>
          </View>

          {/* Section: Account */}
          <SectionHeader title="Account" />
          <Card>
            <Row
              icon="person-outline"
              label="Edit Profile"
              onPress={() => navigate("profileSetup")}
            />
            <Row
              icon="shield-checkmark-outline"
              label="Trust Hub & Verification"
              onPress={() => navigate("verifyHub")}
            />
            <Row
              icon="options-outline"
              label="Match Filters & Preferences"
              onPress={() => navigate("discovery")}
              isLast
            />
          </Card>

          {/* Section: Discover */}
          <SectionHeader title="Discover" />
          <Card>
            <Row
              icon="heart-outline"
              label="Who Chose You"
              onPress={() => navigate("likes")}
            />
            <Row
              icon="search-outline"
              label="Find Someone"
              onPress={() => navigate("find")}
              isLast
            />
          </Card>

          {/* Section: Privacy & Safety */}
          <SectionHeader title="Privacy & Safety" />
          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F0EAE0",
              }}
            >
              <Ionicons
                name={isPrivate ? "lock-closed-outline" : "lock-open-outline"}
                size={22}
                color={GOLD}
                style={{ marginRight: 16 }}
              />
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "500", color: "#1A1416" }}>
                  Private account
                </Text>
                <Text style={{ fontSize: 12, color: "#635A5D", marginTop: 3 }}>
                  {isPrivate
                    ? "Nobody can find you by username. You still appear to people browsing."
                    : "Anyone can find you by searching your username."}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Private account"
                value={isPrivate}
                disabled={savingPrivacy}
                onValueChange={async (next) => {
                  setSavingPrivacy(true);
                  try {
                    await onPrivacyChange(next);
                  } finally {
                    setSavingPrivacy(false);
                  }
                }}
                trackColor={{ false: "#E2D9CB", true: "#C9A227" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Row
              icon="shield-outline"
              label="Safety & Privacy"
              onPress={() => navigate("safety")}
              isLast
            />
          </Card>

          {/* Section: Danger Zone */}
          <SectionHeader title="Danger Zone" />
          <Card>
            <Row
              icon="log-out-outline"
              label="Log out"
              onPress={onLogout}
              danger
            />
            <Row
              icon="pause-circle-outline"
              label="Deactivate Account"
              onPress={onDeactivate}
              danger
            />
            <Row
              icon="trash-outline"
              label="Delete Account Permanently"
              onPress={onDeletePermanently}
              danger
              isLast
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}
