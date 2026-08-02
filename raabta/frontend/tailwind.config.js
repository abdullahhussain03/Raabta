/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#0A0A12',   // page background
          surface: '#14141F',   // cards
          raised: '#1C1C2A',    // hover/elevated surfaces
          border: '#2A2A3C',
        },
        brand: {
          50: '#EEECFE',
          100: '#D9D5FD',
          300: '#A69CFA',
          500: '#6C5CE7', // primary Raabta violet
          600: '#5A4BD6',
          700: '#4A3DB8',
        },
        accent: {
          teal: '#2DD4BF',
          amber: '#F5A524',
          rose: '#FB7185',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(0,0,0,0.5)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
