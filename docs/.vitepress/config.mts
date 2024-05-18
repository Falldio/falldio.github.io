import { defineConfig } from "vitepress";
import { transformerTwoslash } from "vitepress-plugin-twoslash";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "YoloKokura",
  description: "YoloKokura Personal Blog",
  srcDir: "../",
  ignoreDeadLinks: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Blog", link: "/all-tag" },
      { text: "Now", link: "/now" },
      { text: "Tags", link: "/tags" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
    footer: [
      "What need is there to weep over parts of life,",
      "when the whole of it calls for tears? ",
    ],
  },
  markdown: {
    theme: "catppuccin-latte",
    codeTransformers: [transformerTwoslash()],
    math: {
      loader: { load: ["[tex]/enclose"] },
      tex: {
        packages: ["base"],
        inlineMath: [
          ["$", "$"],
          ["\\(", "\\)"],
        ],
        displayMath: [["$$", "$$"]],
      },
    },
  },
});
