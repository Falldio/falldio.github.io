import { createContentLoader } from "vitepress";
import { addSpaceBetweenCharacters } from "./utils.mts";

interface Post {
  title: string;
  date: string;
  url: string;
}

declare const data: Post[];
export { data };

export default createContentLoader(["./blog/*.md", "./blog/*/*.md"], {
  transform(mds): Post[] {
    return mds
      .map((md) => {
        return {
          title: addSpaceBetweenCharacters(md.frontmatter.title),
          date: new Date(md.frontmatter.date).toDateString(),
          url: md.url,
        };
      })
      .sort((a, b) => {
        return +new Date(b.date) - +new Date(a.date);
      })
      .slice(0, 3);
  },
});
