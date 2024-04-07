---
title: 我用VitePress重构了博客页面
date: 2024-4-7
author: Falldio
location: 深圳
layout: blog
tags: 
    - TailwindCSS
    - VitePress
    - FrontEnd
summary: 秋招之后的第一件事就是翻修老旧的博客页面……
---

之前一直觉得我的blog页面太简陋了，使用的是`@vuepress/theme-blog`。
这个主题确实做到了开箱即用，但其默认的外观设置实在不适合阅读：
代码块的高亮不完善、文章标签视图太窄、中文字体比较尖锐、不支持自定义某些页面布局blahblahblah……
无奈找工作占了太多时间，我又是在找后端方向，修改博客在彼时不会产生太多收益，于是就一直拖延到年末。

寒假期间我总算是过了一遍前端三大件的基础（虽说我还是觉得CSS很反人类😅），然后薅着`TailWindCSS`和`VitePress`开始了博客改造计划……

目前实现了基础的博客功能：

+ [Now Page](https://falldio.github.io/now.html)；
+ Tag统计及排序；
+ 自定义的主页和Blog布局；
+ 一些渐变动画效果……

当然对于一个博客来说，后续功能亟待更新：

+ 自适应手机屏幕的布局；
+ 改善Tag按钮的动画效果；
+ 支持RSS；
+ 修改主页，增加Social Links；
+ ……

希望这个月的空档期能搞定这些杂七杂八的东西。