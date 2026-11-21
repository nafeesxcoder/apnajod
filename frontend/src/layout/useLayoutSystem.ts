/**
 * Layout utilities for consistent spacing and structure
 */

import { spacing, typeScale, layouts, patterns, safeArea, breakpoints, media } from './layoutSystem';

export const useLayout = () => {
  return {
    spacing,
    typeScale,
    layouts,
    patterns,
    safeArea,
    breakpoints,
    media,
  };
};

/**
 * Common layout patterns as React components would use them
 */
export const pageLayout = {
  // Main page container
  container: {
    paddingLeft: `max(8px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(8px, env(safe-area-inset-right, 0px))`,
    maxWidth: '100%',
    marginHorizontal: 'auto',
  },

  // Screen with safe area insets (reduced horizontal padding)
  screen: {
    flex: 1,
    paddingTop: `max(16px, env(safe-area-inset-top, 0px))`,
    paddingBottom: `max(16px, env(safe-area-inset-bottom, 0px))`,
    paddingLeft: `max(8px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(8px, env(safe-area-inset-right, 0px))`,
  },

  // Header bar (sticky)
  header: {
    paddingLeft: `max(16px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(16px, env(safe-area-inset-right, 0px))`,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Content section
  section: {
    gap: 16,
    marginBottom: 24,
  },

  // Card/Panel
  card: {
    paddingHorizontal: 8,  // Reduced from 16
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    marginHorizontal: 0,   // No side margin
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Profile card (tighter sides)
  profileCard: {
    paddingHorizontal: 4,  // Minimal side padding
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // List item
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },

  // Button
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input field
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    minHeight: 44,
    fontSize: 16,
  },

  // Grid item
  gridItem: {
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Modal
  modal: {
    padding: 20,
    borderRadiusTopLeft: 16,
    borderRadiusTopRight: 16,
    backgroundColor: '#ffffff',
  },

  // Bottom sheet
  sheet: {
    paddingLeft: `max(16px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(16px, env(safe-area-inset-right, 0px))`,
    paddingTop: 20,
    paddingBottom: `max(16px, env(safe-area-inset-bottom, 0px))`,
    borderRadiusTopLeft: 16,
    borderRadiusTopRight: 16,
    backgroundColor: '#ffffff',
  },

  // Spacer (for vertical spacing)
  spacer: (size: keyof typeof spacing) => ({
    height: spacing[size],
  }),

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginVertical: 16,
  },
};

/**
 * Responsive spacing values
 */
export const responsiveSpacing = {
  // Mobile first approach
  pageGap: {
    mobile: spacing.lg,
    tablet: spacing.xl,
    desktop: spacing.xxl,
  },
  sectionSpacing: {
    mobile: spacing.lg,
    tablet: spacing.xl,
    desktop: spacing.xxxl,
  },
  cardPadding: {
    mobile: spacing.lg,
    tablet: spacing.xl,
    desktop: spacing.xl,
  },
};

export const layoutConstants = {
  // Navigation
  bottomNavHeight: 56,
  topHeaderHeight: 56,

  // Tabs
  tabHeight: 48,

  // Input
  minInputHeight: 44,

  // Button
  minButtonHeight: 44,

  // Card
  cardMinHeight: 60,

  // Safe margins
  screenMargin: 16,
};
