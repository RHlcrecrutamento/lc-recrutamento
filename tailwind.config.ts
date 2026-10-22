import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6fb',
          100: '#d6eaf5',
          200: '#aed5eb',
          300: '#7bb9dc',
          400: '#4a99c6',
          500: '#2b7cb0',
          600: '#1e6391',
          700: '#1767b8',
          800: '#123760',
          900: '#0d1b35',
          950: '#050d20',
        },
        accent: {
          50: '#eefbf9',
          100: '#d0f5f1',
          200: '#a4eae4',
          300: '#6ed8d1',
          400: '#12c7eb',
          500: '#09a5c8',
          600: '#087e9d',
          700: '#08667e',
          800: '#155352',
          900: '#164645',
        },
        gold: {
          400: '#f3c14b',
          500: '#e5a91e',
          600: '#c48a12',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 46, 76, 0.08), 0 4px 14px rgba(15, 46, 76, 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
