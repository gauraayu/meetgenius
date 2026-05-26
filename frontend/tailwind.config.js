/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          panel: '#141414',
          card: '#1a1a1a',
          input: '#0f0f0f',
        },
        border: {
          DEFAULT: '#262626',
          subtle: '#1f1f1f',
        },
        accent: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          muted: 'rgba(34,197,94,0.1)',
        },
        text: {
          DEFAULT: '#e5e5e5',
          muted: '#a3a3a3',
          dim: '#737373',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
