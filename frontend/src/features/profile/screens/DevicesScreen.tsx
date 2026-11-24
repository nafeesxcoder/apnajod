import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { sessionApi, type SignInDevice } from "../../../api/sessionApi";
import { serverMs } from "../../../domain/serverTime";
import { colors, fonts, palette, radius, typeScale } from "../../../theme";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "5 min ago", "2 hours ago", "3 days ago", or the date for older. */
function ago(iso: string | null | undefined): string {
  const at = serverMs(iso ?? "");
  if (Number.isNaN(at)) return "";
  const diff = Date.now() - at;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hr ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function iconFor(device: string): keyof typeof Ionicons.glyphMap {
  return /Windows|Mac|Linux/.test(device) ? "desktop-outline" : "phone-portrait-outline";
}

/**
 * Where you're logged in: every device the account is signed in on. Log out one
 * device at a time, or every device except this one.
 */
export function DevicesScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [devices, setDevices] = useState<SignInDevice[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  // Inline confirmation, so a tap is never enough to sign a device out.
  const [confirm, setConfirm] = useState<"others" | string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await sessionApi.list(accessToken));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your devices.");
      setDevices((current) => current ?? []);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const logoutOne = async (id: string) => {
    setBusy(true);
    setNotice("");
    try {
      await sessionApi.logout(accessToken, id);
      setConfirm(null);
      setNotice("That device is signed out.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign that device out.");
    } finally {
      setBusy(false);
    }
  };

  const logoutOthers = async () => {
    setBusy(true);
    setNotice("");
    try {
      await sessionApi.logoutOthers(accessToken);
      setConfirm(null);
      setNotice("All other devices are signed out.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign the other devices out.");
    } finally {
      setBusy(false);
    }
  };

  const others = (devices ?? []).filter((device) => !device.current);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paperBase }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: typeScale.title, color: palette.ink }}>Where you&apos;re logged in</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.slate }}>
          These devices are signed in to your account. If you see one you do not know, log it out and change your password.
        </Text>

        {!!notice && <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.navy }}>{notice}</Text>}
        {!!error && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.crimson }}>{error}</Text>}

        {devices === null ? (
          <ActivityIndicator color={palette.crimson} style={{ margin: 16 }} />
        ) : (
          <>
            {others.length > 0 && (
              <View style={{ gap: 8 }}>
                {confirm === "others" ? (
                  <View style={{ gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: palette.rule }}>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>
                      Log out all other devices? This device stays signed in.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button label="Yes, log them out" danger disabled={busy} onPress={() => void logoutOthers()} />
                      <Button label="Cancel" onPress={() => setConfirm(null)} />
                    </View>
                  </View>
                ) : (
                  <Button label="Log out all other devices" disabled={busy} onPress={() => setConfirm("others")} wide />
                )}
              </View>
            )}

            {devices.length === 0 && (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: palette.slate }}>No devices are signed in.</Text>
            )}

            {devices.map((device) => (
              <View
                key={device.id}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: device.current ? palette.navy : palette.rule,
                  backgroundColor: palette.paperSand,
                }}
              >
                <Ionicons name={iconFor(device.device)} size={26} color={palette.ink} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>{device.device}</Text>
                  {device.current && (
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, color: palette.navy }}>This device</Text>
                  )}
                  {!!device.ip && <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>IP {device.ip}</Text>}
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>
                    Active {ago(device.lastUsedAt)}
                    {device.signedInAt ? ` · Signed in ${ago(device.signedInAt)}` : ""}
                  </Text>

                  {!device.current &&
                    (confirm === device.id ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                        <Button label="Yes, log out" danger disabled={busy} onPress={() => void logoutOne(device.id)} />
                        <Button label="Cancel" onPress={() => setConfirm(null)} />
                      </View>
                    ) : (
                      <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
                        <Button label="Log out" danger disabled={busy} onPress={() => setConfirm(device.id)} />
                      </View>
                    ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Button({
  label,
  onPress,
  danger,
  disabled,
  wide,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: danger ? colors.danger : palette.navy,
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
        alignSelf: wide ? "stretch" : "flex-start",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: danger ? colors.danger : palette.navy }}>{label}</Text>
    </Pressable>
  );
}
