import { describe, expect, it } from 'vitest';
import { truthOrDarePromptCount, truthOrDarePrompts } from './coupleGamePrompts';

describe('Truth or Dare prompt library', () => {
  it('ships exactly 100 non-repeating rounds', () => {
    expect(truthOrDarePromptCount).toBe(100);
    expect(new Set(truthOrDarePrompts).size).toBe(100);
  });

  it('keeps an even mix of truth and dare rounds', () => {
    expect(truthOrDarePrompts.filter(prompt => prompt.startsWith('TRUTH · '))).toHaveLength(50);
    expect(truthOrDarePrompts.filter(prompt => prompt.startsWith('DARE · '))).toHaveLength(50);
  });

  it('does not ship blank or placeholder rounds', () => {
    expect(truthOrDarePrompts.every(prompt => prompt.trim().length > 24)).toBe(true);
    expect(truthOrDarePrompts.some(prompt => /lorem|todo|placeholder/i.test(prompt))).toBe(false);
  });
});
