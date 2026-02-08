<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import DefaultLayout from "./components/DefaultLayout.vue";
import HomeView from "./components/HomeView.vue";
import ContentWrapper from "./components/ContentWrapper.vue";
import PostLayout from "./components/PostLayout.vue";

const { page, frontmatter } = useData();
const layoutName = computed(() => frontmatter.value.layout ?? "default");
</script>

<template>
  <DefaultLayout>
    <div v-if="page.isNotFound" class="container py-16">
      <h1 class="text-3xl font-semibold">404</h1>
      <p class="mt-3 text-text-muted">The page you are looking for does not exist.</p>
    </div>
    <HomeView v-else-if="layoutName === 'home'" />
    <PostLayout v-else-if="layoutName === 'blog'" />
    <ContentWrapper v-else />
  </DefaultLayout>
</template>
