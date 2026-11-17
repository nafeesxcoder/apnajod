/**
 * Two-step verification: a 6-digit code to your verified mobile, asked for on
 * top of the password every time you log in. Turning it on or off needs a code
 * too, so someone holding a live session cannot switch it off silently.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { authApi } from "../../../api/authApi";
import { AppCanvas } from "../../../components/AppCanvas";
import { whiteCard } from "../../../components/brand";
import { fonts, palette, typeScale } from "../../../theme";

export function TwoStepScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    authApi
      .me(accessToken)
      .then((data) => setEnabled(!!data?.user?.twoFactorEnabled))
      .catch(() => setEnabled(false));
  }, [accessToken]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await authApi.twoFactorStart(accessToken);
      setCodeSent(true);
      setNotice("We sent a 6-digit code to your mobile.");
    });

  const confirm = () =>
    run(async () => {
      const turnOn = !enabled;
      const result = await authApi.twoFactorConfirm(accessToken, code, turnOn);
      setEnabled(result.twoFactorEnabled);
      setCodeSent(false);
      setCode("");
      setNotice(turnOn ? "Two-step verification is on." : "Two-step verification is off.");
    });

  return (
    <AppCanvas>
      <View style={{ flex: 1, padding: 20, paddingTop: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={22} color={palette.navy} />
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: palette.navy }}>Settings</Text>
        </Pressable>

        <Text style={{ fontFamily: fonts.display, fontSize: typeScale.section, color: palette.ink, marginBottom: 12 }}>
          Two-step verification
        </Text>

        <View style={{ ...whiteCard, padding: 18, marginBottom: 16 }}>
          {enabled === null ? (
            <ActivityIndicator color={palette.navy} />
          ) : (
            <>
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: palette.ink, marginBottom: 6 }}>
                {enabled ? "On" : "Off"}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, lineHeight: 20 }}>
                {enabled
                  ? "When you log in, we ask for a 6-digit code sent to your mobile, along with your password."
                  : "Turn this on to ask for a 6-digit code sent to your mobile each time you log in, along with your password."}
              </Text>
            </>
          )}
        </View>

        {enabled !== null && !codeSent && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={enabled ? "Turn off two-step verification" : "Turn on two-step verification"}
            disabled={busy}
            onPress={() => void sendCode()}
            style={{ backgroundColor: palette.navy, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: "#FFFFFF" }}>
              {busy ? "Sending…" : enabled ? "Turn off" : "Turn on"}
            </Text>
          </Pressable>
        )}

        {codeSent && (
          <View style={{ ...whiteCard, padding: 18 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, marginBottom: 10 }}>
              Enter the code we sent to your mobile.
            </Text>
            <TextInput
              accessibilityLabel="Six-digit code"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
              style={{ borderWidth: 1, borderColor: palette.rule, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16, marginBottom: 12 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm code"
              disabled={busy || code.length !== 6}
              onPress={() => void confirm()}
              style={{ backgroundColor: palette.navy, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: busy || code.length !== 6 ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: "#FFFFFF" }}>
                {busy ? "Checking…" : "Confirm"}
              </Text>
            </Pressable>
          </View>
        )}

        {error ? (
          <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 14, color: palette.crimson, marginTop: 12 }}>
            {error}
          </Text>
        ) : notice ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate, marginTop: 12 }}>{notice}</Text>
        ) : null}
      </View>
    </AppCanvas>
  );
}
