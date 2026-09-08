# FreeRTOS 生态参考

## 适用范围

本文只把 FreeRTOS Kernel V11.1.0 的 GCC ARM_CM4F `port.c` 作为已核对示例。它不能代表其他 CPU、compiler、port 或版本。

## 编图要点

- 该 port 用 SVC 启动首个 task，PendSV 执行上下文切换，SysTick 处理 tick；这些是该 port 的实现关系。
- SysTick 可由弱函数替换为其他 tick 定时器；不要固定画成所有配置都使用 SysTick。
- handler 可直接安装，也可经应用 handler 间接路由；路径受 `configCHECK_HANDLER_INSTALLATION` 和应用配置影响。
- `FromISR` API 与任务 API 分开；可调用范围受 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 和硬件优先级实现约束。
- PendSV、SysTick 和 SVC 的优先级设置来自该 ARM Cortex-M port；不要把优先级数字推广到其他 port。
- task 返回不是普通函数返回路径；该 port 进入错误处理，正常退出应使用对应任务删除机制。

## 确认点与反例

先固定 Kernel tag、port 路径、`FreeRTOSConfig.h`、中断向量安装、tick 源和 CPU 优先级位数。源码静态存在不证明目标工程使用该 port；调用 `FromISR` 的名字不证明调用点位于合法 ISR 上下文；tick 递增不证明发生了任务切换。

官方依据：https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/portable/GCC/ARM_CM4F/port.c
