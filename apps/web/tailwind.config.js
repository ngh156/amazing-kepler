/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#181a20',
          100: '#1e2329',
          200: '#2b313a',
          300: '#363c4e',
          400: '#474d57',
        },
        trade: {
          green: '#0ecb81',
          greenHover: '#0ba368',
          red: '#f6465d',
          redHover: '#d93a4f',
          yellow: '#f0b90b',
        },
      },
    },
  },
  plugins: [],
};
