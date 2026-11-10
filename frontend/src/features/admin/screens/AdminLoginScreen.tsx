import { useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../api/adminApi";
import { fonts, palette, radius } from "../../../theme";

export function AdminLoginScreen({
  onLogin,
}: {
  onLogin: (token: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password States
  const [isForgot, setIsForgot] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"send" | "verify">("send");

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await adminApi.login(identifier, password);
      onLogin(session.accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!phone) {
      setError("Please enter registered phone.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adminApi.forgotPassword(phone);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!otp || !newPassword) {
      setError("Enter OTP and new password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adminApi.resetPassword(phone, otp, newPassword);
      setIsForgot(false);
      setStep("send");
      setPhone("");
      setOtp("");
      setNewPassword("");
      setError("Password reset successful. Please login.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== "web") {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: palette.paperBase,
          padding: 20,
        }}
      >
        <Ionicons name="laptop-outline" size={64} color={palette.navy} />
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 24,
            color: palette.ink,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Admin panel is desktop-only
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: palette.slate,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Please open apnajoda.com on a laptop or desktop computer.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.paperBase,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: palette.paper,
          borderRadius: radius.lg,
          padding: 32,
          gap: 20,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 10 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: palette.paperSand,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={isForgot ? "lock-closed" : "shield-checkmark"}
              size={30}
              color={palette.navy}
            />
          </View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: palette.ink,
              marginTop: 16,
            }}
          >
            {isForgot ? "Reset Password" : "Admin Login"}
          </Text>
        </View>

        {!isForgot ? (
          // ================= LOGIN VIEW =================
          <>
            <View>
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: palette.ink,
                  marginBottom: 6,
                }}
              >
                Username
              </Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                style={{
                  backgroundColor: palette.paperSand,
                  borderWidth: 1,
                  borderColor: palette.rule,
                  borderRadius: radius.md,
                  padding: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: palette.ink,
                  outlineStyle: "none" as any,
                }}
              />
            </View>
            <View>
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: palette.ink,
                  marginBottom: 6,
                }}
              >
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={{
                  backgroundColor: palette.paperSand,
                  borderWidth: 1,
                  borderColor: palette.rule,
                  borderRadius: radius.md,
                  padding: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: palette.ink,
                  outlineStyle: "none" as any,
                }}
              />
            </View>

            <Pressable
              onPress={() => setIsForgot(true)}
              style={{ alignSelf: "flex-end", marginTop: -10 }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: palette.navy,
                }}
              >
                Forgot Password?
              </Text>
            </Pressable>

            {!!error && (
              <Text
                style={{
                  color: palette.clay,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: palette.navy,
                paddingVertical: 16,
                borderRadius: radius.pill,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: fonts.bodySemi,
                    fontSize: 16,
                  }}
                >
                  Log In
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          // ================= FORGOT PASSWORD VIEW =================
          <>
            {step === "send" ? (
              <>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: palette.slate,
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  Enter your registered phone number to receive an OTP.
                </Text>
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                      color: palette.ink,
                      marginBottom: 6,
                    }}
                  >
                    Registered Phone
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +919876543210"
                    keyboardType="phone-pad"
                    style={{
                      backgroundColor: palette.paperSand,
                      borderWidth: 1,
                      borderColor: palette.rule,
                      borderRadius: radius.md,
                      padding: 14,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: palette.ink,
                      outlineStyle: "none" as any,
                    }}
                  />
                </View>
                {!!error && (
                  <Text
                    style={{
                      color: palette.clay,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </Text>
                )}
                <Pressable
                  onPress={handleForgot}
                  disabled={loading}
                  style={{
                    backgroundColor: palette.navy,
                    paddingVertical: 16,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: fonts.bodySemi,
                        fontSize: 16,
                      }}
                    >
                      Send OTP
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: palette.slate,
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  Enter the OTP sent to your phone and set a new password.
                </Text>
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                      color: palette.ink,
                      marginBottom: 6,
                    }}
                  >
                    OTP Code
                  </Text>
                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      backgroundColor: palette.paperSand,
                      borderWidth: 1,
                      borderColor: palette.rule,
                      borderRadius: radius.md,
                      padding: 14,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: palette.ink,
                      outlineStyle: "none" as any,
                    }}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                      color: palette.ink,
                      marginBottom: 6,
                    }}
                  >
                    New Password
                  </Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    style={{
                      backgroundColor: palette.paperSand,
                      borderWidth: 1,
                      borderColor: palette.rule,
                      borderRadius: radius.md,
                      padding: 14,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: palette.ink,
                      outlineStyle: "none" as any,
                    }}
                  />
                </View>
                {!!error && (
                  <Text
                    style={{
                      color: palette.clay,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </Text>
                )}
                <Pressable
                  onPress={handleReset}
                  disabled={loading}
                  style={{
                    backgroundColor: palette.navy,
                    paddingVertical: 16,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: fonts.bodySemi,
                        fontSize: 16,
                      }}
                    >
                      Reset Password
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            <Pressable
              onPress={() => {
                setIsForgot(false);
                setStep("send");
                setError("");
              }}
              style={{ alignSelf: "center", marginTop: 10 }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: palette.slate,
                }}
              >
                Back to Login
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
