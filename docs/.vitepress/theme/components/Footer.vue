<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

const { theme } = useData();
const footers = computed(() => theme.value.footer ?? []);
</script>

<template>
  <footer class="border-t border-border/50 py-10">
    <div class="container space-y-2 text-center text-sm text-text-muted md:text-base">
      <p v-for="line in footers" :key="line">{{ line }}</p>
    </div>
  </footer>
</template>
