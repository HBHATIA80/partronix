import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#FFFFFF',
        panel: '#FFFFFF',
        panel2: '#F1F5F4',
        line: '#E6EAE9',
        accent: '#14B8A6',
        accent2: '#0D9488',
        good: '#16A34A',
        bad: '#E11D48',
        ink: '#132A3A',
        muted: '#64748B',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
};

export default config;
