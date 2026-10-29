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
        night: {
          950: "#181215",
          900: "#211A1D", // Base background
          850: "#261E22",
          800: "#2B2226", // Secondary surface
          750: "#342A2F",
          700: "#3F3238",
        },
        parchment: {
          50: "#FAF6F0",
          100: "#F0E8DF", // Primary text
          200: "#DECFC5",
          300: "#C8B6AA",
          400: "#A89A98", // Secondary text
          500: "#8C7E7C",
          600: "#6B5E5C",
        },
        embers: {
          DEFAULT: "#D78A70", // Accent
          hover: "#E49A82",
          dim: "#C2785F",
          glow: "rgba(215, 138, 112, 0.12)",
          whisper: "rgba(215, 138, 112, 0.06)",
        },
        edge: {
          DEFAULT: "#45373C", // Borders
          subtle: "#34282D",
          dim: "#2D2227",
          hover: "#57464C",
        },
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "Instrument Serif", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "DM Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        writing: ["var(--font-newsreader)", "Newsreader", "Lora", "Charter", "Georgia", "serif"],
      },
      letterSpacing: {
        editorial: "0.015em",
        relaxed: "0.03em",
        whisper: "0.08em",
      },
    },
  },
  plugins: [],
};

export default config;

