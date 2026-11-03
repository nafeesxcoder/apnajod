import { describe, expect, it } from 'vitest';
import { matches } from '../data';
import { buildAlignmentBridge, buildIntentPassport } from './intentPassport';

const completeAlignment = {
  timeline:'Within 1–2 years',
  children:'Definitely want children',
  family:'Family is deeply involved',
  relocation:'Yes, I’m open',
};

describe('Intent Passport',()=>{
  it('never invents answers for incomplete passports',()=>{
    const passport=buildIntentPassport({intent:'Marriage',alignment:{}});
    expect(passport.completedCount).toBe(1);
    expect(passport.ready).toBe(false);
    expect(passport.fields.find(field=>field.id==='children')?.value).toBe('Not shared yet');
  });

  it('recognizes a complete set of future essentials',()=>{
    const passport=buildIntentPassport({intent:'Marriage',alignment:completeAlignment});
    expect(passport.ready).toBe(true);
    expect(passport.completedCount).toBe(5);
  });

  it('explains alignment without a compatibility percentage',()=>{
    const bridge=buildAlignmentBridge({intent:'Marriage',alignment:completeAlignment},matches[0]!);
    expect(bridge.alignedCount).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(bridge)).not.toContain('%');
  });

  it('turns a difference into a respectful conversation prompt',()=>{
    const bridge=buildAlignmentBridge({intent:'Marriage',alignment:{...completeAlignment,children:'Do not want children'}},matches[0]!);
    expect(bridge.items.find(item=>item.id==='children')?.status).toBe('discuss');
    expect(bridge.conversationPrompt.toLowerCase()).toContain('children');
  });
});
