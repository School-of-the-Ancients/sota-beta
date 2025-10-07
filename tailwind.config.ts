import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './supabase/**/*.{ts,tsx}',
    './constants.ts',
    './suggestions.ts',
    './types.ts'
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        sans: ['Lato', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
