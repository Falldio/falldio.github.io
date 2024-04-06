<script setup>
import { useData } from 'vitepress';
import { ref } from 'vue';
const { theme } = useData();
const footers = ref(theme.value.footer || []);
</script>

<template>
    <footer class="mx-auto container flex flex-col justify-center items-center my-4 min-h-min">
        <div class="text-sm relative py-1" v-for="line in footers" :key="line">{{ line }}</div>
    </footer>
</template>