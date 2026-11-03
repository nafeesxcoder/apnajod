import type { DatePlanStatus, RelationshipReflectionChoice } from '../storage';

export type RelationshipLearningSignal = 'positive' | 'neutral' | 'negative';

export type RelationshipLearningInput = {
  dateStatus: DatePlanStatus | 'none';
  reflection: RelationshipReflectionChoice | null;
  useForMatching: boolean;
  reminderEnabled: boolean;
};

export function buildRelationshipLearningState(input: RelationshipLearningInput) {
  const reflectionComplete=input.dateStatus==='completed'&&input.reflection!==null;
  const matchingSignal:RelationshipLearningSignal|null=!reflectionComplete||!input.useForMatching
    ? null
    : input.reflection==='continue'
      ? 'positive'
      : input.reflection==='pause'
        ? 'neutral'
        : 'negative';

  return {
    reflectionComplete,
    canUseForMatching:matchingSignal!==null,
    matchingSignal,
    reminderEligible:input.dateStatus==='accepted',
    reminderActive:input.dateStatus==='accepted'&&input.reminderEnabled,
  };
}

export const relationshipJourneyEventNames=[
  'relationship_path_opened',
  'date_plan_status_changed',
  'private_reflection_saved',
  'relationship_learning_consent_changed',
  'date_reminder_changed',
] as const;

export type RelationshipJourneyEventName=typeof relationshipJourneyEventNames[number];

const allowedPropertyKeys=new Set(['stage','from_status','to_status','choice','enabled']);

export function sanitizeRelationshipJourneyProperties(properties:Record<string,unknown>) {
  return Object.fromEntries(Object.entries(properties).filter(([key,value])=>
    allowedPropertyKeys.has(key)&&(['string','boolean'].includes(typeof value))
  ));
}
