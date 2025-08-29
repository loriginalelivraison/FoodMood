/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316', // orange-500
          dark: '#ea580c'
        }
      },
      borderRadius: {
        '2xl': '1rem'
      }
    }
  },
  plugins: []
}
