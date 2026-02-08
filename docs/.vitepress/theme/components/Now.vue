<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

const { frontmatter } = useData();

const prettyDate = computed(() => {
  if (!frontmatter.value.date) {
    return "";
  }
  return new Date(frontmatter.value.date).toDateString();
});
</script>

<template>
  <article class="mx-auto max-w-3xl py-10">
    <header class="border-b border-border pb-6">
      <h1 class="text-3xl font-semibold">{{ frontmatter.title }}</h1>
      <time v-if="prettyDate" class="mt-3 block text-text-muted" :datetime="frontmatter.date">{{ prettyDate }}</time>
      <p v-if="frontmatter.summary" class="mt-4 text-lg text-text-muted">{{ frontmatter.summary }}</p>
    </header>
    <Content class="prose prose-lg mt-8 max-w-none" />
  </article>
</template>
