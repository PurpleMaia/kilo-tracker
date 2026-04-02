/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#15803D",
          light: "#D1E7D5",
          dark: "#14532D",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#B91C1C",
          foreground: "#FFFFFF",
        },
        kilo: {
          green: "#15803D",
          "green-light": "#D1E7D5",
          "green-dark": "#14532D",
          earth: "#78716C",
          sand: "#FEF3C7",
          ocean: "#0369A1",
          leaf: "#15803D",
          lava: "#B91C1C",
          sunset: "#D97706",
        },
        muted: {
          DEFAULT: "#F5F5F4",
          foreground: "#78716C",
        },
        surface: "#FAFAF9",
        border: "#E7E5E4",
        koa: {
          bg: "#FFFFFF",
          sand: "#1C1917",
          stone: "#78716C",
          fern: "#15803D",
          wood: "#D97706",
          surface: "#FAFAF9",
          danger: "#B91C1C",
        },
      },
      fontFamily: {
        serif: ["Newsreader_400Regular"],
        "serif-italic": ["Newsreader_400Regular_Italic"],
      },
    },
  },
  plugins: [],
};
