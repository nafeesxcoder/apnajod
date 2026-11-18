import { Image, ScrollView, Text, View } from "react-native";
import { brand, whiteCard } from "../../../components/brand";
import { PressScale, SpinRing } from "../../../components/motion";
import { TrustBadge } from "../../../components/TrustBadge";
import type { Match } from "../../../data";
import { fonts, palette, radius } from "../../../theme";

/**
 * Members whose boost is running right now, in a row sized like Today's
 * picks: same avatar, same tap to open. Renders nothing when nobody is boosted.
 */
export function BoostedRow({
  members,
  onOpen,
}: {
  members: Match[];
  onOpen: (match: Match) => void;
}) {
  if (members.length === 0) return null;

  return (
    <View style={{ ...whiteCard, marginBottom: 16, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: 19, color: palette.ink }}>Boosted members</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>Boosted right now, shown first</Text>
        </View>
        <View style={{ backgroundColor: brand.pillBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: brand.pillText }}>{members.length} live</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {members.map((member) => {
          const firstName = String(member.name || "").split(" ")[0] ?? "";
          return (
            <PressScale
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${member.name}'s profile, boosted`}
              onPress={() => onOpen(member)}
              style={{ width: 56, alignItems: "center", gap: 4 }}
            >
              <View>
                <SpinRing size={54} spin={false}>
                  {member.photo ? (
                    <Image source={{ uri: member.photo }} style={{ width: "100%", height: "100%", backgroundColor: palette.paperSand }} />
                  ) : (
                    <View style={{ width: "100%", height: "100%", backgroundColor: palette.paperSand, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: palette.navy }}>{firstName.charAt(0)}</Text>
                    </View>
                  )}
                </SpinRing>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, maxWidth: 56 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: palette.ink }}>
                  {firstName}
                </Text>
                {member.verified && <TrustBadge blueTick={member.blueTick} size={11} />}
              </View>
            </PressScale>
          );
        })}
      </ScrollView>
    </View>
  );
}
