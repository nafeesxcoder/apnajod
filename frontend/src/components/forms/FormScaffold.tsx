import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StepBar, shared } from "../../components";
import { ReferenceIconTile } from "../premium/PremiumIcon";
import { colors } from "../../theme";
import { styles } from "../../theme/appStyles";

type FormPageProps = {
  children: React.ReactNode;
  back?: () => void;
  step?: number;
  scroll?: boolean;
};

export function FormPage({
  children,
  back,
  step,
  scroll: _scroll,
}: FormPageProps) {
  void _scroll;
  const inner = (
    <View style={[shared.content, formPageStyles.content]}>
      {(back || step) && (
        <View style={{ gap: 18 }}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={back}
              style={styles.backButton}
            >
              <ReferenceIconTile
                name="arrow-back"
                orbSize={30}
                iconSize={14}
                tilePadding={10}
              />
            </Pressable>
          ) : (
            <View style={{ height: 42 }} />
          )}
          {step && <StepBar step={step} total={6} />}
        </View>
      )}
      {children}
    </View>
  );

  return (
    <View
      style={{ flex: 1, overflow: "hidden", backgroundColor: "transparent" }}
    >
      <SafeAreaView style={shared.safe}>
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          style={formPageStyles.keyboard}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            // On web, react-native-web's "on-drag" closes the keyboard on ANY
            // scroll event, including the browser's own scroll-into-view when
            // a field is focused. That made the keyboard close before it even
            // opened and kicked the page down, so fields couldn't be tapped.
            keyboardDismissMode={
              Platform.OS === "web"
                ? "none"
                : Platform.OS === "ios"
                  ? "interactive"
                  : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={formPageStyles.scrollContent}
          >
            {inner}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentActive]}
    >
      <Text
        style={[styles.segmentText, active && { color: colors.textInverse }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const formPageStyles = StyleSheet.create({
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 34 },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingBottom: 28,
  },
});
