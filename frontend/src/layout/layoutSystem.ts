/**
 * Layout System - Consistent spacing, sizing, and structure
 * Use these values across the app for uniform layout
 */

export const spacing = {
  // Base unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  none: 0,
  small: 8,
  medium: 12,
  large: 16,
  round: 999,
} as const;

export const typeScale = {
  // Display (Headings)
  display: { size: 32, weight: 700, lineHeight: 1.2 },
  heading: { size: 24, weight: 700, lineHeight: 1.3 },
  subheading: { size: 20, weight: 600, lineHeight: 1.4 },

  // Body
  body: { size: 16, weight: 400, lineHeight: 1.5 },
  bodySemi: { size: 16, weight: 600, lineHeight: 1.5 },

  // Small
  label: { size: 14, weight: 600, lineHeight: 1.4 },
  caption: { size: 12, weight: 500, lineHeight: 1.4 },
  fine: { size: 11, weight: 400, lineHeight: 1.3 },
} as const;

export const layouts = {
  // Screen insets (reduced horizontal padding)
  screenPaddingX: spacing.sm, // 8px sides (reduced)
  screenPaddingY: spacing.lg, // 16px top/bottom

  // Content width on desktop
  maxContentWidth: 720,
  maxWideWidth: 1000,

  // Cards (reduced padding on sides)
  cardRadius: radius.medium,
  cardPadding: spacing.md, // 12px (reduced from 16px)
  cardPaddingHorizontal: spacing.sm, // 8px sides only
  cardShadow: '0 2px 8px rgba(0,0,0,0.08)',
  cardShadowHover: '0 8px 24px rgba(0,0,0,0.12)',

  // List items
  listItemPadding: spacing.lg,
  listItemGap: spacing.md,

  // Buttons
  buttonPadding: { vertical: spacing.md, horizontal: spacing.lg },
  buttonRadius: radius.medium,

  // Modal/Sheet
  modalRadius: radius.large,
  modalPadding: spacing.xl,
  modalMaxWidth: 600,

  // Tabs
  tabPadding: spacing.lg,
  tabBorderWidth: 2,

  // Input
  inputPadding: spacing.md,
  inputRadius: radius.small,
  inputHeight: 44,

  // Grid
  gridGap: spacing.lg,
  gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
} as const;

// Layout patterns
export const patterns = {
  // Page structure
  page: {
    paddingX: layouts.screenPaddingX,
    paddingY: layouts.screenPaddingY,
    maxWidth: layouts.maxContentWidth,
    margin: '0 auto',
  },

  // Header with back button + title
  header: {
    paddingX: layouts.screenPaddingX,
    paddingY: spacing.lg,
    gap: spacing.md,
    minHeight: 56,
  },

  // Card container
  card: {
    padding: layouts.cardPadding,
    borderRadius: layouts.cardRadius,
    backgroundColor: '#ffffff',
    boxShadow: layouts.cardShadow,
    '&:hover': {
      boxShadow: layouts.cardShadowHover,
      transform: 'translateY(-2px)',
    },
  },

  // List container
  list: {
    gap: 0,
    flexDirection: 'column' as const,
    '& > * + *': {
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
  },

  // Button group (horizontal)
  buttonGroup: {
    display: 'flex',
    gap: spacing.md,
    flexWrap: 'wrap' as const,
  },

  // Button group (vertical)
  buttonGroupVertical: {
    display: 'flex',
    gap: spacing.md,
    flexDirection: 'column' as const,
  },

  // Form field spacing
  formField: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },

  // Section spacing
  section: {
    paddingY: spacing.xl,
    '& + &': {
      paddingTopWidth: 1,
      borderTopColor: '#eee',
    },
  },
} as const;

// Safe area for phone notches/bottom bars
export const safeArea = {
  topPadding: 'max(16px, env(safe-area-inset-top, 0px))',
  bottomPadding: 'max(16px, env(safe-area-inset-bottom, 0px))',
  leftPadding: 'max(16px, env(safe-area-inset-left, 0px))',
  rightPadding: 'max(16px, env(safe-area-inset-right, 0px))',
} as const;

// Breakpoints
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export const media = {
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px)',
  desktop: '@media (min-width: 1024px)',
  wide: '@media (min-width: 1440px)',
} as const;
