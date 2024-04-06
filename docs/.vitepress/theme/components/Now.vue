<script setup>
</script>

<template>
    <div class="now w-4/5">
        <div class="page-header py-10 border-dashed border-b">
            <h1 class="text-4xl font-bold">{{ $frontmatter.title }}</h1>
            <time class="text-lg text-gray-500 block mt-5" :datetime="$frontmatter.date" >{{  $frontmatter.date }}</time>
            <span class="text-xl text-gray-500 block mt-5">{{ $frontmatter.summary }}</span>
        </div>
        <Content class="prose" />
    </div>
</template>