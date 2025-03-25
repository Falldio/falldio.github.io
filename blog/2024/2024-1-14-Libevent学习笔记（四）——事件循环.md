---
title: Libevent学习笔记（四）—— 事件循环
date: 2024-1-14
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

回顾之前[Hello World](https://falldio.github.io/2023/11/12/libevent%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0-%E4%B8%80-helloworld/)中对`event_base`的使用，当我们完成了`event_base`初始化和事件注册之后，将调用`event_base_dispatch`函数进入事件循环。在循环中持续等待事件到来，直到不再有已注册事件再退出。

```c
int
event_base_dispatch(struct event_base *event_base)
{
	return (event_base_loop(event_base, 0));
}
```

`event_base_loop`的代码多但清晰，最外层是局部变量声明、获取锁、检查事件循环是否重入，并为若干事件循环控制变量赋初值，退出事件循环之后释放锁、重设`event_base`有关状态等。

```c
int
event_base_loop(struct event_base *base, int flags)
{
	const struct eventop *evsel = base->evsel;
	struct timeval tv;
	struct timeval *tv_p;
	int res, done, retval = 0;
	struct evwatch_prepare_cb_info prepare_info;
	struct evwatch_check_cb_info check_info;
	struct evwatch *watcher;

	EVBASE_ACQUIRE_LOCK(base, th_base_lock);

	if (base->running_loop) {
		event_warnx("%s: reentrant invocation.  Only one event_base_loop"
		    " can run on each event_base at once.", __func__);
		EVBASE_RELEASE_LOCK(base, th_base_lock);
		return -1;
	}

	base->running_loop = 1;

	clear_time_cache(base);

	if (base->sig.ev_signal_added && base->sig.ev_n_signals_added)
		evsig_set_base_(base);

	done = 0;

#ifndef EVENT__DISABLE_THREAD_SUPPORT
	base->th_owner_id = EVTHREAD_GET_ID();
#endif

	base->event_gotterm = base->event_break = 0;

	...

	done:
	clear_time_cache(base);
	base->running_loop = 0;

	EVBASE_RELEASE_LOCK(base, th_base_lock);

	return (retval);
}
```

`EVBASE_ACQUIRE_LOCK(base, th_base_lock);`和`EVBASE_RELEASE_LOCK(base, th_base_lock);`是一系列宏的嵌套。最终将通过两个静态全局结构体实现锁操作。这样做的好处在于不同的结构体可能存在不同的锁名，用宏的方法实现相当于在预处理阶段根据相应的结构体变换了锁操作的逻辑。而在更通用的`EVLOCK_LOCK`和`EVLOCK_UNLOCK`里，Libevent也只是根据锁变量的地址和一个`mode`值（0）来实现具体操作。

顺带一提，这种`do { ... } while (0)`的写法在宏定义中似乎很常见，因为**它确保展开之后是一个闭合的代码块**，比如如果使用宏的地方是一个不带花括号的`if`语句，这样写即可确保展开后的所有语句都得到执行。

```c
/** Lock an event_base, if it is set up for locking.  Acquires the lock
    in the base structure whose field is named 'lockvar'. */
#define EVBASE_ACQUIRE_LOCK(base, lockvar) do {				\
		EVLOCK_LOCK((base)->lockvar, 0);			\
	} while (0)

/** Unlock an event_base, if it is set up for locking. */
#define EVBASE_RELEASE_LOCK(base, lockvar) do {				\
		EVLOCK_UNLOCK((base)->lockvar, 0);			\
	} while (0)

/** Acquire a lock. */
#define EVLOCK_LOCK(lockvar,mode)					\
	do {								\
		if (lockvar)						\
			evthreadimpl_lock_lock_(mode, lockvar);		\
	} while (0)

/** Release a lock */
#define EVLOCK_UNLOCK(lockvar,mode)					\
	do {								\
		if (lockvar)						\
			evthreadimpl_lock_unlock_(mode, lockvar);	\
	} while (0)
```

我们将止步于此，不再进一步查看对应的全局结构体及其函数指针的设置情况，而是回到我们的主题事件循环中去。

```c
	while (!done) {
		base->event_continue = 0;
		base->n_deferreds_queued = 0;

		/* Terminate the loop if we have been asked to */
		if (base->event_gotterm) {
			break;
		}

		if (base->event_break) {
			break;
		}

		tv_p = &tv;
		if (!N_ACTIVE_CALLBACKS(base) && !(flags & EVLOOP_NONBLOCK)) {
			timeout_next(base, &tv_p);
		} else {
			/*
			 * if we have active events, we just poll new events
			 * without waiting.
			 */
			evutil_timerclear(&tv);
		}

		/* If we have no events, we just exit */
		if (0==(flags&EVLOOP_NO_EXIT_ON_EMPTY) &&
		    !event_haveevents(base) && !N_ACTIVE_CALLBACKS(base)) {
			event_debug(("%s: no events registered.", __func__));
			retval = 1;
			goto done;
		}

		event_queue_make_later_events_active(base);

		/* Invoke prepare watchers before polling for events */
		prepare_info.timeout = tv_p;
		TAILQ_FOREACH(watcher, &base->watchers[EVWATCH_PREPARE], next) {
			EVBASE_RELEASE_LOCK(base, th_base_lock);
			(*watcher->callback.prepare)(watcher, &prepare_info, watcher->arg);
			EVBASE_ACQUIRE_LOCK(base, th_base_lock);
		}

		clear_time_cache(base);

		res = evsel->dispatch(base, tv_p);

		if (res == -1) {
			event_debug(("%s: dispatch returned unsuccessfully.",
				__func__));
			retval = -1;
			goto done;
		}

		update_time_cache(base);

		/* Invoke check watchers after polling for events, and before
		 * processing them */
		TAILQ_FOREACH(watcher, &base->watchers[EVWATCH_CHECK], next) {
			EVBASE_RELEASE_LOCK(base, th_base_lock);
			(*watcher->callback.check)(watcher, &check_info, watcher->arg);
			EVBASE_ACQUIRE_LOCK(base, th_base_lock);
		}

		timeout_process(base);

		if (N_ACTIVE_CALLBACKS(base)) {
			int n = event_process_active(base);
			if ((flags & EVLOOP_ONCE)
			    && N_ACTIVE_CALLBACKS(base) == 0
			    && n != 0)
				done = 1;
		} else if (flags & EVLOOP_NONBLOCK)
			done = 1;
	}
	event_debug(("%s: asked to terminate loop.", __func__));
```

跳过对循环状态的设置和检查，接下来，如果没有活跃事件，且并非非阻塞模式，首先通过`timeout_next`函数计算接下来的等待时间，更新`tv_p`值。在`timeout_next`函数中，这是通过从`event_base`的`timeheap`小根堆取堆顶元素，和当前事件比较计算得到的。若存在活跃事件，则直接将tv置0，表示不再等待。

```c
		if (!N_ACTIVE_CALLBACKS(base) && !(flags & EVLOOP_NONBLOCK)) {
			timeout_next(base, &tv_p);
		} else {
			/*
			 * if we have active events, we just poll new events
			 * without waiting.
			 */
			evutil_timerclear(&tv);
		}
```

如果没有要监听的事件，且没有通过`EVLOOP_NO_EXIT_ON_EMPTY`设置在这种情况下继续循环，则可以直接跳出循环。

```c
		/* If we have no events, we just exit */
		if (0==(flags&EVLOOP_NO_EXIT_ON_EMPTY) &&
		    !event_haveevents(base) && !N_ACTIVE_CALLBACKS(base)) {
			event_debug(("%s: no events registered.", __func__));
			retval = 1;
			goto done;
		}
```

截至目前完成了对等待时间的计算及直接跳出循环情况的检测，后续工作即对活跃时间进行处理，调用`event_base`底层的backend进行事件监听，检查backend运行情况，并更新有关状态即可。首先调用`event_queue_make_later_events_active`函数将`event_base`中`active_later_queue`的事件逐个迁移到`activequeues`中，而后完成prepare watcher的唤醒，这部分后面的笔记中会涉及。到此，总算可以按照我们[上一篇笔记](https://falldio.github.io/2024/01/07/libevent%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0-%E4%B8%89-libevent%E5%A6%82%E4%BD%95%E7%BB%84%E7%BB%87%E5%B9%B6%E9%80%89%E6%8B%A9%E5%90%88%E9%80%82%E7%9A%84backend/)所讲的那样，利用`dispatch`方法最终调用`event_base`底层的backend进行监听。如果`tv`是0，即前文对等待事件的检测中发现已经有活跃事件了，则无需等待直接返回事件。最后对backend机制的运行情况进行检查。

```c
		event_queue_make_later_events_active(base);

		/* Invoke prepare watchers before polling for events */
		prepare_info.timeout = tv_p;
		TAILQ_FOREACH(watcher, &base->watchers[EVWATCH_PREPARE], next) {
			EVBASE_RELEASE_LOCK(base, th_base_lock);
			(*watcher->callback.prepare)(watcher, &prepare_info, watcher->arg);
			EVBASE_ACQUIRE_LOCK(base, th_base_lock);
		}

		clear_time_cache(base);

		res = evsel->dispatch(base, tv_p);

		if (res == -1) {
			event_debug(("%s: dispatch returned unsuccessfully.",
				__func__));
			retval = -1;
			goto done;
		}

		update_time_cache(base);
```

上述操作完成后，Libevent像之前处理prepare watcher一样，对check watcher进行处理。在`timeout_process`中，Libevent持续不断从小根堆中获取超时事件，将之插入`activequeues`。

```c
		/* Invoke check watchers after polling for events, and before
		 * processing them */
		TAILQ_FOREACH(watcher, &base->watchers[EVWATCH_CHECK], next) {
			EVBASE_RELEASE_LOCK(base, th_base_lock);
			(*watcher->callback.check)(watcher, &check_info, watcher->arg);
			EVBASE_ACQUIRE_LOCK(base, th_base_lock);
		}

		timeout_process(base);
```

完成上述操作后，若存在活跃事件，则对其按照优先级进行处理，当不再存在活跃事件，则退出循环。否则重复上述过程，计算timeout，设置watcher，调用backend，根据状态对事件进行处理，回调。

```c
		if (N_ACTIVE_CALLBACKS(base)) {
			int n = event_process_active(base);
			if ((flags & EVLOOP_ONCE)
			    && N_ACTIVE_CALLBACKS(base) == 0
			    && n != 0)
				done = 1;
		} else if (flags & EVLOOP_NONBLOCK)
			done = 1;
	}
	event_debug(("%s: asked to terminate loop.", __func__));
}
```