---
title: Libevent学习笔记（三）—— Libevent如何组织并选择合适的backend
date: 2024-1-7
author: Falldio
location: 武汉
layout: blog
tags: 
    - 网络
    - C
    - Libevent
    - Unix
summary: 
---

在上一篇关于`event_base`使用的[post](https://falldio.github.io/2023/11/18/libevent%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0-%E4%BA%8C-event-base%E4%BD%BF%E7%94%A8%E6%A6%82%E7%95%A5/)里，我们略过了各类backend和`event_base`的组织原理，这篇post会更深入地讨论这块内容。

我们已经了解，`event_base`中的`evsel`、`evbase`和`evsigsel`等成员和backend强相关。

```c
struct event_base {
	/** Function pointers and other data to describe this event_base's
	 * backend. */
	const struct eventop *evsel;
	/** Pointer to backend-specific data. */
	void *evbase;

	/** List of changes to tell backend about at next dispatch.  Only used
	 * by the O(1) backends. */
	struct event_changelist changelist;

	/** Function pointers used to describe the backend that this event_base
	 * uses for signals */
	const struct eventop *evsigsel;

    ...
};
```

在此基础上，我们首先观察`eventop`的结构，它定义了backend的具体行为：

```c
struct eventop {
	const char *name;

	void *(*init)(struct event_base *);
	int (*add)(struct event_base *, evutil_socket_t fd, short old, short events, void *fdinfo);
	int (*del)(struct event_base *, evutil_socket_t fd, short old, short events, void *fdinfo);
	int (*dispatch)(struct event_base *, struct timeval *);
	void (*dealloc)(struct event_base *);

	int need_reinit;
	enum event_method_feature features;
	size_t fdinfo_len;
};
```

可见，`eventop`用函数指针的形式规定了具体backend实现的行为接口：

+ `init`：初始化，创建backend运行所需的数据结构并返回，`event_base`用`evbase`存放该函数的返回值。
+ `add`：注册感兴趣的事件，如读写、信号。
+ `del`：同上，删除某些事件。
+ `dispatch`：用于实现事件循环的某些逻辑，如果出现某些注册事件，该函数应该调用`event_active`。
+ `dealloc`：清理释放该backend的资源。

具体的backend逻辑分别存放在对应的`.c`文件中，如`select`、`devpoll`、`epoll`、`evport`、`kqueue`、`poll`和`signal`等。这里我们以`select`为例细看：

```c
const struct eventop selectops = {
	"select",
	select_init,
	select_add,
	select_del,
	select_dispatch,
	select_dealloc,
	1, /* need_reinit. */
	EV_FEATURE_FDS,
	0,
};

struct selectop {
	int event_fds;		/* Highest fd in fd set */
	int event_fdsz;
	int resize_out_sets;
	fd_set *event_readset_in;
	fd_set *event_writeset_in;
	fd_set *event_readset_out;
	fd_set *event_writeset_out;
};
```

区分`selectops`和`selectop`两个数据结构，前者实现了上文`eventop`的五种接口，提供了逻辑实现，后者存储了`select`这个backend特定的数据，如监听对象的`fd`、读写事件的集合等。

更具体一点，看看`select_add`的源代码：

```c
static int
select_add(struct event_base *base, int fd, short old, short events, void *p)
{
	struct selectop *sop = base->evbase;
	(void) p;

	EVUTIL_ASSERT((events & EV_SIGNAL) == 0);
	check_selectop(sop);
	/*
	 * Keep track of the highest fd, so that we can calculate the size
	 * of the fd_sets for select(2)
	 */
	if (sop->event_fds < fd) {
		int fdsz = sop->event_fdsz;

        // typedef unsigned long fd_mask;
		if (fdsz < (int)sizeof(fd_mask))
			fdsz = (int)sizeof(fd_mask);

		/* In theory we should worry about overflow here.  In
		 * reality, though, the highest fd on a unixy system will
		 * not overflow here. XXXX */
		while (fdsz < (int) SELECT_ALLOC_SIZE(fd + 1))
			fdsz *= 2;

		if (fdsz != sop->event_fdsz) {
			if (select_resize(sop, fdsz)) {
				check_selectop(sop);
				return (-1);
			}
		}

		sop->event_fds = fd;
	}

	if (events & EV_READ)
		FD_SET(fd, sop->event_readset_in);
	if (events & EV_WRITE)
		FD_SET(fd, sop->event_writeset_in);
	check_selectop(sop);

	return (0);
}
```

代码的逻辑不难，首先进行合法性检查，然后根据backend中最高的`fd`计算Unix中`fd_set`的大小，检查是否需要扩容，而后调用`FD_SET`将参数`fd`添加到`selectop`中对应的`fd_set`中。

剩下的问题是，如何判断哪些backend可用，如何选择合适的backend？

答案藏在`event.c`中：

```c
/* Array of backends in order of preference. */
static const struct eventop *eventops[] = {
#ifdef EVENT__HAVE_EVENT_PORTS
	&evportops,
#endif
#ifdef EVENT__HAVE_WORKING_KQUEUE
	&kqops,
#endif
#ifdef EVENT__HAVE_EPOLL
	&epollops,
#endif
#ifdef EVENT__HAVE_DEVPOLL
	&devpollops,
#endif
#ifdef EVENT__HAVE_POLL
	&pollops,
#endif
#ifdef EVENT__HAVE_SELECT
	&selectops,
#endif
#ifdef _WIN32
	&win32ops,
#endif
#ifdef EVENT__HAVE_WEPOLL
	&wepollops,
#endif
	NULL
};
```

在特定系统编译时根据宏确定某backend是否支持，然后决定是否要将对应的`eventop`实现加入到全局`eventops`数组中。数组中`eventop`的排列顺序就是backend选择的优先级顺序。

而在`event_base_new_with_config`方法中对`eventops`数组遍历，并检查当前backend是否被手动禁用，然后完成`eventop`的确定，如果没有找到合适的方法，则发出警告，释放资源并退出。

```c
    ...

	for (i = 0; eventops[i] && !base->evbase; i++) {
		if (cfg != NULL) {
			/* determine if this backend should be avoided */
			if (event_config_is_avoided_method(cfg,
				eventops[i]->name))
				continue;
			if ((eventops[i]->features & cfg->require_features)
			    != cfg->require_features)
				continue;
		}

		/* also obey the environment variables */
		if (should_check_environment &&
		    event_is_method_disabled(eventops[i]->name))
			continue;

		base->evsel = eventops[i];

		base->evbase = base->evsel->init(base);
	}

	if (base->evbase == NULL) {
		event_warnx("%s: no event mechanism available",
		    __func__);
		base->evsel = NULL;
		event_base_free(base);
		return NULL;
	}

    ...
```