/**
 * Ludo settings and store: choose the board, sounds, dice and tokens you
 * have, unlock more with coins, see your emoji and quick-chat packs, set
 * the volume and token speed, and swap coins for a Spark, a Super Like or a Boost.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { coinsApi, type GameWallet, type StoreItem } from "../../api/coinsApi";
import { Modal } from "../../components/BackModal";
import { fonts } from "../../theme";
import { SEAT_COLORS } from "./board";
import { DiceFace, SoundPanelBody } from "./LudoBits";
import { BOARD_THEMES, DICE_SKINS, PREF_OF, splitKey, TOKEN_STYLES, type LudoPrefs } from "./ludoLooks";
import { ludoPrefs } from "./ludoPrefs";
import { ludoSound } from "./ludoSound";
import { walletStore } from "./walletStore";

const TABS: { kind: StoreItem["kind"] | "swap"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: "theme", label: "Boards", icon: "grid" },
  { kind: "sound", label: "Sounds", icon: "musical-notes" },
  { kind: "dice", label: "Dice", icon: "cube" },
  { kind: "token", label: "Tokens", icon: "ellipse" },
  { kind: "emoji", label: "Emoji", icon: "happy" },
  { kind: "chat", label: "Chat", icon: "chatbubble-ellipses" },
  { kind: "swap", label: "Swap", icon: "swap-horizontal" },
];

const S = { bg: "#160B3A", card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.14)", text: "#FFFFFF", soft: "#F2B6CF", gold: "#F6C445", green: "#22C55E" };

// Swap deals: an icon for each (no emoji, so it draws the same everywhere).
const DEAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  spark: "sparkles-outline",
  superlike: "star-outline",
  boost: "rocket-outline",
};

export function useLudoPrefs() {
  const [prefs, setPrefs] = useState<LudoPrefs>(ludoPrefs.get());
  useEffect(() => {
    void ludoPrefs.load().then(setPrefs);
    return ludoPrefs.subscribe(() => setPrefs(ludoPrefs.get()));
  }, []);
  return prefs;
}

export function useWallet(accessToken: string) {
  const [wallet, setWallet] = useState<GameWallet | null>(walletStore.get());
  useEffect(() => {
    void walletStore.refresh(accessToken);
    return walletStore.subscribe(() => setWallet(walletStore.get()));
  }, [accessToken]);
  return wallet;
}

const coinImage = require("../../../assets/coin.png");

/** The gold coin icon shown next to coin counts. */
export function CoinIcon({ size = 14 }: { size?: number }) {
  return <Image source={coinImage} style={{ width: size + 8, height: size + 8 }} resizeMode="contain" />;
}

export function CoinChip({ coins, onPress, size = 14 }: { coins: number | null | undefined; onPress?: () => void; size?: number }) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: "rgba(246,196,69,0.16)", borderWidth: 1, borderColor: "rgba(246,196,69,0.5)" }}>
      <CoinIcon size={size} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size, color: S.gold }}>{coins ?? "…"}</Text>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${coins ?? 0} coins. Open the Ludo store`} onPress={onPress} hitSlop={6}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

function Preview({ item }: { item: StoreItem }) {
  const { kind, look } = splitKey(item.key);
  if (kind === "theme") {
    const t = BOARD_THEMES[look]!;
    return (
      <LinearGradient colors={t.frame} style={{ width: 64, height: 64, borderRadius: 12, padding: 4 }}>
        <View style={{ flex: 1, borderRadius: 8, overflow: "hidden", backgroundColor: t.cell, flexDirection: "row", flexWrap: "wrap" }}>
          {SEAT_COLORS.map((c, i) => (
            <View key={c} style={{ width: "50%", height: "50%", backgroundColor: i === 1 || i === 2 ? t.cell : c, alignItems: "center", justifyContent: "center" }}>
              {i === 1 || i === 2 ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SEAT_COLORS[i] }} /> : null}
            </View>
          ))}
          <View style={{ position: "absolute", left: 20, top: 20, width: 16, height: 16, borderRadius: 8, backgroundColor: t.center, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 9, color: "#FFF" }}>{t.centerMark ?? "★"}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }
  if (kind === "dice") return <DiceFace value={5} size={52} skin={DICE_SKINS[look]} />;
  if (kind === "token") {
    const style = TOKEN_STYLES[look]!;
    return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[0, 2].map((seat) => (
          <View
            key={seat}
            style={{
              width: 28,
              height: 28,
              borderRadius: style.shape === "gem" ? 6 : 14,
              backgroundColor: SEAT_COLORS[seat],
              borderWidth: 2,
              borderColor: "#FFF",
              alignItems: "center",
              justifyContent: "center",
              transform: style.shape === "gem" ? [{ rotate: "45deg" }, { scale: 0.85 }] : undefined,
            }}
          >
            {style.mark ? <Text style={{ color: "#FFF", fontSize: 14, transform: style.shape === "gem" ? [{ rotate: "-45deg" }] : undefined }}>{style.mark}</Text> : <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.25)" }} />}
          </View>
        ))}
      </View>
    );
  }
  if (kind === "sound") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Hear ${item.name}`}
        onPress={() => ludoSound.preview(look)}
        style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="play" size={22} color={S.text} />
      </Pressable>
    );
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, maxWidth: 140 }}>
      {(item.items ?? []).map((value) =>
        kind === "emoji" ? (
          <Text key={value} style={{ fontSize: 22 }}>
            {value}
          </Text>
        ) : (
          <View key={value} style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: S.text }}>{value}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function LudoStore({ visible, accessToken, onClose, startTab = "theme" }: { visible: boolean; accessToken: string; onClose: () => void; startTab?: (typeof TABS)[number]["kind"] }) {
  const wallet = useWallet(accessToken);
  const prefs = useLudoPrefs();
  const [tab, setTab] = useState<(typeof TABS)[number]["kind"]>(startTab);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setTab(startTab);
      setNote("");
      setConfirm(null);
    }
  }, [visible, startTab]);

  const act = async (key: string, work: () => Promise<GameWallet>, done: (w: GameWallet) => string) => {
    setBusy(key);
    setNote("");
    try {
      const next = await work();
      walletStore.set(next);
      setNote(done(next));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const use = (item: StoreItem) => {
    const { kind, look } = splitKey(item.key);
    const pref = PREF_OF[kind];
    if (pref) ludoPrefs.set({ [pref]: look } as Partial<LudoPrefs>);
    if (kind === "sound") ludoSound.preview(look);
  };

  const unlocked = new Set(wallet?.unlocked ?? []);
  const items = (wallet?.catalog ?? []).filter((item) => item.kind === tab);
  const progress = wallet && wallet.nextAt ? Math.min(1, (wallet.xp - wallet.levelFrom) / (wallet.nextAt - wallet.levelFrom)) : 1;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: S.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close store" onPress={onClose} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: S.card, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={22} color={S.text} />
            </Pressable>
            <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 22, color: S.text }}>Ludo Store & Settings</Text>
            <CoinChip coins={wallet?.coins} />
          </View>

          {/* Level */}
          {wallet && (
            <View style={{ marginHorizontal: 14, marginBottom: 10, padding: 12, borderRadius: 16, backgroundColor: S.card, borderWidth: 1, borderColor: S.border, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: S.text }}>
                  {wallet.level === "Diamond" ? "💎" : wallet.level === "Gold" ? "🥇" : wallet.level === "Silver" ? "🥈" : "🥉"} {wallet.level}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: S.soft }}>
                  {wallet.wins} wins · {wallet.games} games{wallet.streak > 1 ? ` · 🔥 ${wallet.streak} in a row` : ""}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <LinearGradient colors={["#FDE68A", "#F59E0B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${progress * 100}%`, height: "100%" }} />
              </View>
              {!!wallet.nextLevel && (
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: S.soft }}>
                  {wallet.nextAt! - wallet.xp} more coins earned to reach {wallet.nextLevel}
                </Text>
              )}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }} style={{ flexGrow: 0 }}>
            {TABS.map((t) => (
              <Pressable
                key={t.kind}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.kind }}
                accessibilityLabel={t.label}
                onPress={() => setTab(t.kind)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, backgroundColor: tab === t.kind ? S.gold : S.card }}
              >
                <Ionicons name={t.icon} size={15} color={tab === t.kind ? "#8A1A47" : S.text} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: tab === t.kind ? "#8A1A47" : S.text }}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {!!note && (
            <Text accessibilityLiveRegion="polite" style={{ marginHorizontal: 16, marginTop: 10, fontFamily: fonts.bodySemi, fontSize: 13, color: S.gold }}>
              {note}
            </Text>
          )}

          <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 40 }}>
            {!wallet && <ActivityIndicator color={S.gold} style={{ marginTop: 30 }} />}

            {tab === "sound" && (
              <View style={{ padding: 12, borderRadius: 16, backgroundColor: S.card, borderWidth: 1, borderColor: S.border, gap: 12 }}>
                <SoundPanelBody />
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: S.text }}>Fast tokens</Text>
                  <Switch accessibilityLabel="Fast tokens" value={prefs.speed === "fast"} onValueChange={(on) => ludoPrefs.set({ speed: on ? "fast" : "normal" })} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: S.text }}>Vibrate on my turn and cuts</Text>
                  <Switch accessibilityLabel="Vibrate" value={prefs.vibrate} onValueChange={(on) => ludoPrefs.set({ vibrate: on })} />
                </View>
              </View>
            )}

            {tab === "swap" && wallet && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: S.soft }}>Swap your coins for things that help you match.</Text>
                {Object.entries(wallet.exchange).map(([what, deal]) => (
                  <View key={what} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: S.card, borderWidth: 1, borderColor: S.border }}>
                    <Ionicons name={DEAL_ICON[what] ?? "gift-outline"} size={28} color={S.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: S.text }}>{deal.label}</Text>
                      <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: S.soft }}>{deal.coins} coins</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Swap ${deal.coins} coins for ${deal.label}`}
                      disabled={busy === what || wallet.coins < deal.coins}
                      onPress={() =>
                        confirm === what
                          ? void act(what, () => coinsApi.exchange(accessToken, what), (w) => `You got ${w.got ?? deal.label}! 🎉`)
                          : setConfirm(what)
                      }
                      style={{ paddingHorizontal: 16, height: 38, borderRadius: 19, justifyContent: "center", backgroundColor: wallet.coins < deal.coins ? "rgba(255,255,255,0.1)" : confirm === what ? S.green : S.gold }}
                    >
                      {busy === what ? <ActivityIndicator color="#8A1A47" /> : <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: wallet.coins < deal.coins ? S.soft : "#8A1A47" }}>{confirm === what ? "Sure?" : "Swap"}</Text>}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {items.map((item) => {
              const { kind, look } = splitKey(item.key);
              const have = unlocked.has(item.key);
              const pref = PREF_OF[kind];
              const inUse = !!pref && prefs[pref] === look;
              const afford = (wallet?.coins ?? 0) >= item.price;
              return (
                <View
                  key={item.key}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: inUse ? "rgba(246,196,69,0.12)" : S.card, borderWidth: 1.5, borderColor: inUse ? S.gold : S.border }}
                >
                  <Preview item={item} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: S.text }}>{item.name}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12, color: S.soft }}>
                      {inUse ? "In use" : have ? (pref ? "Yours - tap Use" : "Yours - use it in games") : item.price === 0 ? "Free" : `${item.price} coins`}
                    </Text>
                  </View>
                  {have ? (
                    pref && !inUse ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Use ${item.name}`} onPress={() => use(item)} style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: "center", backgroundColor: S.green }}>
                        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: "#FFF" }}>Use</Text>
                      </Pressable>
                    ) : inUse ? (
                      <Ionicons name="checkmark-circle" size={26} color={S.gold} />
                    ) : (
                      <Ionicons name="checkmark" size={22} color={S.green} />
                    )
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unlock ${item.name} for ${item.price} coins`}
                      disabled={busy === item.key}
                      onPress={() =>
                        !afford
                          ? setNote(`You need ${item.price - (wallet?.coins ?? 0)} more coins. Win games and spin daily!`)
                          : confirm === item.key
                            ? void act(item.key, () => coinsApi.unlock(accessToken, item.key), () => {
                                use(item);
                                return `${item.name} unlocked! 🎉`;
                              })
                            : setConfirm(item.key)
                      }
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: confirm === item.key ? S.green : afford ? S.gold : "rgba(255,255,255,0.1)" }}
                    >
                      {busy === item.key ? (
                        <ActivityIndicator color="#8A1A47" />
                      ) : (
                        <>
                          <Ionicons name={confirm === item.key ? "checkmark" : "lock-closed"} size={13} color={afford ? "#8A1A47" : S.soft} />
                          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: afford ? "#8A1A47" : S.soft }}>{confirm === item.key ? "Unlock?" : item.price}</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
