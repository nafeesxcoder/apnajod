import { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppCanvas } from "../../../components/AppCanvas";
import { fonts, palette, radius, typeScale } from "../../../theme";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

export function SettingsScreen({
  navigate,
  isPrivate,
  onPrivacyChange,
  onLogout,
  onDeactivate,
  onDeletePermanently,
  onOpenAdmin,
}: {
  navigate: (screen: any) => void;
  isPrivate: boolean;
  onPrivacyChange: (next: boolean) => Promise<void>;
  onLogout: () => void;
  onDeactivate: () => void;
  onDeletePermanently: () => void;
  /** Only passed for admin accounts; everyone else never sees the entry. */
  onOpenAdmin?: () => void;
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
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: palette.rule,
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? palette.clay : palette.navy}
        style={{ marginRight: 14 }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.bodyMedium,
          fontSize: 15,
          color: danger ? palette.clay : palette.ink,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={palette.slate} />
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text
      style={{
        fontFamily: fonts.display,
        fontSize: typeScale.section,
        color: palette.ink,
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      {title}
    </Text>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View
      style={{
        backgroundColor: palette.paper,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.rule,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );

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
                onPress={() => navigate("profile")}
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
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: typeScale.title,
                  color: palette.ink,
                }}
              >
                Settings
              </Text>
            </View>

            {/* App Info */}
            <View style={{ alignItems: "center", paddingBottom: 24 }}>
              <Image
                source={require("../../../../assets/apnajoda-mark.png")}
                style={{ width: 84, height: 84 }}
                resizeMode="contain"
                accessibilityLabel="Apnajoda"
              />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: palette.slate,
                  marginTop: 4,
                }}
              >
                Version 1.0.0
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: palette.slate,
                  fontStyle: "italic",
                  marginTop: 4,
                }}
              >
                Meaningful connections. Meaningful futures.
              </Text>
            </View>

            {onOpenAdmin && (
              <>
                <SectionHeader title="Admin" />
                <Card>
                  <Row
                    icon="shield-checkmark-outline"
                    label="Admin Panel"
                    onPress={onOpenAdmin}
                    isLast
                  />
                </Card>
              </>
            )}

            {/* Account */}
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

            {/* Discover */}
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

            {/* Privacy & Safety */}
            <SectionHeader title="Privacy & Safety" />
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.rule,
                }}
              >
                <Ionicons
                  name={isPrivate ? "lock-closed-outline" : "lock-open-outline"}
                  size={20}
                  color={palette.navy}
                  style={{ marginRight: 14 }}
                />
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 15,
                      color: palette.ink,
                    }}
                  >
                    Private account
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 12,
                      color: palette.slate,
                      marginTop: 3,
                    }}
                  >
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
                  trackColor={{ false: palette.rule, true: palette.crimson }}
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

            {/* Support — single link */}
            <SectionHeader title="Support" />
            <Card>
              <Row
                icon="help-circle-outline"
                label="Help & Support"
                onPress={() => navigate("support")}
                isLast
              />
            </Card>

            {/* Danger Zone */}
            <SectionHeader title="Danger zone" />
            <Card>
              <Row
                icon="log-out-outline"
                label="Log out"
                onPress={onLogout}
                danger
              />
              <Row
                icon="pause-circle-outline"
                label="Deactivate account"
                onPress={onDeactivate}
                danger
              />
              <Row
                icon="trash-outline"
                label="Delete account permanently"
                onPress={onDeletePermanently}
                danger
                isLast
              />
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppCanvas>
  );
}
