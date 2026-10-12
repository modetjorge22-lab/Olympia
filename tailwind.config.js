/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // hover: solo en punteros que de verdad pueden hacer hover — en táctil se
  // quedaba "pegado" tras un toque.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // Transición estándar de controles: solo las propiedades que cambian.
      transitionProperty: {
        ui: 'background-color, border-color, color, opacity, box-shadow',
      },
      fontFamily: {
        display: ['"DM Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
