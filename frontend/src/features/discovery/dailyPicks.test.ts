import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8');

describe('Aaj ke 5', () => {
  const row = read('src/features/discovery/components/DailyPicksRow.tsx');

  it('sits on Home for signed-in members and opens the full profile', () => {
    const home = read('src/features/discovery/screens/HomeScreen.tsx');
    expect(home).toContain('<DailyPicksRow accessToken={accessToken} onOpen={openDetail} />');
  });

  it('shows when the next five arrive', () => {
    expect(row).toContain('New picks in {timeUntil(data.nextAt)}');
  });

  it('never breaks Home if the picks cannot load', () => {
    expect(row).toContain('if (!accessToken || !data) return null;');
    expect(row).toContain('.catch(() => {');
  });

  it('still shows the card, with the next drop time, when there are no picks today', () => {
    expect(row).toContain('if (data.picks.length === 0) {');
    expect(row).toContain('Next picks in {timeUntil(data.nextAt)}');
  });

  it('keeps every hook above its early return', () => {
    const early = row.indexOf('if (!accessToken || !data');
    expect(row.slice(early)).not.toMatch(/\buse(State|Effect|Callback|Memo|Ref)\(/);
  });
});
