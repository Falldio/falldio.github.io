<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import SocialLinks from "../SocialLinks.vue";

interface HeroData {
  name?: string;
  img?: string;
  intro?: string[];
}

const { frontmatter } = useData();
const hero = computed(() => (frontmatter.value.hero ?? {}) as HeroData);
</script>

<template>
  <section class="mx-auto max-w-4xl">
    <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-[auto_1fr] md:gap-12">
      <h1 class="site-title order-1 font-jinghua text-3xl font-medium md:col-start-2 md:text-4xl">{{ hero.name }}</h1>
      <img
        v-if="hero.img"
        :src="hero.img"
        :alt="hero.name ?? 'avatar'"
        class="order-2 mx-auto h-28 w-28 rounded-full object-cover md:col-start-1 md:row-span-3 md:mx-0 md:h-36 md:w-36"
      />
      <div class="order-3 space-y-4 md:col-start-2">
        <p class="text-sm uppercase tracking-[0.14em] text-text-muted">Hi there 👋</p>
        <p
          v-for="line in hero.intro"
          :key="line"
          class="max-w-3xl font-jinghua text-base leading-8 text-text-main md:text-lg"
        >
          {{ line }}
        </p>
        <div class="mt-6 flex flex-wrap items-center gap-2 text-base">
          <span class="font-bold text-text-main">Find me here 👉:</span>
          <SocialLinks />
        </div>
      </div>
    </div>
  </section>
</template>
