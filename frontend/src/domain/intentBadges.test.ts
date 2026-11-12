import { describe, expect, it } from 'vitest';
import { intentBadges } from './intentBadges';

const labels = (input: Parameters<typeof intentBadges>[0]) => intentBadges(input).map((b) => b.label);

describe('intent badges', () => {
  it('turns the onboarding answers into chips, in a fixed order', () => {
    expect(
      labels({
        intent: 'Long-term, leading to Marriage',
        timeline: 'Within 1–2 years',
        children: 'Definitely want children',
        family: 'Family is deeply involved',
        relocation: "Yes, I'm open",
      }),
    ).toEqual([
      '💍 Marriage-minded',
      '⏱️ Ready to settle soon',
      '👶 Wants kids',
      '🏡 Family First',
      '✈️ Open to relocate',
    ]);
  });

  it('reads "do not want children" as no kids, never as wanting them', () => {
    expect(labels({ children: 'Do not want children' })).toEqual(['🚫 No kids']);
  });

  it('understands the other answers too', () => {
    expect(
      labels({
        intent: 'Long-term Relationship',
        timeline: 'When the relationship feels ready',
        children: 'Open to children',
        family: 'Close, with healthy boundaries',
        relocation: 'I prefer to stay in my city',
      }),
    ).toEqual(['❤️ Long-term', '🌱 No rush', '🙂 Open to kids', '🤝 Family balanced', '📍 Rooted in their city']);
  });

  it('shows nothing for answers it does not understand or that were skipped', () => {
    expect(labels({})).toEqual([]);
    expect(labels({ relocation: 'Depends on career and family', intent: '' })).toEqual([]);
  });

  it('maps older wordings from before the questions were reworded', () => {
    expect(labels({ timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Balanced family involvement' })).toEqual([
      '⏱️ Ready to settle soon',
      '👶 Wants kids',
      '🤝 Family balanced',
    ]);
  });
});
