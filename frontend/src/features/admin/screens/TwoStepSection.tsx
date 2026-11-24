import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";

import { adminApi } from "../../../api/adminApi";

function errText(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Two-step verification for the admin: an authenticator app (Microsoft
 * Authenticator, Google Authenticator) gives the 6-digit code at every sign-in.
 */
export function TwoStepSection({ accessToken }: { accessToken: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    adminApi
      .twoFactorStatus(accessToken)
      .then((res) => live && setEnabled(!!res.enabled))
      .catch((e) => live && setError(errText(e, "Could not load two-step verification")));
    return () => {
      live = false;
    };
  }, [accessToken]);

  const start = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await adminApi.twoFactorSetup(accessToken);
      setSetup({ secret: res.secret, qrDataUrl: res.qrDataUrl });
      setCode("");
    } catch (e) {
      setError(errText(e, "Could not start the setup"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError("");
    setBusy(true);
    try {
      await adminApi.twoFactorConfirm(accessToken, code);
      setEnabled(true);
      setSetup(null);
      setCode("");
      setNotice("Two-step verification is on. Sign-in will ask for the code from your app.");
    } catch (e) {
      setError(errText(e, "That code did not work"));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setError("");
    setBusy(true);
    try {
      await adminApi.twoFactorDisable(accessToken, code);
      setEnabled(false);
      setCode("");
      setNotice("Two-step verification is off.");
    } catch (e) {
      setError(errText(e, "That code did not work"));
    } finally {
      setBusy(false);
    }
  };

  const input = (label: string) => (
    <TextInput
      accessibilityLabel={label}
      value={code}
      onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
      keyboardType="number-pad"
      placeholder="6-digit code"
      style={{ borderWidth: 1, borderColor: "#D9E0E7", borderRadius: 8, padding: 10, fontSize: 16, letterSpacing: 4 }}
    />
  );

  const button = (label: string, onPress: () => void, disabled = false, danger = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={{
        padding: 12,
        borderRadius: 999,
        backgroundColor: danger ? "#A8243A" : "#1F4D7A",
        opacity: disabled || busy ? 0.5 : 1,
      }}
    >
      <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#D9E0E7", marginBottom: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, color: "#1F4D7A" }}>Two-step verification</Text>

      {enabled === null ? (
        <ActivityIndicator color="#A8243A" />
      ) : enabled ? (
        <>
          <Text style={{ color: "#1B2A3A", lineHeight: 20 }}>
            On. Each sign-in asks for the 6-digit code from your authenticator app.
          </Text>
          <Text style={{ fontSize: 12, color: "#5B6B7A" }}>To turn it off, enter a current code from the app.</Text>
          {input("Code to turn off")}
          {button("Turn off", () => void turnOff(), code.length !== 6, true)}
        </>
      ) : setup ? (
        <>
          <Text style={{ color: "#1B2A3A", lineHeight: 20 }}>
            Open Microsoft Authenticator (or Google Authenticator), tap + and scan this QR code.
          </Text>
          <View style={{ alignItems: "center" }}>
            <Image source={{ uri: setup.qrDataUrl }} style={{ width: 220, height: 220, backgroundColor: "#FFFFFF" }} />
          </View>
          <Text style={{ fontSize: 12, color: "#5B6B7A", lineHeight: 18 }}>
            Can not scan? Choose "enter a setup key" in the app and type this key, then keep it somewhere safe:
          </Text>
          <Text selectable style={{ fontFamily: "monospace", fontSize: 14, color: "#1B2A3A" }}>{setup.secret}</Text>
          {input("Code from the app")}
          {button("Turn on", () => void confirm(), code.length !== 6)}
          <Pressable accessibilityRole="button" onPress={() => setSetup(null)}>
            <Text style={{ textAlign: "center", color: "#5B6B7A" }}>Cancel</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: "#1B2A3A", lineHeight: 20 }}>
            Off. Turn it on to ask for a code from an authenticator app every time you sign in to the admin panel.
          </Text>
          {button("Set up authenticator app", () => void start())}
        </>
      )}

      {!!notice && <Text style={{ color: "#1F4D7A" }}>{notice}</Text>}
      {!!error && <Text style={{ color: "#A8243A" }}>{error}</Text>}
    </View>
  );
}
