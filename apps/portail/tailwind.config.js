/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        immuniq: {
          navy: '#083860',
          'navy-2': '#084068',
          'navy-light': '#0E4A7A',
          teal: '#00A8A8',
          'teal-dark': '#00A0A0',
          'teal-light': '#33BDBD',
          mist: '#E8F0F0',
          'mist-light': '#F0F7F7',
        },
        surface: '#FFFFFF',
        ink: '#1A202C',
        muted: '#4A5568',
        line: '#E2E8F0',
        success: '#2F855A',
        warning: '#B7791F',
        danger: '#C53030',
      },
      fontFamily: {
        heading: ['Gotham', 'Segoe UI', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'Gotham', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(8, 56, 96, 0.08)',
      },
    },
  },
  plugins: [],
};
