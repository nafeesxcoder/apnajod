import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chatPrimaryAttachments } from '../../domain/featureFocus';

describe('Activity and the back button', () => {
  it("closes Activity on the phone's back and stays on Home", () => {
    const modal = readFileSync(join(__dirname, 'ActivityModal.tsx'), 'utf8');
    expect(modal).toContain('useBackToClose(visible, onClose)');
    expect(modal).toContain('onRequestClose={close}');
    const hook = readFileSync(join(__dirname, '../../app/navigation/useBackToClose.ts'), 'utf8');
    expect(hook).toContain('event.stopImmediatePropagation()');
  });

  it('says your own likes and comments do not show', () => {
    const modal = readFileSync(join(__dirname, 'ActivityModal.tsx'), 'utf8');
    expect(modal).toContain("Your own likes and comments don't.");
  });
});

describe('The back button closes every popup', () => {
  it('uses the back-aware Modal everywhere (Activity has its own)', () => {
    const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
    const root = join(__dirname, '../..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.tsx') && !path.endsWith('.test.tsx')) files.push(path);
      }
    };
    walk(root);
    const plain = files.filter((file) => {
      if (file.endsWith('BackModal.tsx') || file.endsWith('ActivityModal.tsx')) return false;
      const text = readFileSync(file, 'utf8');
      return /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]react-native['"]/.test(text);
    });
    expect(plain).toEqual([]);
  });
});

describe('Meet up in chat', () => {
  it('is called Meet up with a cup, not Date with a calendar', () => {
    const meet = chatPrimaryAttachments.find((item) => item.id === 'date');
    expect(meet?.label).toBe('Meet up');
    expect(meet?.icon).toBe('cafe');
  });
});
