# 实时操作系统

## 适用问题

用于任务架构、中断交互、同步资源、调度与低功耗。FreeRTOS、Zephyr、RT-Thread 的 API、优先级和上下文规则必须分别解释。

## 取证与表达

- 区分软件模块、task／thread、ISR、驱动回调、定时器回调和 deferred work；一个模块可拥有多个执行上下文。
- 分别记录创建、ready、blocked／suspended、wake、调度请求、上下文切换和运行；wake 不等于 run。
- 优先级的数值方向、范围、抢占类别、时间片和核亲和性以具体内核、port、版本和配置为准。
- ISR 与任务间的通知、队列、信号量、事件和共享缓冲分别表达；不要将通知画成隐式同步调用。
- 阻塞 API、临界区、ISR-safe API 和超时只在对应实现有证据时表达；不能推广某一 RTOS 的 `FromISR` 或 `K_NO_WAIT` 规则。
- 配置／源码事实与运行时状态、延迟观测、预算和最坏界限分开；图不证明实时性或可调度性。

## 调度护栏

- 高优先级线程变为 ready 只证明它有资格被选中；真正切换点由内核调度规则和当前上下文决定。
- 中断可能抢占线程，ISR 返回后可能触发调度；两者不是同一个事件。
- 同优先级轮转、时间片和 cooperative／preemptive 语义不跨内核复用。
- 多核系统的亲和性、迁移限制和每核 ready 队列必须来自目标配置或源码；不默认一任务一核。

## 版本与确认点

固定 RTOS revision、CPU port、配置头／Kconfig、任务创建点、IRQ handler、回调注册和同步调用链。FreeRTOS V11.1.0 ARM_CM4F 的 SVC、PendSV、SysTick 与 `FromISR` 边界仅作为已核对 port 示例；Zephyr 和 RT-Thread 需各自核对版本。官方依据：FreeRTOS port（https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/portable/GCC/ARM_CM4F/port.c）、Zephyr Threads（https://docs.zephyrproject.org/latest/kernel/services/threads/index.html）、RT-Thread Thread Management（https://rt-thread.github.io/rt-thread/page_thread_management.html）。
