import { Platform, type ViewStyle } from "react-native";
import { palette } from "../theme";

/**
 * The Navy x Crimson card look (design Option A), in one place.
 *
 * - The single most important card on a screen is a HERO: a navy gradient
 *   with white text.
 * - Every other card is WHITE with a soft shadow; information cards get a
 *   thin navy-to-crimson BAR along the top.
 * - Small labels (a countdown, "New") are crimson-on-pink PILLS.
 * - Profile photos sit in a turning navy/crimson RING.
 */
export const brand = {
  heroGradient: [palette.navy, palette.navyDeep] as const,
  barGradient: [palette.navy, palette.crimson] as const,
  ringGradient: [palette.navy, palette.crimson, palette.navy] as const,
  /** Text on the navy hero (8:1 on navy). */
  onHero: "#FFFFFF",
  /** Secondary text on the navy hero (4.9:1 on navy). */
  onHeroSoft: "#C9D8E8",
  pillBg: palette.crimsonTint,
  pillText: palette.crimson,
};

/** A soft card shadow that works on web, iOS and Android. */
export const cardShadow: ViewStyle =
  Platform.OS === "web"
    ? ({ boxShadow: "0 6px 18px rgba(20,32,46,0.07)" } as ViewStyle)
    : {
        shadowColor: "#14202E",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      };

/** The white card every non-hero card uses. */
export const whiteCard: ViewStyle = {
  backgroundColor: palette.paper,
  borderRadius: 18,
  ...cardShadow,
};
