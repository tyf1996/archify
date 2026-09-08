# RT-Thread 生态参考

## 适用范围

本文依据 RT-Thread 官方线程与中断文档整理；线程优先级数量、CPU port、BSP 中断尾部和可调用 API 仍须固定版本与配置。

## 编图要点

- 线程是调度单元，调度器从 ready 队列选择最高优先级线程；官方文档描述为抢占式调度。
- 默认优先级编码为数值越小优先级越高，但可用优先级数量由配置决定；同优先级线程可按 tick 时间片轮转。
- `rt_thread_startup()` 使初始线程进入 ready；延时、等待资源等可使线程进入 suspended；ready、running 和实际切换分别表达。
- ISR 使高优先级线程 ready 时，调度切换发生在中断完成后；不要把 ISR 通知画成同步执行任务体。
- `rt_hw_interrupt_install()` 安装用户 ISR，但具体向量表、底层入口和尾部处理由 CPU/BSP 实现决定。

## 确认点与反例

固定 RT-Thread revision、`rtconfig.h`、CPU port、BSP、向量映射、handler 注册和同步 API。文档中的优先级方向不能推广给 FreeRTOS 或 Zephyr；安装 API 的存在不证明目标中断已触发；ready 不证明线程已经运行。

官方依据：https://rt-thread.github.io/rt-thread/page_thread_management.html、https://rt-thread.github.io/rt-thread/page_interrupt_management.html
