<script setup>
import { addSpaceBetweenCharacters } from '../composables/utils';
import TagButton from './TagButton.vue';
</script>

<template>
    <div class="blog">
        <div class="page-header py-10 border-dashed border-b w-4/5">
            <h1 class="text-4xl font-bold">{{ addSpaceBetweenCharacters($frontmatter.title) }}</h1>
            <div class="blog-meta text-gray-500 mt-5 flex gap-4">
                <time :datetime="$frontmatter.date">{{ new Date($frontmatter.date).toDateString() }}</time>
                <span v-if="$frontmatter.author !== undefined">{{ $frontmatter.author }}</span>
                <span v-if="$frontmatter.location !== undefined">{{ $frontmatter.location }}</span>
            </div>
            <span
                v-if="$frontmatter.summary !== undefined && $frontmatter.summary !== null && $frontmatter.summary.length !== 0"
                class="text-xl text-gray-500 block mt-5">{{ addSpaceBetweenCharacters($frontmatter.summary) }}</span>
        </div>
        <div class="blog-content flex gap-8">
            <Content class="prose max-w-none w-3/5" />
            <div class="blog-sidebar w-2/5">
                <div class="blog-tags p-5">
                    <h4 class="text-2xl font-bold mb-2">Tags: </h4>
                    <div class="tags-container flex flex-wrap gap-1">
                        <TagButton v-for="tag in $frontmatter.tags" :key="tag" :tag="tag" :displayText="tag"/>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>