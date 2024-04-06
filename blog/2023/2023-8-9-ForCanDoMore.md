---
title: for Can Do More
date: 2023-8-9
author: Falldio
location: 武汉
layout: blog
tags: 
    - 翻译
    - Elixir
summary: 
---

> 这篇文章来自[Fly.io](https://fly.io/phoenix-files/for-can-do-more/)，翻译是因为我对 Elixir 有点兴趣。[用Go语言自制解释器](https://book.douban.com/subject/35909085/)的作者对 Elixir 或者 Lisp 有很高的评价，它们甚至允许修改语言本身。我想在秋招之后我会花时间了解一下这种特性。

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202308091600166.png)

Elixir 有一个特殊的`for`表达式，叫做 “list comprehension”（列表推导式），但知道它作用的人不多。它更像是把Enum和Strem模块结合在一起的宏，而不仅仅是一个 for loop。而我想要向你介绍它的能力。

下面是一个标准的 Elixir 用例，读文件，做映射，过滤，最后转换成一个 map ：

```elixir
File.read!("my_lines.txt") # key=val\n
|> Enum.filter(fn str -> "" == str end)
|> Enum.map(fn line -> 
      [key, val] = String.split(line, "=", trim: true)
        {key, val}
    end)
|> Enum.into(%{})
```

这是地道的 Elixir，清楚地把每一步拆解成一个 pipeline flow （我不太清楚中文对应的术语是什么😅），执行我们期待的操作。一个缺点是，这个循环的每一步中，每当列表变化，就会创建一个列表的副本。在一般情况下这不是问题， Elang VM 会做好GC。

然而，如果 `my_lines.txt` 是一个大文件，我们的内存可能就撑不住了。下面我们用 Stream 重写：

```elixir
File.stream!("my_lines.txt") # key=val\n
|> Stream.filter(fn str -> "" == str end)
|> Stream.map(fn line -> 
      [key, val] = String.split(line, "=", trim: true)
        {key, val}
    end)
|> Enum.into(%{})
```

在编程的术语中，`Stream`属于惰性容器，也就是说，在我们调用 `Enum.into(%{})` 之前，上面的代码都不会执行。`Enum` 函数则会立刻执行。 Stream 只不过是一种结构体，能把一系列操作组成 list ，当执行的时候，它会遍历这个输入 list、Range、 [Enumerable](https://hexdocs.pm/elixir/1.14.5/Enumerable.html) 或者[创建 stream](https://hexdocs.pm/elixir/1.14.5/Stream.html#module-creating-streams)的函数。

如果我们用 `for` 来重写：

```elixir
for line <- File.stream!("my_lines.txt"), line != "", into: %{} do
  [key, val] = String.split(line, "=", trim: true)
    {key, val}
end
```

代码里的第一行做了绝大多数工作，所以我们把它拆开：

+ `line <- File.stream(..),` 是迭代的起点因为它有一个时髦的左箭头，在我们这里导引文件。 `for` 会立刻执行，因此会和 `Enum`一样，完全执行 stream。
+ 迭代之后的下一个参数， `line != ""`是一个[守卫函数](https://hexdocs.pm/elixir/patterns-and-guards.html)，它等同于前面的 `Enum.filter`。
+ 最后一个参数， `into: %{}`，使我们可以使用 `Collectable` 协议，把结果收集到一个 map 里。在功能上，它等同于前面的 `Enum.into`。

这段表达式的优美之处在于，它像 `Stream` 一样只在一个 list 中遍历了一次，我们也不用混淆 `Enum`/`Stream` 函数。我们甚至可以用一个 Stream 开始！它的缺点在于代码表意不明，这一行太繁杂，和我们之前的pipeline相比不太清晰。

让我们来化繁为简（reduce）。

我们可以使用 `reduce` 关键字代替 `into`，像这样：

```elixir
for line <- File.stream!("my_lines.txt"), line != "", reduce: %{} do
  acc ->
      [key, val] = String.split(line, "=", trim: true)
        Map.put(acc, key, val)
end
```

主要的改变在 `do` 代码块里，我们需要一个 `var_name ->` 的右箭头声明一个 accumulator，并将其返回。这个例子并不是 reduce的最佳示范，但的确能让我们控制accumulator的更新方式。

## 还不够？

我们也可以有多个迭代器，比如：

```elixir
for x <- [1, 2], y <- [2, 3] do
    x * y 
end 
# [2, 3, 4, 6]
```

这段代码来自 [Elixir Docs](https://hexdocs.pm/elixir/Kernel.SpecialForms.html#for/1)，你可以看出来我也不是经常用这个 feature。我怀疑在做 code challenge 或者实现一个进阶 FizzBuzz 的时候，这个特性会很有用。你要是有更好的用例，请务必告诉我！

## 讨论

`for` 表达式是一个很有用的迭代工具，我们不应该忽视！除此以外它还像尖刀一样... 能用来给下一个开发者制造完全不可读的代码，同时让你觉得你是个天才。

### 彩蛋：递归

Elixir 在递归上也很出色，事实上 Erlang 社群比我们用的更多，尽管在写代码时需要三思！下面就是个例子：

```elixir
def parse(), do: parse(File.read!("my_lines.txt"), %{})
def parse([], acc), do: acc # End Condition
def parse(["" | rest], acc), do: parse(rest, acc) # Skip empty
def parse([line | rest], acc) do # Default Case
  [key, val] = String.split(line, "=", trim: true)
    parse(rest, Map.put(acc, key, val))
end
```

这里我们重度依赖模式匹配，最好从上往下读：

+ 把文本转换成由行组成的 list，声明一个空的 map 作为我们的 accumulator。
+ 如果 list 为空，我们就返回 accumulator。
+ 如果当前行是空的，我们就跳过它，这里也可以用守卫函数。
+ 最后拆分当前元素，把它放到 accumulator 里，然后继续拆分。

这种用法叫做“尾递归”，因为递归发生在函数的最后。为了避免无尽的调用栈， VM会把代码优化为一个高效的循环。你可能会想，为什么 Erlang 社群会偏爱这种风格？

+ 首先这是一种文化，他们是这样学的，这样做的，也是这样教的。任何准则都是这样产生的。
+ 这种风格确保我们能准确控制分配的过程，如何 filter/map/reduce，你不再需要这些概念，因为你在写实现这些概念的代码。
+ 最后，这种风格不再有 `do/end` 或者 `def`，因此函数头会更加简洁。
