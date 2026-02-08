<script setup lang="ts">
import { useRouter } from "vitepress";
import { cn } from "../composables/cn";

const props = defineProps<{
  tag: string;
  count?: number;
  class?: string;
}>();

const router = useRouter();

const openTag = () => {
  router.go(`/${props.tag}-tag`);
};
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border/80 bg-surface/70 px-2 py-0.5 text-sm text-text-main font-jinghua transition-colors duration-200 hover:border-primary/40 hover:bg-[#e6f0e6] hover:text-primary dark:hover:bg-[#2a352a]',
        props.class,
      )
    "
    @click="openTag"
  >
    <span>{{ tag }}</span>
    <span
      v-if="typeof count === 'number'"
      class="rounded-md bg-background px-1.5 py-0.5 text-xs text-text-muted"
      >{{ count }}</span
    >
  </button>
</template>
