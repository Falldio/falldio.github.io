import { defineConfig } from "vitepress";
import { transformerTwoslash } from "vitepress-plugin-twoslash";
import mathjax3 from "markdown-it-mathjax3";

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
      "小倉百人一首",
      "春過ぎて　夏来るらし　白妙の　衣干したり　天の香具山"
    ],
  },
  markdown: {
    theme: "catppuccin-latte",
    codeTransformers: [transformerTwoslash()],
    config: (md) => {
      md.use(mathjax3);
    },
  },
});
