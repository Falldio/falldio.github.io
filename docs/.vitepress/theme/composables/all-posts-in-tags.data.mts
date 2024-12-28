import { createContentLoader } from "vitepress";
import { addSpaceBetweenCharacters } from "./utils.mts";

interface Post {
  title: string;
  date: string;
  url: string;
  summary: string;
  tags: string[];
}

interface Tags {
  [tag: string]: Post[];
}

declare const data: Tags;
export { data };

export default createContentLoader(["./blog/*.md", "./blog/*/*.md"], {
  excerpt: true,
  transform(mds): Tags {
    const tags: Tags = {};
    for (const md of mds) {
      const post = {
        title: addSpaceBetweenCharacters(md.frontmatter.title),
        date: new Date(md.frontmatter.date).toDateString(),
        url: md.url,
        summary: addSpaceBetweenCharacters(md.frontmatter.summary),
        tags: md.frontmatter.tags,
      };
      for (const tag of post.tags) {
        if (!tags[tag]) {
          tags[tag] = [];
        }
        tags[tag].push(post);
      }
    }
    for (const tag in tags) {
      tags[tag].sort((a, b) => {
        return +new Date(b.date) - +new Date(a.date);
      });
    }
    const sortedTags: Tags = {};
    Object.keys(tags)
      .sort((a, b) => {
        return +new Date(tags[b][0].date) - +new Date(tags[a][0].date);
      })
      .forEach((key) => {
        sortedTags[key] = tags[key];
      });

    return sortedTags;
  },
});
