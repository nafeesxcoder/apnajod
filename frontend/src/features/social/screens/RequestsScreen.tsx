/**
 * Follow requests waiting on a private account.
 *
 * Accepting is what opens messaging between two private accounts, so the
 * screen says that rather than leaving the member to work out what the
 * button does.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import type { FollowRequest } from "../../../api/socialApi";
import { colors } from "../../../theme";
import { social } from "../../../theme/socialStyles";
import { Avatar } from "./FindPeopleScreen";

export function RequestsScreen({
  onBack,
  onLoad,
  onRespond,
  onOpenPerson,
}: {
  onBack: () => void;
  onLoad: () => Promise<FollowRequest[]>;
  onRespond: (userId: string, accept: boolean) => Promise<void>;
  onOpenPerson: (userId: string) => void;
}) {
  const [requests, setRequests] = useState<FollowRequest[] | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    onLoad()
      .then((r) => active && setRequests(r))
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load requests.");
        setRequests([]);
      });
    return () => {
      active = false;
    };
  }, [onLoad]);

  const respond = async (userId: string, accept: boolean) => {
    setBusy((b) => ({ ...b, [userId]: true }));
    try {
      await onRespond(userId, accept);
      setRequests((list) => (list ?? []).filter((r) => r.userId !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy((b) => ({ ...b, [userId]: false }));
    }
  };

  return (
    <View style={social.root}>
      <SafeAreaView style={social.safe}>
        <View style={social.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={onBack}
            style={social.back}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={social.headerTitle}>Requests</Text>
        </View>

        {!!error && (
          <Text accessibilityRole="alert" style={social.error}>
            {error}
          </Text>
        )}

        {requests === null ? (
          <View style={social.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : requests.length === 0 ? (
          <View style={social.center}>
            <Ionicons name="checkmark-done-outline" size={34} color={colors.muted} />
            <Text style={social.emptyText}>
              No one is waiting. Requests from people who want to follow you
              appear here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={social.listContent} showsVerticalScrollIndicator={false}>
            {requests.map((request) => (
              <View key={request.userId} style={social.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${request.username}`}
                  onPress={() => onOpenPerson(request.userId)}
                  style={social.rowMain}
                >
                  <Avatar user={request} />
                  <View style={social.rowText}>
                    <Text numberOfLines={1} style={social.rowTitle}>
                      {request.username}
                    </Text>
                    <Text numberOfLines={1} style={social.rowSub}>
                      wants to follow you
                    </Text>
                  </View>
                </Pressable>
                <View style={social.requestActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Accept ${request.username}`}
                    disabled={!!busy[request.userId]}
                    onPress={() => void respond(request.userId, true)}
                    style={social.requestAccept}
                  >
                    {busy[request.userId] ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <Text style={social.requestAcceptText}>Accept</Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Decline ${request.username}`}
                    disabled={!!busy[request.userId]}
                    onPress={() => void respond(request.userId, false)}
                    style={social.requestDecline}
                  >
                    <Text style={social.requestDeclineText}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
