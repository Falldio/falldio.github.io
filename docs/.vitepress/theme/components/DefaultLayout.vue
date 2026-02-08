<script setup lang="ts">
import Header from "./Header.vue";
import Footer from "./Footer.vue";
</script>

<template>
  <div class="min-h-screen bg-background text-text-main transition-colors duration-300">
    <Header />
    <main class="pb-12">
      <slot />
    </main>
    <Footer />
  </div>
</template>
