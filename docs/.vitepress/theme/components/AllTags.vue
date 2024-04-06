<script setup>
import { data as tags } from '../composables/all-posts-in-tags.data';
import { useRouter } from 'vitepress';
const router = useRouter();

function navagateToTag(tag) {
    router.go(`/${tag}-tag`);
}
</script>

<template>
    <div>
        <h1 class="page-header text-4xl font-bold py-10 border-dashed border-b">{{ $frontmatter.title }}</h1>
        <div class="tags-container flex flex-wrap gap-1 w-3/4">
            <button type="button" @click="navagateToTag(tag)" v-for="tag in Object.keys(tags)" :key="tag" class="tag-button rounded-lg bg-green-30 p-2 m-1">{{ tag + ': ' + tags[tag].length
                }}</button>
        </div>
    </div>
</template>