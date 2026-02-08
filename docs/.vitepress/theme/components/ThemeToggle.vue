<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const isDark = ref(false);

const applyTheme = (dark: boolean) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(dark ? "dark" : "light");
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  applyTheme(isDark.value);
  localStorage.setItem("yk-theme", isDark.value ? "dark" : "light");
};

onMounted(() => {
  const saved = localStorage.getItem("yk-theme");
  if (saved === "dark" || saved === "light") {
    isDark.value = saved === "dark";
  } else {
    isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  applyTheme(isDark.value);
});

const label = computed(() => (isDark.value ? "Switch to light mode" : "Switch to dark mode"));
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    class="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-sm text-text-main transition-colors hover:bg-background"
    @click="toggleTheme"
  >
    {{ isDark ? "Dark" : "Light" }}
  </button>
</template>
