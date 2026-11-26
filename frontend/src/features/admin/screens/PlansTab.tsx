import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { adminApi } from "../../../api/adminApi";

const C = {
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#5B5478",
  primary: "#1E3A8A",
  danger: "#EF4444",
  good: "#047857",
};

export type AdminPlan = {
  code: string;
  title: string;
  blurb: string;
  kind: "subscription" | "consumable";
  grants: string;
  quantity: number;
  amountPaise: number;
  currency: string;
  playProductId: string | null;
  active: boolean;
};

/**
 * Premium plans and boost packs. The admin changes the title, the
 * description, the price, whether it is on sale, and the Google Play product
 * id it is sold under. What a plan gives stays fixed.
 */
export function PlansTab({ accessToken }: { accessToken: string }) {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await adminApi.plans(accessToken);
      setPlans(data.plans);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plans");
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
        A new price applies to purchases from now on. Purchases already made keep their price.
        The price on Google Play is set in the Play Console as well, and changing it here does
        not change what Google Play charges.
      </Text>
      {!!error && <Text style={{ color: C.danger }}>{error}</Text>}
      {!plans && !error && <ActivityIndicator color={C.primary} />}
      {plans?.map((plan) => (
        <PlanCard key={plan.code} plan={plan} accessToken={accessToken} onSaved={load} />
      ))}
    </View>
  );
}

function PlanCard({
  plan,
  accessToken,
  onSaved,
}: {
  plan: AdminPlan;
  accessToken: string;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(plan.title);
  const [blurb, setBlurb] = useState(plan.blurb);
  const [rupees, setRupees] = useState(String(plan.amountPaise / 100));
  const [playId, setPlayId] = useState(plan.playProductId ?? "");
  const [active, setActive] = useState(plan.active);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  const save = async () => {
    const amount = Number(rupees);
    setBusy(true);
    setMessage("");
    try {
      await adminApi.updatePlan(accessToken, plan.code, {
        title,
        blurb,
        amountPaise: Number.isFinite(amount) ? Math.round(amount * 100) : 0,
        active,
        playProductId: playId.trim() || null,
      });
      setFailed(false);
      setMessage("Saved");
      await onSaved();
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{plan.code}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: active }}
          onPress={() => setActive((v) => !v)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: active ? C.good : C.border,
          }}
        >
          <Text style={{ color: active ? "#FFFFFF" : C.text, fontWeight: "600", fontSize: 13 }}>
            {active ? "On sale" : "Off sale"}
          </Text>
        </Pressable>
      </View>
      <Text style={{ color: C.muted, fontSize: 12 }}>
        {plan.kind === "subscription" ? "Subscription" : "Pack"} · gives {plan.quantity}{" "}
        {plan.kind === "subscription" ? "days" : "credits"} of {plan.grants} (fixed)
      </Text>

      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Description (up to 160 characters)" value={blurb} onChangeText={setBlurb} multiline />
      <Field label="Price in rupees" value={rupees} onChangeText={setRupees} keyboardType="numeric" />
      <Field label="Google Play product id (leave empty if not on Play)" value={playId} onChangeText={setPlayId} />

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void save()}
        style={{
          backgroundColor: C.primary,
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{busy ? "Saving..." : "Save"}</Text>
      </Pressable>
      {!!message && <Text style={{ color: failed ? C.danger : C.good, fontSize: 13 }}>{message}</Text>}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: C.text,
          minHeight: multiline ? 60 : undefined,
        }}
      />
    </View>
  );
}
