<script setup>
const props = defineProps({
    title: String,
    date: String,
    url: String,
});

</script>

<template>
    <a :href="url" class="no-underline">
        <article
            class="home-card group home-card px-10 py-8 bg-green-10 shadow-xl transition ease-in-out delay-150 hover:bg-white hover:cursor-pointer duration-300 h-full">
            <h3
                class="home-card-title mb-8 font-black text-2xl transition ease-in-out delay-150 group-hover:text-kokura-accent duration-300 line-clamp-2 h-16">
                {{
        title }}
            </h3>
            <time class="text-gray-400" datetime=:date>{{ date }}</time>
        </article>
    </a>
</template>
