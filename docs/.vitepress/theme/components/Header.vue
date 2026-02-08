<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import ThemeToggle from "./ThemeToggle.vue";

const { theme } = useData();
const nav = computed(() => theme.value.nav ?? []);
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
    <div class="container flex h-16 items-center justify-between gap-4">
      <a href="/" class="site-title text-xl tracking-tight md:text-2xl">YoloKokura</a>
      <nav class="hidden items-center gap-6 text-sm text-text-muted md:flex md:text-base">
        <a
          v-for="item in nav"
          :key="item.text"
          :href="item.link"
          class="transition-colors hover:text-text-main"
        >
          {{ item.text }}
        </a>
      </nav>
      <div class="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </div>
    <nav class="container flex gap-4 overflow-x-auto pb-3 text-sm text-text-muted md:hidden">
      <a
        v-for="item in nav"
        :key="item.text"
        :href="item.link"
        class="whitespace-nowrap transition-colors hover:text-text-main"
      >
        {{ item.text }}
      </a>
    </nav>
  </header>
</template>
