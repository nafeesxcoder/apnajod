import { describe, expect, it } from 'vitest';
import { buildRelationshipLearningState, sanitizeRelationshipJourneyProperties } from './relationshipLearning';

describe('relationship learning consent',()=>{
  it('never creates a matching signal without explicit consent',()=>{
    const state=buildRelationshipLearningState({dateStatus:'completed',reflection:'continue',useForMatching:false,reminderEnabled:false});
    expect(state.canUseForMatching).toBe(false);
    expect(state.matchingSignal).toBeNull();
  });

  it('maps only the private reflection category after consent',()=>{
    expect(buildRelationshipLearningState({dateStatus:'completed',reflection:'continue',useForMatching:true,reminderEnabled:false}).matchingSignal).toBe('positive');
    expect(buildRelationshipLearningState({dateStatus:'completed',reflection:'pause',useForMatching:true,reminderEnabled:false}).matchingSignal).toBe('neutral');
    expect(buildRelationshipLearningState({dateStatus:'completed',reflection:'close',useForMatching:true,reminderEnabled:false}).matchingSignal).toBe('negative');
  });

  it('allows a reminder only for an accepted date',()=>{
    expect(buildRelationshipLearningState({dateStatus:'accepted',reflection:null,useForMatching:false,reminderEnabled:true}).reminderActive).toBe(true);
    expect(buildRelationshipLearningState({dateStatus:'completed',reflection:'continue',useForMatching:true,reminderEnabled:true}).reminderActive).toBe(false);
  });

  it('removes identifiers and private content from metric properties',()=>{
    expect(sanitizeRelationshipJourneyProperties({stage:'safe_date',enabled:true,match_id:'private',message:'secret',latitude:43.6})).toEqual({stage:'safe_date',enabled:true});
  });
});
