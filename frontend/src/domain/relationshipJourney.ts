export type RelationshipReflection = 'continue' | 'pause' | 'close' | null;
import type { DatePlanStatus } from '../storage';

export type RelationshipDateStatus = 'none' | DatePlanStatus;

export type RelationshipJourneyInput = {
  alignmentComplete: boolean;
  conversationUnlocked: boolean;
  dateStatus: RelationshipDateStatus;
  reflection: RelationshipReflection;
};

export type RelationshipJourneyStage = {
  id: 'alignment' | 'conversation' | 'safe_date' | 'reflection' | 'trusted_circle';
  title: string;
  body: string;
  status: 'complete' | 'current' | 'locked';
};

export function buildRelationshipJourney(input: RelationshipJourneyInput) {
  const completion = [
    input.alignmentComplete,
    input.conversationUnlocked,
    input.dateStatus === 'completed',
    input.reflection !== null,
    input.reflection === 'continue',
  ];
  const definitions: Array<Omit<RelationshipJourneyStage, 'status'>> = [
    {id:'alignment',title:'Future alignment',body:'Intent, family, children, relocation and marriage pace are visible upfront.'},
    {id:'conversation',title:'Thoughtful conversation',body:'A mutual match and shared icebreaker unlock private chat.'},
    {id:'safe_date',title:'Safe first date',body:'Plan a public place, time and optional safety check-in together.'},
    {id:'reflection',title:'Private reflection',body:'After meeting, record what felt safe and whether you want another date.'},
    {id:'trusted_circle',title:'Trusted Circle',body:'Invite trusted people into the journey only when the relationship is ready.'},
  ];
  const firstIncomplete = completion.findIndex(value=>!value);
  const stages = definitions.map((stage,index):RelationshipJourneyStage=>({
    ...stage,
    status: completion[index] ? 'complete' : index === firstIncomplete ? 'current' : 'locked',
  }));
  const completedCount = completion.filter(Boolean).length;
  return {
    stages,
    completedCount,
    progressPercent: Math.round((completedCount / stages.length) * 100),
    currentStage: stages.find(stage=>stage.status==='current') ?? null,
    trustedCircleReady: input.reflection === 'continue',
  };
}
