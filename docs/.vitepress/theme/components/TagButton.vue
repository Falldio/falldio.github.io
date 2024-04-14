<script setup lang="ts">
import { useRouter } from 'vitepress';
const router = useRouter();
defineProps<{
    tag?: string,
    displayText?: string
}>()

function navagateToTag(tag) {
    router.go(`/${tag}-tag`);
}
</script>

<template>
    <button type="button" @click="navagateToTag(tag)"
        class="tag-button rounded-lg bg-green-30 p-2 m-1 transition ease-in-out hover:text-kokura-accent hover:bg-white">{{
            displayText
        }}</button>
</template>