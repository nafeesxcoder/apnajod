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
        canvas: '#F8F3E9',
        surface: '#FFFFFF',
        surface2: '#FDFAF4',
        text: '#1A1416',
        textSoft: '#3C3336',
        textInverse: '#FFFFFF',
        muted: '#635A5D',
        line: '#E2D9CB',
        lineSoft: '#EFE8DB',
        accent: '#8A6722',
        accentSoft: '#E9D6A8',
        romance: '#B5405C',
        success: '#2E6B4A',
        danger: '#A32318',
        // Legacy aliases, remapped onto the new palette.
        black: '#F8F3E9',
        plum: '#1A1416',
        plumLight: '#E6DACB',
        ivory: '#1A1416',
        espresso: '#1A1416',
        purple: '#3A1420',
        purpleDeep: '#0C0809',
        purpleLight: '#7A4252',
        pink: '#7A1028',
        pinkSoft: '#B5405C',
        wine: '#7A1028',
        wineDeep: '#4A0A18',
        gold: '#BF9230',
        blush: '#F8EDE2',
        blushSoft: '#F0DFCD',
        selectedSurface: '#F5E7D8',
        selectedBorder: '#8A6722',
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
