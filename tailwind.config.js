/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f7f8fb',
          100: '#eef0f6',
          200: '#dde1ec',
          300: '#bcc3d4',
          400: '#8b94ad',
          500: '#5d6885',
          600: '#404a66',
          700: '#2d3550',
          800: '#1c2238',
          900: '#0f1426',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 20, 38, 0.04), 0 8px 24px rgba(15, 20, 38, 0.06)',
        glow: '0 10px 30px -10px rgba(99, 102, 241, 0.45)',
      },
      backgroundImage: {
        'mesh-1':
          'radial-gradient(at 0% 0%, rgba(99,102,241,0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(34,211,238,0.12) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(167,139,250,0.10) 0px, transparent 50%)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
