<script setup lang="ts">
interface ExploringItem {
  label: string
  title: string
}

const items: ExploringItem[] = [
  {
    label: 'Crypto',
    title: '捣鼓 TON 生态，研究基于 Actor 模型的异步智能合约'
  },
  {
    label: 'Rust',
    title: '业余时间慢慢啃 Rust，正在和 Borrow Checker 斗智斗勇'
  },
  {
    label: 'Discipline',
    title: '重建身心节律与精力管理系统'
  },
]
</script>

<template>
  <section class="mx-auto max-w-5xl">
    <h2 class="blog-title text-2xl md:text-3xl">Currently exploring</h2>

    <ul class="mt-5 space-y-4">
      <li
        v-for="item in items"
        :key="`${item.label}-${item.title}`"
        class="flex flex-col gap-1 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:gap-x-4"
      >
        <span class="text-sm text-text-muted sm:whitespace-nowrap">
          {{ item.label }}
        </span>
        <span class="font-medium text-text-main">
          {{ item.title }}
        </span>
      </li>
    </ul>
  </section>
</template>
