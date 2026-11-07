import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ContactsMatchResult, SocialUser } from "../../../api/socialApi";
import { fonts, palette, radius, typeScale } from "../../../theme";

const MAX_WIDTH = 720;
const SIDE_PADDING = 16;

type Tab = "username" | "contacts";

const SUGGESTIONS = ["riya_07", "arjun_delhi", "priya_mumbai", "kabir_92"];

export type FindPeopleProps = {
  onBack: () => void;
  onSearch: (term: string) => Promise<SocialUser[]>;
  onMatchContacts: () => Promise<ContactsMatchResult>;
  onOpenPerson: (userId: string) => void;
  onFollow: (userId: string) => Promise<"accepted" | "pending">;
  contactsSupported: boolean;
};

function formatPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

function inviteOnWhatsApp(phone: string, name?: string) {
  const cleanNumber = phone.replace(/[^0-9]/g, "");
  const text = encodeURIComponent(
    `Hi${name ? " " + name : ""}! I'm on Apnajoda, a thoughtful matrimony app where people are serious about finding a life partner. Join me: https://apnajoda.com`,
  );
  const url = `https://wa.me/${cleanNumber}?text=${text}`;
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  Linking.openURL(url).catch(() => {
    Linking.openURL(`sms:${cleanNumber}?body=${text}`);
  });
}

export function FindPeopleScreen({
  onBack,
  onSearch,
  onMatchContacts,
  onOpenPerson,
  onFollow,
  contactsSupported,
}: FindPeopleProps) {
  const [tab, setTab] = useState<Tab>("username");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SocialUser[]>([]);
  const [contacts, setContacts] = useState<ContactsMatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const token = useRef(0);

  useEffect(() => {
    if (tab !== "username") return;
    const q = term.trim();
    setError("");
    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    const mine = (token.current += 1);
    setBusy(true);
    const timer = setTimeout(() => {
      onSearch(q)
        .then((found) => {
          if (mine !== token.current) return;
          setResults(found);
        })
        .catch((e) => {
          if (mine !== token.current) return;
          setError(e instanceof Error ? e.message : "Search failed.");
          setResults([]);
        })
        .finally(() => {
          if (mine === token.current) setBusy(false);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [term, onSearch, tab]);

  const loadContacts = async () => {
    setError("");
    setBusy(true);
    try {
      setContacts(await onMatchContacts());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not read your contacts.",
      );
      setContacts({ matched: [], unmatched: [] });
    } finally {
      setBusy(false);
    }
  };

  const follow = async (user: SocialUser) => {
    setPending((p) => ({ ...p, [user.userId]: true }));
    try {
      const status = await onFollow(user.userId);
      const patch = (list: SocialUser[]) =>
        list.map((u) =>
          u.userId === user.userId
            ? {
                ...u,
                likeStatus: (status === "accepted"
                  ? "accepted"
                  : "pending") as SocialUser["likeStatus"],
              }
            : u,
        );
      setResults(patch);
      setContacts((c) => (c ? { ...c, matched: patch(c.matched) } : c));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that like.");
    } finally {
      setPending((p) => ({ ...p, [user.userId]: false }));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.paperBase }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 100,
            paddingHorizontal: 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: MAX_WIDTH,
              alignSelf: "center",
              backgroundColor: palette.paper,
              borderRadius: radius.xl,
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
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
                  backgroundColor: palette.paperSand,
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
                Find people
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === "username" }}
                onPress={() => setTab("username")}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: radius.pill,
                  backgroundColor:
                    tab === "username" ? palette.navy : palette.paper,
                  borderWidth: tab === "username" ? 0 : 1,
                  borderColor: palette.rule,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemi,
                    fontSize: 13,
                    color: tab === "username" ? "#FFFFFF" : palette.ink,
                  }}
                >
                  Username
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === "contacts" }}
                onPress={() => {
                  setTab("contacts");
                  if (contacts === null && contactsSupported)
                    void loadContacts();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: radius.pill,
                  backgroundColor:
                    tab === "contacts" ? palette.navy : palette.paper,
                  borderWidth: tab === "contacts" ? 0 : 1,
                  borderColor: palette.rule,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemi,
                    fontSize: 13,
                    color: tab === "contacts" ? "#FFFFFF" : palette.ink,
                  }}
                >
                  My contacts
                </Text>
              </Pressable>
            </View>

            {tab === "username" ? (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: palette.paperSand,
                    borderRadius: radius.pill,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  <Ionicons name="search" size={20} color={palette.navy} />
                  <TextInput
                    accessibilityLabel="Search by username"
                    value={term}
                    onChangeText={setTerm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Search by username..."
                    placeholderTextColor={palette.navySoft}
                    selectionColor={palette.navy}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 15,
                      fontFamily: fonts.body,
                      color: palette.ink,
                      outlineStyle: "none" as any,
                    }}
                  />
                  {!!term && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear"
                      onPress={() => setTerm("")}
                      hitSlop={10}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={palette.slate}
                      />
                    </Pressable>
                  )}
                </View>

                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      color: palette.clay,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      marginBottom: 12,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </Text>
                )}

                {busy ? (
                  <View style={{ paddingVertical: 60, alignItems: "center" }}>
                    <ActivityIndicator color={palette.navy} />
                  </View>
                ) : results.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: palette.paperSand,
                      borderRadius: radius.lg,
                      padding: 24,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: palette.paper,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <Ionicons
                        name="people-outline"
                        size={30}
                        color={palette.navy}
                      />
                    </View>
                    <Text
                      style={{
                        fontFamily: fonts.display,
                        fontSize: typeScale.section,
                        color: palette.ink,
                        textAlign: "center",
                        marginBottom: 6,
                      }}
                    >
                      {term.trim().length < 2
                        ? "Who are you looking for?"
                        : `No one goes by "${term.trim()}"`}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: palette.slate,
                        textAlign: "center",
                        lineHeight: 19,
                        marginBottom: 20,
                        maxWidth: 360,
                      }}
                    >
                      {term.trim().length < 2
                        ? "Type at least 2 letters of a username. We'll show the best matches first."
                        : "Try a different username."}
                    </Text>

                    <Text
                      style={{
                        fontFamily: fonts.bodySemi,
                        fontSize: 11,
                        color: palette.slate,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        marginBottom: 10,
                      }}
                    >
                      Try searching
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        justifyContent: "center",
                      }}
                    >
                      {SUGGESTIONS.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setTerm(s)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: radius.pill,
                            backgroundColor: palette.paper,
                            borderWidth: 1,
                            borderColor: palette.rule,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.bodyMedium,
                              fontSize: 12,
                              color: palette.navy,
                            }}
                          >
                            {s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {results.map((user) => (
                      <PersonRow
                        key={user.userId}
                        user={user}
                        busy={!!pending[user.userId]}
                        onOpen={() => onOpenPerson(user.userId)}
                        onFollow={() => void follow(user)}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                {!contactsSupported ? (
                  <View
                    style={{
                      backgroundColor: palette.paperSand,
                      borderRadius: radius.lg,
                      padding: 24,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={36}
                      color={palette.navySoft}
                      style={{ marginBottom: 12 }}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: palette.slate,
                        textAlign: "center",
                        lineHeight: 20,
                      }}
                    >
                      Reading contacts is only available in the phone app.
                    </Text>
                  </View>
                ) : busy ? (
                  <View style={{ paddingVertical: 60, alignItems: "center" }}>
                    <ActivityIndicator color={palette.navy} />
                  </View>
                ) : contacts === null ? (
                  <View
                    style={{
                      backgroundColor: palette.paperSand,
                      borderRadius: radius.lg,
                      padding: 24,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: palette.paper,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <Ionicons
                        name="people-circle-outline"
                        size={32}
                        color={palette.navy}
                      />
                    </View>
                    <Text
                      style={{
                        fontFamily: fonts.display,
                        fontSize: typeScale.section,
                        color: palette.ink,
                        textAlign: "center",
                        marginBottom: 6,
                      }}
                    >
                      Find friends on Apnajoda
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: palette.slate,
                        textAlign: "center",
                        lineHeight: 19,
                        maxWidth: 360,
                        marginBottom: 20,
                      }}
                    >
                      We'll check your contacts once. Nothing is stored.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void loadContacts()}
                      style={{
                        backgroundColor: palette.navy,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        borderRadius: radius.pill,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="sync" size={18} color="#FFFFFF" />
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontFamily: fonts.bodySemi,
                          fontSize: 14,
                        }}
                      >
                        Check my contacts
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 20 }}>
                    {contacts.matched.length > 0 && (
                      <View>
                        <Text
                          style={{
                            fontFamily: fonts.bodySemi,
                            fontSize: 11,
                            color: palette.slate,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            marginBottom: 10,
                          }}
                        >
                          {contacts.matched.length} on Apnajoda
                        </Text>
                        <View style={{ gap: 8 }}>
                          {contacts.matched.map((user) => (
                            <PersonRow
                              key={user.userId}
                              user={user}
                              busy={!!pending[user.userId]}
                              onOpen={() => onOpenPerson(user.userId)}
                              onFollow={() => void follow(user)}
                            />
                          ))}
                        </View>
                      </View>
                    )}

                    {contacts.unmatched.length > 0 && (
                      <View>
                        <Text
                          style={{
                            fontFamily: fonts.bodySemi,
                            fontSize: 11,
                            color: palette.slate,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            marginBottom: 10,
                          }}
                        >
                          Invite {contacts.unmatched.length}{" "}
                          {contacts.unmatched.length === 1
                            ? "friend"
                            : "friends"}
                        </Text>
                        <View style={{ gap: 8 }}>
                          {contacts.unmatched.map((phone) => (
                            <View
                              key={phone}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderRadius: radius.lg,
                                backgroundColor: palette.paperSand,
                              }}
                            >
                              <View
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 20,
                                  backgroundColor: palette.paper,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Ionicons
                                  name="phone-portrait-outline"
                                  size={20}
                                  color={palette.navy}
                                />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  style={{
                                    fontFamily: fonts.bodyMedium,
                                    fontSize: 14,
                                    color: palette.ink,
                                  }}
                                >
                                  {formatPhone(phone)}
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: fonts.body,
                                    fontSize: 12,
                                    color: palette.slate,
                                    marginTop: 1,
                                  }}
                                >
                                  Not on Apnajoda yet
                                </Text>
                              </View>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Invite ${formatPhone(phone)} on WhatsApp`}
                                onPress={() => inviteOnWhatsApp(phone)}
                                style={{
                                  paddingHorizontal: 14,
                                  paddingVertical: 9,
                                  borderRadius: radius.pill,
                                  backgroundColor: "#25D366",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Ionicons
                                  name="logo-whatsapp"
                                  size={16}
                                  color="#FFFFFF"
                                />
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontFamily: fonts.bodySemi,
                                    fontSize: 13,
                                  }}
                                >
                                  Invite
                                </Text>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {contacts.matched.length === 0 &&
                      contacts.unmatched.length === 0 && (
                        <View
                          style={{
                            backgroundColor: palette.paperSand,
                            borderRadius: radius.lg,
                            padding: 24,
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="people-outline"
                            size={36}
                            color={palette.navySoft}
                            style={{ marginBottom: 12 }}
                          />
                          <Text
                            style={{
                              fontFamily: fonts.body,
                              fontSize: 14,
                              color: palette.slate,
                              textAlign: "center",
                              lineHeight: 20,
                            }}
                          >
                            No phone numbers found in your contacts.
                          </Text>
                        </View>
                      )}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PersonRow({
  user,
  busy,
  onOpen,
  onFollow,
}: {
  user: SocialUser;
  busy?: boolean;
  onOpen: () => void;
  onFollow?: () => void;
}) {
  const status = user.likeStatus ?? "none";
  const label =
    status === "accepted"
      ? "Matched"
      : status === "pending"
        ? "Liked"
        : status === "likes_you"
          ? "Accept"
          : "Like";
  const settled = status === "accepted" || status === "pending";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: radius.lg,
        backgroundColor: palette.paperSand,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${user.username}`}
        onPress={onOpen}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        {user.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: palette.paper,
            }}
          />
        ) : (
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: palette.paper,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: palette.rule,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 18,
                color: palette.crimson,
              }}
            >
              {(user.username || "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.display,
                fontSize: typeScale.section,
                color: palette.ink,
              }}
            >
              {user.username}
            </Text>
            {user.isPrivate && (
              <Ionicons name="lock-closed" size={12} color={palette.slate} />
            )}
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: palette.slate,
            }}
          >
            {status === "likes_you" ? `${user.name} · likes you` : user.name}
          </Text>
        </View>
      </Pressable>
      {onFollow && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${user.username}`}
          disabled={busy || settled}
          onPress={onFollow}
          style={{
            minWidth: 84,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: radius.pill,
            backgroundColor: settled ? palette.paper : palette.navy,
            borderWidth: settled ? 1 : 0,
            borderColor: palette.rule,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 13,
                color: settled ? palette.slate : "#FFFFFF",
              }}
            >
              {label}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function Avatar({
  user,
  size = 46,
}: {
  user: { avatarUrl?: string | null; username: string };
  size?: number;
}) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (user.avatarUrl) {
    return (
      <Image
        accessibilityLabel={`${user.username} profile photo`}
        source={{ uri: user.avatarUrl }}
        style={[dimension, { backgroundColor: palette.paperSand }]}
      />
    );
  }
  return (
    <View
      style={[
        dimension,
        {
          backgroundColor: palette.paperSand,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: palette.rule,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: size * 0.42,
          color: palette.crimson,
        }}
      >
        {(user.username || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}