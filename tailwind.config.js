/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      colors: {
        pl: {
          bg: '#0a0b12',
          'bg-deep': '#06070c',
          surface: '#12131c',
          elevated: '#1a1b28',
          border: '#2a2b3d',
          hover: '#252638',
          muted: '#8b8fa8',
          dim: '#565a72',
          text: '#eef0f8',
          primary: '#7c5cff',
          'primary-bright': '#9d82ff',
          'primary-dim': '#5a3fd4',
          accent: '#00e5cc',
          success: '#2ee59d',
          danger: '#ff6b6b',
          live: '#ff4757',
        },
        vl: {
          bg: '#0a0b12',
          surface: '#12131c',
          primary: '#7c5cff',
          accent: '#00e5cc',
          text: '#eef0f8',
          border: '#2a2b3d',
        },
        studio: {
          bg: '#0a0b12',
          panel: '#12131c',
          border: '#2a2b3d',
          hover: '#252638',
          muted: '#8b8fa8',
          accent: '#7c5cff',
        },
        tiktok: '#ff4668',
        twitch: '#9b72f2',
      },
      boxShadow: {
        'pl-glow': '0 0 28px rgba(124, 92, 255, 0.4)',
        'pl-glow-accent': '0 0 24px rgba(0, 229, 204, 0.3)',
        'pl-panel': '0 4px 24px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        pl: '10px',
      },
    },
  },
  plugins: [],
};
