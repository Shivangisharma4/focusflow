/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neon: '#00ff88',
        accent: '#a855f7',
        surface: '#0f0f0f',
        'surface-light': '#1a1a2e',
        'surface-mid': '#151528',
      },
    },
  },
  plugins: [],
}
