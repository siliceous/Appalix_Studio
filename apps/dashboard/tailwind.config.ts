import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f6f4',
          100: '#c8ece8',
          300: '#7dcfc3',
          400: '#61c2ad',
          500: '#4aaa97',
          600: '#3d9585',
          700: '#2f7a6c',
          900: '#1a4740',
        },
        accent: {
          orange:      '#ec732e',
          'orange-light': '#f19e38',
          blue:        '#3873BB',
          'blue-dark': '#1a4073',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
