---
title: 哈希表及Golang map的底层实现原理
author: Falldio
date: 2023-4-16
location: 武汉
layout: blog
tags:
    - 数据结构
    - Go
summary: 哈希表是普通数组概念的一种推广，可以以键值对的形式存储数据，类似于数组通过索引值访问数组元素。本文将介绍哈希表的基本概念、哈希冲突的解决手段以及Golang中map的实现原理。
---


## 哈希表

首先想象一个底层为数组的哈希表，哈希表通过一个**哈希函数**将键值转换为数组索引，然后将键值对存储在数组中。这样就可以通过键值快速访问数组元素。由于数组的寻址是通过指针偏移实现的，`&a[i] = &a[0] + i * sizeof(a[0])`，所以数组的访问时间复杂度为O(1)。哈希表的访问时间复杂度也是O(1)。

然而问题在于，数组是一片连续的、大小固定的内存空间，这其实限制了哈希表的大小。例如，如果一个哈希表被设计来存储最多1000个键值对，那么它的数组大小就至少为1000。但在一般情况下，哈希表实际容纳的元素个数可能远少于1000，这就造成了空间的浪费。为此，有必要寻找一种新的数据结构，是我们可以在尽可能保留数组$O(1)$访问效率的同时，又能够减小其对内存空间的需求。

### 链接法

现在假设我们的哈希表底层数组长度固定为`m`，而其能够容纳的元素总数可能远大于这个值，在这种情况下，我们的哈希函数必然会将一些不同的键值映射到相同的数组位置上，即**哈希冲突**。一种简单的解决哈希冲突的方法是链接法：不在底层数组中直接存放键值对，而是存放一个元素为键值对的链表。一旦发生哈希冲突，就将新的键值对插入到链表的头部（或任意位置）。这样，我们就可以通过遍历链表来找到对应的键值对。

### 开放寻址法

开放寻址法直接使用数组存储键值对，当出现哈希冲突时，就将元素存放在下一个空闲数组位置上。好处在于，不需要额外的空间来存储指针信息，因此可以用同样的空间提供更长的数组。然而，当数组趋近于被填满时，哈希冲突的几率会急剧增加，这就会导致开放寻址法的性能急剧下降，也因如此，数据检索的速度会骤降。

## Golang map

首先可在`src/runtime/map.go`中找到map的定义，如下所示：

```go
type hmap struct {
    count     int // 元素个数
    flags     uint8
    B         uint8 // 桶的数量 = 2^B
    noverflow uint16 // 溢出桶的数量
    hash0     uint32 // hash 种子

    buckets    unsafe.Pointer // 桶数组
    oldbuckets unsafe.Pointer // 旧桶数组
    nevacuate  uintptr // 桶迁移进度

    extra *mapextra // 用于扩容
}

type mapextra struct {
    overflow    *[]*bmap // 溢出桶
    oldoverflow *[]*bmap // 旧溢出桶

    nextOverflow *bmap
}

// 桶
type bmap struct {
    // bucketCnt = 1 << abi.MapBucketCountBits = 1 << 3 = 8
    tophash [bucketCnt]uint8
}
```

Golang map大体使用前文所述链接法解决哈希冲突。数据实际上被存放在桶中（`hmap`的`buckets`字段，指向桶数组），即`bmap`。

在编译期间，`bmap`会被编译器转换为如下结构：

```go
type bmap struct {
    tophash [bucketCnt]uint8
    // 注意整个bmap是一个连续地址，这里在内存中的分布实际上是：
    // key1, key2, key3, ..., key8, value1, value2, value3, ..., value8
    // 而非key1, value1, key2, value2, key3, value3, ..., key8, value8
    // 这样可以减少内存对齐的开销，只需要在最后有一个pad即可
    keys    [bucketCnt]keytype
    values  [bucketCnt]valuetype
    pad     uintptr

    overflow uintptr
}
```

### 解决哈希冲突

经过哈希计算之后，元素将根据哈希值**低位**决定落到某一个桶中，并根据哈希值的**高八位**（tophash）决定落入桶中的某一个位置。一旦桶中元素已满，则在`overflow`字段以链接法的方式构造一个新桶，将元素存放在新桶中。也就是说，`hmap`的`buckets`字段指向的是一个长度为$2^B$的桶数组，而每个桶又是一个链表。

### 扩容

扩容实际上分为扩容和搬迁两步操作。为了减少一次性扩容的开销，Go在每次访问map时会检测扩容条件，逐步进行扩容操作。

```go
func mapassign(t *maptype, h *hmap, key unsafe.Pointer) unsafe.Pointer {
    ...
    if !h.growing() && (overLoadFactor(h.count+1, h.B) || tooManyOverflowBuckets(h.noverflow, h.B)) {
		hashGrow(t, h)
		goto again // Growing the table invalidates everything, so try again
	}
    ...
}
```

当负载因子超过6.5或overflow数量过大时，将触发扩容。扩容操作分等量扩容和增量扩容两种。

```go
// 该函数通过设置flags确定具体的扩容策略，并且实现扩容
func hashGrow(t *maptype, h *hmap) {
	// If we've hit the load factor, get bigger.
	// Otherwise, there are too many overflow buckets,
	// so keep the same number of buckets and "grow" laterally.
	bigger := uint8(1)

    // 检测负载因子
	if !overLoadFactor(h.count+1, h.B) {
		bigger = 0
		h.flags |= sameSizeGrow
	}
	oldbuckets := h.buckets
    // makeBucketArray()将初始化一个备份的桶数组，
    // 注意如果是增量扩容，桶数组的长度是旧桶数组的两倍
    // 类似于slice或vector
	newbuckets, nextOverflow := makeBucketArray(t, h.B+bigger, nil)

    ...
	// commit the grow (atomic wrt gc)
	h.B += bigger
	h.flags = flags
	h.oldbuckets = oldbuckets
	h.buckets = newbuckets
	h.nevacuate = 0
	h.noverflow = 0

    ...
	// the actual copying of the hash table data is done incrementally
	// by growWork() and evacuate().
}
```

在每次访问map时，都会调用`growWork()`函数，该函数执行具体搬迁操作，每次从oldBucket中搬迁一个元素到bucket中。

```go
func growWork(t *maptype, h *hmap) {
    // make sure we evacuate the oldbucket corresponding
	// to the bucket we're about to use
	evacuate(t, h, bucket&h.oldbucketmask())

	// evacuate one more oldbucket to make progress on growing
	if h.growing() {
		evacuate(t, h, h.nevacuate)
	}
}

type evacDst struct {
    b *bmap // 目标桶
    i int // 目标桶中的位置
    k unsafe.Pointer // key
    e unsafe.Pointer // element
}

// 搬迁策略
func evacuate(t *maptype, h *hmap, oldbucket uintptr) {
	b := (*bmap)(add(h.oldbuckets, oldbucket*uintptr(t.bucketsize)))
	newbit := h.noldbuckets()
	if !evacuated(b) {
		// xy contains the x and y (low and high) evacuation destinations.
		var xy [2]evacDst
        // 初始化x和y两个桶，即可能的搬迁目的地
		x := &xy[0]
		x.b = (*bmap)(add(h.buckets, oldbucket*uintptr(t.bucketsize)))
		x.k = add(unsafe.Pointer(x.b), dataOffset)
		x.e = add(x.k, bucketCnt*uintptr(t.keysize))

		if !h.sameSizeGrow() {
			// Only calculate y pointers if we're growing bigger.
			// Otherwise GC can see bad pointers.
			y := &xy[1]
			y.b = (*bmap)(add(h.buckets, (oldbucket+newbit)*uintptr(t.bucketsize)))
			y.k = add(unsafe.Pointer(y.b), dataOffset)
			y.e = add(y.k, bucketCnt*uintptr(t.keysize))
		}

        // 对桶链表中的每个元素进行搬迁
		for ; b != nil; b = b.overflow(t) {
            // 找到key段和value段的起始地址
			k := add(unsafe.Pointer(b), dataOffset)
			e := add(k, bucketCnt*uintptr(t.keysize))
            // 对每个键值对进行操作
			for i := 0; i < bucketCnt; i, k, e = i+1, add(k, uintptr(t.keysize)), add(e, uintptr(t.elemsize)) {
                // 检测当前元素哈希是否落在当前桶中
                ...
				var useY uint8
				if !h.sameSizeGrow() {
					// Compute hash to make our evacuation decision (whether we need
					// to send this key/elem to bucket x or bucket y).
                    ...
				}

                ...

				dst := &xy[useY]                 // evacuation destination

                // 桶溢出，分配新的桶，将元素放在新桶首位
				if dst.i == bucketCnt {
					dst.b = h.newoverflow(t, dst.b)
					dst.i = 0
					dst.k = add(unsafe.Pointer(dst.b), dataOffset)
					dst.e = add(dst.k, bucketCnt*uintptr(t.keysize))
				}
				dst.b.tophash[dst.i&(bucketCnt-1)] = top // mask dst.i as an optimization, to avoid a bounds check
                // 搬迁键值对到dst，并调整下一个搬迁位置
                ...
			}
		}
        // 清理旧桶
        ...
	}
    ...
}
```

### key的定位

key经过哈希计算之后会得到一个64位的哈希值，低`B`位用于定位桶，高8位用于定位桶中的位置。如果没有找到合适的位置，则按照链接法在桶链表中继续查找。

### map的遍历

在理想状况下，map的遍历是通过遍历桶数组的所有元素，及桶链表中所有的有效元素位实现的。然而，由于map的扩容操作是逐步进行的，如果正在扩容过程中，在遍历过程中就需要遍历oldBucket和bucket。

```go
type hiter struct {
	key         unsafe.Pointer // Must be in first position.  Write nil to indicate iteration end (see cmd/compile/internal/walk/range.go).
	elem        unsafe.Pointer // Must be in second position (see cmd/compile/internal/walk/range.go).
	t           *maptype
	h           *hmap
	buckets     unsafe.Pointer // bucket ptr at hash_iter initialization time
	bptr        *bmap          // current bucket
	overflow    *[]*bmap       // keeps overflow buckets of hmap.buckets alive
	oldoverflow *[]*bmap       // keeps overflow buckets of hmap.oldbuckets alive
	startBucket uintptr        // bucket iteration started at
	offset      uint8          // intra-bucket offset to start from during iteration (should be big enough to hold bucketCnt-1)
	wrapped     bool           // already wrapped around from end of bucket array to beginning
	B           uint8
	i           uint8
	bucket      uintptr
	checkBucket uintptr
}
```

```go
func mapiterinit(t *maptype, h *hmap, it *hiter) {
	// hiter的字段初始化
    ...

	// decide where to start
	var r uintptr
	if h.B > 31-bucketCntBits {
		r = uintptr(fastrand64())
	} else {
		r = uintptr(fastrand())
	}
    // 随机选择一个桶，且随机选择一个桶中的位置作为遍历的起始位置
	it.startBucket = r & bucketMask(h.B)
	it.offset = uint8(r >> h.B & (bucketCnt - 1))

	// iterator state
	it.bucket = it.startBucket

	// Remember we have an iterator.
	// Can run concurrently with another mapiterinit().
	if old := h.flags; old&(iterator|oldIterator) != iterator|oldIterator {
		atomic.Or8(&h.flags, iterator|oldIterator)
	}

	mapiternext(it)
}

func mapiternext(it *hiter) {
	h := it.h
	// it字段赋值
    ...

next:
	if b == nil {
		if bucket == it.startBucket && it.wrapped {
			// end of iteration
			it.key = nil
			it.elem = nil
			return
		}
		if h.growing() && it.B == h.B {
			// Iterator was started in the middle of a grow, and the grow isn't done yet.
			// If the bucket we're looking at hasn't been filled in yet (i.e. the old
			// bucket hasn't been evacuated) then we need to iterate through the old
			// bucket and only return the ones that will be migrated to this bucket.
			oldbucket := bucket & it.h.oldbucketmask()
			b = (*bmap)(add(h.oldbuckets, oldbucket*uintptr(t.bucketsize)))
			if !evacuated(b) {
                // 需要遍历oldbucket
				checkBucket = bucket
			} else {
				b = (*bmap)(add(it.buckets, bucket*uintptr(t.bucketsize)))
				checkBucket = noCheck
			}
		} else {
			b = (*bmap)(add(it.buckets, bucket*uintptr(t.bucketsize)))
			checkBucket = noCheck
		}
		bucket++
		if bucket == bucketShift(it.B) {
            // 遍历到最后一个桶，重置bucket
			bucket = 0
			it.wrapped = true
		}
		i = 0
	}
	for ; i < bucketCnt; i++ {
		offi := (i + it.offset) & (bucketCnt - 1)
		if isEmpty(b.tophash[offi]) || b.tophash[offi] == evacuatedEmpty {
			// TODO: emptyRest is hard to use here, as we start iterating
			// in the middle of a bucket. It's feasible, just tricky.
			continue
		}
		k := add(unsafe.Pointer(b), dataOffset+uintptr(offi)*uintptr(t.keysize))
		if t.indirectkey() {
			k = *((*unsafe.Pointer)(k))
		}
		e := add(unsafe.Pointer(b), dataOffset+bucketCnt*uintptr(t.keysize)+uintptr(offi)*uintptr(t.elemsize))
		if checkBucket != noCheck && !h.sameSizeGrow() {
			// Special case: iterator was started during a grow to a larger size
			// and the grow is not done yet. We're working on a bucket whose
			// oldbucket has not been evacuated yet. Or at least, it wasn't
			// evacuated when we started the bucket. So we're iterating
			// through the oldbucket, skipping any keys that will go
			// to the other new bucket (each oldbucket expands to two
			// buckets during a grow).
			if t.reflexivekey() || t.key.equal(k, k) {
				// If the item in the oldbucket is not destined for
				// the current new bucket in the iteration, skip it.
				hash := t.hasher(k, uintptr(h.hash0))
				if hash&bucketMask(it.B) != checkBucket {
					continue
				}
			} else {
				// Hash isn't repeatable if k != k (NaNs).  We need a
				// repeatable and randomish choice of which direction
				// to send NaNs during evacuation. We'll use the low
				// bit of tophash to decide which way NaNs go.
				// NOTE: this case is why we need two evacuate tophash
				// values, evacuatedX and evacuatedY, that differ in
				// their low bit.
				if checkBucket>>(it.B-1) != uintptr(b.tophash[offi]&1) {
					continue
				}
			}
		}
		if (b.tophash[offi] != evacuatedX && b.tophash[offi] != evacuatedY) ||
			!(t.reflexivekey() || t.key.equal(k, k)) {
			// This is the golden data, we can return it.
			// OR
			// key!=key, so the entry can't be deleted or updated, so we can just return it.
			// That's lucky for us because when key!=key we can't look it up successfully.
			it.key = k
			if t.indirectelem() {
				e = *((*unsafe.Pointer)(e))
			}
			it.elem = e
		} else {
			// The hash table has grown since the iterator was started.
			// The golden data for this key is now somewhere else.
			// Check the current hash table for the data.
			// This code handles the case where the key
			// has been deleted, updated, or deleted and reinserted.
			// NOTE: we need to regrab the key as it has potentially been
			// updated to an equal() but not identical key (e.g. +0.0 vs -0.0).
			rk, re := mapaccessK(t, h, k)
			if rk == nil {
				continue // key has been deleted
			}
			it.key = rk
			it.elem = re
		}
		it.bucket = bucket
		if it.bptr != b { // avoid unnecessary write barrier; see issue 14921
			it.bptr = b
		}
		it.i = i + 1
		it.checkBucket = checkBucket
		return
	}
	b = b.overflow(t)
	i = 0
	goto next
}
```

## Misc

### map的迭代顺序是随机的

这一点有两方面原因：
1. 每次迭代的起始位置是通过`fastrand()`随机生成的，见上面`mapiternext`的代码。
2. 搬迁可能导致key的位置发生变化。

### key的类型必须是可比较的

map的key必须是可比较的，即必须实现`==`和`!=`操作符。而复合数据类型slice、map、function等不能直接作为key使用（也许可以转换为字符串等）。

### map不能边遍历边修改

这样做可能导致扩容，新增加的元素不一定能够遍历到，且顺序不确定。

### map的键值对无法地址

map的元素可能在扩容时改变位置，所以不允许取地址。

### map不支持并发

map在操作过程中会检查写标志，一旦发现正在写入，则会直接panic。因此，安全的操作是使用`sync.RWMutex`进行写锁，或者使用`sync.Map`。

## 拓展阅读

- [算法导论](https://book.douban.com/subject/20432061/)
- [Go专家编程](https://book.douban.com/subject/35144587/)
- [map的实现原理](https://golang.design/go-questions/map/principal/)