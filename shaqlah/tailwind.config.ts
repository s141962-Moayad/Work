import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#151515", soft: "#2a2a2a", muted: "#6b6b6b" },
        brand: { DEFAULT: "#FF6B00", dark: "#d95a00", light: "#fff0e3" },
        gold: { DEFAULT: "#D9A441", light: "#f8edd3" },
        paper: "#FAF8F5",
      },
      fontFamily: { sans: ["Cairo Variable", "Tajawal", "system-ui", "sans-serif"] },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        card: "0 2px 14px rgba(21,21,21,.06)",
        lift: "0 10px 30px rgba(21,21,21,.12)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
        "pop": { "0%": { transform: "scale(.9)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "slide-in": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "none" } },
      },
      animation: {
        "fade-up": "fade-up .5s ease-out both",
        pop: "pop .2s ease-out both",
        "slide-in": "slide-in .25s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
