---
title: Go channel实现原理
date: 2023-7-2
author: Falldio
location: 武汉
layout: blog
tags: 
    - 数据结构
    - Go
summary: channel是Go语言实现并发的重要机制，用来实现协程之间的通信。由于之前缺少并发编程的经验，我一直不太乐意去看channel的源码。如今写完了MIT 6.824的Lab，总算是对并发有了更直观的认识，之前一直逃避的源码也终于清晰了起来。
---

## But what does channel do?

从使用者的角度来看，channel可以理解成一个go routinues间共享信息的管道，一边可以进行数据输入，而另一边可以进行数据输出，和Unix中用于进程间通信的管道类似，当然它并不是一个硬盘上的文件，而是作为内存中的数据结构存在。这意味着它可以像其它的struct、slice一样被赋值、传递。因此，如果在不同的go routines中使用同一个channel，就可以实现这两个go routines之间的通信，像下面这样：

```go
func main() {
    ch := make(chan int)
    go func() {
        ch <- 1
    }()
    fmt.Println(<-ch)
}
```

我们还可以利用channel实现稍微复杂一点的消息分发，例如在一个go routine中不断地从channel中读取数据，然后根据数据的不同类型进行不同的处理。而在6.824的Lab2中，我们同样也是利用channel将不同`commandIndex`的Operand分发给对应的apply函数，从而能够对客户的多条请求进行并发处理，不必等待前一条请求的处理完成。

```go
func main() {
    ch := make(chan interface{})
    go func() {
        for {
            switch v := <-ch; v.(type) {
            case int:
                fmt.Println("int:", v)
            case string:
                fmt.Println("string:", v)
            }
        }
    }()
    ch <- 1
    ch <- "hello"
}
```

在[Go专家编程](https://book.douban.com/subject/35144587/)中，作者还提到一种利用channel实现互斥锁的写法，just for fun：

```go
var counter int = 0
var ch = make(chan int, 1)

func Worker() {
    ch <- 1
    counter++
    <-ch
}
```

## 缓冲区、阻塞和数据读写

channel支持无缓冲区和有缓冲区两类。前者在数据读写时会发生阻塞，直至存在数据读写的另一方go routine，使得两者可以直接传递数据；后者则能够将数据预存在channel内置的缓冲区中，只有当缓冲区满时才会发生阻塞，正常情况下，往channel中写入数据的go routine仍然可以继续执行。这时我们回过头来看前面用channel实现互斥锁的例子就可以发现其中的`ch`是一个缓冲区大小为1的channel，第一个Worker往其中写入数据，此时缓冲区满，其它的Worker就会发生阻塞，直到第一个Worker完成了它要执行的任务（例子中给的是`counter++`，但通常情况下可能是更耗时的操作），从`ch`中拿出之前写入的数据，此时缓冲区才会有空余空间，等待其它Worker写入，从而实现了一种类似于Mutex的效果。

```go
ch1 := make(chan int) // 无缓冲区
ch2 := make(chan int, 1) // 有缓冲区
```

和slice和map类似，channel是引用类型（默认的零值是nil），在函数间传递时，传递的是指向channel的指针，而不是channel本身。当我们尝试往nil中读写数据时，会发生阻塞，而且是**永久阻塞**。

和从map中读取数据类似，从channel中读取数据也可以支持给两个变量赋值，前者是读取到的数据，后者是一个bool值，表示**读取是否成功**。如果读取失败，则前者的值为channel中数据类型的零值，后者为false。

```go
data, ok := <-ch
```

需要注意的是，`ok`表示的并不是channel是否关闭（可以使用`close(ch)`来关闭一个channel，后续往里面写入数据会触发panic，但是仍然可以读取缓冲区中的数据。我似乎还没有在代码中见到过需要手动关闭一个channel的情况，一般都是由GC处理），即使channel被关闭了，只要缓冲区中有数据，就可以读取，`ok`仍然为true。只有当已关闭channel的缓冲区中没有数据时，`ok`才会为false，没关闭的channel在读取时会发生阻塞。

从管道读取数据时，还可以使用`for-range`和`select`语句，前者会在channel关闭时自动退出循环，后者可以在多个channel中选择读取数据，如果所有channel都没有数据，就会发生阻塞。

```go
for data := range ch {
    fmt.Println(data)
}
```

```go
for {
    select {
    case data := <-ch1:
        fmt.Println(data)
    case data := <-ch2:
        fmt.Println(data)
    }
}
```

此外，和slice一样，我们可以分别使用`len()`和`cap()`来查询channel缓冲区的大小和缓冲区中已有的数据个数。

## channel的源码实现

```go
type hchan struct {
	qcount   uint           // total data in the queue
	dataqsiz uint           // size of the circular queue
	buf      unsafe.Pointer // points to an array of dataqsiz elements
	elemsize uint16
	closed   uint32
	elemtype *_type // element type
	sendx    uint   // send index
	recvx    uint   // receive index
	recvq    waitq  // list of recv waiters
	sendq    waitq  // list of send waiters

	// lock protects all fields in hchan, as well as several
	// fields in sudogs blocked on this channel.
	//
	// Do not change another G's status while holding this lock
	// (in particular, do not ready a G), as this can deadlock
	// with stack shrinking.
	lock mutex
}
```

从channel的数据结构不难看出，`qcount`和`dataqsiz`分别对应`cap()`和`len()`的返回值。`buf`指向缓冲区数组，可以联想slice中的数组指针，`elemsize`表示缓冲区中每个元素的大小，`closed`表示channel是否关闭，`elemtype`表示缓冲区中元素的类型。

当我们执行`ch := make(chan int, 1)`时，会调用`makechan`函数来创建一个channel，其源码如下：

```go
func makechan(t *chantype, size int) *hchan {
	elem := t.Elem

    ...

	mem, overflow := math.MulUintptr(elem.Size_, uintptr(size))
	if overflow || mem > maxAlloc-hchanSize || size < 0 {
		panic(plainError("makechan: size out of range"))
	}

	// Hchan does not contain pointers interesting for GC when elements stored in buf do not contain pointers.
	// buf points into the same allocation, elemtype is persistent.
	// SudoG's are referenced from their owning thread so they can't be collected.
	// TODO(dvyukov,rlh): Rethink when collector can move allocated objects.
	var c *hchan
	
    ...
    // 根据缓冲区的大小，和元素是否包含指针，来决定内存分配

	c.elemsize = uint16(elem.Size_)
	c.elemtype = elem
	c.dataqsiz = uint(size)
	lockInit(&c.lock, lockRankHchan)

	...

	return c
}
```

当我们执行数据读写时，会调用`chansend`和`chanrecv`函数，

```go
func chansend(c *hchan, ep unsafe.Pointer, block bool, callerpc uintptr) bool {
	...

	lock(&c.lock)

	if c.closed != 0 {
		unlock(&c.lock)
		panic(plainError("send on closed channel"))
	}

	if sg := c.recvq.dequeue(); sg != nil {
		// Found a waiting receiver. We pass the value we want to send
		// directly to the receiver, bypassing the channel buffer (if any).
		send(c, sg, ep, func() { unlock(&c.lock) }, 3)
		return true
	}

	if c.qcount < c.dataqsiz {
		// Space is available in the channel buffer. Enqueue the element to send.
		qp := chanbuf(c, c.sendx)
		if raceenabled {
			racenotify(c, c.sendx, nil)
		}
		typedmemmove(c.elemtype, qp, ep)
		c.sendx++
		if c.sendx == c.dataqsiz {
			c.sendx = 0
		}
		c.qcount++
		unlock(&c.lock)
		return true
	}

	if !block {
		unlock(&c.lock)
		return false
	}

	// Block on the channel. Some receiver will complete our operation for us.
	...

	c.sendq.enqueue(mysg)

    ...

	return true
}
```

```go
func chanrecv(c *hchan, ep unsafe.Pointer, block bool) (selected, received bool) {
	...

	lock(&c.lock)

	if c.closed != 0 {
		if c.qcount == 0 {
			if raceenabled {
				raceacquire(c.raceaddr())
			}
			unlock(&c.lock)
			if ep != nil {
				typedmemclr(c.elemtype, ep)
			}
			return true, false
		}
		// The channel has been closed, but the channel's buffer have data.
	} else {
		// Just found waiting sender with not closed.
		if sg := c.sendq.dequeue(); sg != nil {
			// Found a waiting sender. If buffer is size 0, receive value
			// directly from sender. Otherwise, receive from head of queue
			// and add sender's value to the tail of the queue (both map to
			// the same buffer slot because the queue is full).
			recv(c, sg, ep, func() { unlock(&c.lock) }, 3)
			return true, true
		}
	}

	if c.qcount > 0 {
		// Receive directly from queue
		qp := chanbuf(c, c.recvx)
		if raceenabled {
			racenotify(c, c.recvx, nil)
		}
		if ep != nil {
			typedmemmove(c.elemtype, ep, qp)
		}
		typedmemclr(c.elemtype, qp)
		c.recvx++
		if c.recvx == c.dataqsiz {
			c.recvx = 0
		}
		c.qcount--
		unlock(&c.lock)
		return true, true
	}

	if !block {
		unlock(&c.lock)
		return false, false
	}

	// no sender available: block on this channel.
	...

	c.recvq.enqueue(mysg)
	
    ...

	return true, success
}
```

从代码中或多或少可以看出，channel通过`lock`来保证每次只有一个go routine进行读写操作，换句话说，channel本身就带有互斥锁的机制。当channel的缓冲区满时，写操作会阻塞，当channel的缓冲区为空时，读操作会阻塞。`sendx`和`recvx`分别表示缓冲区的写入和读取位置，用于实现循环队列（联想到路由器中的环形缓冲区）。

在读和写时被阻塞的go routine会分别被加入channel的`sendq`和`recvq`队列中，当有数据写入或读取时，会从队列中取出一个go routine来执行。如果等待队列中有等待的G，那么读写操作会**直接将数据传递给等待的G**，而不是放入缓冲区。这样做的好处是减少了一次数据拷贝。