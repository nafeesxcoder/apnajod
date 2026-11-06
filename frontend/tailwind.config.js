/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirrors src/theme.ts `colors` — the "Maroon & Gold" palette.
        // Keep the two in step.
        canvas: '#EFF0F2',
        surface: '#FFFFFF',
        surface2: '#F8F8F9',
        text: '#151719',
        textSoft: '#33373C',
        textInverse: '#FFFFFF',
        muted: '#5A5E63',
        line: '#D3D6DA',
        lineSoft: '#E3E5E7',
        accent: '#8A2237',
        accentSoft: '#DBB6BD',
        romance: '#407AB5',
        success: '#2E6B57',
        danger: '#B3261E',
        // Legacy aliases, remapped onto the new palette.
        black: '#EFF0F2',
        plum: '#151719',
        plumLight: '#D5D8DC',
        ivory: '#151719',
        espresso: '#151719',
        purple: '#14273A',
        purpleDeep: '#090A0B',
        purpleLight: '#425E7A',
        pink: '#194571',
        pinkSoft: '#407AB5',
        wine: '#194571',
        wineDeep: '#0F2A45',
        gold: '#BF304D',
        blush: '#EBEDEF',
        blushSoft: '#E7D6D9',
        selectedSurface: '#E4E6E9',
        selectedBorder: '#8A2237',
      },
      borderRadius: {
        // Mirrors src/theme.ts `radius`
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        pill: '999px',
      },
      fontFamily: {
        // Mukta by Ek Type: one family for Latin and Devanagari.
        sans: ['Mukta_400Regular'],
        medium: ['Mukta_500Medium'],
        semibold: ['Mukta_600SemiBold'],
        bold: ['Mukta_700Bold'],
      },
    },
  },
  plugins: [],
};
