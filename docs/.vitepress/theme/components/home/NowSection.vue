<script setup lang="ts">
import { data as nowStatus } from "../../composables/now-status.data";
</script>

<template>
  <section class="mx-auto max-w-4xl">
    <hr class="mb-10 border-border/70" />
    <div class="space-y-4 font-jinghua">
      <p class="artistic-text text-2xl md:text-3xl">Now</p>
      <p class="text-sm text-text-muted" v-if="nowStatus.date">Updated {{ nowStatus.date }}</p>
      <p class="max-w-3xl text-base leading-8 text-text-main md:text-lg">{{ nowStatus.summary }}</p>
      <a :href="nowStatus.url" class="inline-flex text-sm underline decoration-primary/60 underline-offset-4">
        Open full now page
      </a>
    </div>
  </section>
</template>
