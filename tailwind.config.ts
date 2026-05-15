import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        dash: {
          bg: '#080c14',
          surface: '#0f1624',
          panel: '#121b2c',
          raised: '#182236',
          border: '#243049',
          muted: '#8b9bb8',
          text: '#e8edf5',
          blue: '#3b82f6',
          blueHi: '#60a5fa',
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444'
        }
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;
