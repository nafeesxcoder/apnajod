import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ReferenceIconTile } from "../../../components/premium/PremiumIcon";
import {
  buildIntentPassport,
  type IntentPassportInput,
} from "../../../domain/intentPassport";
import { colors, fonts, palette, radius, typeScale } from "../../../theme";
import { LinearGradient } from "expo-linear-gradient";
import { brand, whiteCard } from "../../../components/brand";

export function IntentPassportCard({
  input,
  compact = false,
  onEdit,
}: {
  input: IntentPassportInput;
  compact?: boolean;
  onEdit: () => void;
}) {
  const passport = buildIntentPassport(input);
  const visibleFields = compact ? passport.fields.slice(0, 3) : passport.fields;

  return (
    <View style={{ ...whiteCard, overflow: "hidden", marginBottom: 16 }}>
      {/* The navy-to-crimson bar that marks an information card. */}
      <LinearGradient colors={brand.barGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5 }} />
      <View style={{ padding: compact ? 18 : 22 }}>
      {/* Header: icon + summary in sentence case, edit affordance */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <ReferenceIconTile
          name="finger-print"
          orbSize={compact ? 42 : 48}
          iconSize={compact ? 18 : 20}
          tilePadding={compact ? 18 : 20}
        />
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: typeScale.section,
              color: colors.text,
            }}
          >
            Your intent
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: typeScale.label,
              color: colors.muted,
              marginTop: 2,
            }}
          >
            {passport.summary}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit Intent Passport"
          onPress={onEdit}
          hitSlop={8}
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.pill,
            backgroundColor: palette.paperSand,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="create-outline" size={17} color={palette.navy} />
        </Pressable>
      </View>

      {/* Fields: one column of rows, separated by a single rule line — not three cards */}
      <View>
        {visibleFields.map((field, i) => (
          <View
            key={field.id}
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              paddingVertical: 10,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: palette.rule,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: typeScale.label,
                color: colors.muted,
                width: 110,
              }}
            >
              {field.label}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                fontFamily: field.complete ? fonts.bodySemi : fonts.bodyMedium,
                fontSize: typeScale.body,
                // Answers alternate navy and crimson, the card's two colours.
                color: field.complete ? (i % 2 ? palette.crimson : palette.navy) : colors.muted,
                fontStyle: field.complete ? "normal" : "italic",
              }}
            >
              {field.value}
            </Text>
          </View>
        ))}
      </View>

      {compact && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: palette.rule,
          }}
        >
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={palette.marigold}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.body,
              fontSize: typeScale.caption,
              color: colors.muted,
              lineHeight: 16,
            }}
          >
            Shared deliberately. Never shown as a compatibility percentage.
          </Text>
        </View>
      )}
      </View>
    </View>
  );
}
