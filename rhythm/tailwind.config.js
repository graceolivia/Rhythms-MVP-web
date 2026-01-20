/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary palette - natural dye tones
        cream: '#FAF6F1',
        parchment: '#F5EDE4',
        linen: '#EDE6DB',

        // Earth tones
        bark: '#5D4E37',
        terracotta: '#C67B5C',
        clay: '#B8860B',

        // Garden greens
        sage: '#9CAF88',
        moss: '#6B7B3C',
        fern: '#4A5D23',

        // Soft accents
        dustyrose: '#D4A5A5',
        lavender: '#B8A9C9',
        skyblue: '#A5C4D4',

        // Seasonal accents
        spring: {
          light: '#E8F5E9',
          DEFAULT: '#81C784'
        },
        summer: {
          light: '#FFF8E1',
          DEFAULT: '#FFD54F'
        },
        fall: {
          light: '#FBE9E7',
          DEFAULT: '#FF8A65'
        },
        winter: {
          light: '#E3F2FD',
          DEFAULT: '#90CAF9'
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
        sans: ['Source Sans Pro', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
