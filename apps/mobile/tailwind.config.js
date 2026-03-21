/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#15A4AE',
          600: '#1290a0',
          700: '#0f7d8c',
        },
        priority: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#6b7280',
        },
      },
    },
  },
};
