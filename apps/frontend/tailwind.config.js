/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta legada — preservada para retrocompatibilidade com telas fora do recorte 004
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },

        // Paleta institucional EcoCoop (ADR 004)

        // Azul-petróleo — cor primária de interação
        petroleo: {
          50: '#eef3f8',
          100: '#d4e2ef',
          200: '#aac5e0',
          300: '#7ba4cc',
          400: '#5083b4',
          500: '#34699c',
          600: '#1e4a6e',
          700: '#163756',
          800: '#0e2540',
          900: '#07131f',
        },

        // Teal — cor de acento e destaque
        ecocoop: {
          50: '#e6f7f7',
          100: '#b8eaea',
          200: '#83d9d9',
          300: '#4dc5c5',
          400: '#26afaf',
          500: '#0e9494',
          600: '#0d7a7a',
          700: '#0a6060',
          800: '#074747',
          900: '#052e2e',
        },

        // Grafite — neutros, texto, fundos e bordas
        grafite: {
          50: '#f5f6f7',
          100: '#e8eaec',
          200: '#d1d5d9',
          300: '#b0b7bd',
          400: '#8a929a',
          500: '#636c75',
          600: '#4c555e',
          700: '#3d464f',
          800: '#343a40',
          900: '#1f2327',
        },
      },
    },
  },
  plugins: [],
};
