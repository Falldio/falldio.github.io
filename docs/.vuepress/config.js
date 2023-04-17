module.exports = {
    title: 'Falldio',
    description: 'Falldio的个人博客',
    plugins: [
        '@vurepress/blog',
        '@vuepress/back-to-top',
        [
            'vuepress-plugin-mathjax',
            {
                macros: {
                    '*': '\\times',
                },
            },
        ],
    ],
    theme: '@vuepress/blog',
    themeConfig: {
        hostname: 'https://falldio.github.io',
        // 页脚
        footer: {
            contact: [
                {
                    type: 'github',
                    link: 'https://github.com/Falldio',
                },
                {
                    type: 'linkedin',
                    link: 'https://www.linkedin.cn/incareer/in/ACoAACpuYSYBUOXa-c2x79JYFfhEtRgRexrSBO4',
                },
                {
                    type: 'twitter',
                    link: 'https://twitter.com/lichng79348303'
                }
            ]
        },
        nav: [
            { text: 'Blogs', link: '/' },
            { text: 'Tags', link: '/tag/' },
            { text: 'Now', link: '/now/' },
        ],
    },
    markdown: {
        extendMarkdown: md => {
            md.use(require('markdown-it-footnote'))
        }
    }
}