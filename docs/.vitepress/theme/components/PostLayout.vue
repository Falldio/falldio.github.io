<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";
import Tag from "./Tag.vue";

interface HeaderItem {
  title: string;
  link: string;
  level?: number;
  children?: HeaderItem[];
}

const { page, frontmatter } = useData();
const route = useRoute();
const showTocDrawer = ref(false);

const tocItems = computed(() => {
  const headers = (page.value.headers ?? []) as HeaderItem[];
  const items: HeaderItem[] = [];

  for (const header of headers) {
    if (header.level === 2 || header.level === 3) {
      items.push(header);
    }
    for (const child of header.children ?? []) {
      if (child.level === 3) {
        items.push(child);
      }
    }
  }

  return items;
});

const prettyDate = computed(() => {
  const raw = frontmatter.value.date;
  if (!raw) {
    return "";
  }
  return new Date(raw).toDateString();
});

const tags = computed<string[]>(() => frontmatter.value.tags ?? []);

watch(
  () => route.path,
  () => {
    showTocDrawer.value = false;
  },
);
</script>

<template>
  <article class="container py-8 md:py-12">
    <div class="relative mx-auto w-full max-w-6xl">
      <div class="mx-auto w-full max-w-3xl px-1">
        <header class="border-b border-border/80 pb-7">
          <h1 class="font-jinghua text-3xl font-medium leading-tight md:text-4xl">{{ frontmatter.title }}</h1>
          <p v-if="frontmatter.summary" class="mt-4 text-base leading-relaxed text-text-muted md:text-lg">
            {{ frontmatter.summary }}
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted md:text-base">
            <time v-if="prettyDate" :datetime="frontmatter.date">{{ prettyDate }}</time>
            <span v-if="frontmatter.author">{{ frontmatter.author }}</span>
            <span v-if="frontmatter.location">{{ frontmatter.location }}</span>
          </div>
          <div v-if="tags.length" class="mt-5 flex flex-wrap gap-2">
            <Tag v-for="tag in tags" :key="tag" :tag="tag" />
          </div>
        </header>

        <Content
          class="prose mt-8 w-full max-w-none font-serif prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-li:my-1"
        />
      </div>

      <aside v-if="tocItems.length" class="absolute right-0 top-0 hidden w-56 lg:block">
        <div class="sticky top-24 rounded-lg border border-border/80 bg-surface/70 p-4">
          <p class="mb-3 text-xs uppercase tracking-[0.12em] text-text-muted">On this page</p>
          <nav class="space-y-2 text-sm">
            <a
              v-for="item in tocItems"
              :key="item.link"
              :href="item.link"
              class="block text-text-muted transition-colors hover:text-text-main"
            >
              {{ item.title }}
            </a>
          </nav>
        </div>
      </aside>
    </div>

    <div v-if="tocItems.length" class="fixed bottom-5 right-5 z-30 lg:hidden">
      <button
        type="button"
        class="rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-card"
        @click="showTocDrawer = true"
      >
        Contents
      </button>
    </div>

    <div
      v-if="showTocDrawer"
      class="fixed inset-0 z-40 bg-black/40 p-4 lg:hidden"
      @click.self="showTocDrawer = false"
    >
      <aside class="ml-auto h-full w-full max-w-xs rounded-2xl border border-border bg-background p-5">
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm font-medium">On this page</p>
          <button type="button" class="text-sm text-text-muted" @click="showTocDrawer = false">Close</button>
        </div>
        <nav class="space-y-2 text-sm">
          <a
            v-for="item in tocItems"
            :key="item.link"
            :href="item.link"
            class="block text-text-muted transition-colors hover:text-text-main"
            @click="showTocDrawer = false"
          >
            {{ item.title }}
          </a>
        </nav>
      </aside>
    </div>
  </article>
</template>
