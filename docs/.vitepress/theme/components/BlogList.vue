<script setup>
import BlogEntry from './BlogEntry.vue';
import { data as allPosts } from '../composables/all-posts.data';
import { data as tags } from '../composables/all-posts-in-tags.data';
import { useData } from 'vitepress';
import { ref, watchEffect } from 'vue';
let { params } = useData();
const title = ref('');
const posts = ref([]);
watchEffect(() => {
    let tag = params.value.tag;
    title.value = tag !== 'all' ? `Posts tagged with ${tag}` : 'All Posts';
    posts.value = tag !== 'all' ? tags[tag] : allPosts;
});
</script>

<template>
    <div>
        <h1 class="page-header text-4xl font-bold py-10 border-dashed border-b">{{ title }}</h1>
        <BlogEntry v-for="post in posts" :key="post.title" :title="post.title" :date="post.date" :summary="post.summary"
            :url="post.url" :tags="post.tags" />
    </div>
</template>