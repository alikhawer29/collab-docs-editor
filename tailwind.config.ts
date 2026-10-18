import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe7",
        sheet: "#fffdf9",
        ink: "#1c1916",
        muted: "#6f675f",
        line: "#e4dcd0",
        clay: "#8d4b2a",
        danger: "#9b2c2c",
        pine: {
          50: "#eef6f4",
          100: "#d5ebe6",
          700: "#0f5c54",
          800: "#0c4a44",
          900: "#08332f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        sheet: "0 18px 50px rgba(60, 42, 20, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
