import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { adminApi } from "../../../api/adminApi";

type DemoUser = { id: string; username: string; fullName: string; createdAt: string };

function errText(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Demo accounts for store and partner reviews. Each is a real account (username
 * and password, no phone) that behaves like any member. Delete it when the review is done.
 */
export function DemoAccountsTab({ accessToken }: { accessToken: string }) {
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await adminApi.demoUsers(accessToken);
      setUsers(Array.isArray(res?.users) ? res.users : []);
    } catch (e) {
      setError(errText(e, "Could not load demo accounts"));
      setUsers([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res: any = await adminApi.createDemoUser(accessToken, { username, password, fullName });
      setNotice(`Created @${res?.user?.username ?? username}. Log in with that username and password.`);
      setUsername("");
      setPassword("");
      setFullName("");
      await load();
    } catch (e) {
      setError(errText(e, "Could not create the demo account"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await adminApi.deleteDemoUser(accessToken, id);
      setConfirmId(null);
      setNotice("Demo account deleted.");
      await load();
    } catch (e) {
      setError(errText(e, "Could not delete the demo account"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 13, lineHeight: 19, color: "#5B6B7A" }}>
        A demo account is a real account with a username and password, and no phone number. Use it
        for a store review or a partner check. It works like any member's account, so delete it when
        you are done.
      </Text>

      <View style={{ gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#D9E0E7" }}>
        <Text style={{ fontWeight: "700", color: "#B0245F" }}>New demo account</Text>
        <TextInput
          accessibilityLabel="Demo username"
          placeholder="Username (3-20 letters, numbers, . or _)"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={{ borderWidth: 1, borderColor: "#D9E0E7", borderRadius: 8, padding: 10 }}
        />
        <TextInput
          accessibilityLabel="Demo password"
          placeholder="Password (at least 6 characters)"
          autoCapitalize="none"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#D9E0E7", borderRadius: 8, padding: 10 }}
        />
        <TextInput
          accessibilityLabel="Demo name"
          placeholder="Name shown on the profile (optional)"
          value={fullName}
          onChangeText={setFullName}
          style={{ borderWidth: 1, borderColor: "#D9E0E7", borderRadius: 8, padding: 10 }}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !username || !password}
          onPress={() => void create()}
          style={{ padding: 12, borderRadius: 999, backgroundColor: "#B0245F", opacity: busy || !username || !password ? 0.5 : 1 }}
        >
          <Text style={{ textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>Create demo account</Text>
        </Pressable>
      </View>

      {!!notice && <Text style={{ color: "#B0245F" }}>{notice}</Text>}
      {!!error && <Text style={{ color: "#D6336C" }}>{error}</Text>}

      {users === null ? (
        <ActivityIndicator color="#D6336C" />
      ) : users.length === 0 ? (
        <Text style={{ color: "#5B6B7A" }}>No demo accounts yet.</Text>
      ) : (
        users.map((user) => (
          <View
            key={user.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#D9E0E7" }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>@{user.username}</Text>
              <Text style={{ fontSize: 12, color: "#5B6B7A" }}>{user.fullName}</Text>
            </View>
            {confirmId === user.id ? (
              <>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => void remove(user.id)}>
                  <Text style={{ color: "#D6336C", fontWeight: "700" }}>Delete for good</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setConfirmId(null)}>
                  <Text style={{ color: "#5B6B7A" }}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setConfirmId(user.id)}>
                <Text style={{ color: "#D6336C", fontWeight: "700" }}>Delete</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  );
}
