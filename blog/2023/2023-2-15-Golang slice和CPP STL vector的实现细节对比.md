---
title: Golang slice和CPP STL vector的实现细节对比
author: Falldio
date: 2023-2-15
location: 武汉
layout: blog
tags:
    - 数据结构
    - CPP
    - Go
summary: 同样是对数组的强化，Golang slice和CPP STL vector的区别在哪里？使用上要注意什么？
---

## Why not just array?

`array`是一种基本的连续数据结构，代表内存中的一段**连续**的、**静态**的空间，两个连续数组元素的内存地址差值取决于数组元素的类型。在许多使用场合，我们需要对相同的数据进行类似的处理，使用数组来存储这一系列数据，以遍历等形式来简化程序。同时，数组也可以用于表示更复杂的对象，如位图、矩阵等。

在Golang和CPP中，声明数组的语法大概如下：

```go
var a [3]int{1, 2, 3}
b := [3]int{1, 2, 3}
c := [...]int{1, 2, 3} // 编译器通过元素个数推断数组长度
```

```cpp
int a[3] = {1, 2, 3};
int b[] = {1, 2, 3}; // 给定initialize list时可以省略数组长度
int c[3] = {1}; // 元素全为1，长度为3
```

由于内存连续，计算数组元素的内存地址的时间复杂度为$O(n)$，`index * sizeof(T) + a`，数组实际上可以用作哈希表，键值对为{index, value}。然而问题在于，数组的实现是如此粗糙，我们有时在存储批量数据时，并不能确定具体的数据量，如果使用数组，不得不申请更大的内存空间来适应极端情况，而在一般情况下这样会造成极大的内存浪费。如果能有一种动态的数组，能够按照实际需要扩展长度，但同时保留数组通过索引查找元素的效率优势，对开发者来说无疑会更加方便。

## Golang slice

`slice`是对底层数组的抽象，包括数组指针、切片长度`len`、切片容量`cap`三个部分。当底层数组足以容纳切片元素（`cap`）时，将在底层数组上进行操作，反之将会申请一片更大的内存空间（新数组，`cap`随之更新），将已有的元素复制到新地址，然后在新的数组上进行操作。

```go
type slice struct {
    array unsafe.Pointer
    len int
    cap int
}
```

slice的创建方式有以下若干：

```go
s1 := []string{}
s2 := make([]int, 5, 5) // type, len, cap
a1 := [3]int{1, 2, 3}
s3 := a1[:]
```

### 基础使用方式

#### 切片表达式

切片范围遵循左闭右开原则。`max`影响切片容量，如果省略，则`cap(s) = high - low`，反之`cap(s) = max - low`。

```go
// [low : high : max]
s = s[2:4]
```

#### 动态添加元素

添加元素，利用`append()`函数为slice动态添加元素。未经初始化的nil slice可以直接使用`append()`函数。

```go
s = append(s, 1)
s = append(s, 1, 2, 3) // 可一次添加多个元素
s = append(s, s1...) // 添加另一个slice的所有元素


// preappend
s = append([]int{1}, s...) // 创建一个临时slice，append
// 另一种更高效的实现
s = append(s, 0)
copy(s[1:], s)
s[0] = 1
```

在preappend的使用场景中，前者意味着需要创建临时slice，且原有slice的元素需要一一复制到新地址，而后者只需要将原slice的元素向后移动一位，然后在头部插入元素，时间复杂度为$O(n)$，比前者更高效。

#### append()细节

`append`接收slice和变长元素，将变长元素添加到slice尾部。如果出现`len(s) + len(vs) > cap(s)`的情况，则会处理前述内存重新申请和元素复制操作。

```go
func append(s []T, vs ...T) []T
```

`append`将返回添加元素后的slice，这是因为如果出现扩容，`append`会创建一个新的slice，这个slice应该被重新赋值给原slice。


## CPP STL vector

`vector`实际上也采用了capacity的概念，一旦vector的长度超过或等于capacity，则会触发内存扩容，即：配置新空间、数据移动、释放旧空间。

```cpp
template <class T, class Alloc = alloc>
class vector {
...
protected:
    iterator start; // 表示目前使用空间的头
    iterator finish; // 表示目前使用空间的尾
    iterator end_of_storage; // 表示目前可用空间的尾
...
}
```

`start`指向内部连续内存空间的起始位置，`finish`指向已有元素的连续部分的结尾（即Golang中的`len`），`end_of_storage`指向内部连续内存空间的结尾（即Golang中的`cap`）。

### 基础使用方式

```cpp
vector<int> v;
v.push_back(1);
v.pop_back();
```

## 内存扩容策略

两者均使用capacity和length的大小关系来决定是否扩容，且扩容时需要开辟全新的内存空间并进行数据复制。但由源代码可知，两者的具体扩容策略有所不同。

### Golang

```go
func growslice(oldPtr unsafe.Pointer, newLen, oldCap, num int, et *_type) slice {
	oldLen := newLen - num

    ...

	newcap := oldCap
	doublecap := newcap + newcap
	if newLen > doublecap {
		newcap = newLen
	} else {
		const threshold = 256
		if oldCap < threshold {
			newcap = doublecap
		} else {
			// Check 0 < newcap to detect overflow
			// and prevent an infinite loop.
			for 0 < newcap && newcap < newLen {
				// Transition from growing 2x for small slices
				// to growing 1.25x for large slices. This formula
				// gives a smooth-ish transition between the two.
				newcap += (newcap + 3*threshold) / 4
			}
			// Set newcap to the requested cap when
			// the newcap calculation overflowed.
			if newcap <= 0 {
				newcap = newLen
			}
		}
	}

    ...

	return slice{p, newLen, newcap}
}
```

当`cap < threshold = 256`时，slice会将容量扩大两倍，而当`cap`超过256后，slice仅扩容1.25倍，这样可避免较大的内存浪费。

### CPP STL

```cpp
template <class T, class Alloc>
void vector<T, Alloc>::insert_aux(iterator position, const T& x) {

    ...

    else {
        // 如果当前可用空间不足，则需要重新配置空间
        const size_type old_size = size();
        const size_type len = old_size != 0 ? 2 * old_size : 1;

        ...

        // 调整迭代器，指向新空间
        start = new_start;
        finish = new_finish;
        end_of_storage = new_start + len;
    }
}
```

vector直接以原大小的两倍另外配置内存空间，然后将原有元素复制到新空间，并释放原空间。

## Side Effect

以上内存扩容策略虽然能够在形式上模拟动态数组，但这种倍数扩容的方式将带来两个问题，需要额外注意：

+ **内存浪费**：扩容2倍或者1.25倍确实可以避免频繁的申请空间，但这种“慷慨”的未雨绸缪却造成了大量的闲置内存。有时候我们可能无法承担2倍于实际数据量的内存开销。
+ **dangling pointer**：内存扩容将导致底层数组的实际位置发生变化，如果存在指针或者迭代器指向原来的地址，（对于Golang，通常体现为多个slice指向同一个底层数组），那么它们的实际指向是无法预期的。

## Further Reading

1. [Go Slices: usage and internals - The Go Programming Language](https://go.dev/blog/slices-intro)

2. [深入解析 Go 中 Slice 底层实现 (halfrost.com)](https://halfrost.com/go_slice/)

3. [Golang slice append 實作細節 - 文組工程師 (yushuanhsieh.github.io)](https://yushuanhsieh.github.io/post/2021-12-29-golang-slice-append/)

4. [Golang slice源码](https://github.com/golang/go/blob/master/src/runtime/slice.go)

5. [Effective Go - The Golang Programming Language](https://go.dev/doc/effective_go#append)

6. STL源码剖析 The Annotated STL Sources (using SGI STL)
