/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Updated Palette based on HerKey ---
        background: '#F5F5F5', // Light grey panel background
        primary: '#8D4672',    // Mauve/Purple brand color
        secondary: '#333333',  // Dark grey primary text
        accent: '#F3D9E2',     // Light pink highlight/tag bg
        muted: '#888888',      // Medium grey secondary text
        action: '#8BC34A',     // <<<<--- Green action button color (Ensure this line exists)
        // --- End Updated Palette ---
      },
      fontFamily: {
        serif: ['"EB Garamond"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
