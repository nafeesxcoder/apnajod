import { describe, expect, it } from 'vitest';
import { DAILY_INTRODUCTION_LIMIT, buildDailyIntroductionDeck } from './dailyIntroductions';

describe('intentional daily introductions', () => {
  it('keeps discovery intentionally bounded instead of creating an endless feed', () => {
    const result = buildDailyIntroductionDeck(Array.from({ length: 24 }, (_, index) => index + 1));

    expect(DAILY_INTRODUCTION_LIMIT).toBe(5);
    expect(result.featured).toBe(1);
    expect(result.remaining).toEqual([2, 3, 4, 5]);
    expect(result.heldForFutureDays).toBe(19);
  });

  it('handles an empty or sparse deck without invented profiles', () => {
    expect(buildDailyIntroductionDeck([])).toEqual({
      featured: undefined,
      remaining: [],
      heldForFutureDays: 0,
    });
    expect(buildDailyIntroductionDeck(['one']).remaining).toEqual([]);
  });
});
