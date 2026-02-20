<script setup lang="ts">
import { data as recentPosts } from "../../composables/recent-posts.data";
</script>

<template>
  <section class="mx-auto max-w-5xl">
    <div class="mb-5 flex items-end justify-between gap-4">
      <h2 class="blog-title text-2xl md:text-3xl">Why do you  write like you needed it to survive?</h2>
      <a href="/all-tag" class="text-sm text-text-muted hover:text-text-main">Browse all</a>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <a
        v-for="post in recentPosts"
        :key="post.url"
        :href="post.url"
        class="group rounded-2xl border border-border/80 bg-surface/50 p-5 transition-colors duration-200 hover:border-primary/40 hover:bg-surface"
      >
        <h3 class="line-clamp-2 text-xl leading-snug group-hover:text-primary">{{ post.title }}</h3>
        <p class="mt-4 text-sm text-text-muted">{{ post.date }}</p>
      </a>
    </div>
  </section>
</template>
