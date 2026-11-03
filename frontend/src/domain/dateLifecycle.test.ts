import { describe, expect, it } from 'vitest';
import { canTransitionDatePlan, dateLifecycleCopy, isDatePlanStatus } from './dateLifecycle';

describe('date lifecycle', () => {
  it('supports cancellation, no-show and unresponsive states without reopening completed dates', () => {
    expect(canTransitionDatePlan('accepted', 'no_show')).toBe(true);
    expect(canTransitionDatePlan('accepted', 'cancelled')).toBe(true);
    expect(canTransitionDatePlan('proposed', 'unresponsive')).toBe(true);
    expect(canTransitionDatePlan('completed', 'proposed')).toBe(false);
  });

  it('rejects unknown state input and flags no-show for a safety follow-up', () => {
    expect(isDatePlanStatus('no_show')).toBe(true);
    expect(isDatePlanStatus('ghosted')).toBe(false);
    expect(dateLifecycleCopy('no_show').safetyFollowUp).toBe(true);
  });
});
