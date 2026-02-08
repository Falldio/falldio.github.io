<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../composables/cn";

const props = withDefaults(
  defineProps<{
    as?: "button" | "a";
    href?: string;
    variant?: "solid" | "ghost";
    size?: "sm" | "md";
    class?: string;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    as: "button",
    variant: "solid",
    size: "md",
    type: "button",
  },
);

const classes = computed(() =>
  cn(
    "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    props.size === "sm" ? "h-9 px-4 text-sm" : "h-11 px-5 text-sm",
    props.variant === "solid"
      ? "bg-primary text-white hover:bg-primary/90"
      : "bg-transparent text-text-main hover:bg-surface border border-border",
    props.class,
  ),
);
</script>

<template>
  <component
    :is="as"
    :href="as === 'a' ? href : undefined"
    :type="as === 'button' ? type : undefined"
    :class="classes"
  >
    <slot />
  </component>
</template>
