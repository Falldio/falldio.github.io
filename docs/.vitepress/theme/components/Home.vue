<script setup>
import { ref } from 'vue';
import { useData } from 'vitepress';
import { data as posts } from '../composables/recent-posts.data'
import HomeCard from './HomeCard.vue';
const { frontmatter } = useData();
const hero = ref(frontmatter.value.hero);
</script>

<template>
    <section class="container">
        <div class="intro columns-2 flex flex-row py-16 mx-auto max-w-3xl justify-center items-center">
            <img class="size-64 rounded-full scale-75" :src="hero.img" :alt="hero.name" />
            <div class="w-full gap-4 p-8 flex flex-col hyphens-auto">
                <h1 class="text-2xl font-bold text-kokura-accent">{{ hero.name }}</h1>
                <p class="text-lg" v-for="line in hero.intro" :key="line">{{ line }}</p>
            </div>
        </div>
        <div class="latest-posts py-8" v-if="posts.length">
            <h2 class="text-2xl font-semibold">Why do you write like you needed it to survive...</h2>
            <div class="homecard-container grid grid-cols-3 gap-4 my-4">
                <HomeCard v-for="post in posts" :key="post.title" :title="post.title" :date="post.date"
                    :url="post.url" />
            </div>
        </div>
    </section>
</template>