export const DAILY_INTRODUCTION_LIMIT = 5;

export function buildDailyIntroductionDeck<T>(items: readonly T[]) {
  const deck = items.slice(0, DAILY_INTRODUCTION_LIMIT);
  return {
    featured: deck[0],
    remaining: deck.slice(1),
    heldForFutureDays: Math.max(0, items.length - deck.length),
  };
}
