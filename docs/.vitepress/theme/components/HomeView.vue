<script setup lang="ts">
import Intro from "./home/Intro.vue";
import RecentPosts from "./home/RecentPosts.vue";
import Recommendations from "./home/Recommendations.vue";
</script>

<template>
  <section class="container space-y-16 py-12 md:space-y-24 md:py-20">
    <Intro />
    <RecentPosts />
    <Recommendations />
  </section>
</template>
