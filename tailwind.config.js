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
          50:  '#f4f2ff',
          100: '#ebe6fd',
          200: '#d5ccf8',
          300: '#b0a4e8',
          400: '#8b7dd0',
          500: '#6657b8',
          600: '#4b3d9b',
          700: '#332a74',
          800: '#1e1850',
          900: '#0e0b2e',
        },
        brand: {
          50:  '#f0edff',
          100: '#e2daff',
          200: '#c7b8ff',
          300: '#a98dff',
          400: '#8b62ff',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      boxShadow: {
        soft: '0 1px 3px rgba(109,40,217,0.06), 0 8px 28px rgba(109,40,217,0.10)',
        glow: '0 8px 32px -8px rgba(124,58,237,0.55)',
        'glow-orange': '0 8px 32px -8px rgba(249,115,22,0.45)',
      },
      backgroundImage: {
        'mesh-1':
          'radial-gradient(at 0% 0%, rgba(124,58,237,0.18) 0px, transparent 55%), radial-gradient(at 100% 0%, rgba(249,115,22,0.14) 0px, transparent 55%), radial-gradient(at 50% 100%, rgba(139,98,255,0.14) 0px, transparent 55%)',
        'sidebar-gradient':
          'linear-gradient(160deg, #13103a 0%, #0e0b2e 60%, #12082a 100%)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
