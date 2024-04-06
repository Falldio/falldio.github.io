---
title: Libevent学习笔记（一）—— Hello World
date: 2023-11-12
author: Falldio
location: 武汉
layout: blog
tags: 
    - 网络
    - C
    - Libevent
    - Unix
summary: 从官方的Hello World用例开始学习Libevent的使用。
---

> `Libevent`是一个跨平台的事件驱动库，封装了如`select`、`poll`、`epoll`、`kqueue`等事件驱动机制，并能根据实际平台选择最优机制，使开发者不必关心平台差异。本文从官方的Hello World用例开始学习`Libevent`的使用。

以下是Hello World用例的代码，主要是利用`Libevent`实现了一个简单的服务器程序，能在指定端口监听连接，并写入"Hello World"消息。这里省略了部分自定义函数实现，完整代码见[这里](https://github.com/libevent/libevent/blob/master/sample/hello-world.c)。

```c
int
main(int argc, char **argv)
{
	struct event_base *base;
	struct evconnlistener *listener;
	struct event *signal_event;

	struct sockaddr_in sin = {0};
#ifdef _WIN32
	WSADATA wsa_data;
	WSAStartup(0x0201, &wsa_data);
#endif

	base = event_base_new();
	if (!base) {
		fprintf(stderr, "Could not initialize libevent!\n");
		return 1;
	}

	sin.sin_family = AF_INET;
	sin.sin_port = htons(PORT);

	listener = evconnlistener_new_bind(base, listener_cb, (void *)base,
	    LEV_OPT_REUSEABLE|LEV_OPT_CLOSE_ON_FREE, -1,
	    (struct sockaddr*)&sin,
	    sizeof(sin));

	if (!listener) {
		fprintf(stderr, "Could not create a listener!\n");
		return 1;
	}

	signal_event = evsignal_new(base, SIGINT, signal_cb, (void *)base);

	if (!signal_event || event_add(signal_event, NULL)<0) {
		fprintf(stderr, "Could not create/add a signal event!\n");
		return 1;
	}

	event_base_dispatch(base);

	evconnlistener_free(listener);
	event_free(signal_event);
	event_base_free(base);

	printf("done\n");
	return 0;
}
```

下面我们逐行分析代码。

```c
	struct event_base *base;

	...

	base = event_base_new();
	if (!base) {
		fprintf(stderr, "Could not initialize libevent!\n");
		return 1;
	}
```

首先通过`event_base_new`函数创建一个`event_base`结构体，该函数类似于工厂方法，内部依据`event_config`状态（一个内部的数据结构）来生成`event_base`。`event_base`可以持有多个事件，并通过轮询方式决定某一个事件是否活跃，这里即封装了多个平台的多路复用方式。

然后进行socket的初始化工作：

```c
static const unsigned short PORT = 9995;

...

	struct sockaddr_in sin = {0};

	...

	sin.sin_family = AF_INET;
	sin.sin_port = htons(PORT);
```

这里首先用0置位socket，设置地址族（address family）为IPv4（AF_INET），设置监听端口为`PORT`，在hello world程序开始设置了这一变量。`htons`主要进行unsigned short到网络字节序的转换，详见[Linux man page](https://linux.die.net/man/3/htons)。

```c
	struct evconnlistener *listener;

	...

	listener = evconnlistener_new_bind(base, listener_cb, (void *)base,
	    LEV_OPT_REUSEABLE|LEV_OPT_CLOSE_ON_FREE, -1,
	    (struct sockaddr*)&sin,
	    sizeof(sin));

	if (!listener) {
		fprintf(stderr, "Could not create a listener!\n");
		return 1;
	}
```

`listener`用于监听socket以及接收（accept）新建立的TCP连接。`evconnlistener_new_bind`将首先传入的socket（后两个参数）绑定到端口上，然后调用`evconnlistener_new`函数进行listener的初始化，该函数的最后一个参数变成了已经绑定了端口的fd。在`listener_cb`中，我们设置了连接建立到断开各个结点的逻辑，比如是否读写、写入Hellow World消息等。

之后我们使用`evsignal_new`得到一个signal event：

```c
	signal_event = evsignal_new(base, SIGINT, signal_cb, (void *)base);

	if (!signal_event || event_add(signal_event, NULL)<0) {
		fprintf(stderr, "Could not create/add a signal event!\n");
		return 1;
	}
```

而`evsignal_new`其实是`event_new`的一个宏，基于`event_new`的宏还有：

```c
/**
   @name evsignal_* macros

   Aliases for working with signal events
 */
/**@{*/
#define evsignal_add(ev, tv)		event_add((ev), (tv))
#define evsignal_assign(ev, b, x, cb, arg)			\
	event_assign((ev), (b), (x), EV_SIGNAL|EV_PERSIST, cb, (arg))
#define evsignal_new(b, x, cb, arg)				\
	event_new((b), (x), EV_SIGNAL|EV_PERSIST, (cb), (arg))
#define evsignal_del(ev)		event_del(ev)
#define evsignal_pending(ev, tv)	event_pending((ev), EV_SIGNAL, (tv))
#define evsignal_initialized(ev)	event_initialized(ev)
/**@}*/
```

`event`是`Libevent`的核心，对于hellow world中的代码，我们只是增加程序中止（SIGINT）时的事件监听，此时打印一些信息，退出事件循环。

总结目前为止的工作，我们初始化了`event_base`，并在此之上注册了socket监听器`listener`和进程终止时间的事件`signal_event`，接下来我们将在一个事件循环中不断地监听上述事件，而这只需要调用`event_base_dispatch`即可。

```c
	event_base_dispatch(base);
```

这个函数封了一层`event_base_loop`，在这个底层函数中包含一个while循环，其中我们检查event_base的状态，如果仍然有事件，我们继续这个循环等等等等......这又是另外一堆故事，不是这篇post要讲的内容。到目前为止，我们只知道`event_base_dispatch`通过循环进行监听，而真正起作用的`event_base_loop`中有许多有价值的东西等待挖掘即可。

假设我们完成了事件循环，现在要退出进程，我们还有一些清理的工作要做，也就是把之前初始化的变量清理掉：

```c
	evconnlistener_free(listener);
	event_free(signal_event);
	event_base_free(base);
```