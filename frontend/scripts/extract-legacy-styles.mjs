import { readFileSync, writeFileSync } from 'node:fs';

const appPath = 'src/app/MilaanApp.tsx';
const stylesPath = 'src/theme/appStyles.ts';
const marker = 'const selectorStyles=StyleSheet.create(';
const source = readFileSync(appPath, 'utf8');
const splitAt = source.indexOf(marker);

if (splitAt < 0) throw new Error(`Could not find style marker: ${marker}`);

const names = [...source.slice(splitAt).matchAll(/^const ([A-Za-z0-9_]+)=/gm)].map(match => match[1]);
const styleSource = source.slice(splitAt).replace(/^const ([A-Za-z0-9_]+)=/gm, 'export const $1=');
const header = [
  "import { Platform, StyleSheet, type ImageStyle } from 'react-native';",
  "import { colors, radius } from '../theme';",
  '',
  '/**',
  ' * Original Milaan visual system, extracted without changing values.',
  ' * Feature-specific groups will move beside their screens during refactoring.',
  ' */',
  '',
].join('\n');

writeFileSync(stylesPath, header + styleSource);
writeFileSync(appPath, `${source.slice(0, splitAt)}\nimport { ${names.join(', ')} } from '../theme/appStyles';\n`);
