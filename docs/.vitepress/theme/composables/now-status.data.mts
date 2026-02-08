import { createContentLoader } from "vitepress";

interface NowStatus {
  title: string;
  summary: string;
  date: string;
  url: string;
}

declare const data: NowStatus;
export { data };

export default createContentLoader("./now.md", {
  transform(pages): NowStatus {
    const page = pages[0];

    return {
      title: page?.frontmatter.title ?? "Now",
      summary: page?.frontmatter.summary ?? "Current focus and updates.",
      date: page?.frontmatter.date ? new Date(page.frontmatter.date).toDateString() : "",
      url: page?.url ?? "/now",
    };
  },
});
