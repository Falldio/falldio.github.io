/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx,vue}",
    "./docs/.vitepress/**/*.{html,js,ts,jsx,tsx,vue}",
  ],
  theme: {
    container: {
      center: true,
    },
     extend: {
      colors: {
        kokura: {
          bg: "var(--kokura-bg)",
          primary: "var(--kokura-primary)",
          secondary: "var(--kokura-secondary)",
          accent: "var(--kokura-accent)",
        },
        green: {
          10: '#edefe7',
          30: '#bbbeb1',
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            code: {
              backgroundColor: theme("colors.gray.100"),
              padding: theme("spacing.1"),
              borderRadius: theme("borderRadius.md"),
              fontWeight: "400",
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
