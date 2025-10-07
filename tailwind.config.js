import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
    '!./node_modules/**',
    '!./dist/**',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', ...defaultTheme.fontFamily.sans],
        serif: ['Merriweather', ...defaultTheme.fontFamily.serif],
      },
    },
  },
  plugins: [],
};
