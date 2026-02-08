import { defineConfig } from "vitepress";
import markdownItPangu from "markdown-it-pangu";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "YoloKokura",
  description: "YoloKokura Personal Blog",
  srcDir: "../",
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Blog", link: "/all-tag" },
      { text: "Now", link: "/now" },
      { text: "Tags", link: "/tags" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/vuejs/vitepress" }],
    footer: [
      "What need is there to weep over parts of life,",
      "when the whole of it calls for tears? ",
    ],
  },
  markdown: {
    lineNumbers: false,
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
    math: true,
    config(md) {
      md.use(markdownItPangu);
    },
  },
});
