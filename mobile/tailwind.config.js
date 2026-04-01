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
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        koa: {
          bg: "#1C1B19",
          sand: "#F2E8D5",
          stone: "#B0A48E",
          fern: "#7A9E7D",
          wood: "#D4A878",
          surface: "#2A2926",
          danger: "#D4695A",
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
