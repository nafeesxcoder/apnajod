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

/**
 * A soft card shadow that works on web, iOS and Android. Close to centred
 * (2px down), so the card's top edge still shows on a white page - a
 * deeper drop made the top bar of an info card look like it floated above.
 */
export const cardShadow: ViewStyle =
  Platform.OS === "web"
    ? ({ boxShadow: "0 2px 16px rgba(20,32,46,0.09)" } as ViewStyle)
    : {
        shadowColor: "#14202E",
        shadowOpacity: 0.09,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      };

/** The white card every non-hero card uses. */
export const whiteCard: ViewStyle = {
  backgroundColor: palette.paper,
  borderRadius: 18,
  ...cardShadow,
};
