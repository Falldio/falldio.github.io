---
title: Golang的新map实现
date: 2025-3-25
author: Falldio
location: 深圳
layout: blog
tags:
  - Go
  - 数据结构
summary: Golang 1.24版本引入了基于“Swiss Tables”的新map实现，通过多个table和group结构提升性能。每个group包含8个slot，并通过control word管理状态，支持并行计算。新设计采用可扩展哈希，避免了一次性扩容影响所有数据，优化了插入和查找效率。但仍不建议并发访问，尤其在扩容时可能出现数据同步问题。
---


`Golang`在1.24版本中引入了基于[Swiss Tables](https://abseil.io/blog/20180927-swisstables)的新`map`实现。

在新的实现中，一个`map`由多个`group`组成，而每个`group`包含8个`slot`以存储键值对，且还包含一个`control word`作为元数据。`control word`一共占8个字节，其中的每个字节都对应`group`中的1个`slot`。`Golang`在这个基础上，将一个`map`继续分为多个`table`，即一个`map`其实包含了多个`Swiss Table`。

```
map -> table -> group -> slot
```

## 基本数据结构

接下来自底而上看看新`map`数据结构的实现：

### group

一个`slot`其实就是一个键值对，这里没什么可以深挖的，所以我们从`group`开始。每个`group`都可以理解成一张固定大小的哈希表，`slot`在其中连续分布：

| Slot | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Key | 56 | 32 | 21 | | | | | |

而`control word`和`slot`也一一对应：

| Slot | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| h2 | 23 | 89 | 50 | | | | | |

表中的`h2`是每个`slot`的键的低7位，注意每个`slot`在`control word`里都有1个字节，也就是8位bit与之对应。高位的1个bit用于标记`slot`状态：空（10000000）、已删除（11111110）、正在使用（0*******）。

### table

在原始的`Swiss Table`设计（C++）里，一张`table`就实现了整个哈希表，这样设计有两点缺陷：

1. 表格的增长受到限制，会一次性影响所有数据（要把数据从一个底层数组迁移到另一个更大的新数组里去）；

2. 查找未命中时的搜寻序列会很大，所有的`group`都得查一遍。

为此，`Golang`采用[可扩展哈希](https://en.wikipedia.org/wiki/Extendible_hashing)的形式令每个`map`可包含一个或多个`table`，每个`table`最多可以容纳1024个键值对，即128个`group`。如此一来，每个`table`的增长，不会影响到其它`table`的数据，且在最坏的情况下，也只是在插入新数据时，把一个满溢的`table`增长为两个容量为1024的`table`，只需要拷贝已有的1024个键值对。

这里所谓可扩展哈希，即根据`map`中表格数量，采用不同位数的bit来做选择。例如，如果只有两张`table`，则使用1个bit，4张则使用2个。

## 哈希过程

我们以插入一个新的键值对为例，看看如何将数据定位到一个特定的`slot`里去。

首先，我们会通过一个哈希函数，得到一个64-bit的哈希码，其中：

+ 前57 bit称为`h1`；

+ 后7 bit称为`h2`。

假设我们的`map`包含4个`table`，那么这里的前2个bit其实决定了存放这个新键值对的`table`。我们假设前两位是`10`，代表定位到第2个`table`。

紧接着，我们要确定新的数据落在哪个`group`里，这就要使用前57个bit，也即`h1`了。`Golang`内部会基于`h1`计算目标`group`的位置。如果`group`已满，则使用[Quadratic probing ](https://en.wikipedia.org/wiki/Quadratic_probing)来查找下一个`group`。相比于线性查找，这种做法的好处时能尽可能的将数据分散到不同的`group`里。既能避免数据集中，又能减少后续查询时间。而如果采用线性查找，就只能一个个往下查找`group`了。

假设我们找到了一个候选的`group`，就需要根据`h2`来查看目标`slot`。因为我们是要插入数据，涉及更新已有数据和插入新数据两种情况，不需要查看高1位（见`group`里对`slot`状态的描述）。

我们需要扫描对比`control word`和`h2`以确定候选`slot`，这个过程中，可能会找到多个匹配的`slot`。当搜索到一个空`slot`时，搜索会立刻终止，毕竟后续的匹配`slot`也必然为空。为此，之前被删除的键值对，在`control word`中会标定为“已删除”（见前文），而不是“空”，以免做键值对搜索时误判。如果没有空`slot`，则在第一个被删除的`slot`里插入这个键值对。

相比于之前的实现，新实现的优点在于，字节级别的`control word`和`h2`的匹配比较，在[硬件](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data)层面是可以支持并行的，即一个`group`的八个`slot`可以并行计算匹配结果。

## 增长过程

一个极小的`map`（数据不大于8个）是无所谓`table`的概念的，仅仅包含一个`group`，且`slot`不会被标记为“已删除”，搜索时只会简单遍历8个`slot`。

当`map`的尺寸增长时，就会出现`table`。如果一个`table`的实际数据量超过了负载阈值，它就会像`slice`一样将自身底层数组切换为原容量两倍的新数组（见[之前的一篇blog](https://falldio.github.io/blog/2023/2023-2-15-Golang%20slice%E5%92%8CCPP%20STL%20vector%E7%9A%84%E5%AE%9E%E7%8E%B0%E7%BB%86%E8%8A%82%E5%AF%B9%E6%AF%94.html)）。如果它计算得到的新容量已经超过了1024，则`table`会被拆分为两个新的`table`。

在后者的情况下，`map`中存放`table`位置的底层数据结构也会扩大两倍，而不论`table`的实际个数。如，原本有两个`table`（`map`中的数组大小为2），现在其中有一个需要分成两个新`table`，即现在一共有三个`table`，此时`map`中的数组却会扩大为4，多余的容量用于指向未分裂的`table`。

旧`map`的一个缺点是不支持并发（见[另一篇blog](https://falldio.github.io/blog/2023/2023-4-16-%E5%93%88%E5%B8%8C%E8%A1%A8%E5%8F%8AGolang%20map%E7%9A%84%E5%BA%95%E5%B1%82%E5%AE%9E%E7%8E%B0%E5%8E%9F%E7%90%86.html)），毕竟修改时可能扩容，而搜索顺序也是随机的，导致某些键值对在扩容过程中可能不会被遍历到。在基于`Swiss Table`的实现中，执行搜索的迭代器会记录当前正在搜索的`table`的引用地址，如果该`table`扩容，这样能保证已有的数据是可以被检索到的，但**仍不保证新数据的搜索**。如果我们此时修改或删除某些数据，也同样会出现问题，毕竟我们实际上是对旧的`table`做操作，脏数据有可能已经完成了迁移。总结起来看，新的`map`最好也不要并发访问。

## Further Reading

1. [Faster Go maps with Swiss Tables - The Go Programming Language](https://go.dev/blog/swisstable)
2. [Swiss Tables](https://abseil.io/blog/20180927-swisstables)
3. [Map internals in Go 1.24](https://themsaid.com/map-internals-go-1-24?__readwiseLocation=)
