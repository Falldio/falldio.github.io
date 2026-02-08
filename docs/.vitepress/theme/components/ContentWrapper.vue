<script setup lang="ts">
import BlogList from "./BlogList.vue";
import Now from "./Now.vue";
import AllTags from "./AllTags.vue";
</script>

<template>
  <div class="container">
    <BlogList v-if="$frontmatter.layout === 'blog-list'" />
    <Now v-else-if="$frontmatter.layout === 'now'" />
    <AllTags v-else-if="$frontmatter.layout === 'all-tags'" />
    <article v-else class="mx-auto max-w-3xl py-10">
      <Content class="prose prose-lg max-w-none" />
    </article>
  </div>
</template>
