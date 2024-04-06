<script setup>
import { useData, useRouter } from 'vitepress';
const { theme } = useData();
let nav = theme.value.nav;
const router = useRouter();

const goHome = () => {
    router.go('/');
};
</script>

<template>
    <header class="mx-auto p-3">
        <div class="py-4 border-slate-900/10 lg:px-8 lg:border-0 mx-4 lg:mx-0">
            <div class="relative flex items-center">
                <div class="mr-3 flex-none md:w-auto font-bold text-xl hover:cursor-pointer hover:text-kokura-accent" @click="goHome">YoloKokura</div>
                <div class="relative hidden lg:flex items-center ml-auto">
                    <nav class="text-sm leading-6 font-semibold text-slate-700 dark:text-slate-200">
                        <ul class="flex space-x-8">
                            <li v-for="item in nav" :key="item.text">
                                <a :href="item.link" class="hover:text-slate-900 dark:hover:text-slate-100 text-xl">{{ item.text
                                    }}</a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    </header>
</template>