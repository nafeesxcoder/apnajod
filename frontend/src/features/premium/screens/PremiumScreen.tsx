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
import { fonts, palette, radius, typeScale } from "../../../theme";
import { BLUE_TICK, TrustBadge } from "../../../components/TrustBadge";

const COLUMN = 800;

const FREE_FEATURES = [
  { text: "10 likes per day", ok: true },
  { text: "Chat free", ok: true },
  { text: "1 liker visible", ok: true },
  { text: "No age filter", ok: false },
  { text: "0 boosts", ok: false },
  { text: "0 super likes", ok: false },
] as const;

const BLUE_TICK_FEATURE = {
  text: "Blue tick next to your name",
  ok: true,
  tick: true,
} as const;

const PLUS_FEATURES = [
  { text: "Unlimited likes", ok: true },
  { text: "All likers visible", ok: true },
  { text: "Age filter", ok: true },
  { text: "1 boost per week", ok: true },
  { text: "2 super likes per week", ok: true },
] as const;

const PRO_FEATURES = [
  BLUE_TICK_FEATURE,
  { text: "Top of search", ok: true },
  { text: "Everything in Plus", ok: true },
  { text: "3 boosts per week", ok: true },
  { text: "5 super likes per week", ok: true },
] as const;

type PlanFeature = { text: string; ok: boolean; tick?: boolean };

const PLAN_FEATURES: Record<string, readonly PlanFeature[]> = {
  plus_monthly: PLUS_FEATURES,
  pro_monthly: PRO_FEATURES,
};

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
  onVerify,
}: {
  accessToken: string;
  onBack: () => void;
  /** Opens the selfie verification hub. */
  onVerify?: () => void;
}) {
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
  const boostPacks = plans.filter(
    (plan) => plan.kind === "consumable" && plan.grants === "boost",
  );
  const superlikePacks = plans.filter(
    (plan) => plan.kind === "consumable" && plan.grants === "superlike",
  );

  const currentPlanName =
    selectedCode === "pro_monthly"
      ? "Pro"
      : selectedCode === "plus_monthly"
        ? "Plus"
        : "Premium";

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
          <View style={{ width: "100%", maxWidth: COLUMN, alignSelf: "center" }}>
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
                      You have {currentPlanName}
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

                {!summary?.blueTick && <BlueTickHero />}

                <BlueTickNote summary={summary} onVerify={onVerify} />

                <CreditsCard
                  summary={summary}
                  accessToken={accessToken}
                  onChanged={setSummary}
                />

                <PlanCard
                  title="Free"
                  price="₹0"
                  features={FREE_FEATURES}
                  selected={false}
                  disabled
                  badge={!summary?.premium ? "Current plan" : undefined}
                  onSelect={() => {}}
                />

                {subscriptions.map((plan) => {
                  const features = PLAN_FEATURES[plan.code] ?? [];
                  const isCurrentPlan =
                    summary?.premium && selectedCode === plan.code;
                  return (
                    <PlanCard
                      key={plan.code}
                      title={plan.title}
                      price={`${rupees(plan.amount_paise)}/month`}
                      features={features}
                      selected={selectedCode === plan.code}
                      onSelect={() => setSelectedCode(plan.code)}
                      blueTick={plan.code === "pro_monthly"}
                      highlight={plan.code === "pro_monthly"}
                      badge={isCurrentPlan ? "Current plan" : undefined}
                    />
                  );
                })}

                {boostPacks.length > 0 && (
                  <PackGroup
                    title="Boost packs"
                    packs={boostPacks}
                    selectedCode={selectedCode}
                    onSelect={setSelectedCode}
                  />
                )}

                {superlikePacks.length > 0 && (
                  <PackGroup
                    title="Super Like packs"
                    packs={superlikePacks}
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

function PlanCard({
  title,
  price,
  features,
  selected,
  disabled,
  badge,
  highlight,
  blueTick,
  onSelect,
}: {
  title: string;
  price: string;
  features: readonly PlanFeature[];
  selected: boolean;
  disabled?: boolean;
  badge?: string;
  highlight?: boolean;
  /** The plan carries the blue tick: show it beside the plan name. */
  blueTick?: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${title}, ${price}`}
      onPress={disabled ? undefined : onSelect}
      disabled={disabled}
      style={{
        backgroundColor: selected ? palette.paperSand : palette.paper,
        borderRadius: radius.lg,
        borderWidth: selected || highlight ? 2 : 1,
        borderColor: selected
          ? palette.navy
          : highlight
            ? palette.crimson
            : palette.rule,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {badge && (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: palette.slate,
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
            {badge}
          </Text>
        </View>
      )}
      {selected && !badge && (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={{
            fontFamily: fonts.bodySemi,
            fontSize: 16,
            color: palette.ink,
          }}
        >
          {title}
        </Text>
        {blueTick && <TrustBadge blueTick size={18} />}
      </View>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          color: palette.navy,
          marginTop: 2,
        }}
      >
        {price}
      </Text>
      <View style={{ marginTop: 10, gap: 4 }}>
        {features.map((f) => (
          <View
            key={f.text}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            {f.tick ? (
              <TrustBadge blueTick size={15} />
            ) : (
              <Ionicons
                name={f.ok ? "checkmark-circle" : "close-circle"}
                size={14}
                color={f.ok ? palette.emerald : palette.slate}
              />
            )}
            <Text
              style={{
                fontFamily: f.tick ? fonts.bodySemi : fonts.body,
                fontSize: 13,
                color: f.tick ? BLUE_TICK : f.ok ? palette.ink : palette.slate,
              }}
            >
              {f.text}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function PackGroup({
  title,
  packs,
  selectedCode,
  onSelect,
}: {
  title: string;
  packs: BillingPlan[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <View style={{ marginTop: 8, marginBottom: 12 }}>
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
      <View style={{ flexDirection: "row", gap: 10 }}>
        {packs.map((plan) => {
          const selected = selectedCode === plan.code;
          return (
            <Pressable
              key={plan.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(plan.code)}
              style={{
                flex: 1,
                backgroundColor: selected ? palette.paperSand : palette.paper,
                borderRadius: radius.lg,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? palette.navy : palette.rule,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 14,
                  color: palette.ink,
                }}
              >
                {plan.title}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: palette.navy,
                  marginTop: 4,
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

/**
 * Where the member stands on the blue tick.
 *
 * The tick needs an approved selfie as well as Pro, so nobody can
 * buy "this person is real". Paying still works without one - the tick
 * simply turns on the day the selfie is approved - but the member is told
 * that before they pay, not after.
 */
function BlueTickNote({
  summary,
  onVerify,
}: {
  summary: BillingSummary | null;
  onVerify?: () => void;
}) {
  if (!summary) return null;
  if (summary.blueTick) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: palette.paperSand,
          borderRadius: radius.lg,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <TrustBadge blueTick size={22} />
        <Text style={{ fontFamily: fonts.bodySemi, color: palette.navy, fontSize: 14, flex: 1 }}>
          Your blue tick is live. It shows next to your name everywhere.
        </Text>
      </View>
    );
  }
  if (summary.verified) return null;
  return (
    <View
      style={{
        backgroundColor: palette.paperSand,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: BLUE_TICK,
        padding: 14,
        marginBottom: 16,
        gap: 8,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, color: palette.navy, fontSize: 14 }}>
        {summary.pro
          ? "Verify your selfie to switch on your blue tick"
          : "The blue tick needs a verified selfie"}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: palette.slate, fontSize: 13 }}>
        {summary.pro
          ? "Pro is active. The blue tick appears the moment an admin approves your selfie."
          : "You can buy Pro now and use every feature. The blue tick appears once an admin approves your selfie."}
      </Text>
      {onVerify && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Verify my selfie"
          onPress={onVerify}
          style={{
            alignSelf: "flex-start",
            backgroundColor: palette.navy,
            borderRadius: radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodySemi, fontSize: 13 }}>
            Verify my selfie
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** The first thing on the page: what the blue tick is and where it comes from. */
function BlueTickHero() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: palette.paper,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: BLUE_TICK,
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 6,
      }}
    >
      <TrustBadge blueTick size={48} />
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          color: palette.ink,
          textAlign: "center",
        }}
      >
        Get the Blue Tick
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: palette.slate,
          textAlign: "center",
        }}
      >
        Included in Pro. Shows next to your name on every card,
        puts you at the top of search, and tells matches you are a real,
        verified member.
      </Text>
    </View>
  );
}

/**
 * What the member has to spend, and the one button that spends a boost.
 *
 * Boost and Super Like packs were sold with no way to use a boost anywhere
 * in the app. Plus and Pro also hand out both every week, so the counts
 * here are the first place a member sees that allowance arrive.
 */
function CreditsCard({
  summary,
  accessToken,
  onChanged,
}: {
  summary: BillingSummary | null;
  accessToken: string;
  onChanged: (summary: BillingSummary) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!summary) return null;
  const boosts = summary.boost?.balance ?? 0;
  const superlikes = summary.superlikes ?? 0;
  const active = summary.boost?.active ?? null;
  if (!summary.premium && boosts === 0 && superlikes === 0 && !active) return null;

  const until = active
    ? new Date(active.endsAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const boostNow = async () => {
    setBusy(true);
    setMessage("");
    try {
      await billingApi.startBoost(accessToken);
      onChanged(await billingApi.me(accessToken));
      setMessage("You are boosted. More people will see you first.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start a boost.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: palette.paper,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.rule,
        padding: 16,
        marginBottom: 16,
        gap: 12,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>
        Your Boosts and Super Likes
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          { icon: "🚀", label: "Boosts", value: boosts },
          { icon: "⭐", label: "Super Likes", value: superlikes },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              flex: 1,
              backgroundColor: palette.paperSand,
              borderRadius: radius.md,
              padding: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, color: palette.ink }}>
              {item.value}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      {summary.premium && (
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
          {summary.pro ? "Pro adds 3 Boosts and 5 Super Likes" : "Plus adds 1 Boost and 2 Super Likes"}{" "}
          every Monday. Unused ones carry over.
        </Text>
      )}
      {active ? (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.emerald }}>
          🚀 Boost live until {until}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a boost now"
          disabled={busy || boosts === 0}
          onPress={() => void boostNow()}
          style={{
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            backgroundColor: boosts > 0 ? palette.navy : palette.rule,
            borderRadius: radius.pill,
            paddingVertical: 12,
          }}
        >
          {busy && <ActivityIndicator color="#FFFFFF" size="small" />}
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>
            {boosts > 0 ? "Boost me now - jump to the top" : "No boosts left"}
          </Text>
        </Pressable>
      )}
      {!!message && (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.ink }}>
          {message}
        </Text>
      )}
    </View>
  );
}
