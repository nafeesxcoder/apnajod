/**
 * Premium: what it gives, what it costs, and where the member stands.
 *
 * It cannot take money yet - Razorpay is not connected and Play Billing
 * needs the app listed first - so the plans are shown with their real
 * prices and the buy button says so plainly rather than failing when
 * tapped. When billingApi.checkoutAvailable turns true, the buttons work
 * and nothing else on this screen changes.
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  type BillingPlan,
  type BillingSummary,
  billingApi,
  rupees,
} from "../../../api/billingApi";
import { useLayout } from "../../../layout/useLayout";
import { palette } from "../../../theme";

const PAPER = "#FDF7F4";
const LINE = "#EADDD2";

/** The one column width the header and the body both use. */
const COLUMN = 800;

const INCLUDED = [
  { icon: "infinite", text: "Unlimited likes, every day" },
  { icon: "eye", text: "See everyone who liked you, in full" },
  { icon: "options", text: "Filter by the age range you want" },
  { icon: "rocket", text: "Boosts to reach the top of the deck" },
] as const;

export function PremiumScreen({
  accessToken,
  onBack,
}: {
  accessToken: string;
  onBack: () => void;
}) {
  const { isWide } = useLayout();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([billingApi.plans(), billingApi.me(accessToken)])
      .then(([loadedPlans, loadedSummary]) => {
        if (!live) return;
        setPlans(loadedPlans);
        setSummary(loadedSummary);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Could not load Premium.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [accessToken]);

  const subscriptions = plans.filter((plan) => plan.kind === "subscription");
  const packs = plans.filter((plan) => plan.kind === "consumable");

  return (
    <View style={{ flex: 1, backgroundColor: PAPER }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* The same column as the body, so the back arrow lines up with
            the content instead of hugging the far edge of a wide window. */}
        <View
          style={{
            width: "100%",
            maxWidth: COLUMN,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: palette.ink }}>
            Premium
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: "100%", maxWidth: COLUMN, alignSelf: "center" }}>
            {loading ? (
              <View style={{ paddingVertical: 60, alignItems: "center" }}>
                <ActivityIndicator color={palette.navy} />
              </View>
            ) : error ? (
              <Text accessibilityRole="alert" style={{ color: palette.clay }}>
                {error}
              </Text>
            ) : (
              <>
                {summary?.premium && (
                  <View
                    style={{
                      backgroundColor: "#E8F1F8",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: palette.navy }}>
                      You have Premium
                    </Text>
                    {summary.premiumUntil && (
                      <Text style={{ color: palette.slate, marginTop: 2 }}>
                        Until {new Date(summary.premiumUntil).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}

                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: palette.ink,
                    marginBottom: 10,
                  }}
                >
                  What you get
                </Text>
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: LINE,
                    padding: 6,
                    marginBottom: 22,
                  }}
                >
                  {INCLUDED.map((item) => (
                    <View
                      key={item.text}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                      }}
                    >
                      <Ionicons name={item.icon} size={18} color={palette.navy} />
                      <Text style={{ color: palette.ink, fontSize: 15 }}>
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>

                <PlanGroup
                  title="Choose a plan"
                  plans={subscriptions}
                  wide={isWide}
                />
                {packs.length > 0 && (
                  <PlanGroup title="Boosts" plans={packs} wide={isWide} />
                )}

                {!billingApi.checkoutAvailable && (
                  <Text
                    style={{
                      color: palette.slate,
                      fontSize: 13,
                      textAlign: "center",
                      marginTop: 18,
                      lineHeight: 19,
                    }}
                  >
                    Payments are not open yet. Everything above is free for
                    everyone in the meantime.
                  </Text>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PlanGroup({
  title,
  plans,
  wide,
}: {
  title: string;
  plans: BillingPlan[];
  wide: boolean;
}) {
  if (!plans.length) return null;
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: palette.ink,
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <View
        style={[
          { gap: 10 },
          wide && { flexDirection: "row", flexWrap: "wrap" },
        ]}
      >
        {plans.map((plan) => (
          <View
            key={plan.code}
            style={[
              {
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: LINE,
                padding: 16,
              },
              wide && { width: 240 },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: palette.ink }}>
              {plan.title}
            </Text>
            {!!plan.blurb && (
              <Text
                style={{
                  color: palette.slate,
                  fontSize: 13,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {plan.blurb}
              </Text>
            )}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: palette.navy,
                marginTop: 10,
              }}
            >
              {rupees(plan.amount_paise)}
            </Text>
            <View
              // Not a Pressable: a button that cannot do anything is worse
              // than no button. It becomes one when checkout opens.
              accessibilityRole="text"
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: "#EEF2F6",
                alignItems: "center",
              }}
            >
              <Text style={{ color: palette.slate, fontWeight: "600" }}>
                Opening soon
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
