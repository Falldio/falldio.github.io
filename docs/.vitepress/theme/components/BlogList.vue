<script setup lang="ts">
import { computed } from "vue";
import { data as allPosts } from "../composables/all-posts.data";
import { data as tags } from "../composables/all-posts-in-tags.data";
import { useData } from "vitepress";
import BlogEntry from "./BlogEntry.vue";

const { params } = useData();

const currentTag = computed(() => params.value?.tag ?? "all");

const title = computed(() =>
  currentTag.value !== "all"
    ? `Posts tagged with ${currentTag.value}`
    : `All Posts (${allPosts.length})`,
);

const posts = computed(() =>
  currentTag.value !== "all" ? (tags[currentTag.value] ?? []) : allPosts,
);
</script>

<template>
  <section class="mx-auto max-w-3xl py-10">
    <h1 class="border-b border-border pb-6 text-3xl font-semibold">{{ title }}</h1>
    <div class="divide-y divide-border/70">
      <BlogEntry
        v-for="post in posts"
        :key="post.url"
        :title="post.title"
        :date="post.date"
        :summary="post.summary"
        :url="post.url"
        :tags="post.tags"
      />
    </div>
  </section>
</template>
