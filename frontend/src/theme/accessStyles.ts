/**
 * Styles for the sign-up / sign-in flow.
 *
 * Kept separate from `appStyles` on purpose: this is the first thing every
 * member sees, so it is built on the new tokens with no inherited gradients,
 * glows or shadows. Structure comes from one hairline and a background step —
 * the only thing allowed to be loud is the mobile-number field.
 *
 * Radius varies by role rather than being one value everywhere: fields are
 * 14 (quiet), the primary action is a pill (the thing to press), the photo
 * well is a circle (it holds a face).
 */
import { StyleSheet } from 'react-native';

import { colors, font, palette, typeScale } from '../theme';

const GUTTER = 22;

export const access = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  page: {
    flexGrow: 1,
    // `width: '100%'` is load-bearing. With only maxWidth + alignSelf:'center',
    // react-native-web sizes this flex item to its max-content width; on a
    // narrow phone that is wider than the viewport, and the overflow is split
    // evenly either side, so the left edge of every screen is cut off.
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: 32,
    gap: 26,
  },

  // ---- Chrome ----
  back: {
    width: 44,
    height: 44,
    marginLeft: -10,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: { height: 14 },

  wordmark: {
    fontFamily: font.semibold,
    fontSize: 15,
    letterSpacing: 2.4,
    color: colors.accent,
  },

  // ---- Headings: the scale jump is the personality ----
  heading: { gap: 8 },
  title: {
    fontFamily: font.bold,
    fontSize: typeScale.display,
    lineHeight: typeScale.display * 1.14,
    color: colors.text,
  },
  lede: {
    fontFamily: font.regular,
    fontSize: typeScale.body,
    lineHeight: 23,
    color: colors.muted,
    maxWidth: 380,
  },

  stack: { gap: 18 },

  // ---- Fields ----
  field: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  label: {
    fontFamily: font.semibold,
    fontSize: typeScale.label,
    color: colors.text,
  },
  help: {
    fontFamily: font.regular,
    fontSize: typeScale.caption,
    lineHeight: 17,
    color: colors.muted,
  },
  error: {
    fontFamily: font.medium,
    fontSize: typeScale.caption,
    lineHeight: 17,
    color: colors.danger,
  },
  formError: {
    fontFamily: font.medium,
    fontSize: typeScale.label,
    lineHeight: 19,
    color: colors.danger,
    paddingVertical: 2,
  },

  inputBox: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputNarrow: { width: 104 },
  inputBad: { borderColor: colors.danger, backgroundColor: '#FDFBF6' },
  input: {
    flex: 1,
    minWidth: 0,
    outlineWidth: 0,
    paddingVertical: 14,
    fontFamily: font.medium,
    fontSize: 17,
    color: colors.text,
  },
  reveal: { paddingHorizontal: 4, paddingVertical: 6 },
  revealText: {
    fontFamily: font.semibold,
    fontSize: typeScale.label,
    color: colors.accent,
  },

  // ---- The one loud element: the mobile number ----
  phoneBox: {
    minHeight: 68,
    overflow: 'hidden',
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dial: {
    fontFamily: font.semibold,
    fontSize: 20,
    color: colors.accent,
  },
  dialRule: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 14,
    backgroundColor: colors.line,
  },
  phoneInput: {
    flex: 1,
    // Without this the input cannot shrink below its content width on web and
    // the field overflows the screen.
    minWidth: 0,
    outlineWidth: 0,
    paddingVertical: 14,
    fontFamily: font.semibold,
    fontSize: 24,
    letterSpacing: 1.6,
    color: colors.text,
  },

  codeInput: {
    height: 76,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accentSoft,
    outlineWidth: 0,
    textAlign: 'center',
    fontFamily: font.bold,
    fontSize: 32,
    letterSpacing: 12,
    color: colors.text,
  },

  // ---- Actions ----
  action: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  actionPressed: { backgroundColor: colors.wineDeep },
  actionOff: { backgroundColor: '#635A5D' },
  actionText: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.textInverse,
  },

  secondary: {
    minHeight: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: { backgroundColor: colors.surface2 },
  secondaryText: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: colors.text,
  },

  textAction: {
    fontFamily: font.semibold,
    fontSize: typeScale.label,
    color: colors.accent,
  },
  textActionOff: { color: colors.muted },

  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footText: {
    fontFamily: font.regular,
    fontSize: typeScale.label,
    color: colors.muted,
  },
  forgotRow: { alignItems: 'flex-end' },

  legal: {
    fontFamily: font.regular,
    fontSize: typeScale.caption,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },

  // ---- Welcome panel: the Devanagari wordmark is the hero ----
  welcomeArt: {
    flexGrow: 1,
    minHeight: 150,
    borderRadius: 24,
    backgroundColor: palette.paperWarm,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeArtMark: {
    fontFamily: font.bold,
    fontSize: 64,
    lineHeight: 86,
    // The tint was too pale to read against the card it sits on.
    color: colors.accent,
  },

  // ---- Quick profile ----
  photoRow: {
    minHeight: 84,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: palette.paperWarm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoTitle: {
    fontFamily: font.semibold,
    fontSize: typeScale.body,
    color: colors.text,
    marginBottom: 2,
  },

  choiceRow: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  choiceOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  choiceText: {
    fontFamily: font.semibold,
    fontSize: typeScale.body,
    color: colors.text,
  },
  choiceTextOn: { color: colors.textInverse },
});
