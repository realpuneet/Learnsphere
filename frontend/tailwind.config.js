/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        brand: { 50: '#f1eeff', 100: '#e4deff', 200: '#cbbfff', 300: '#ab98ff', 400: '#8a6dff', 500: '#6f4cfb', 600: '#5b3df5', 700: '#4a2fd6', 800: '#3d28ab', 900: '#2f2185' },
        ink: { 50: '#f7f6fb', 100: '#eceaf5', 200: '#dcd9ea', 300: '#b6b2cd', 400: '#8a86a8', 500: '#65627f', 600: '#4b4965', 700: '#383650', 800: '#252340', 900: '#15142b' },
        coral: { 50: '#fff4ec', 100: '#ffe6d3', 400: '#ff9d5c', 500: '#ff7f2a', 600: '#e8661a' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(21,20,43,.04), 0 8px 24px -12px rgba(21,20,43,.14)', pop: '0 18px 50px -12px rgba(21,20,43,.28)' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgba(91,61,245,.45)' }, '100%': { boxShadow: '0 0 0 14px rgba(91,61,245,0)' } },
      },
      animation: { pulseRing: 'pulseRing 1.8s ease-out infinite' },
    },
  },
  plugins: [],
};
