import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'golf-green': '#1a6b3c',
        'golf-green-light': '#2d9e5f',
        'golf-green-dark': '#0f4a28',
        'bg-dark': '#0f1a14',
        'bg-surface': '#1a2e20',
        'bg-surface2': '#223829',
        'golf-text': '#e8f0e9',
        'golf-muted': '#8aad8f',
        'golf-gold': '#c9a84c',
        'golf-gold-light': '#e5c97e',
        'golf-border': '#2a4530',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
