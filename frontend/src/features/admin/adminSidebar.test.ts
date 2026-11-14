import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const admin = readFileSync(join(__dirname, 'screens/AdminDashboardScreen.tsx'), 'utf8');

describe('admin sidebar on a laptop', () => {
  it('scrolls, so every tab can be reached on a short screen', () => {
    expect(admin).toContain('accessibilityLabel="Admin sections"');
    expect(admin).toMatch(/<ScrollView\s+accessibilityLabel="Admin sections"\s+style=\{\{ flex: 1/);
  });

  it('titles the page with the same name as the sidebar', () => {
    expect(admin).toContain('{TABS.find((t) => t.key === tab)?.label ?? tab}');
  });
});
