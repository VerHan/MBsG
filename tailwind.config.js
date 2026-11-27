/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: '#0B0D14',
          900: '#161B29',
        },
        ancient: {
          stone: '#2B2F3A',
          rust: '#4A3F35',
        },
        mana: {
          cyan: '#00F0FF',
          purple: '#A855F7',
        },
        slayer: {
          orange: '#F97316',
          red: '#EF4444',
        },
        loot: {
          gold: '#FACC15',
          green: '#22C55E',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
