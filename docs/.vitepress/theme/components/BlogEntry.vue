<script setup lang="ts">
import Tag from "./Tag.vue";

defineProps<{
  title: string;
  date: string;
  url: string;
  summary?: string;
  tags?: string[];
}>();
</script>

<template>
  <article class="py-6">
    <a :href="url" class="text-2xl font-semibold leading-snug transition-colors hover:text-primary">{{ title }}</a>
    <p v-if="summary" class="mt-2 text-text-muted">{{ summary }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
      <time :datetime="date">{{ date }}</time>
      <Tag v-for="tag in tags" :key="tag" :tag="tag" />
    </div>
  </article>
</template>
