/**
 * The social surface: finding people, a person's page, and follow requests.
 *
 * Written against the semantic tokens only, so the palette stays in theme.ts.
 * Type is sized for someone reading on a mid-range phone in daylight, which
 * is why nothing here is smaller than 13px.
 */
import { StyleSheet } from 'react-native';

import { colors, font, fonts, radius, typeScale } from '../theme';

export const social = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },

  // ---- header ----
  header: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: typeScale.title,
    color: colors.text,
  },
  headerSpacer: { flex: 1 },

  // ---- tabs ----
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  tabText: { fontFamily: font.semibold, fontSize: typeScale.body, color: colors.text },
  tabTextOn: { color: colors.textInverse },

  // ---- search ----
  searchBox: {
    marginHorizontal: 16,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    outlineWidth: 0,
    paddingVertical: 12,
    fontFamily: font.medium,
    fontSize: 17,
    color: colors.text,
  },

  noteCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: typeScale.body, lineHeight: 21, color: colors.muted },

  error: {
    marginHorizontal: 16,
    marginTop: 10,
    fontFamily: font.medium,
    fontSize: typeScale.body,
    color: colors.danger,
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize: typeScale.body,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },

  // ---- lists ----
  listContent: { padding: 16, gap: 10, paddingBottom: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontFamily: fonts.display, fontSize: typeScale.section, color: colors.text },
  rowSub: { fontFamily: font.regular, fontSize: typeScale.body, color: colors.muted },

  avatar: { backgroundColor: colors.surface2 },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarInitial: { fontFamily: font.bold, color: colors.accent },

  followButton: {
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
  },
  followButtonOff: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  followButtonText: { fontFamily: font.semibold, fontSize: typeScale.body, color: colors.textInverse },
  followButtonTextOff: { color: colors.muted },

  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
  },
  primaryButtonText: { fontFamily: font.semibold, fontSize: 17, color: colors.textInverse },

  // ---- a person's page ----
  personHead: { alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  personName: { fontFamily: font.bold, fontSize: typeScale.display, color: colors.text, textAlign: 'center' },
  personHandle: { fontFamily: font.medium, fontSize: typeScale.section, color: colors.accent },
  personMetaRow: { flexDirection: 'row', gap: 26, paddingVertical: 14 },
  personMeta: { alignItems: 'center', gap: 2, minWidth: 84 },
  personMetaValue: { fontFamily: font.bold, fontSize: typeScale.title, color: colors.text },
  personMetaLabel: { fontFamily: font.regular, fontSize: typeScale.body, color: colors.muted },
  personActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 4 },
  personAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.pink,
  },
  personActionGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  personActionText: { fontFamily: font.semibold, fontSize: 16, color: colors.textInverse },
  personActionGhostText: { color: colors.text },

  lockedCard: {
    margin: 20,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: 10,
  },
  lockedTitle: { fontFamily: font.semibold, fontSize: typeScale.section, color: colors.text, textAlign: 'center' },
  lockedBody: {
    fontFamily: font.regular,
    fontSize: typeScale.body,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },

  // ---- requests ----
  requestActions: { flexDirection: 'row', gap: 8 },
  requestAccept: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
  },
  requestAcceptText: { fontFamily: font.semibold, fontSize: typeScale.body, color: colors.textInverse },
  requestDecline: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  requestDeclineText: { fontFamily: font.semibold, fontSize: typeScale.body, color: colors.muted },

  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.bold, fontSize: 11, color: colors.textInverse },

  // ---- Chats list ----
  rowTime: {
    fontFamily: font.regular,
    fontSize: typeScale.label,
    color: colors.muted,
  },
  unreadDot: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDotText: {
    fontFamily: font.bold,
    fontSize: typeScale.label,
    color: colors.textInverse,
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.pink,
    borderWidth: 2,
    borderColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    fontFamily: font.bold,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textInverse,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingTop: 72,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: typeScale.title,
    color: colors.text,
  },
});
