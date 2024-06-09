<script setup>
import { useData, useRouter } from 'vitepress';
import { ref } from 'vue';
const { theme } = useData();
let nav = theme.value.nav;
const router = useRouter();

const goHome = () => {
    router.go('/');
};
let showMenu = ref(false);
</script>

<template>
    <header class="w-auto p-3">
        <div class="py-4 border-slate-900/10 lg:px-8 lg:border-0 mx-4 lg:mx-0">
            <div class="relative flex items-center">
                <div class="mr-3 flex-none max-md:w-auto font-bold text-xl hover:cursor-pointer hover:text-kokura-accent"
                    @click="goHome">YoloKokura</div>
                <div class="relative lg:flex items-center ml-auto">
                    <nav class="text-sm leading-6 font-semibold text-slate-700 dark:text-slate-200">
                        <ul class="flex space-x-8 max-md:hidden">
                            <li v-for="item in nav" :key="item.text">
                                <a :href="item.link" class="hover:text-slate-900 dark:hover:text-slate-100 text-xl">{{
                                    item.text
                                }}</a>
                            </li>
                        </ul>
                        <!-- navigation menu for mobile hidden when screen is larger than md -->
                        <div class="relative lg:max-2xl:hidden">
                            <button
                                class="flex items-center justify-center w-10 h-10 rounded-md text-slate-900"
                                @click="showMenu = !showMenu">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 6h16M4 12h16m-7 6h7"></path>
                                </svg>
                            </button>
                            <div v-if="showMenu"
                                class="absolute top-12 right-0 z-10 w-48 py-2 bg-white border border-slate-900/10 rounded-md shadow-lg"
                                @click="showMenu = false">
                                <a v-for="item in nav" :key="item.text" :href="item.link"
                                    class="block px-4 py-2 text-sm">
                                    {{ item.text }}
                                </a>
                            </div>
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    </header>
</template>