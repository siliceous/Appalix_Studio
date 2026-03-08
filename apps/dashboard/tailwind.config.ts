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
  // Safelist all category badge colours — these are returned as dynamic strings
  // from categoryClass() so Tailwind JIT must be told explicitly to include them
  // Also safelist triage list-item active-state classes used in nested ternaries
  safelist: [
    // SubpageToolbar pill button active states
    'bg-blue-100','text-blue-800','border-blue-300','dark:bg-blue-500/20','dark:text-blue-200','dark:border-blue-500/40',
    'bg-purple-100','text-purple-800','border-purple-300','dark:bg-purple-500/20','dark:text-purple-200','dark:border-purple-500/40',
    'bg-green-100','text-green-800','border-green-300','dark:bg-green-500/20','dark:text-green-200','dark:border-green-500/40',
    'bg-orange-100','text-orange-800','border-orange-300','dark:bg-orange-500/20','dark:text-orange-200','dark:border-orange-500/40',
    // Triage list item — active selection backgrounds (bots / forms / tickets)
    'border-l-[3px]',
    'border-l-transparent',
    'border-l-[#61c2ad]','bg-[#61c2ad]/8','dark:bg-[#61c2ad]/10','dark:bg-[#61c2ad]/15',
    'border-l-amber-400','bg-amber-50','dark:bg-amber-500/15',
    'border-l-gray-400','bg-gray-100','dark:bg-white/8',
    'border-l-red-500','bg-red-50','dark:bg-red-500/15',
    'border-l-orange-400','bg-orange-50','dark:bg-orange-500/15',
    'border-l-blue-400','bg-blue-50','dark:bg-blue-500/8',
    // teal (Sales)
    'bg-teal-50','text-teal-600','border-teal-200',
    'dark:bg-teal-500/10','dark:text-teal-400','dark:border-teal-500/20',
    // sky (Support)
    'bg-sky-50','text-sky-600','border-sky-200',
    'dark:bg-sky-500/10','dark:text-sky-400','dark:border-sky-500/20',
    // violet (Invoice)
    'bg-violet-50','text-violet-600','border-violet-200',
    'dark:bg-violet-500/10','dark:text-violet-400','dark:border-violet-500/20',
    // blue (Receipt)
    'bg-blue-50','text-blue-600','border-blue-200',
    'dark:bg-blue-500/10','dark:text-blue-400','dark:border-blue-500/20',
    // emerald (Financial)
    'bg-emerald-50','text-emerald-600','border-emerald-200',
    'dark:bg-emerald-500/10','dark:text-emerald-400','dark:border-emerald-500/20',
    // pink (Social)
    'bg-pink-50','text-pink-600','border-pink-200',
    'dark:bg-pink-500/10','dark:text-pink-400','dark:border-pink-500/20',
    // orange (Promotion + Legal)
    'bg-orange-50','text-orange-600','text-orange-700','border-orange-200',
    'dark:bg-orange-500/10','dark:text-orange-400','dark:border-orange-500/20',
    // red (Security)
    'bg-red-50','text-red-600','border-red-200',
    'dark:bg-red-500/10','dark:text-red-400','dark:border-red-500/20',
    // indigo (Meeting)
    'bg-indigo-50','text-indigo-600','border-indigo-200',
    'dark:bg-indigo-500/10','dark:text-indigo-400','dark:border-indigo-500/20',
    // cyan (Partnership)
    'bg-cyan-50','text-cyan-600','border-cyan-200',
    'dark:bg-cyan-500/10','dark:text-cyan-400','dark:border-cyan-500/20',
    // amber (Shipping)
    'bg-amber-50','text-amber-600','border-amber-200',
    'dark:bg-amber-500/10','dark:text-amber-400','dark:border-amber-500/20',
    // slate (Subscription)
    'bg-slate-100','text-slate-600','border-slate-200',
    'dark:bg-slate-500/10','dark:text-slate-400','dark:border-slate-500/20',
  ],
  plugins: [],
}

export default config
