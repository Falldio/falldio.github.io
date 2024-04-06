---
title: 线程与Goroutines
date: 2023-8-3
author: Falldio
location: 武汉
layout: blog
tags: 
    - 翻译
    - Go
    - Rust
    - Unix
summary: 本文译自Threads and Goroutines，作者从一个具体的benchmark（启动一百万个现线程或者协程）比较了Go和Rust的并发性能。
---

> 本文译自[Threads and Goroutines](https://shane.ai/posts/threads-and-goroutines/)，作者从一个具体的benchmark（启动一百万个现线程或者协程）比较了Go和Rust的并发性能。

这几年我读了不少关于线程/纤程/goroutines/异步/等等的文章，它们粗略浅显，还充斥着错误，以致于我一直在和下面这种反应作斗争：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202308031519935.png)

终于，我下定决心，也要写一篇同样粗略浅显的文章，来介绍一些主流线程和纤程实现的区别。为了限制文章的体量，我将专注于Linux线程、goroutines和Rust线程。

tl;dr —— Linux上的Rust线程占用8kb的内存，goroutine只用了2kb。这种差异很显著，但是也不像他们说的那样，达到了“kb VS mb”的程度。如果非要说goroutines有什么魔力的话，那一定是在用户态的调度器里集成了非阻塞I/O和协程。

我想要用更好的工具来回答有关系统工程方面的问题，比如“我们应该给每一个客户分配一个线程吗？”、“我们需要利用异步来扩容吗？”、“我的下一个项目应该使用哪种并发模型呢？”

我们先看一个例子，因为文章的剩余内容会讨论实验的结果。我们将讨论，这些实现是否有惊人的提升，为了达到这样的提升而做出的妥协是否有必要。那么我们的第一个问题是：

## 线程的体量有多大？

首先我想看看一个线程到底会占用多少内存。在Linux上你可以用`ulimit`查看。这个值在不同的设备上可能不一样。在你的Linux上运行这条命令看看输出结果。你可以看到，我的输出是8MB。

```bash
$ ulimit -a | grep stack
stack size                  (kbytes, -s) 8192
```

这个值虽然是正确的，但是经常会被误解。你可能觉得，创建一个新线程就得分配8mb的内存。但得益于虚拟内存和内存过度申请（[memory overcommitment](https://en.wikipedia.org/wiki/Memory_overcommitment)），事实并非如此。正确的思路是：操作系统（假设是64位）会给你分配私有内存，但私有内存不一定有物理内存支撑。64位的内存空间中确实存在很多8mb的内存块，但是在内核追踪IOU时，会做很多额外的工作。

我们用rust写一个简单的程序，分配一百万个线程，测测看使用的内存。但在那之前，你可能得接触你系统上的一些限制，否则程序爬不起来。我是这样做的：

```bash
sysctl -w vm.max_map_count=4000000
sysctl -w kernel.threads-max=2000000000
```

我写了这样一个简单的rust程序，它分配一百万个线程，每个线程睡眠1秒，程序等待所有线程完成。

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let count = 1_000_000;
    let mut handles = Vec::with_capacity(count);
    for _ in 1..count {
	handles.push(thread::spawn(|| {
	    thread::sleep(Duration::from_millis(1000));
        }));
    }
    for handle in handles {
    	handle.join().unwrap();
    }
}
```

我们来跑跑看：

```bash
cargo build --release
/usr/bin/time ./target/release/threads
6.17user 80.41system 0:38.55elapsed 224%CPU (0avgtext+0avgdata 8500640maxresident)k
0inputs+0outputs (0major+2125114minor)pagefaults 0swaps
```

可能有人不习惯读/usr/bin/time里这种像是加密过的输出，我们一起来看看：

1. 6秒的用户态时间：所有的rust代码创建、休眠等，一共花了6秒。
2. 80秒的内核态时间包括38秒的实际时间：这也就是说有两个核心花了38秒来跑这个程序，而大部分工作是在内核中完成的。
3. 8500640maxresidentk -> 实际使用了8.5GB的内存。除以一百万条线程，即每个线程/栈使用了大约8kb的内存。对于一个“重量级”的线程来说，这也不算太糟糕。

虚拟内存（用`top`查看比较科学）的最高占用要小于2TB，因此每个线程大约使用了2MB。这个数字怎么和我之前提到的8MB对不上呢？我也不知道。也许rust给`clone()`传递了一些参数，覆盖了默认结果。

但至少我们得出了结论：抛开内核结构跟踪开销不谈，一个没有太多工作量的简单OS线程，在我的系统上只是用了8KB的实际内存。Go的表现会如何呢？

## Goroutines及其它

防杠声明：我知道编程语言和其具体实现完全是两码事，我下面要讲的东西对gccgo不适用。在余下的文章中，“Go”既表示Go语言，也表示官方的Go工具链。

什么是goroutine？goroutine和线程的区别在哪里？这种区别是怎么让它表现得更好的（或者更糟）？

从一个程序员的角度来看，goroutine其实就是线程。它是一种能够和程序其余部分并发运行（也可能并行）的函数。在goroutine里执行函数能够使用到更多的CPU核心。Go有一个M:N的线程模型，也就是说，M个goroutine会被N个线程调度（然后在内核中被所有的CPU调度）。Go默认设置NumThreads==NumCores，即使你创建了一百万个goroutine。使用线程的时候，我们依赖操作系统来做调度。在Go里面，部分调度工作是在用户态完成的。我后面会讨论这部分细节，但是首先：我们用Go来跑一下之前的测试：

```go
package main
import (
	"time"
	"sync"
)
func main() {
    var wg sync.WaitGroup
    count := 1000000
    wg.Add(count)
    for i:=0;i<count;i++ {
	   go func() {
		   defer wg.Done()
		   time.Sleep(time.Second)
	   }()
    }
	wg.Wait()
}
```

构建这个程序：

```bash
go build -o threads main.go
/usr/bin/time ./threads 
16.66user 0.68system 0:02.44elapsed 709%CPU (0avgtext+0avgdata 2122296maxresident)k
0inputs+0outputs (0major+529900minor)pagefaults 0swaps
```

我们立刻得到了这样的结果：

1. 16秒的用户态时间：这可比rust多多了。因为rust在用户态只是进行了系统调用，而go却是在执行调度工作。
2. 0.68秒的内核态时间：这个数字很小是因为Go减轻了内核的工作负担。
3. 2_122_296maxresident：2GB的使用内存，或者说每个goroutine只用了2KB！
4. 我查了一下虚拟内存，使用也是2GB。

这个简单的benchmark表明，在创建一百万条线程做轻量级调度时，go的速度快了10倍以上。虽然内存占用的表现不一样，但是趋势大概相同。我们可以合理假设，一个大型程序可能超过2KB的栈初始大小，并且让栈扩容（go确实可以这么做），因此go和rust的真实内存使用会很快趋近。

身为一个网站运维工程师：要是有人告诉我，他们想要跑一个有一百万goroutine的服务，我可能感到不安。要是他们告诉我，这个服务需要一百万个线程，我会更紧张，因为要考虑虚拟内存的开销，还要管理sysctls。但是如今的硬件已经可以承受这种挑战了。

要是硬件水平足够，那么goroutine的价值何在？我确实偏好节省内存，2GB的内存占用确实也小于8GB，但是说是换，如果我要为了更优的性能表现去切换运行时环境和开发语言，我希望真实性能提升能达到接近十倍，这才是合理的性价比。

在教Go的时候我经常被问到这样一个问题。要是goroutine的开销这么小，那为什么内核不能把结构优化到同等开销呢？要是go能摆脱小容量栈的限制，内核为什么不行呢？Go的任务调度最初是协作式的（理论上是这样，但是是由运行时或者编译器管理，而非用户），而现在变成了抢占式，因此Go在切换goroutine的上下文信息时，似乎和内核切换线程时做了同样的事情：即保存/恢复寄存器状态。

说实话，我不完全知道问题的答案，但我有一些头绪。Go能分配更大的栈容量，是因为Go一直可以在需要时对栈扩容。这种能力是由运行时实现的。使用Thread api的rust程序（或者clone和libc wrapper）一般可能不能指望栈扩容。由于Go有更紧密集成的用户态调度器和并发原语，它有时候能用更小的开销实现上下文切换。比如，如果一个goroutine在写一个channel，另一个在读，Go可以在同一个线程上运行这两个goroutine，相当于走了捷径，无需线程切换。

我也怀疑（尽管没有证据）Go编译器对它保存和恢复的寄存器状态可能不那么保守。Linux内核需要能防御更多的恶意用户代码。在实际运行中，我猜内核需要去考虑有一些古早的寄存器/标识，但是Go编译器不需要。

我好像把goroutine讲的有点无聊。它们像是线程，但是使用了同样数量级的内存。它们偶尔能够被更智能的调度，但我也没能找到它们在调度上胜过常规线程的证据。我能看到的最大的优势在于，我可以使用很多的goroutine，但是用不着考虑系统资源了。

那么，为什么会存在goroutine，以及为什么goroutine很棒呢？答案其实很简单，但是首先我们得介绍一下异步I/O。Linux上最具扩展性的网络I/O是一个叫`epoll`的异步接口。另一个叫`io_uring`的特性可能取而代之，但到那时，Go也可能使用这种特性。由于这些接口的异步特性，我们不必阻塞在线程的`.Read()`调用上。一般而言，我们认为这种系统是事件驱动的，我们使用`callback`（回调函数）来响应被读取的新数据。比如，Node.js在底层使用libuv来进行高效的非阻塞事件驱动I/O操作。Go也在各种地方使用非阻塞I/O，并把I/O调度和goroutine集成。非阻塞I/O（可能还要加上go调度器和IO事件循环的集成）就是我们问题的答案，即为什么goroutine比线程更高效，它是怎么做到的。一个.Read()的调用可能在提交了一个非阻塞I/O请求之后切换到下一个goroutine，就像一个`async`Rust函数一样，只是不会出现导致库崩溃的[The Colored Function Problem](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/)。Javascript通过强制使用异步和非阻塞来避免这个问题。Python和Rust则需要分开处理异步和同步。

当你把goroutine和紧密集成的非阻塞I/O结合起来，你就能得到强悍的多核性能和一个能用较小开销应对大量网络连接的平台，同时避免了“回调地狱”和“函数着色”问题。并非所有人都想做这样的tradeoff。他们把C语言的互操作变得更复杂，同时还规定非阻塞的操作必须用线程池来实现（就像Node.js和DNS解析做的一样）。但如果你想要高效实现一个快速的网络服务器，那么Go就是一个功能强大的平台。
