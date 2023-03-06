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
                }
            ]
        }
    },
    markdown: {
        extendMarkdown: md => {
            md.use(require('markdown-it-footnote'))
        }
    }
}