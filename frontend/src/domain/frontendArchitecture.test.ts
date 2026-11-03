import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('frontend architecture boundaries', () => {
  it('keeps provider implementations out of feature UI modules', () => {
    const violations = sourceFiles('src/features').flatMap(path => {
      const source = readFileSync(path, 'utf8');
      const imports = [...source.matchAll(/import[\s\S]*?from\s+['"]([^'"]+)['"];?/g)];
      return imports
        .filter(([, dependency]) => /(?:^|\/)(?:services|payments|lib\/supabase)(?:\/|$)/.test(dependency ?? ''))
        .map(([, dependency]) => `${path} -> ${dependency}`);
    });

    expect(violations).toEqual([]);
  });

  it('ships no concrete backend, database, payment, push, or realtime provider dependency', () => {
    const packageJson = readFileSync('package.json', 'utf8');
    const appJson = readFileSync('app.json', 'utf8');
    const banned = ['@supabase/supabase-js', '@stripe/stripe-react-native', 'expo-iap', 'expo-notifications'];
    for (const dependency of banned) {
      expect(packageJson).not.toContain(dependency);
      expect(appJson).not.toContain(dependency);
    }
  });

  it('keeps concrete provider SDK imports out of the complete source tree', () => {
    const banned = /(?:@supabase\/supabase-js|@stripe\/stripe-react-native|@aws-sdk|aws-amplify|expo-iap|expo-notifications|react-native-webrtc)/i;
    const violations = sourceFiles('src').flatMap(path => {
      const source = readFileSync(path, 'utf8');
      const imports = [...source.matchAll(/(?:import[\s\S]*?from\s+|require\()['"]([^'"]+)['"]/g)];
      return imports.filter(([, dependency]) => banned.test(dependency ?? '')).map(([, dependency]) => `${path} -> ${dependency}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps database and provider SDK imports out of feature UI modules', () => {
    const banned = ['@supabase/supabase-js', '@stripe/stripe-react-native', '../types/database', '../../types/database'];
    const violations = sourceFiles('src/features').flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return banned.filter(dependency => source.includes(dependency)).map(dependency => `${path} -> ${dependency}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps the AWS boundary provider-agnostic', () => {
    const contract = readFileSync('src/app/contracts/AwsApiContracts.ts', 'utf8');
    expect(contract).not.toMatch(/@aws-sdk|amplify|supabase|stripe|mysql|postgres/i);
    expect(contract).toContain('export interface MilaanAwsApi');
    expect(contract).toContain('auth: AuthApi');
    expect(contract).toContain('chat: ChatApi');
    expect(contract).toContain('payments: PaymentsApi');
  });
});
