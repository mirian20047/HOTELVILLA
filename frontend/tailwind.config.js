/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hotel-primary': '#F97316',
        'hotel-primary-dark': '#EA580C',
        'hotel-primary-light': '#FDBA74',
        'hotel-bg': '#FFF7ED',
        'hotel-gray': '#6B7280',
      },
    },
  },
  plugins: [],
}