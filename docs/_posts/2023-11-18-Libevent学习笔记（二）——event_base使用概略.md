---
title: Libevent学习笔记（一）—— event_base使用概略
date: 2023-11-18
author: Falldio
location: 武汉
tags: 
    - 网络
    - C
    - Libevent
    - Unix
summary: event_base保存Libevent事件循环所需的信息，可以说是Libevent的核心组件，在这篇post里我们概略性地探究一下这个结构体。
---

## event_base结构

`event_base`的声明位于`event-internal.h`中。在Libevent中这种带有-internal后缀的头文件表示内部函数和结构体，不对外开放使用，用户直接`#include <event.h>`即可。

`event_base`的成员可以分成下面几类来理解：

- 与backend相关的数据和函数指针，比如`evsel`、`evbase`、`evsigsel`等，毕竟我们了解，Lievent支持多种多路复用机制（在Libevent-book里被称为backend）。
- 事件、事件循环和事件回调的状态信息，比如某些活跃事件的数量，再比如该`event_base`所属的事件循环是否需要break或者continue。需要注意的是布尔语义的状态变量（像`event_break`、`event_continue`）仍然是int类型，这是因为**在C99之前，C语言还不支持内置的bool类型**，Libevent的开发者需要保证后向兼容性。
- timeout相关逻辑，Libevent使用queue（`common_timeout_list`）和min_heap（`timeheap`）来等待触发事件。
- 对多线程的支持，目前版本中`event_base`还不支持跨线程使用，因此设置了锁（`thread_base_lock`）和条件变量（`current_event_cond`）来提供多线程支持。
- 一些目前看来还不是很重要的变量，比如支持IOCP的结构等等。

## 使用event_config定制event_base

通常情况下我们直接使用`event_base_new()`得到一个默认的`event_base`即可，我们在Hello World用例里就是这么做的，但我们也可以使用`event_config`实现更精细的控制，然后使用`event_base_new_with_config(const struct event_config *cfg)`获得定制化的`event_base`。

```c
struct event_config {
	TAILQ_HEAD(event_configq, event_config_entry) entries;

    /*
    TAIQ_HEAD是一个宏：
    #define TAILQ_HEAD(name, type)
        struct name {
        	struct type *tqh_first;	// first element
        	struct type **tqh_last;	// addr of last next element 
        }
    拆开之后是下面这样：
    struct event_configq {
		struct event_config_entry *tqh_first;
		struct event_config_entry **tqh_last;
	} entries;
    */

	int n_cpus_hint;
	struct timeval max_dispatch_interval;
	int max_dispatch_callbacks;
	int limit_callbacks_after_prio;
	enum event_method_feature require_features;
	enum event_base_config_flag flags;
};
```

`event_method_feature`和`event_base_config_flag`分别定义了backend支持的feature和`event_base`的行为，[Libevent-book](https://github.com/libevent/libevent-book/blob/master/Ref2_eventbase.txt)对这两类枚举值有更详细的介绍。我们可以使用`event_config`的这些接口来对其成员进行相应操作：

```c
int event_config_avoid_method(struct event_config *cfg, const char *method);
int event_config_require_features(struct event_config *cfg,
                                  enum event_method_feature feature);
int event_config_set_flag(struct event_config *cfg,
    enum event_base_config_flag flag);
/* 这个接口目前只对Windoiws系统的IOCP协议有意义 */
int event_config_set_num_cpus_hint(struct event_config *cfg, int cpus)
int event_config_set_max_dispatch_interval(struct event_config *cfg,
    const struct timeval *max_interval, int max_callbacks,
    int min_priority);

```

## 事件管理

Libevent提供下面这些接口来进行`event_base`相关的事件管理，这里当然省略了特殊情况下实现类似功能的不同接口：

```c
int event_add(struct event *ev, const struct timeval *timeout);
int event_del(struct event *ev);
void event_active(struct event *ev, int res, short ncalls);
```

有一点让我迷惑的是，我们需要使用`event_new()`方法得到一个新的`event`，这里我们需要传入其对应的`event_base`（作为`event`的成员），然后在上述接口里，实际上使用ev指针找到`event_base`再进行操作。相比于这种来回颠倒，似乎还是OOP中类似于`base->add_event(ev)`的表达更直观😅。

