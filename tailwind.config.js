/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx,vue}",
    "./docs/.vitepress/**/*.{html,js,ts,jsx,tsx,vue,md}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
    },
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "text-main": "rgb(var(--color-text-main) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Literata"', "Georgia", '"Times New Roman"', "serif"],
        serif: ['"Literata"', "Georgia", '"Times New Roman"', "serif"],
        jinghua: ['"Jinghua"', '"Literata"', "serif"],
        display: ['"Jinghua"', '"Literata"', "serif"],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.75" }],
        lg: ["1.0625rem", { lineHeight: "1.85" }],
        xl: ["1.25rem", { lineHeight: "1.6" }],
        "2xl": ["1.5rem", { lineHeight: "1.45" }],
        "3xl": ["1.875rem", { lineHeight: "1.3" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
      },
      boxShadow: {
        paper: "0 18px 40px -28px rgb(20 20 20 / 0.35)",
        card: "0 14px 28px -20px rgb(20 20 20 / 0.28)",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme("colors.text-main"),
            fontSize: theme("fontSize.base")[0],
            lineHeight: "1.9",
            maxWidth: "72ch",
            code: { fontWeight: "500" },
            a: { color: theme("colors.primary") },
            h1: { fontFamily: theme("fontFamily.display").join(", "), fontSize: "1.5rem" },
            h2: { fontFamily: theme("fontFamily.display").join(", "), fontSize: "1.25rem" },
            h3: { fontFamily: theme("fontFamily.display").join(", "), fontSize: "1.125rem" },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
