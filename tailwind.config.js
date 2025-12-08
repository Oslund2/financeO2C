/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'scripps-navy': '#0B4C7C',
        'scripps-blue': '#006CB7',
        'scripps-light-blue': '#3C8EC5',
        'scripps-yellow': '#FFD100',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
