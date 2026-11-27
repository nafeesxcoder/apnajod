/**
 * Sign-up and sign-in.
 *
 * The old flow asked for a phone or email, then a selfie, then a government
 * ID, then a nine-field profile, then three preference screens — eleven
 * screens before anyone saw a single person. People who were not confident
 * reading English simply stopped.
 *
 * This flow is three screens: the details, one SMS code, and a short profile.
 * Every label is plain sentence-case English, and the mobile field is the one
 * place the design raises its voice — it is the first thing a nervous member
 * touches, so it shows exactly what is expected.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Pressable } from "../../../components/Pressable";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  isEmailEntry,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUsername,
  normalizeAuthEmail,
  normalizeAuthPhone,
  normalizeUsername,
  passwordError,
  usernameError,
} from "../../../domain/validation";
import { authApi, AuthRequestError } from "../../../api/authApi";
import { access } from "../../../theme/accessStyles";
import { colors } from "../../../theme";
import { keyboardBehavior } from "../../../layout/keyboardBehavior";

const wordmarkArt = require("../../../../assets/apnajoda-wordmark.png");

/* ============================================================
   Shared shell
   ============================================================ */

function AccessPage({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={access.root}>
      <SafeAreaView style={access.safe}>
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          style={access.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "web" ? "none" : "interactive"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={access.scroll}
          >
            <View style={access.page}>
              {onBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={12}
                  onPress={onBack}
                  style={access.back}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </Pressable>
              ) : (
                <View style={access.backSpacer} />
              )}
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Wordmark() {
  // The drawn wordmark, not the name re-set in the UI typeface: the brand
  // has its own letterforms and this is where they belong.
  return (
    <Image
      source={wordmarkArt}
      resizeMode="contain"
      accessibilityLabel="Apnajoda"
      style={access.wordmark}
    />
  );
}

function Heading({ title, body }: { title: string; body?: string }) {
  return (
    <View style={access.heading}>
      <Text style={access.title}>{title}</Text>
      {!!body && <Text style={access.lede}>{body}</Text>}
    </View>
  );
}

/** Full-width primary action. One per screen. */
function Action({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        access.action,
        pressed && access.actionPressed,
        off && access.actionOff,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text style={access.actionText}>{label}</Text>
      )}
    </Pressable>
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress}>
      <Text style={access.textAction}>{label}</Text>
    </Pressable>
  );
}

/** A labelled field with help text below, replaced by the error when there is one. */
// The browser's own red focus ring is turned off on the web; the field keeps its look.
const noWebOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null;

function AccessField({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={access.field}>
      <View style={access.labelRow}>
        <Text style={access.label}>{label}</Text>
      </View>
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={access.error}>
          {error}
        </Text>
      ) : help ? (
        <Text style={access.help}>{help}</Text>
      ) : null}
    </View>
  );
}

/**
 * The mobile-or-email field. Digits are read as a mobile number and an @ makes
 * it an email; the code goes to whichever one is typed.
 */
function ContactField({
  value,
  onChange,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const emailEntry = isEmailEntry(value);
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const help = !value.trim()
    ? "Type a 10-digit mobile number, or an email address."
    : emailEntry
      ? "We will send one code to this email."
      : digits.length === 10
        ? "We will send one code to this number."
        : `${digits.length} of 10 digits`;
  return (
    <AccessField label="Mobile number or email" help={help} error={error}>
      <View style={[access.inputBox, !!error && access.inputBad]}>
        <TextInput
          accessibilityLabel="Mobile number or email"
          autoFocus={autoFocus}
          value={value}
          onChangeText={(next) => onChange(next.replace(/\s/g, ""))}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          placeholder="98765 43210 or you@example.com"
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          style={[access.input, noWebOutline]}
        />
      </View>
    </AccessField>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  accessibilityLabel,
  bad,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: "password" | "new-password";
  accessibilityLabel: string;
  bad?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <View style={[access.inputBox, !!bad && access.inputBad]}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={[access.input, noWebOutline]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? "Hide password" : "Show password"}
        hitSlop={12}
        onPress={() => setShown((on) => !on)}
        style={access.reveal}
      >
        <Text style={access.revealText}>{shown ? "Hide" : "Show"}</Text>
      </Pressable>
    </View>
  );
}

/* ============================================================
   Welcome: two doors, nothing else
   ============================================================ */

export function AccessWelcomeScreen({
  onSignUp,
  onLogIn,
}: {
  onSignUp: () => void;
  onLogIn: () => void;
}) {
  return (
    <AccessPage>
      <Wordmark />
      <Heading
        title={"Serious about\nfinding someone?"}
        body="Verified people across India, looking for something real. No swiping games."
      />
      <View style={access.welcomeArt}>
        <Image
          source={wordmarkArt}
          resizeMode="contain"
          accessibilityLabel="Apnajoda"
          style={access.welcomeArtMark}
        />
      </View>
      <View style={access.stack}>
        <Action label="Create account" onPress={onSignUp} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I already have an account"
          onPress={onLogIn}
          style={({ pressed }) => [access.secondary, pressed && access.secondaryPressed]}
        >
          <Text style={access.secondaryText}>I already have an account</Text>
        </Pressable>
      </View>
    </AccessPage>
  );
}

/* ============================================================
   Sign up: mobile, username, password
   ============================================================ */

export type SignUpDraft = { phone?: string; email?: string; username: string; password: string };

export function SignUpScreen({
  onBack,
  onLogIn,
  onCheckUsername,
  onSubmit,
}: {
  onBack: () => void;
  onLogIn: () => void;
  onCheckUsername: (username: string) => Promise<{ available: boolean; reason: string }>;
  onSubmit: (draft: SignUpDraft) => Promise<void>;
}) {
  const [contact, setContact] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [nameTaken, setNameTaken] = useState("");
  const [checking, setChecking] = useState(false);
  const checkToken = useRef(0);

  const emailEntry = isEmailEntry(contact);
  const contactOk = emailEntry ? isValidEmail(contact) : isValidPhone(contact);
  const nameMessage = usernameError(username);
  const passwordMessage = passwordError(password);
  const ready = contactOk && !nameMessage && !passwordMessage && !nameTaken;

  // Checking as they type means they find out the username is taken before
  // they have filled in a password, not after the OTP.
  useEffect(() => {
    setNameTaken("");
    if (!isValidUsername(username)) return;
    const token = (checkToken.current += 1);
    setChecking(true);
    const timer = setTimeout(() => {
      void onCheckUsername(normalizeUsername(username))
        .then((result) => {
          if (token !== checkToken.current) return;
          setNameTaken(result.available ? "" : result.reason || "That username is taken.");
        })
        .catch(() => undefined)
        .finally(() => {
          if (token === checkToken.current) setChecking(false);
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      setChecking(false);
    };
  }, [username, onCheckUsername]);

  const submit = async () => {
    setSubmitted(true);
    setFormError("");
    if (!ready) return;
    setLoading(true);
    try {
      const who = emailEntry
        ? { email: normalizeAuthEmail(contact) as string }
        : { phone: normalizeAuthPhone(contact) as string };
      await onSubmit({ ...who, username: normalizeUsername(username), password });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not start sign-up. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const nameHelp = checking
    ? "Checking…"
    : isValidUsername(username) && !nameTaken
      ? "This name is free."
      : "You will use this to log in.";

  return (
    <AccessPage onBack={onBack}>
      <Wordmark />
      <Heading
        title={"Create your\naccount"}
        body="Three things, that is all. Your name and photo come next."
      />

      <View style={access.stack}>
        <ContactField
          autoFocus
          value={contact}
          onChange={setContact}
          error={submitted && !contactOk ? "Enter a 10-digit mobile number or an email address." : ""}
        />

        <AccessField
          label="Username"
          help={nameHelp}
          error={nameTaken || (submitted ? nameMessage : "")}
        >
          <View
            style={[
              access.inputBox,
              !!(nameTaken || (submitted && nameMessage)) && access.inputBad,
            ]}
          >
            <TextInput
              accessibilityLabel="Username"
              value={username}
              onChangeText={(next) => setUsername(next.replace(/\s/g, ""))}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              maxLength={20}
              placeholder="riya_07"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={[access.input, noWebOutline]}
            />
            {isValidUsername(username) && !nameTaken && !checking && (
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            )}
          </View>
        </AccessField>

        <AccessField
          label="Password"
          help="At least 6 characters. Anything you will remember."
          error={submitted ? passwordMessage : ""}
        >
          <PasswordInput
            accessibilityLabel="Password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            bad={submitted && !!passwordMessage}
          />
        </AccessField>
      </View>

      {!!formError && (
        <Text accessibilityRole="alert" style={access.formError}>
          {formError}
        </Text>
      )}

      <View style={access.stack}>
        <Action
          label="Send me a code"
          onPress={() => void submit()}
          loading={loading}
        />
        <View style={access.footRow}>
          <Text style={access.footText}>Already have an account?</Text>
          <TextAction label="Log in" onPress={onLogIn} />
        </View>
      </View>
    </AccessPage>
  );
}

/* ============================================================
   One SMS code
   ============================================================ */

export function OtpScreen({
  destination,
  purpose,
  onBack,
  onResend,
  onVerify,
}: {
  destination: string;
  /** Changes only the copy; the code itself is scoped on the server. */
  purpose: "signup" | "reset" | "twoFactor";
  onBack: () => void;
  onResend: () => Promise<void>;
  onVerify: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const masked = useMemo(() => {
    if (destination.includes("@")) {
      const [name = "", domain = ""] = destination.split("@");
      return `${name.slice(0, 1)}•••@${domain}`;
    }
    const digits = destination.replace(/\D/g, "");
    return digits.length >= 4 ? `••••• ${digits.slice(-4)}` : destination;
  }, [destination]);

  const verify = async () => {
    setError("");
    setLoading(true);
    try {
      await onVerify(code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That code did not work. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setSeconds(30);
    setCode("");
    setError("");
    try {
      await onResend();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send a new code.");
    }
  };

  return (
    <AccessPage onBack={onBack}>
      <Wordmark />
      <Heading
        title="Enter the code"
        body={`We sent a 6-digit code by SMS to ${masked}.`}
      />

      <View style={access.stack}>
        <TextInput
          accessibilityLabel="6-digit code"
          autoFocus
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          style={[access.codeInput, !!error && access.inputBad]}
        />
        {error ? (
          <Text accessibilityRole="alert" style={access.error}>
            {error}
          </Text>
        ) : (
          <Text style={access.help}>
            {purpose === "reset"
              ? "Next you will choose a new password."
              : "Use the newest code in your messages."}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send a new code"
          disabled={seconds > 0}
          hitSlop={10}
          onPress={() => void resend()}
        >
          <Text style={[access.textAction, seconds > 0 && access.textActionOff]}>
            {seconds > 0
              ? `Send a new code in 0:${String(seconds).padStart(2, "0")}`
              : "Send a new code"}
          </Text>
        </Pressable>
      </View>

      <Action
        label={purpose === "reset" ? "Check code" : purpose === "twoFactor" ? "Log in" : "Create my account"}
        onPress={() => void verify()}
        disabled={code.length !== 6}
        loading={loading}
      />
    </AccessPage>
  );
}

/* ============================================================
   Log in
   ============================================================ */

export function LogInScreen({
  onBack,
  onSignUp,
  onForgotPassword,
  onSubmit,
}: {
  onBack: () => void;
  onSignUp: () => void;
  onForgotPassword: (identifier: string) => void;
  onSubmit: (input: { identifier: string; password: string }) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // A suspended member can't reach the in-app Support screen, so the appeal
  // is sent from here and shows up in the admin dashboard.
  const [appealToken, setAppealToken] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealSending, setAppealSending] = useState(false);
  const [appealError, setAppealError] = useState("");
  const [appealSent, setAppealSent] = useState(false);

  const sendAppeal = async () => {
    if (!appealToken) return;
    if (appealText.trim().length < 10) {
      setAppealError("Please tell us a little more (at least 10 characters).");
      return;
    }
    setAppealSending(true);
    setAppealError("");
    try {
      await authApi.submitAppeal(appealToken, appealText.trim());
      setAppealSent(true);
    } catch (caught) {
      setAppealError(caught instanceof Error ? caught.message : "Could not send your appeal.");
    } finally {
      setAppealSending(false);
    }
  };

  const submit = async () => {
    setError("");
    setAppealToken(null);
    if (!identifier.trim()) {
      setError("Enter your username, mobile number or email.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ identifier: identifier.trim(), password });
    } catch (caught) {
      const token =
        caught instanceof AuthRequestError &&
        caught.code === "account_suspended" &&
        typeof caught.details?.appealToken === "string"
          ? caught.details.appealToken
          : null;
      setAppealToken(token);
      setAppealSent(false);
      setAppealError("");
      setError(caught instanceof Error ? caught.message : "Could not log you in. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessPage onBack={onBack}>
      <Wordmark />
      <Heading title="Log in" body="Use your username, mobile number or email." />

      <View style={access.stack}>
        <AccessField label="Username, mobile number or email">
          <View style={access.inputBox}>
            <TextInput
              accessibilityLabel="Username, mobile number or email"
              autoFocus
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              placeholder="riya_07"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={[access.input, noWebOutline]}
            />
          </View>
        </AccessField>

        <AccessField label="Password">
          <PasswordInput
            accessibilityLabel="Password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="password"
          />
        </AccessField>

        <View style={access.forgotRow}>
          <TextAction
            label="Forgot password?"
            onPress={() => onForgotPassword(identifier.trim())}
          />
        </View>
      </View>

      {!!error && (
        <Text accessibilityRole="alert" style={access.formError}>
          {error}
        </Text>
      )}

      {!!appealToken && (
        <View style={access.stack}>
          {appealSent ? (
            <Text accessibilityRole="alert" style={access.help}>
              Your appeal has been sent. Our team will review your account and you can try
              logging in again later.
            </Text>
          ) : (
            <>
              <AccessField label="Your appeal">
                <View style={[access.inputBox, { minHeight: 110, alignItems: "flex-start" }]}>
                  <TextInput
                    accessibilityLabel="Your appeal"
                    value={appealText}
                    onChangeText={setAppealText}
                    multiline
                    maxLength={1000}
                    placeholder="Tell us why you think this is a mistake"
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.accent}
                    style={[access.input, { minHeight: 96, textAlignVertical: "top" }]}
                  />
                </View>
              </AccessField>
              {!!appealError && (
                <Text accessibilityRole="alert" style={access.formError}>
                  {appealError}
                </Text>
              )}
              <Action
                label="Send appeal"
                onPress={() => void sendAppeal()}
                loading={appealSending}
              />
            </>
          )}
        </View>
      )}

      <View style={access.stack}>
        <Action label="Log in" onPress={() => void submit()} loading={loading} />
        <View style={access.footRow}>
          <Text style={access.footText}>New here?</Text>
          <TextAction label="Create an account" onPress={onSignUp} />
        </View>
      </View>
    </AccessPage>
  );
}

/* ============================================================
   Forgot password: who are you?
   ============================================================ */

export function ForgotPasswordScreen({
  initialIdentifier = "",
  onBack,
  onSubmit,
}: {
  initialIdentifier?: string;
  onBack: () => void;
  onSubmit: (identifier: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!identifier.trim()) {
      setError("Enter your username, mobile number or email.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(identifier.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send a code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessPage onBack={onBack}>
      <Wordmark />
      <Heading
        title={"Forgot your\npassword?"}
        body="We will send a code to the mobile number or email on your account. Then you choose a new password."
      />

      <View style={access.stack}>
        <AccessField
          label="Username, mobile number or email"
          help="Whichever you remember."
          error={error}
        >
          <View style={[access.inputBox, !!error && access.inputBad]}>
            <TextInput
              accessibilityLabel="Username, mobile number or email"
              autoFocus
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="riya_07"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={[access.input, noWebOutline]}
            />
          </View>
        </AccessField>
      </View>

      <Action
        label="Send code"
        onPress={() => void submit()}
        loading={loading}
      />
    </AccessPage>
  );
}

/* ============================================================
   New password — always shown before the app opens
   ============================================================ */

export function NewPasswordScreen({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordMessage = passwordError(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = isValidPassword(password) && confirm === password;

  const submit = async () => {
    setSubmitted(true);
    setError("");
    if (!ready) return;
    setLoading(true);
    try {
      await onSubmit(password);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save your password. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessPage onBack={onBack}>
      <Wordmark />
      <Heading
        title={"Choose a new\npassword"}
        body="This replaces your old password everywhere. You will stay logged in here."
      />

      <View style={access.stack}>
        <AccessField
          label="New password"
          help="At least 6 characters."
          error={submitted ? passwordMessage : ""}
        >
          <PasswordInput
            accessibilityLabel="New password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            bad={submitted && !!passwordMessage}
          />
        </AccessField>

        <AccessField
          label="Type it again"
          error={mismatch ? "Both passwords must match." : ""}
        >
          <PasswordInput
            accessibilityLabel="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Same password again"
            autoComplete="new-password"
            bad={mismatch}
          />
        </AccessField>
      </View>

      {!!error && (
        <Text accessibilityRole="alert" style={access.formError}>
          {error}
        </Text>
      )}

      <Action
        label="Save password"
        onPress={() => void submit()}
        loading={loading}
      />
    </AccessPage>
  );
}

/* ============================================================
   Short profile — the only thing between the code and the app
   ============================================================ */

export type QuickProfileGender = "" | "woman" | "man" | "nonbinary";

export type QuickProfile = {
  firstName: string;
  age: string;
  gender: QuickProfileGender;
  photoUri: string;
};

/** Stored values stay machine-readable; only the labels are for people. */
const GENDERS: { value: Exclude<QuickProfileGender, "">; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Other" },
];

export function QuickProfileScreen({
  value,
  onChange,
  onPickPhoto,
  onSubmit,
}: {
  value: QuickProfile;
  onChange: (next: QuickProfile) => void;
  onPickPhoto: () => Promise<void>;
  onSubmit: () => Promise<void>;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const age = Number(value.age.replace(/\D/g, ""));
  const nameOk = value.firstName.trim().length >= 2;
  const ageOk = Number.isInteger(age) && age >= 18 && age <= 70;
  const genderOk = !!value.gender;
  const ready = nameOk && ageOk && genderOk;

  const submit = async () => {
    setSubmitted(true);
    setError("");
    if (!ready) return;
    setLoading(true);
    try {
      await onSubmit();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessPage>
      <Wordmark />
      <Heading
        title="Tell us who you are"
        body="Just this much to start. You can add more whenever you like."
      />

      <View style={access.stack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value.photoUri ? "Change your photo" : "Add a photo"}
          onPress={() => void onPickPhoto()}
          style={access.photoRow}
        >
          <View style={access.photoWell}>
            {value.photoUri ? (
              <Image source={{ uri: value.photoUri }} style={access.photo} />
            ) : (
              <Ionicons name="camera-outline" size={26} color={colors.muted} />
            )}
          </View>
          <View style={access.flex}>
            <Text style={access.photoTitle}>
              {value.photoUri ? "Change photo" : "Add a photo"}
            </Text>
            <Text style={access.help}>
              Optional now, but profiles with a photo get many more replies.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <AccessField
          label="First name"
          help="This is what people will see."
          error={submitted && !nameOk ? "Enter your first name." : ""}
        >
          <View style={[access.inputBox, submitted && !nameOk && access.inputBad]}>
            <TextInput
              accessibilityLabel="First name"
              value={value.firstName}
              onChangeText={(firstName) => onChange({ ...value, firstName })}
              autoComplete="given-name"
              maxLength={40}
              placeholder="Nafees Ahmad"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={[access.input, noWebOutline]}
            />
          </View>
        </AccessField>

        <AccessField
          label="Age"
          error={submitted && !ageOk ? "You must be 18 or older to use Apnajoda." : ""}
        >
          <View
            style={[access.inputBox, access.inputNarrow, submitted && !ageOk && access.inputBad]}
          >
            <TextInput
              accessibilityLabel="Age"
              value={value.age}
              onChangeText={(next) =>
                onChange({ ...value, age: next.replace(/\D/g, "").slice(0, 2) })
              }
              keyboardType="number-pad"
              maxLength={2}
              placeholder="26"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={[access.input, noWebOutline]}
            />
          </View>
        </AccessField>

        <AccessField
          label="I am a"
          error={submitted && !genderOk ? "Choose one." : ""}
        >
          <View style={access.choiceRow}>
            {GENDERS.map((option) => {
              const on = value.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={option.label}
                  onPress={() => onChange({ ...value, gender: option.value })}
                  style={[access.choice, on && access.choiceOn]}
                >
                  <Text style={[access.choiceText, on && access.choiceTextOn]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </AccessField>
      </View>

      {!!error && (
        <Text accessibilityRole="alert" style={access.formError}>
          {error}
        </Text>
      )}

      <Action
        label="Start meeting people"
        onPress={() => void submit()}
        loading={loading}
      />
    </AccessPage>
  );
}
