<script setup>
import BlogList from './BlogList.vue';
import Now from './Now.vue';
import Blog from './Blog.vue';
import AllTags from './AllTags.vue';
</script>

<template>
    <div class="content-wrapper px-11 w-full">
        <BlogList v-if="$frontmatter.layout === 'blog-list'" />
        <Now v-else-if="$frontmatter.layout === 'now'" />
        <Blog v-else-if="$frontmatter.layout === 'blog'" />
        <AllTags v-else-if="$frontmatter.layout === 'all-tags'" />
    </div>
</template>