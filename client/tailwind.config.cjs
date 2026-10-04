/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      animation: { 'pulse-soft': 'pulse 2.5s ease-in-out infinite' }
    }
  },
  plugins: []
};
