import { useEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Chip, shared } from "../../../components";
import {
  MiniPremiumIcon,
  PremiumIcon,
  type PremiumIconTone,
} from "../../../components/premium/PremiumIcon";
import type { Match } from "../../../data";
import {
  buildAlignmentBridge,
  type AlignmentBridgeItem,
  type IntentPassportInput,
} from "../../../domain/intentPassport";
import { matchReasons } from "../../../domain/matching";
import type { MatchFilters } from "../../../storage";
import { colors } from "../../../theme";
import {
  aiStyles,
  circleStyles,
  coachStyles,
  passportStyles,
  styles,
} from "../../../theme/appStyles";
import { AppCanvas } from "../../../components/AppCanvas";



export function MatchDetailScreen({
  match,
  preferences,
  alignment,
  back,
  interested,
  onRose,
  onProfileView,
  onPrivateBlock,
}: {
  match: Match;
  preferences: { intent: string; vibes: string[]; filters: MatchFilters };
  alignment: Record<string, string>;
  back: () => void;
  interested: () => void;
  onRose: () => void;
  onProfileView: () => void;
  onPrivateBlock: () => void;
}) {
  const reasons = match.reasons ?? matchReasons(match, preferences);
  useEffect(() => {
    const timer = setTimeout(onProfileView, 5000);
    return () => clearTimeout(timer);
  }, [match.id, onProfileView]);
  return (
    <AppCanvas>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.hero}>
            <Image source={{ uri: match.photo }} style={styles.fill} />
            <LinearGradient
              colors={["rgba(18,14,15,.35)", "transparent", colors.black]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView>
              <View style={shared.row}>
                <Pressable onPress={back} style={styles.circleBtn}>
                  <PremiumIcon
                    name="arrow-back"
                    tone="dark"
                    size={44}
                    iconSize={21}
                  />
                </Pressable>
                <View style={shared.spacer} />
                <Pressable
                  onPress={onPrivateBlock}
                  style={styles.detailBlockButton}
                >
                  <PremiumIcon
                    name="ban-outline"
                    tone="ruby"
                    size={40}
                    iconSize={18}
                  />
                </Pressable>
              </View>
            </SafeAreaView>
            <View style={styles.heroText}>
              <Chip label={match.match} gold />
              <View style={shared.row}>
                <Text style={styles.detailName}>
                  {match.name}, {match.age}
                </Text>
                <MiniPremiumIcon
                  name="shield-checkmark"
                  tone="plum"
                  size={34}
                  iconSize={16}
                />
              </View>
              <Text style={styles.matchMeta}>
                {match.profession} · {match.city}
              </Text>
              <Chip label={match.intent} />
            </View>
          </View>
          <View style={styles.detailBody}>
            <AlignmentBridge
              match={match}
              input={{ intent: preferences.intent, alignment }}
            />
            {reasons.length > 0 && (
              <View style={aiStyles.detailAi}>
                <View style={shared.row}>
                  <MiniPremiumIcon
                    name="sparkles"
                    tone="gold"
                    size={38}
                    iconSize={18}
                  />
                  <Text style={[styles.cardTitle, { marginLeft: 8 }]}>
                    Why AI surfaced {match.name}
                  </Text>
                </View>
                <View style={aiStyles.reasonRow}>
                  {reasons.map((reason) => (
                    <View key={reason} style={aiStyles.reasonPill}>
                      <Text style={aiStyles.reasonText}>{reason}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.helper}>
                  Based only on your Milaan answers and in-app activity.
                </Text>
              </View>
            )}
            <View style={styles.profileViewNotice}>
              <MiniPremiumIcon
                name="eye-outline"
                tone="gold"
                size={36}
                iconSize={17}
              />
              <Text style={[styles.helper, { flex: 1 }]}>
                If you spend 5+ seconds here, {match.name} receives a tasteful
                profile-view notification. Swipe previews stay private.
              </Text>
            </View>
            <TrustBadges match={match} />
            <View style={styles.voice}>
              <PremiumIcon name="play" tone="ruby" size={42} iconSize={19} />
              <View style={{ flex: 1 }}>
                <Text style={shared.label}>Voice introduction</Text>
                <View style={styles.wave}>
                  {[8, 17, 12, 24, 15, 9, 20, 12, 6, 15, 20, 9].map((h, i) => (
                    <View
                      key={i}
                      style={{
                        height: h,
                        width: 3,
                        backgroundColor: colors.purpleLight,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.helper}>0:24</Text>
            </View>
            <Info title="About me" body={match.about} />
            <Info title="What I value" body={match.values} />
            <Info title="The future I’m building" body={match.goals} />
            <LifeAlignment match={match} />
            <View style={styles.privateBlockCard}>
              <PremiumIcon name="shield" tone="ruby" size={44} iconSize={21} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Private block</Text>
                <Text style={styles.helper}>
                  If someone bothers you, block them quietly. They won’t be
                  notified and they disappear from your app.
                </Text>
              </View>
              <Pressable
                onPress={onPrivateBlock}
                style={styles.privateBlockAction}
              >
                <Text style={styles.privateBlockText}>Block</Text>
              </Pressable>
            </View>
            <Text style={styles.sectionLabel}>THEIR VIBE</Text>
            <View style={styles.chipRow}>
              {match.vibes.map((x) => (
                <Chip key={x} label={x} selected />
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.fixedAction}>
          <Pressable onPress={back} style={styles.nope}>
            <PremiumIcon name="close" tone="dark" size={52} iconSize={24} />
          </Pressable>
          <Pressable onPress={onRose} style={aiStyles.fixedRose}>
            <PremiumIcon name="sparkles" tone="gold" size={34} iconSize={16} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button
              label="Explore a serious connection"
              icon="heart"
              onPress={interested}
            />
          </View>
        </View>
      </View>
    </AppCanvas>
  );
}

function AlignmentBridge({
  match,
  input,
}: {
  match: Match;
  input: IntentPassportInput;
}) {
  const bridge = buildAlignmentBridge(input, match);
  return (
    <View style={passportStyles.bridge}>
      <View style={passportStyles.bridgeHeader}>
        <PremiumIcon
          name="git-compare-outline"
          tone="gold"
          size={44}
          iconSize={20}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabel}>THE ALIGNMENT BRIDGE</Text>
          <Text style={passportStyles.bridgeTitle}>
            Clarity before chemistry.
          </Text>
        </View>
        <View style={passportStyles.alignedPill}>
          <Text style={passportStyles.alignedCount}>{bridge.alignedCount}</Text>
          <Text style={passportStyles.alignedLabel}>clear</Text>
        </View>
      </View>
      <Text style={passportStyles.bridgeIntro}>
        Compare future essentials in plain language. Differences are
        conversation topics, not rejection scores.
      </Text>
      <View style={passportStyles.bridgeList}>
        {bridge.items.map((item) => (
          <AlignmentBridgeRow
            key={item.id}
            item={item}
            matchName={match.name}
          />
        ))}
      </View>
      <View style={passportStyles.promptCard}>
        <MiniPremiumIcon
          name="chatbubble-ellipses-outline"
          tone="rose"
          size={34}
          iconSize={16}
        />
        <View style={{ flex: 1 }}>
          <Text style={passportStyles.promptLabel}>
            A thoughtful first question
          </Text>
          <Text style={passportStyles.promptText}>
            {bridge.conversationPrompt}
          </Text>
        </View>
      </View>
      {bridge.hasPrivateFields && (
        <Text style={passportStyles.privacy}>
          Unshared answers stay private. Complete your Intent Passport to
          compare them.
        </Text>
      )}
    </View>
  );
}

function AlignmentBridgeRow({
  item,
  matchName,
}: {
  item: AlignmentBridgeItem;
  matchName: string;
}) {
  const icon =
    item.status === "aligned"
      ? "checkmark-circle"
      : item.status === "discuss"
        ? "chatbubble-ellipses"
        : "lock-closed";
  const tone: PremiumIconTone =
    item.status === "aligned"
      ? "gold"
      : item.status === "discuss"
        ? "rose"
        : "dark";
  return (
    <View style={passportStyles.bridgeRow}>
      <MiniPremiumIcon name={icon} tone={tone} size={30} iconSize={14} />
      <View style={{ flex: 1 }}>
        <Text style={passportStyles.bridgeLabel}>{item.label}</Text>
        <Text style={passportStyles.bridgeValues} numberOfLines={2}>
          You: {item.you}
        </Text>
        <Text style={passportStyles.bridgeValues} numberOfLines={2}>
          {matchName}: {item.them}
        </Text>
      </View>
      <Text
        style={[
          passportStyles.status,
          item.status === "aligned" && passportStyles.statusAligned,
        ]}
      >
        {item.status === "aligned"
          ? "ALIGNED"
          : item.status === "discuss"
            ? "DISCUSS"
            : "PRIVATE"}
      </Text>
    </View>
  );
}

function TrustBadges({ match }: { match: Match }) {
  const badges = [
    "Selfie verified",
    "Serious intent verified",
    `${match.vouches.count} friend vouches`,
  ];
  return (
    <View style={coachStyles.badgeCard}>
      <View style={shared.row}>
        <MiniPremiumIcon
          name="shield-checkmark"
          tone="gold"
          size={38}
          iconSize={18}
        />
        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Trust profile</Text>
      </View>
      <View style={coachStyles.badgeRow}>
        {badges.map((badge) => (
          <View key={badge} style={coachStyles.badgePill}>
            <MiniPremiumIcon
              name="checkmark-circle"
              tone="rose"
              size={22}
              iconSize={10}
            />
            <Text style={coachStyles.badgeText}>{badge}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.helper}>
        Verification reduces fake profiles, but members should still meet
        publicly and use their own judgment.
      </Text>
    </View>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      <Text style={[shared.body, { color: colors.muted }]}>{body}</Text>
    </View>
  );
}
function LifeAlignment({ match }: { match: Match }) {
  const rows = [
    ["diamond-outline", "Marriage outlook", match.timeline],
    ["happy-outline", "Family plans", match.children],
    ["people-outline", "Family involvement", match.family],
    ["home-outline", "Relocation", match.relocation],
    ["chatbubbles-outline", "Languages", match.languages.join(" · ")],
  ] as const;
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sectionLabel}>LIFE ALIGNMENT</Text>
      <View style={styles.alignmentCard}>
        {rows.map(([icon, label, value]) => (
          <View key={label} style={styles.alignmentRow}>
            <MiniPremiumIcon name={icon} tone="rose" size={34} iconSize={16} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alignmentRowLabel}>{label}</Text>
              <Text style={styles.alignmentRowValue}>{value}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.alignmentPrivacy}>
        Shared to make intentions clear—not to reduce a person to a checklist.
      </Text>
      <View style={circleStyles.profileVouch}>
        <PremiumIcon name="people" tone="gold" size={46} iconSize={22} />
        <View style={{ flex: 1 }}>
          <Text style={circleStyles.profileVouchTitle}>
            Vouched for by {match.vouches.count} friends
          </Text>
          <Text style={circleStyles.profileVouchBody}>
            People who know {match.name} describe them as:
          </Text>
          <View style={circleStyles.qualityWrap}>
            {match.vouches.qualities.map((quality) => (
              <View key={quality} style={circleStyles.qualityPill}>
                <Text style={circleStyles.qualityText}>{quality}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.alignmentPrivacy}>
        Friend vouches confirm character, not identity or safety. Always use
        your own judgment.
      </Text>
    </View>
  );
}
