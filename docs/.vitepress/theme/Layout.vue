<script setup>
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import Home from './components/Home.vue';
import ContentWrapper from './components/ContentWrapper.vue';
import { useData } from 'vitepress';
const { page, frontmatter } = useData();
</script>

<template>
    <div class="flex flex-col h-screen">
        <Header />
        <section class="flex mb-auto">
            <div v-if="page.isNotFound" class="underline">404 Not Found</div>
            <Home v-if="frontmatter.layout === 'home'" />
            <ContentWrapper v-else />
        </section>
        <Footer />
    </div>
</template>

<style>
/* @import url(custom.css); */
@font-face {
    font-family: 'Jinghua';
    src: url(./fonts/京華老宋体v1.007.ttf);
}

@font-face {
    font-family: 'Literata';
    src: url(./fonts/Literata-VariableFont_opsz,wght.ttf),
        url(./fonts/Literata-Italic-VariableFont_opsz,wght.ttf);
}

body {
    background-color: var(--kokura-bg);
    font-family: 'Literata', 'Jinghua', serif;
}
</style>