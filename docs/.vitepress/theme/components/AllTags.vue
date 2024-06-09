<script setup>
import { data as tags } from '../composables/all-posts-in-tags.data';
import TagButton from './TagButton.vue';
</script>

<template>
    <div>
        <h1 class="page-header text-4xl font-bold py-10 border-dashed border-b">{{ $frontmatter.title }}</h1>
        <div class="tags-container flex flex-wrap gap-1 w-3/4 max-md:w-full">
            <TagButton v-for="tag in Object.keys(tags)" :key="tag" :tag="tag" :displayText="tag + ': ' + tags[tag].length"/>
        </div>
    </div>
</template>