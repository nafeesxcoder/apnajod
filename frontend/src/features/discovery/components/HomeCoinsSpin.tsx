import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { showDailySpin } from "../../ludo/DailySpin";
import { CoinChip, useWallet } from "../../ludo/LudoStore";
import { colors, fonts, palette } from "../../../theme";
import { spinStatus } from "./spinStatus";

const spinWheel = require("../../../../assets/spin-wheel.png");

/**
 * Your coins and the daily spin, in the Home header. A red dot shows when a
 * free spin is ready; tapping before that shows when the next one is.
 */
export function HomeCoinsSpin({ accessToken, onOpenGames }: { accessToken: string; onOpenGames: () => void }) {
  const wallet = useWallet(accessToken);
  const [now, setNow] = useState(() => Date.now());
  const [hint, setHint] = useState("");

  // Re-check every minute, so the dot appears when the 24 hours are up.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(""), 3000);
    return () => clearTimeout(timer);
  }, [hint]);

  const status = wallet ? spinStatus(wallet.spinReadyAt, now) : null;
  const ready = !!status?.ready;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <CoinChip coins={wallet?.coins} onPress={onOpenGames} size={13} />
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ready ? "Daily spin ready, tap to spin" : status?.label ?? "Daily spin"}
          onPress={() => (ready ? showDailySpin() : setHint(status?.label ?? ""))}
          hitSlop={8}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(246,196,69,0.16)",
            borderWidth: 1,
            borderColor: "rgba(246,196,69,0.5)",
          }}
        >
          <Image source={spinWheel} style={{ width: 24, height: 24 }} resizeMode="contain" />
          {ready && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 11,
                height: 11,
                borderRadius: 6,
                backgroundColor: palette.crimson,
                borderWidth: 2,
                borderColor: "#FFFFFF",
              }}
            />
          )}
        </Pressable>
        {!!hint && (
          <Text
            accessibilityRole="alert"
            style={{
              position: "absolute",
              top: 38,
              right: 0,
              width: 180,
              textAlign: "right",
              fontFamily: fonts.bodySemi,
              fontSize: 12,
              color: colors.text,
            }}
          >
            {hint}
          </Text>
        )}
      </View>
    </View>
  );
}
