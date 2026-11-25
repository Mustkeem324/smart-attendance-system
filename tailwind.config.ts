import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        master: {
          navy: '#15172B',
          'navy-elevated': '#1C203B',
          'navy-border': '#292E52',
          indigo: '#6538ED',
          violet: '#8255FF',
          lavender: '#F6F5FF',
          card: '#FFFFFF',
          line: '#E6E8F2',
        },
        enterprise: {
          navy: '#15172B',
          purple: '#6538ED',
          violet: '#8255FF',
          soft: '#F6F5FF',
          surface: '#FFFFFF',
          success: '#12B886',
          warning: '#F59E0B',
          danger: '#EF476F',
        },
        brand: {
          50: '#F6F5FF',
          100: '#EBE7FE',
          200: '#D8CEFD',
          300: '#B8A5FB',
          400: '#987AF9',
          500: '#8255FF',
          600: '#6538ED',
          700: '#5329D1',
          800: '#4320AA',
          900: '#2E1878',
          950: '#15172B',
        },
      },
      boxShadow: {
        'enterprise-sm': '0 1px 2px 0 rgba(21, 23, 43, 0.05)',
        'enterprise-md': '0 6px 20px -4px rgba(21, 23, 43, 0.08), 0 2px 6px -1px rgba(101, 56, 237, 0.04)',
        'enterprise-lg': '0 18px 40px -12px rgba(21, 23, 43, 0.16)',
        'enterprise-glow': '0 8px 24px -4px rgba(101, 56, 237, 0.35)',
      },
    },
  },
  plugins: [],
};
export default config;
