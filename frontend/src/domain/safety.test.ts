import { describe, expect, it } from 'vitest';
import { buildReportActionPlan, buildSafetyChecklist, safetyReadinessScore, scanMessageSafety } from './safety';

describe('safety guardian', () => {
  it('flags money and off-app pressure as high risk', () => {
    const scan = scanMessageSafety('Message me on WhatsApp and buy a gift card before we meet');

    expect(scan.severity).toBe('high');
    expect(scan.signals.map((signal) => signal.type)).toContain('money');
    expect(scan.signals.map((signal) => signal.type)).toContain('off_app');
    expect(scan.recommendedAction).toContain('report');
  });

  it('nudges exact-location messages toward safer date planning', () => {
    const scan = scanMessageSafety('Send exact location and I will pick you up from your place');

    expect(scan.severity).toBe('caution');
    expect(scan.nudgeTitle).toContain('Protect exact location');
    expect(scan.recommendedAction).toContain('Date Plan');
  });

  it('turns report details into a safety action plan', () => {
    const plan = buildReportActionPlan('Safety concern', 'They kept asking for my hotel room and home address.');

    expect(plan.category).toBe('unsafe_meeting');
    expect(plan.riskScore).toBeGreaterThanOrEqual(40);
    expect(plan.primaryAction).toContain('safety check-in');
    expect(plan.memberCopy).toContain('not notified');
  });

  it('scores safety readiness from available controls', () => {
    const checklist = buildSafetyChecklist({ reportsCount: 1, blockedCount: 1, datePlansCount: 2, safeCheckInsCount: 1 });

    expect(checklist).toHaveLength(5);
    expect(safetyReadinessScore(checklist)).toBe(100);
  });

  it('keeps date check-ins incomplete until a real plan exists', () => {
    const checklist = buildSafetyChecklist({ reportsCount: 0, blockedCount: 0, datePlansCount: 0, safeCheckInsCount: 0 });

    expect(checklist.find((item) => item.key === 'date_checkins')?.ready).toBe(false);
    expect(safetyReadinessScore(checklist)).toBe(80);
  });
});
