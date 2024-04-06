import metadataParser from "markdown-yaml-metadata-parser";
import path from "node:path";
import fs, { read } from "node:fs";

type path = {
  params: {
    tag: string;
  };
};

function readMarkdownFiles(dir: string, tagSet: Set<string>): any {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
        readMarkdownFiles(filePath, tagSet);
    } else if (file.endsWith(".md")) {
        const content = fs.readFileSync(filePath, "utf-8");
        const tags = metadataParser(content).metadata.tags;
        for (const tag of tags) {
          tagSet.add(tag);
        }
    }
  }
}

export default {
  paths: () => {
    const paths: path[] = [];
    const tags: Set<string> = new Set();
    readMarkdownFiles("./blog", tags);
    for (const tag of tags) {
      paths.push({ params: { tag: tag } });
    }
    paths.push({ params: { tag: "all" } });
    return paths;
  },
};
