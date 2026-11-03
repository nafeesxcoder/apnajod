import type { DatePlanStatus } from '../storage';

export const datePlanStatuses: DatePlanStatus[] = [
  'proposed',
  'accepted',
  'declined',
  'countered',
  'completed',
  'cancelled',
  'no_show',
  'unresponsive',
];

const allowedTransitions: Record<DatePlanStatus, DatePlanStatus[]> = {
  proposed: ['accepted', 'declined', 'countered', 'cancelled', 'unresponsive'],
  countered: ['accepted', 'declined', 'countered', 'cancelled', 'unresponsive'],
  accepted: ['completed', 'cancelled', 'no_show', 'unresponsive'],
  declined: ['proposed'],
  cancelled: ['proposed'],
  no_show: ['proposed'],
  unresponsive: ['proposed', 'cancelled'],
  completed: [],
};

export function isDatePlanStatus(value: unknown): value is DatePlanStatus {
  return typeof value === 'string' && datePlanStatuses.includes(value as DatePlanStatus);
}

export function canTransitionDatePlan(from: DatePlanStatus, to: DatePlanStatus) {
  return from === to || allowedTransitions[from].includes(to);
}

export function dateLifecycleCopy(status: DatePlanStatus) {
  const copy: Record<DatePlanStatus, { label: string; guidance: string; safetyFollowUp: boolean }> = {
    proposed: { label: 'Waiting for a response', guidance: 'The other member can accept, suggest a change or decline.', safetyFollowUp: false },
    countered: { label: 'Change suggested', guidance: 'Review the updated plan before confirming.', safetyFollowUp: false },
    accepted: { label: 'Plan accepted', guidance: 'Keep the public-place plan and private reminder ready.', safetyFollowUp: false },
    completed: { label: 'Date completed', guidance: 'A private reflection can now improve future introductions.', safetyFollowUp: false },
    declined: { label: 'Plan declined', guidance: 'Suggest another plan only if both people want to continue.', safetyFollowUp: false },
    cancelled: { label: 'Plan cancelled', guidance: 'No penalty is applied automatically. A new plan needs mutual confirmation.', safetyFollowUp: false },
    no_show: { label: 'No-show recorded privately', guidance: 'Check in on your safety and decide whether to report, block or close the match.', safetyFollowUp: true },
    unresponsive: { label: 'Waiting on a response', guidance: 'The app will reduce pressure and offer a respectful close after the response window.', safetyFollowUp: false },
  };
  return copy[status];
}
