import { describe, expect, it } from 'vitest';
import { buildRelationshipJourney } from './relationshipJourney';

describe('relationship journey',()=>{
  it('starts with future alignment',()=>{
    const journey=buildRelationshipJourney({alignmentComplete:false,conversationUnlocked:false,dateStatus:'none',reflection:null});
    expect(journey.currentStage?.id).toBe('alignment');
    expect(journey.progressPercent).toBe(0);
  });

  it('moves a mutual conversation toward a safe date',()=>{
    const journey=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus:'none',reflection:null});
    expect(journey.currentStage?.id).toBe('safe_date');
    expect(journey.progressPercent).toBe(40);
  });

  it('keeps the safe-date step current while a proposal is pending',()=>{
    const journey=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus:'proposed',reflection:null});
    expect(journey.currentStage?.id).toBe('safe_date');
    expect(journey.progressPercent).toBe(40);
  });

  it('asks for private reflection only after the date is completed',()=>{
    const journey=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus:'completed',reflection:null});
    expect(journey.currentStage?.id).toBe('reflection');
    expect(journey.progressPercent).toBe(60);
  });

  it('unlocks Trusted Circle only when the member wants to continue',()=>{
    const ready=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus:'completed',reflection:'continue'});
    const paused=buildRelationshipJourney({alignmentComplete:true,conversationUnlocked:true,dateStatus:'completed',reflection:'pause'});
    expect(ready.trustedCircleReady).toBe(true);
    expect(ready.progressPercent).toBe(100);
    expect(paused.trustedCircleReady).toBe(false);
    expect(paused.progressPercent).toBe(80);
  });
});
