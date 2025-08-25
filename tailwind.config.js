/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        army: {
          50: '#f0f9f0',
          100: '#dcf2dc',
          200: '#bce5bc',
          300: '#8dd18d',
          400: '#5bb55b',
          500: '#3a9a3a',
          600: '#2d7d2d',
          700: '#256325',
          800: '#1f4f1f',
          900: '#1a421a',
        },
      },
    },
  },
  plugins: [],
}