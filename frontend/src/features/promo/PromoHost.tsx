/**
 * Shows the offer popup each time the app opens (and when the app comes
 * back after a while), until the member closes it. "Use it" opens Premium
 * with the coupon already on.
 */
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { PromoPopup } from "./PromoPopup";
import { usePromo } from "./promoStore";
import { setPendingCoupon } from "../premium/couponStore";

/** Away this long, and the popup shows again on return. */
const AWAY_MS = 10 * 60 * 1000;

export function PromoHost({ onOpenPremium, hidden }: { onOpenPremium: () => void; hidden?: boolean }) {
  const promo = usePromo();
  const [closedId, setClosedId] = useState<string | null>(null);

  // Back after a while counts as opening the app again.
  useEffect(() => {
    let hiddenAt = 0;
    const away = () => {
      hiddenAt = Date.now();
    };
    const back = () => {
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) setClosedId(null);
      hiddenAt = 0;
    };
    if (typeof document !== "undefined") {
      const onVisibility = () => (document.visibilityState === "hidden" ? away() : back());
      document.addEventListener("visibilitychange", onVisibility);
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }
    const sub = AppState.addEventListener("change", (state) => (state === "active" ? back() : away()));
    return () => sub.remove();
  }, []);

  // Not over Premium or the admin panel; it waits until they leave.
  if (hidden || !promo || promo.id === closedId) return null;
  if (promo.endsAt && new Date(promo.endsAt).getTime() <= Date.now()) return null;
  return (
    <PromoPopup
      promo={promo}
      visible
      onClose={() => setClosedId(promo.id)}
      onCta={() => {
        setClosedId(promo.id);
        setPendingCoupon(promo.couponCode);
        onOpenPremium();
      }}
    />
  );
}
