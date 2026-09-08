# 裸机

## 适用问题

用于无操作系统场景的启动、前后台交互、采集控制和状态恢复。裸机参考不凭空引入 task、scheduler、mutex 或其他 OS 服务。

## 启动链

- 只在源码或启动产物有证据时表达向量表、Reset 入口、运行时初始化、板级初始化、外设初始化和主循环。
- 函数存在、handler 注册和实际执行是不同事实；启动文件存在不证明该路径已运行。
- linker script 的内存区域、section、VMA、LMA 与运行时复制／清零动作分别记录。

## 前后台与数据

- 主循环、ISR、回调、共享标志和临界区保持执行上下文边界；回调归属以注册和调用链为准。
- DMA 数据搬运、缓冲所有权、完成 IRQ／标志、主循环消费和控制输出分开。
- 完成通知不等于数据已被消费；共享标志不自动证明无竞争、原子性或缓存一致性。
- 看门狗、超时、校准、故障保护和复位恢复只有在启动代码、配置、硬件资料或日志支持时才表达。

## 常见误读

- linker 的 `MEMORY` 声明是链接布局约束，不是芯片真实容量或板卡连线证明。
- VMA 与 LMA 不同不代表运行时一定已完成复制；需要初始化代码和产物证据。
- 一个中断向量或函数名不证明 handler 已注册，更不证明每次硬件事件都执行该 handler。
- 没有调度器时，周期性执行应表示为定时器／中断／主循环机制，不改写成 RTOS 任务。

## 版本与确认点

固定启动文件、向量映射、linker script、map／ELF、芯片料号与修订、DMA 配置及校准／恢复记录。官方依据：GNU ld MEMORY（https://sourceware.org/binutils/docs/ld/MEMORY.html）和 Output Section LMA（https://sourceware.org/binutils/docs/ld/Output-Section-LMA.html）。GNU ld 文档只证明链接器语义，不替代 MCU 手册或目标产物。
