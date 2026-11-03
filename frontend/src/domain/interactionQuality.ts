export type InteractionArea =
  | 'home'
  | 'match_detail'
  | 'chat'
  | 'date_planning'
  | 'pricing'
  | 'safety'
  | 'profile'
  | 'support'
  | 'executive';

export type InteractionDefinition = {
  id: string;
  area: InteractionArea;
  label: string;
  outcome: string;
  critical: boolean;
};

export type InteractionAuditSnapshot = {
  total: number;
  criticalTotal: number;
  implemented: number;
  missing: InteractionDefinition[];
  criticalMissing: InteractionDefinition[];
  score: number;
  areaSummary: Array<{ area: InteractionArea; total: number; implemented: number; score: number }>;
};

export const coreInteractions = [
  { id: 'open_profile_detail', area: 'home', label: 'Open profile detail', outcome: 'Detailed profile opens from card tap.', critical: true },
  { id: 'skip_match', area: 'home', label: 'Skip match', outcome: 'Profile leaves deck and learning updates.', critical: true },
  { id: 'send_interest', area: 'home', label: 'Send interest', outcome: 'Mutual/icebreaker path opens.', critical: true },
  { id: 'send_spark', area: 'home', label: 'Send Golden Spark', outcome: 'Daily free/paid Spark flow opens.', critical: true },
  { id: 'profile_view_notice', area: 'match_detail', label: 'Profile view notice', outcome: 'Deep profile view can notify the viewed member.', critical: false },
  { id: 'private_block_detail', area: 'match_detail', label: 'Private block/report', outcome: 'Safety actions open without notifying the member.', critical: true },
  { id: 'send_text_message', area: 'chat', label: 'Send text message', outcome: 'Message appears in the conversation.', critical: true },
  { id: 'send_voice_note', area: 'chat', label: 'Send voice note', outcome: 'Microphone recording creates a playable voice message.', critical: true },
  { id: 'share_live_location', area: 'chat', label: 'Share live location', outcome: 'Approximate live location card appears with expiry.', critical: true },
  { id: 'chat_camera_photo', area: 'chat', label: 'Camera photo', outcome: 'Camera opens directly and sends a photo.', critical: true },
  { id: 'chat_gallery_photo', area: 'chat', label: 'Gallery photo', outcome: 'Photo library opens and sends selected photo.', critical: true },
  { id: 'snap_filter_send', area: 'chat', label: 'Snap filters', outcome: 'Filtered snap/photo can be sent.', critical: false },
  { id: 'funny_face_sticker', area: 'chat', label: 'Funny face sticker', outcome: 'Face emoji/sticker can be created and sent.', critical: false },
  { id: 'gif_picker', area: 'chat', label: 'GIF picker', outcome: '100 daily-use GIF entries are available.', critical: false },
  { id: 'couple_games', area: 'chat', label: 'Couple games', outcome: 'Game prompts send into chat.', critical: false },
  { id: 'choose_date_place', area: 'date_planning', label: 'Choose date place', outcome: 'Public place and category can be selected.', critical: true },
  { id: 'date_reservation_preview', area: 'date_planning', label: 'Reservation preview', outcome: 'Apple Pay/payment-intent style hold preview is shown.', critical: false },
  { id: 'send_date_card', area: 'date_planning', label: 'Send date card', outcome: 'Date proposal card sends into chat.', critical: true },
  { id: 'safety_check_in', area: 'safety', label: 'Safety check-in', outcome: 'Date safety check-in can be marked complete.', critical: true },
  { id: 'report_member', area: 'safety', label: 'Report member', outcome: 'Report enters local Trust Ops queue.', critical: true },
  { id: 'block_member', area: 'safety', label: 'Block member', outcome: 'Member disappears from matches/chat paths.', critical: true },
  { id: 'delete_account_preview', area: 'safety', label: 'Delete account preview', outcome: 'Local account data can be cleared with confirmation.', critical: true },
  { id: 'pricing_membership_checkout', area: 'pricing', label: 'Membership checkout', outcome: 'Plan checkout preview advances through secure steps.', critical: true },
  { id: 'spark_pack_checkout', area: 'pricing', label: 'Spark pack checkout', outcome: 'Spark pack preview adds credits after confirmation.', critical: true },
  { id: 'restore_purchase', area: 'pricing', label: 'Restore purchase', outcome: 'Restore purchase preview updates status.', critical: true },
  { id: 'edit_profile', area: 'profile', label: 'Edit profile', outcome: 'Profile setup screen is reachable from profile.', critical: true },
  { id: 'privacy_settings', area: 'profile', label: 'Privacy settings', outcome: 'Last seen/private mode/pause controls are reachable.', critical: true },
  { id: 'support_ticket', area: 'support', label: 'Support ticket', outcome: 'Support request creates a ticket preview.', critical: true },
  { id: 'support_email', area: 'support', label: 'Email support fallback', outcome: 'Mail link/fallback details are available.', critical: false },
  { id: 'executive_apply', area: 'executive', label: 'Executive application', outcome: 'Application tab and concierge request are available.', critical: false },
  { id: 'executive_concierge', area: 'executive', label: 'Executive concierge', outcome: 'VIP concierge note can be submitted.', critical: false },
] as const satisfies readonly InteractionDefinition[];

export function buildInteractionAuditSnapshot(implementedIds: readonly string[] = coreInteractions.map((item) => item.id)): InteractionAuditSnapshot {
  const implemented = new Set(implementedIds);
  const missing = coreInteractions.filter((interaction) => !implemented.has(interaction.id));
  const areas = [...new Set(coreInteractions.map((interaction) => interaction.area))];
  const areaSummary = areas.map((area) => {
    const areaItems = coreInteractions.filter((interaction) => interaction.area === area);
    const implementedCount = areaItems.filter((interaction) => implemented.has(interaction.id)).length;
    return {
      area,
      total: areaItems.length,
      implemented: implementedCount,
      score: Math.round((implementedCount / areaItems.length) * 100),
    };
  });

  return {
    total: coreInteractions.length,
    criticalTotal: coreInteractions.filter((interaction) => interaction.critical).length,
    implemented: coreInteractions.length - missing.length,
    missing,
    criticalMissing: missing.filter((interaction) => interaction.critical),
    score: Math.round(((coreInteractions.length - missing.length) / coreInteractions.length) * 100),
    areaSummary,
  };
}
