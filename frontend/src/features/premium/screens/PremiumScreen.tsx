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
import { fonts, palette, radius, typeScale } from "../../../theme";

const COLUMN = 800;

const INCLUDED = [
  { icon: "infinite", text: "Unlimited likes, every day" },
  { icon: "eye", text: "See everyone who liked you, in full" },
  { icon: "options", text: "Filter by the age range you want" },
  { icon: "rocket", text: "Boosts to reach the top of the deck" },
] as const;

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState("");

  const reload = () => {
    Promise.all([billingApi.plans(), billingApi.me(accessToken)])
      .then(([loadedPlans, loadedSummary]) => {
        setPlans(loadedPlans);
        setSummary(loadedSummary);
        const firstSubscription = loadedPlans.find(
          (p) => p.kind === "subscription",
        );
        if (firstSubscription && !selectedCode) {
          setSelectedCode(firstSubscription.code);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load Premium.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let live = true;
    Promise.all([billingApi.plans(), billingApi.me(accessToken)])
      .then(([loadedPlans, loadedSummary]) => {
        if (!live) return;
        setPlans(loadedPlans);
        setSummary(loadedSummary);
        const firstSubscription = loadedPlans.find(
          (p) => p.kind === "subscription",
        );
        if (firstSubscription) setSelectedCode(firstSubscription.code);
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Could not load Premium.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [accessToken]);

  const handleBuy = async () => {
    if (!selectedCode || buying) return;
    setBuying(true);
    setError("");
    setNotice("");

    try {
      const ok = await loadRazorpayScript();
      if (!ok) {
        throw new Error("Could not load Razorpay. Check your connection.");
      }

      const order = await billingApi.createOrder(accessToken, selectedCode);

      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Apnajoda",
        description: order.planTitle,
        theme: { color: "#1F4D7A" },
        handler: async () => {
          setNotice("Payment successful. Verifying...");
          setBuying(false);
          setTimeout(() => {
            reload();
            setNotice("Premium is now active. Enjoy!");
          }, 2000);
        },
        modal: {
          ondismiss: () => {
            setBuying(false);
            setNotice("");
          },
        },
      });

      rzp.on("payment.failed", (response: any) => {
        setError(
          response?.error?.description || "Payment failed. Please try again.",
        );
        setBuying(false);
      });

      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBuying(false);
    }
  };

  const subscriptions = plans.filter((plan) => plan.kind === "subscription");
  const packs = plans.filter((plan) => plan.kind === "consumable");

  return (
    <View style={{ flex: 1, backgroundColor: palette.paperBase }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            width: "100%",
            maxWidth: COLUMN,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 20,
            paddingVertical: 12,
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
              backgroundColor: palette.paper,
              borderWidth: 1,
              borderColor: palette.rule,
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
            Premium
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{ width: "100%", maxWidth: COLUMN, alignSelf: "center" }}
          >
            {loading ? (
              <View style={{ paddingVertical: 60, alignItems: "center" }}>
                <ActivityIndicator color={palette.navy} />
              </View>
            ) : error ? (
              <Text
                accessibilityRole="alert"
                style={{ color: palette.clay, fontFamily: fonts.body }}
              >
                {error}
              </Text>
            ) : (
              <>
                {summary?.premium && (
                  <View
                    style={{
                      backgroundColor: palette.paperSand,
                      borderRadius: radius.lg,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemi,
                        color: palette.navy,
                        fontSize: 14,
                      }}
                    >
                      You have Premium
                    </Text>
                    {summary.premiumUntil && (
                      <Text
                        style={{
                          color: palette.slate,
                          marginTop: 2,
                          fontFamily: fonts.body,
                          fontSize: 13,
                        }}
                      >
                        Until{" "}
                        {new Date(summary.premiumUntil).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}

                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: typeScale.section,
                    color: palette.ink,
                    marginBottom: 10,
                  }}
                >
                  What you get
                </Text>
                <View
                  style={{
                    backgroundColor: palette.paper,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: palette.rule,
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
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={palette.navy}
                      />
                      <Text
                        style={{
                          color: palette.ink,
                          fontSize: 15,
                          fontFamily: fonts.body,
                        }}
                      >
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>

                <PlanGroup
                  title="Choose a plan"
                  plans={subscriptions}
                  wide={isWide}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                />
                {packs.length > 0 && (
                  <PlanGroup
                    title="Boosts"
                    plans={packs}
                    wide={isWide}
                    selectedCode={selectedCode}
                    onSelect={setSelectedCode}
                  />
                )}

                {!!notice && (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      color: palette.emerald,
                      fontFamily: fonts.bodySemi,
                      fontSize: 14,
                      textAlign: "center",
                      marginTop: 18,
                    }}
                  >
                    {notice}
                  </Text>
                )}

                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      color: palette.clay,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      textAlign: "center",
                      marginTop: 18,
                    }}
                  >
                    {error}
                  </Text>
                )}

                <Pressable
                  onPress={() => void handleBuy()}
                  disabled={!selectedCode || buying}
                  style={{
                    backgroundColor: palette.navy,
                    paddingVertical: 16,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 20,
                    minHeight: 52,
                    opacity: !selectedCode || buying ? 0.5 : 1,
                  }}
                >
                  {buying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                  )}
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: fonts.bodySemi,
                      fontSize: 16,
                    }}
                  >
                    {buying ? "Opening Razorpay..." : "Buy with Razorpay"}
                  </Text>
                </Pressable>

                {!billingApi.checkoutAvailable && (
                  <Text
                    style={{
                      color: palette.slate,
                      fontSize: 13,
                      textAlign: "center",
                      marginTop: 18,
                      lineHeight: 19,
                      fontFamily: fonts.body,
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
  selectedCode,
  onSelect,
}: {
  title: string;
  plans: BillingPlan[];
  wide: boolean;
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  if (!plans.length) return null;
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: typeScale.section,
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
        {plans.map((plan) => {
          const selected = selectedCode === plan.code;
          return (
            <Pressable
              key={plan.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${plan.title}, ${rupees(plan.amount_paise)}`}
              onPress={() => onSelect(plan.code)}
              style={[
                {
                  backgroundColor: selected ? palette.paperSand : palette.paper,
                  borderRadius: radius.lg,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? palette.navy : palette.rule,
                  padding: 16,
                },
                wide && { width: 240 },
              ]}
            >
              {selected && (
                <View
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: palette.navy,
                    borderRadius: radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 10,
                      color: "#FFFFFF",
                    }}
                  >
                    Selected
                  </Text>
                </View>
              )}
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 15,
                  color: palette.ink,
                }}
              >
                {plan.title}
              </Text>
              {!!plan.blurb && (
                <Text
                  style={{
                    color: palette.slate,
                    fontSize: 13,
                    marginTop: 4,
                    lineHeight: 18,
                    fontFamily: fonts.body,
                  }}
                >
                  {plan.blurb}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 24,
                  color: palette.navy,
                  marginTop: 10,
                }}
              >
                {rupees(plan.amount_paise)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
