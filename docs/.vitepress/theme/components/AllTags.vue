<script setup lang="ts">
import { data as tags } from "../composables/all-posts-in-tags.data";
import Tag from "./Tag.vue";
</script>

<template>
  <section class="mx-auto max-w-3xl py-10 md:py-12">
    <h1 class="border-b border-border pb-6 text-3xl font-semibold">{{ $frontmatter.title }}</h1>
    <div class="mt-8 flex flex-wrap gap-4 md:gap-6">
      <Tag
        v-for="tagName in Object.keys(tags)"
        :key="tagName"
        :tag="tagName"
        :count="tags[tagName].length"
      />
    </div>
  </section>
</template>
