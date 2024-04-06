<script setup>
import { useRouter } from 'vitepress';
const router = useRouter();
const props = defineProps({
    title: String,
    date: String,
    url: String,
    summary: String,
    tags: Array
});

function navigateToTag(tag) {
    router.go(`/${tag}-tag`);
}
</script>

<template>
    <div class="blog-entry w-full py-5">
        <a :href="url" class="text-2xl font-bold hover:text-kokura-accent">{{ title }}</a>
        <div class="text-gray-500 mt-2" v-if="summary !== undefined && summary !== null && summary.length !== 0">{{
            summary }}</div>
        <div class="subtext flex gap-6">
            <time class="text-gray-500 block mt-2" :datetime="date">{{ date }}</time>
            <span class="tags mt-2">
                <span @click="navigateToTag(tag)" v-for="tag in tags" :key="tag" class="tag me-2 hover:cursor-pointer">{{ tag }}</span>
            </span>
        </div>
    </div>
</template>

<style scoped>
.tag::before {
    content: "🏷️";
    display: inline-block;
    margin-right: 1px;
}
</style>