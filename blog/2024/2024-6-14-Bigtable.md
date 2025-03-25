---
title: The Bigtable Paper
date: 2024-6-14
author: Falldio
location: 大连
layout: blog
tags: 
    - 分布式系统
    - 数据存储
    - 可拓展性
    - NoSQL
summary: Bigtable是基于GFS研发的结构化数据分布式存储系统，这篇blog是对原论文的导读，包含对Bigtable数据模型的解释。
---

原论文：[Bigtable: A Distributed Storage System for Structured Data](https://dl.acm.org/doi/10.1145/1365815.1365816)

## 数据模型

我们可以把Bigtable视作一张多维的有序哈希表，它通过行、列和时间戳映射到值，存储的值即简单的字节序列，由用户自行解析，以网页存储为例：

![](https://raw.githubusercontent.com/Falldio/pics/main/img/202406141153191.png)

图中cnn网页的域名为行键，网页内容、导向该页面的网页为列键，每个单元格中都可能存在多个以时间戳区分的版本。

Bigtable确保对单独一行的读写操作是原子化的，且数据按照行键语序排列。这样设计的好处有两点：
首先，对开发者来说，同行数据并发更新的行为更加清晰；
其次，可以合理组织行键，充分利用数据访问的局部性现象。

数据表中的列键将按照列族分组，图中的`anchor`即为列族，它是访问控制的最小单元。列名的格式为：列族:列键。
在Bigtable中，列族需要事先定义，列键必须从属于列族，且列键是可以动态添加的。

Bigtable使用时间戳来索引每个单元格的版本信息。时间戳可由Bigtable生成，或者由用户指定，后者需要用户保证时间戳的唯一性。
GC时，Bigtable可自动保留最近n个版本，或大于指定时间戳的版本。

## 底层依赖

Bigtable依赖GFS存储日志和数据文件，并使用Chubby确保若干性质：

1. master的唯一性；
2. 存储数据的自举位置；
3. 实现tablet服务器的服务注册和发现（tablet是Bigtable中的若干连续行片段，是负载均衡和数据分片的最小单元）；
4. 存储表格元数据，如列族信息；
5. 存储访问控制列表。

由于我们后续会解读GFS和Chubby的论文，这里就省略对两者的介绍。

Bigtable使用Google SSTable格式存储数据，该格式是一种不可变的顺序哈希表，支持按键查询和按键范围遍历的功能。

## 实现方式

整个Bigtable的组件分三部分：

1. 客户端：提供通信相关的库；
2. master：负责集群管理、动态数据分片、负载均衡和GFS文件GC；
3. tablet服务器：管理一个或多个tablet，处理其读写请求，如果tablet过大，则将其拆分。

![](https://raw.githubusercontent.com/Falldio/pics/main/img/202406141514203.png)

Tablet的位置信息按照上图方式存储：首先，Chubby中存放root tablet的位置，其中包括`METADATA`表中所有tablet的位置信息，而`METADATA`表中存储了用户表的tablet位置。
特殊的是，root tablet不会因为数据量太大自动拆分，否则会破坏图中的三层架构。
在`METADATA`表中，用户tablet的行键是用户表名和tablet最后一行的编码。
用户端将缓存tablet的位置，一旦出现缓存未命中现象，它将顺着图中结构上溯，直至查询到其位置。
每次查询`METADATA`表时，客户端会缓存多个tablet位置，减少上溯查询的次数。
该表格同样存储tablet的操作日志信息，便于debug和性能分析。

master将负责追踪活跃的tablet服务器和tablet的分配情况，如果出现未分配的tablet，master会将其分配到有足够空间的tablet服务器上。

每个tablet服务器在启动时会向Chubby的特定目录注册唯一的互斥锁，只要它还在正常运作，它会持续地重新获取这把锁，当出现异常情况时，锁因为超时会被自动释放，服务器发现锁不存在后也会终止进程。master通过监听服务器目录下的锁信息，就可以发现集群中活跃的tablet服务器。

master将周期性询问tablet服务器的锁状态，如果无法得到回应，或者tablet服务器认为失去了锁，那么master会自行在Chubby获取这把锁，以确保Chubby是正常运作的。如果master无法和Chubby集群建立联系，它将终止进程。
注意，由于tablet的分配是保存在Chubby中的，master的变更对集群没啥影响，毕竟它本身是无状态的。

master在初始化时执行下列步骤：

1. 向Chubby申请master锁，防止并发的master初始化；
2. 扫描Chubby的server目录，发现活跃的服务器对象；
3. 和活跃的tablet服务器交换信息，了解tablet的分配情况；
4. 如果`METADATE`表尚未被分配，master将root tablet加入待分配列表，并由此得到`MATADATA`表的所有tablet，进行`MATADATA`表的分配。
5. 扫描`METADATA`表，了解一共有哪些tablet，这样可以推断出还有哪些未分配的tablet，加入待分配列表。

当出现tablet分裂时，相关的tablet服务器将提示master，如果这条提示信息丢失（双方出现一方崩溃），master必然会将已经分裂的tablet分配给一个tablet服务器，这台服务器必然发现`METADATA`表中的记录和master的指令中，tablet的范围不符，此时它将提示master出现了tablet分裂。

![](https://raw.githubusercontent.com/Falldio/pics/main/img/202406141627134.png)

上图展示了tablet的存储形式：写操作首先会记录一条redo log，最近的操作保存在内存的memtable中，更早的操作被持久化到SSTable文件里。要恢复一个tablet，tablet服务器首先从`METADATA`表中获取SSTable文件列表，其中包含tablet和若干存档点（指向redo log中的某些位置），然后先将SSTable文件索引读入内存，再按照存档点的指示重放redo log中的部分操作。

在执行了一系列写操作之后，memtable必然膨胀，等达到一个阈值后，服务器将新建一个memtable用于记录操作，并将旧的memtable转换为SSTable文件写入GFS。另外，Bigtable将周期性地一些SSTable和memtable合并，写入一个新的SSTable文件，并删除源文件。

## 细节优化

### 局部组（locality group）

客户端可将多个列族合并为一个局部组。每个组在每个tablet中生成一个独立的SSTable文件，将不常一起使用的列族分开成组，可以有效提升读性能。局部组也可以被声明在内存中，减少对磁盘的操作。
客户端还可自定义局部组的SSTable文件压缩格式，此时我们可以读取部分文件内容，而不必解压整个文件。

### 读缓存

Tablet服务器存在两种级别的缓存：

+ 扫描缓存：将SSTable文件的扫描结果缓存，有助于反复读取相同数据的场景。
+ 块缓存：将GFS中的SSTable数据块缓存，有助于频繁读取**邻近数据**的场景。

### 布隆过滤器（bloom filters）

要恢复一个tablet，服务器不得不扫描所有的SSTable文件，造成大量的磁盘IO，为了优化这一点，客户端指定，为特定的局部组创建布隆过滤器，帮助Bigtable快速检测特定的行列对是否存储在该文件中。

### log优化

如果给每个tablet分配单独的redo log，那么将造成大量的并发读写。
因此，Bigtable在每个tablet服务器上使用统一的redo log文件，混合记录所有tablet的操作日志，这将复杂化日志重放操作，可能需要重放多次，才能恢复所涉及的全部tablet。
为了规避多次读取，首先将按照表名、行键、日志号对所有日志进行排序，保证同一个tablet的日志分布集中，然后再顺序恢复所有tablet。

为减少GFS写入时的性能抖动带来的影响，Bigtable使用两个线程写入日志，两者各自有独立的日志文件。如果第一个线程性能不佳，另一个线程就将接力日志写入任务。而日志序列号可以帮助删除重复的日志。

### tablet恢复优化

当master将tablet从A服务器移交给B时，A将对memtable进行前述压缩操作，以减少需要重放的redo log大小。
这一操作完成后，A不再对外服务该tablet，此时，它将再进行一次压缩操作，将时间窗口内的日志进行压缩，再进行tablet转交，这样一来，B服务器就可以直接装载tablet，无需进行重放。
