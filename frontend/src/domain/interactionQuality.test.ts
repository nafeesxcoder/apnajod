import { describe, expect, it } from 'vitest';
import { buildInteractionAuditSnapshot, coreInteractions } from './interactionQuality';

describe('interaction quality audit', () => {
  it('covers the high-value product areas', () => {
    const areas = new Set(coreInteractions.map((interaction) => interaction.area));
    expect([...areas].sort()).toEqual([
      'chat',
      'date_planning',
      'executive',
      'home',
      'match_detail',
      'pricing',
      'profile',
      'safety',
      'support',
    ]);
  });

  it('marks a fully wired preview as 100 percent complete', () => {
    const snapshot = buildInteractionAuditSnapshot();
    expect(snapshot.score).toBe(100);
    expect(snapshot.criticalMissing).toEqual([]);
    expect(snapshot.areaSummary.every((area) => area.score === 100)).toBe(true);
  });

  it('detects missing critical chat and safety actions', () => {
    const snapshot = buildInteractionAuditSnapshot(coreInteractions.map((item) => item.id).filter((id) => id !== 'send_voice_note' && id !== 'block_member'));
    expect(snapshot.criticalMissing.map((item) => item.id).sort()).toEqual(['block_member', 'send_voice_note']);
    expect(snapshot.score).toBeLessThan(100);
  });

  it('keeps enough critical actions to protect real users', () => {
    const critical = coreInteractions.filter((interaction) => interaction.critical);
    expect(critical.length).toBeGreaterThanOrEqual(20);
    expect(critical.some((interaction) => interaction.id === 'report_member')).toBe(true);
    expect(critical.some((interaction) => interaction.id === 'send_text_message')).toBe(true);
    expect(critical.some((interaction) => interaction.id === 'pricing_membership_checkout')).toBe(true);
  });
});
