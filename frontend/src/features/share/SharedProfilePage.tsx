import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { shareApi, type SharedProfileView } from "../../api/shareApi";
import { intentBadges } from "../../domain/intentBadges";
import { palette, radius } from "../../theme";

/**
 * What family sees when they open a "show my family" link.
 *
 * No account and no app needed. It shows only the limited card the server
 * sends - nothing to find or contact the person by - and when the link
 * stops working. Plain system fonts on purpose: this page loads before,
 * and without, the rest of the app.
 */
function formatDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function SharedProfilePage({ token }: { token: string }) {
  const [data, setData] = useState<SharedProfileView | null>(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    let live = true;
    shareApi
      .view(token)
      .then((result) => {
        if (live) setData(result);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "This link is not available.");
      });
    return () => {
      live = false;
    };
  }, [token]);

  const home = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = window.location.origin;
    } else {
      void Linking.openURL("https://apnajoda.com");
    }
  };

  const shell = (children: React.ReactNode) => (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.paperBase }}
      contentContainerStyle={{ alignItems: "center", padding: 16, paddingBottom: 48 }}
    >
      <View style={{ width: "100%", maxWidth: 480, gap: 16 }}>
        <Text
          style={{
            textAlign: "center",
            fontSize: 22,
            fontWeight: "700",
            color: palette.navy,
            marginTop: 8,
          }}
        >
          Apnajoda
        </Text>
        {children}
      </View>
    </ScrollView>
  );

  if (error) {
    return shell(
      <View style={{ alignItems: "center", gap: 12, padding: 24 }}>
        <Text style={{ fontSize: 40 }}>🔗</Text>
        <Text style={{ fontSize: 17, fontWeight: "600", color: palette.ink, textAlign: "center" }}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={home}
          style={{
            backgroundColor: palette.navy,
            borderRadius: radius.pill,
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Go to Apnajoda</Text>
        </Pressable>
      </View>,
    );
  }

  if (!data) {
    return shell(
      <View style={{ padding: 48, alignItems: "center" }}>
        <ActivityIndicator color={palette.navy} />
      </View>,
    );
  }

  const p = data.profile;
  const badges = intentBadges(p.intent ?? {});
  const photos = p.photos.length ? p.photos : [];

  return shell(
    <>
      <Text style={{ textAlign: "center", fontSize: 14, color: palette.slate }}>
        {data.own
          ? `${data.sharedBy} shared their own profile with you`
          : `${data.sharedBy} shared this profile with you`}
      </Text>

      <View
        style={{
          backgroundColor: palette.paper,
          borderRadius: radius.xl,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: palette.rule,
        }}
      >
        {photos.length > 0 ? (
          <Image
            accessibilityLabel={`${p.firstName}'s photo`}
            source={{ uri: photos[photo] }}
            style={{ width: "100%", aspectRatio: 4 / 5, backgroundColor: palette.paperSand }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: "100%", aspectRatio: 4 / 5, backgroundColor: palette.paperSand }} />
        )}
        {photos.length > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, padding: 10 }}>
            {photos.map((url, index) => (
              <Pressable
                key={url}
                accessibilityRole="button"
                accessibilityLabel={`Photo ${index + 1}`}
                onPress={() => setPhoto(index)}
              >
                <Image
                  source={{ uri: url }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: index === photo ? palette.navy : "transparent",
                  }}
                />
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ padding: 18, gap: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: palette.ink }}>
            {p.firstName}
            {p.age ? `, ${p.age}` : ""}
            {p.verified ? "  ✅" : ""}
          </Text>
          {!!(p.city || p.profession) && (
            <Text style={{ fontSize: 15, color: palette.slate }}>
              {[p.city, p.profession].filter(Boolean).join("  ·  ")}
            </Text>
          )}
          {p.verified && (
            <Text style={{ fontSize: 13, color: palette.emerald, fontWeight: "600" }}>
              Selfie verified by Apnajoda
            </Text>
          )}
          {badges.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {badges.map((badge) => (
                <View
                  key={badge.key}
                  style={{
                    borderRadius: radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: palette.paperSand,
                  }}
                >
                  <Text style={{ fontSize: 13, color: palette.ink, fontWeight: "600" }}>
                    {badge.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {!!p.about && (
            <Text style={{ fontSize: 15, lineHeight: 22, color: palette.ink, marginTop: 6 }}>
              {p.about}
            </Text>
          )}
        </View>
      </View>

      <Text style={{ textAlign: "center", fontSize: 12, color: palette.slate }}>
        This private link stops working on {formatDate(data.expiresAt)}. Please do not
        forward it outside your family.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={home}
        style={{
          alignSelf: "center",
          backgroundColor: palette.navy,
          borderRadius: radius.pill,
          paddingHorizontal: 22,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Find your match on Apnajoda</Text>
      </Pressable>
    </>,
  );
}
