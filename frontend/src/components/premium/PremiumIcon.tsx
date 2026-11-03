/**
 * The app's icon chip.
 *
 * This component appears several hundred times across the app, so it carries
 * more of the visual identity than any screen does. It used to be a dark
 * crimson orb with a gradient, an inner highlight and a coloured glow — five
 * layers per icon, built for the old night-time look.
 *
 * On the daylight palette it is one flat tinted chip: a soft wash of the tone
 * behind the glyph in that tone at full strength. No gradients, no shadows,
 * no inner rings. Colour alone carries the meaning, and the chip stays legible
 * at the 24px sizes it is used at most often.
 */
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, font, palette } from '../../theme';

export type PremiumIconTone = 'ruby' | 'gold' | 'plum' | 'rose' | 'dark';

/**
 * Tone names are inherited from the old palette and used in ~300 call sites,
 * so they stay. What each one means has changed:
 *   ruby  — the primary action colour (indigo)
 *   gold  — the accent (brass)
 *   plum  — a deeper, quieter indigo
 *   rose  — the romantic register, used sparingly
 *   dark  — neutral slate
 */
const tones: Record<PremiumIconTone, { wash: string; ink: string; edge: string }> = {
  ruby: { wash: '#F3EDE1', ink: palette.indigo, edge: '#E5DCCE' },
  gold: { wash: '#EBE4D6', ink: palette.brass, edge: '#E2CA93' },
  plum: { wash: '#F0E9DC', ink: palette.indigoDeep, edge: '#E2D9CB' },
  rose: { wash: '#F9F4EB', ink: palette.rose, edge: '#EBE4D6' },
  dark: { wash: '#F1EBDE', ink: palette.slate, edge: '#E6DED0' },
};

type PremiumIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  tone?: PremiumIconTone;
  size?: number;
  iconSize?: number;
  /**
   * Was a glassy treatment in the old identity. It now means "solid": the
   * chip fills with the tone and the glyph is knocked out of it, for the few
   * places that need an icon to carry real weight.
   */
  referenceGlass?: boolean;
};

export function PremiumIcon({
  name,
  tone = 'ruby',
  size = 44,
  iconSize = 20,
  referenceGlass = false,
}: PremiumIconProps) {
  const { wash, ink, edge } = tones[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        // A squircle rather than a circle below ~36px: the flat wash reads as
        // a tag at small sizes and a circle makes it look like a dot.
        borderRadius: size >= 36 ? size / 2 : size * 0.32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: referenceGlass ? ink : wash,
        borderWidth: 1,
        borderColor: referenceGlass ? ink : edge,
      }}
    >
      <Ionicons name={name} size={iconSize} color={referenceGlass ? colors.textInverse : ink} />
    </View>
  );
}

/** A smaller chip for inline rows. Same language, tighter geometry. */
export function MiniPremiumIcon({
  name,
  tone = 'ruby',
  size = 28,
  iconSize = 13,
  referenceGlass = false,
}: PremiumIconProps) {
  return (
    <PremiumIcon
      name={name}
      tone={tone}
      size={size}
      iconSize={iconSize}
      referenceGlass={referenceGlass}
    />
  );
}

/**
 * The tile used behind back arrows and toolbar glyphs. It sits on the canvas
 * rather than on a card, so it gets the paper background to lift off it.
 */
export function ReferenceIconTile({
  name,
  orbSize = 30,
  iconSize = 14,
  tilePadding = 10,
  tone = 'ruby',
}: {
  name: keyof typeof Ionicons.glyphMap;
  orbSize?: number;
  iconSize?: number;
  tilePadding?: number;
  tone?: PremiumIconTone;
}) {
  const side = orbSize + tilePadding;
  return (
    <View
      style={{
        width: side,
        height: side,
        borderRadius: side * 0.34,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Ionicons name={name} size={iconSize} color={tones[tone].ink} />
    </View>
  );
}

/**
 * The Rose / Spark mark. It used to be a photograph of a red rose; it is now
 * drawn, so it inherits the palette and costs nothing to load.
 */
export function RoseMark({ size = 34 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9F4EB',
        borderWidth: 1,
        borderColor: '#EBE4D6',
      }}
    >
      <Text style={{ fontFamily: font.semibold, fontSize: size * 0.5, color: palette.rose }}>
        ✿
      </Text>
    </View>
  );
}
