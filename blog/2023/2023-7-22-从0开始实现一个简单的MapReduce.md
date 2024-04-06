---
title: 从0开始实现一个简单的MapReduce
date: 2023-7-22
author: Falldio
location: 武汉
layout: blog
tags: 
    - 分布式系统
    - Go
summary: 6.5840 / 6.824（分布式系统）Lab 1，实现一个简单的MapReduce系统。
---

> **NOTE**：本文为6.824（分布式系统）Lab 1的回顾，实验要求见[这里](https://pdos.csail.mit.edu/6.824/labs/lab-mr.html)。因为要遵守课程的**Collaboration Policy**，所以本文不会分享任何实现细节的代码。

## MapReduce架构

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307231804486.png)

[原论文](http://static.googleusercontent.com/media/research.google.com/zh-CN//archive/mapreduce-osdi04.pdf)对MapReduce架构的描述已经很清晰了。想象一下你有一个复杂的任务，或者你有很庞大的数据要计算，但是实验室的计算机配置不够。比起说服老板升级机器，更可行的方案是把任务分解成若干单机可以承担的子任务，交给单机并行计算，最后再在某一台机器上汇总结果。这就是MapReduce的基本思想。

MapReduce把这种并行分布计算的过程分为Map和Reduce两个阶段：

- Map阶段：把输入的**原始数据**分解成若干个子任务，交给多台机器并行计算，每台机器都会输出一个中间结果。
- Reduce阶段：把Map阶段输出的**中间结果**汇总，得到最终结果。

以计算一本书中每个单词出现的次数为例，MapReduce的过程如下：

首先将书籍分为若干数据块，每个数据块交给一台机器进行Map操作，即每次看到一个单词，就输出一个键值对(word, 1)，即代表看见了一个单词word。这样每台机器都会输出一个中间结果，即它所负责的数据块中的单词出现的情况。

接着会由某台或某些机器（如果多于1台，则最后会输出多个文件）把中间结果作为输入进行Reduce操作，即对于每个单词，把它的所有出现次数相加，得到最终结果。

为了实现这样的分布式计算系统，我们需要这样两种角色：

- Master：（在Lab中称为Coordinator）负责调度任务，分配任务（Map和Reduce任务）给Worker，收集Worker的中间结果，最后汇总结果。
- Worker：（在Lab中称为Worker）负责执行任务，执行Map和Reduce任务。

系统中只有一个Master，但Worker数量不限。Master与多台Worker之间通过RPC通信。

## 计算流程

在设计中，用户会提供Map函数、Reduce函数和输入文件（在Lab中两个函数以插件形式提供）给MapReduce。而后Master会根据输入文件的大小或者数量，将原始文件切分为若干个数据块，作为Map阶段的输入（Lab中一次会输入多个文件，这些文件自动作为多个Map任务的输入，这实际上简化了问题）。

Worker将持续不断地向Master请求任务，而Master会根据目前所有任务的完成情况，将某个任务分配给Worker。Worker执行完任务后，会向Master汇报任务的完成情况，以便Master实时更新全局任务的完成情况。

Master会将全局任务分为Map、Reduce和Done三种状态。最开始系统处于Map状态，当Master检测到所有Map任务都已完成，则切换到Reduce状态，向Worker分配Reduce任务。Reduce任务均已完成后，Master切换到Done状态。在此期间，用户会轮询任务的完成情况（Lab中每秒检测一次），当检测到Master状态为Done，就可以得到计算的最终输出结果。

## Master

在Lab中，Master的关键函数有四个：

1. `Coordinator()`：Master的入口函数，负责初始化Master的状态，包括任务队列，全局任务状态，Reduce任务的数目等。
2. `AssignTask()`：检查任务队列，分配任务给Worker，为已分配的任务设置超时时间。
3. `RecollectTask()`：一个单独的线程，每隔一段时间检查已分配任务的超时状态，如果发现任务超时，则说明Worker或者网络出现故障，该任务可以被重新分配给其它Worker。
4. `Transit()`：每当有任务完成时，检查任务队列，如果发现所有任务都已完成，则切换到下一个状态。

我在Master中使用了一个切片存储待分配队列，用一个map存储当前阶段所有已分配任务的状态。

+ 当有Worker请求任务，则查看待分配队列，如果不为空，则分配任务给Worker，并将该任务放入map，否则返回空任务。
+ 当有Worker返回处理结果，则会更新任务状态，并将其从map中删除，如果发现所有任务都已完成，则切换到下一个状态。
+ 在Master初始化时，开启另一个线程定时检查map中的任务是否超时，如果超时，将该任务重新放入待分配队列。

> 为了应对多个Worker同时请求任务的情况，Master中访问任务队列和任务状态的操作都加了锁。

## Task：连接Master和Worker

重新想象一下Master和Worker的通信过程：

1. Worker向Master请求任务。
2. Worker执行完任务后，告知Master执行情况。

这两个过程中，Task实际上充当了通信的桥梁，它至少应该包含如下信息：

1. 任务的类型（Map或Reduce）：Worker根据不同的任务类型调用不同的函数。
2. 任务的输入文件名：Worker根据输入文件名读取输入文件。
3. 任务的编号：Worker执行完任务后，需要告知Master任务的编号，以便Master更新任务状态。

## Worker

Worker从用户输入中获取Map和Reduce函数（以插件形式）。

Worker自初始化后，将持续不断地向Master请求任务，直到Master切换到Done状态，并根据任务的不同类型，调用不同的函数进行任务处理。

需要注意一点，Worker在执行任务时总会生成一个**临时文件**，用于储存中间结果，只有Master确认该任务已经完成，才会把临时文件名修改为正式的输出文件名，这是为了避免Worker在执行任务过程中出现故障，导致Master误认为该任务已完成。

## 一些问题

1. 任务输出文件的最终命名始终由Master决定，Worker只需要将中间结果写入临时文件即可。
2. 任务的超时时间应该如何设置？如果设置过短，会导致任务频繁重新分配，影响系统性能；如果设置过长，会导致任务完成后，Master无法及时更新任务状态，影响系统的实时性。
3. 需要注意Master在分配和更新任务时需要加锁，防止并发访问造成冲突。

此外，Lab中的MapReduce实际上运行在一个相当理想化的网络环境中（单机环境中的IPC），而在真实情况下，还需要考虑异地容灾、网络延迟、网络抖动等问题，而这需要额外设计来保证系统的可靠性和实时性。
