/**
 * Gun Milan with someone: the badge on a card ("🪐 Gun 28/36") and the
 * sheet it opens - the score, both people's Rashi and Nakshatra, and (for
 * Premium) the eight kootas one by one.
 *
 * The words stay gentle: a low score is "Kam milan", never "do not marry",
 * and every sheet says this is a glimpse from tradition, not a full kundli.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { type KundliMatch, type KundliSide, kundliApi } from "../../api/kundliApi";
import { fonts, palette, radius } from "../../theme";
import { PressScale } from "../../components/motion";
import { Sheet } from "../posts/PostSheets";
import { gunBand, gunText } from "./kundli";
import { closeKundli, onKundli, openKundli, openKundliEditor } from "./kundliStore";

/** The pill on a card or profile. Nothing when either has no Rashi. */
export function GunBadge({
  gun,
  userId,
  name,
  large,
}: {
  gun: { score: number; max: number; full: boolean } | null | undefined;
  userId: string;
  name: string;
  large?: boolean;
}) {
  if (!gun) return null;
  const band = gunBand(gun.score, gun.max);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Gun Milan ${gunText(gun.score, gun.max)}, ${band.label}. See the kundli match`}
      onPress={() => openKundli(userId, name)}
      hitSlop={6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: large ? "center" : "flex-start",
        backgroundColor: "#FFF7E6",
        borderWidth: 1,
        borderColor: "#F4C77A",
        borderRadius: radius.pill,
        paddingHorizontal: large ? 12 : 9,
        paddingVertical: large ? 6 : 3,
      }}
    >
      <Text style={{ fontSize: large ? 14 : 12 }}>🪐</Text>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: large ? 14 : 12, color: "#7C2D12" }}>
        Gun {gunText(gun.score, gun.max)}
      </Text>
    </Pressable>
  );
}

function SideColumn({ title, side }: { title: string; side: KundliSide }) {
  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft, marginTop: 2 }}>
        <Text style={{ fontFamily: fonts.bodySemi, color: palette.ink }}>{label}: </Text>
        {value}
      </Text>
    ) : null;
  return (
    <View style={{ flex: 1, backgroundColor: palette.paperBase, borderRadius: 14, padding: 12 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.slate, marginBottom: 4 }}>{title}</Text>
      {side ? (
        <>
          {row("Rashi", side.rashi)}
          {row("Nakshatra", side.nakshatra)}
          {row("Gana", side.gana)}
          {row("Nadi", side.nadi)}
          {row("Manglik", side.manglik === true ? "Haan" : side.manglik === false ? "Nahi" : null)}
        </>
      ) : (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>Not added yet</Text>
      )}
    </View>
  );
}

export function KundliSheet({
  accessToken,
  userId,
  name,
  visible,
  onClose,
  onPremium,
}: {
  accessToken: string;
  userId: string;
  name: string;
  visible: boolean;
  onClose: () => void;
  onPremium: () => void;
}) {
  const [data, setData] = useState<KundliMatch | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    let live = true;
    setData(null);
    setError("");
    kundliApi
      .with(accessToken, userId)
      .then((result) => live && setData(result))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load the kundli match."));
    return () => {
      live = false;
    };
  }, [visible, accessToken, userId]);

  const result = data?.result ?? null;
  const band = result ? gunBand(result.total, result.max) : null;
  const first = name.split(/\s+/)[0] || name;

  return (
    <Sheet visible={visible} title="Gun Milan" tall onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 16 }}>
        {!data && !error && <ActivityIndicator color={palette.crimson} style={{ marginTop: 30 }} />}
        {!!error && <Text style={{ color: palette.crimson, fontFamily: fonts.body }}>{error}</Text>}

        {data && result && band && (
          <LinearGradient
            colors={["#3B0A45", "#B45309"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 20, alignItems: "center" }}
          >
            <Text style={{ fontSize: 18, letterSpacing: 6 }}>✨ 🪐 ✨</Text>
            <Text
              accessibilityLabel={`Gun Milan ${gunText(result.total, result.max)}`}
              style={{ marginTop: 6, fontFamily: fonts.display, fontSize: 56, lineHeight: 64, color: "#FFF7E6" }}
            >
              {gunText(result.total, result.max)}
            </Text>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: "#FDE68A" }}>
              {band.label} {band.emoji}
            </Text>
            <Text style={{ marginTop: 6, fontFamily: fonts.body, fontSize: 13, color: "#FFEFD5", textAlign: "center" }}>
              {result.full
                ? `Aapka aur ${first} ka Gun Milan`
                : "Sirf Rashi se (15 mein se). Dono ka Nakshatra ho to poora 36 ka milan dikhega."}
            </Text>
          </LinearGradient>
        )}

        {data && !result && (
          <View style={{ backgroundColor: palette.paperBase, borderRadius: 16, padding: 16, gap: 10 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: palette.ink }}>
              {!data.mine ? "Apni Rashi jodo, Gun Milan dekho" : `${first} ne abhi Rashi nahi jodi`}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.slate }}>
              {!data.mine
                ? "Rashi aur Nakshatra jodte hi har profile par aapka Gun Milan dikhega."
                : "Jab wo jodenge, yahan aapka Gun Milan dikhega."}
            </Text>
            {!data.mine && (
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Add my Rashi"
                onPress={() => {
                  onClose();
                  setTimeout(openKundliEditor, 200);
                }}
                containerStyle={{ alignSelf: "flex-start" }}
                style={{ backgroundColor: palette.crimson, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 }}
              >
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFFFFF" }}>Add my Rashi</Text>
              </PressScale>
            )}
          </View>
        )}

        {data && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SideColumn title="Aap" side={data.mine} />
            <SideColumn title={first} side={data.theirs} />
          </View>
        )}

        {data && result && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: palette.ink }}>Ashtakoot, koot by koot</Text>
            {result.kootas ? (
              result.kootas.map((koota) => (
                <View key={koota.key} accessibilityLabel={`${koota.name} ${koota.score} of ${koota.max}`} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                    <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink }}>
                      {koota.name}
                      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.slate }}>  {koota.about}</Text>
                    </Text>
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink }}>
                      {koota.score}/{koota.max}
                    </Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.paperSand, overflow: "hidden" }}>
                    <View
                      style={{
                        width: `${(koota.score / koota.max) * 100}%`,
                        height: "100%",
                        borderRadius: 4,
                        backgroundColor: koota.score === 0 ? "#D1D5DB" : koota.score >= koota.max * 0.75 ? "#059669" : "#D97706",
                      }}
                    />
                  </View>
                </View>
              ))
            ) : (
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "#F4C77A", backgroundColor: "#FFF7E6", padding: 14, gap: 10 }}>
                {["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"].map((koota) => (
                  <View key={koota} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ width: 96, fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft }}>{koota}</Text>
                    <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "#F3E3C3" }} />
                    <Ionicons name="lock-closed" size={13} color="#B45309" />
                  </View>
                ))}
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="See every koota with Premium"
                  onPress={() => {
                    onClose();
                    onPremium();
                  }}
                  style={{
                    marginTop: 4,
                    backgroundColor: "#7C2D12",
                    borderRadius: radius.pill,
                    paddingVertical: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="sparkles" size={16} color="#FDE68A" />
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: "#FFF7E6" }}>See every koota with Premium</Text>
                </PressScale>
              </View>
            )}
          </View>
        )}

        {data?.mine?.manglik != null && data?.theirs?.manglik != null && data.mine.manglik !== data.theirs.manglik && (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft }}>
            Ek Manglik hain aur ek nahi. Kai parivaar iske liye bhi kundli milwate hain.
          </Text>
        )}

        <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.slate }}>
          Ye parampara ke hisaab se ek jhalak hai, Rashi aur Nakshatra se. Poori kundli ke liye janam samay se kisi
          jaankar se milan karwayein. Rishta dil aur samajh se banta hai. 💛
        </Text>
      </ScrollView>
    </Sheet>
  );
}

/** Lives in the app shell: shows the sheet when a badge is tapped. */
export function KundliHost({ accessToken, onPremium }: { accessToken: string; onPremium: () => void }) {
  const [target, setTarget] = useState<{ userId: string; name: string } | null>(null);
  useEffect(() => onKundli(setTarget), []);
  if (!target) return null;
  return (
    <KundliSheet
      accessToken={accessToken}
      userId={target.userId}
      name={target.name}
      visible
      onClose={closeKundli}
      onPremium={onPremium}
    />
  );
}
