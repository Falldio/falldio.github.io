<script setup lang="ts">
interface Item {
  title: string
  author: string
  cover: string
  link: string
  comment: string
  type: 'Book' | 'Movie' | 'Musical' | 'Song' | 'TV show'
}

const items: Item[] = [
  {
    title: '沉思录',
    author: 'Marcus Aurelius Antoninus',
    cover: '/images/meditations.jpg', // User: remember to put local images in public/images/
    link: 'https://book.douban.com/subject/27157291/',
    comment: '这是一本我读了三四遍的斯多葛主义哲思读本，虽然是作者彼时的日记，但却能打破时空的限制，让现代社会中的读者反躬自省。',
    type: 'Book'
  },
  {
    title: 'Les Misérables',
    author: 'James Powell / Jean-Pierre Van De Spuy',
    cover: '/images/lemiz.jpg',
    link: 'https://www.douban.com/event/36895930/#:~:text=%E6%B4%BB%E5%8A%A8%E8%AF%A6%E6%83%85&text=40%E5%91%A8%E5%B9%B4%E7%BA%AA%E5%BF%B5%E7%89%88%E9%9F%B3%E4%B9%90%E4%BC%9A%E6%98%AF%E4%B8%BA%E5%BA%86%E7%A5%9D%E9%9F%B3%E4%B9%90,%E7%A3%85%E5%A5%BD%E6%88%8F%E4%B9%8B%E4%B8%80%E3%80%82',
    comment: 'To love another person is to see the face of God.',
    type: 'Musical'
  },
  {
    title: 'One Last Kiss',
    author: '宇多田ヒカル',
    cover: '/images/onelastkiss.png',
    link: 'https://www.en.utadahikaru.jp/music/khghm2o88i75/',
    comment: 'I love you more than you\'ll ever know 😭',
    type: 'Song'
  },
  {
    title: '白い巨塔',
    author: ' 西谷弘 / 河野圭太 / 村上正典 / 岩田和行',
    cover: '/images/whitetower.png',
    link: 'https://movie.douban.com/subject/2150220/',
    comment: 'Amazing Grace, how sweet the sound. That saved a wretch like me. I once was lost but now I\'m found, Was blind but now I see.',
    type: 'TV show'
  },
]
</script>

<template>
  <section class="mx-auto mt-20 max-w-5xl">
    <h2 class="mb-8 flex items-center gap-2 text-2xl font-bold font-jinghua text-text-main">
      书影音
    </h2>

    <div class="space-y-8">
      <div
        v-for="item in items"
        :key="item.title"
        class="group flex flex-col items-start gap-6 transition-opacity hover:opacity-80 sm:flex-row"
      >
        <a :href="item.link" target="_blank" rel="noreferrer" :aria-label="item.title">
          <div class="w-24 shrink-0 overflow-hidden rounded border border-border/50 bg-surface/50 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg sm:w-28">
            <img :src="item.cover" :alt="item.title" class="h-auto w-full" />
          </div>
        </a>

        <div class="min-w-0 flex-1 py-1">
          <div class="flex items-baseline justify-between">
            <h3 class="truncate text-lg font-bold font-jinghua transition-colors group-hover:text-primary">
              {{ item.title }}
            </h3>
            <span class="font-mono text-xs text-text-muted">
              {{ item.type }}
            </span>
          </div>

          <p class="mt-1 font-serif text-sm text-text-muted">{{ item.author }}</p>

          <div class="mt-3">
            <p class="font-serif text-sm leading-relaxed text-text-main opacity-90">
              {{ item.comment }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
