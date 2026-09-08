# 嵌入式 Linux

## 适用问题

用于启动与就绪、设备模型、驱动交互、DMA 数据通路、构建与升级等问题。图种按问题选择，不因出现 Linux 或硬件名固定为某一种图。

## 取证与表达

- 将固件／Bootloader、内核、rootfs、init、服务和依赖分别取证；启动顺序以目标配置、日志或实现为准。
- 将设备描述、驱动被构建、总线匹配、绑定、`probe()` 结果、子系统注册和用户态可用性分开。
- `match()` 表示总线匹配；开始绑定或临时 `driver`／sysfs 关联也不证明 `probe()` 成功。在已核对的正常 driver-core 路径中，只有 `probe()` 成功后才记录绑定完成；手工绑定等特殊入口按目标源码说明。绑定或 `probe()` 成功仍不单独证明用户态接口 ready。
- 用户态进程、库、系统调用、内核驱动和设备接口保持 user/kernel 边界；阻塞与唤醒须有调用链或观测依据。
- IRQ handler、threaded IRQ、workqueue、tasklet 和普通线程按实际源码与有效配置标出上下文；不能把“有 IRQ”写成进程上下文。
- DMA 搬运、内核缓冲、映射／共享、完成通知、用户态消费和输出保持独立关系。
- 构建依赖图与运行时拓扑分开；Buildroot、Yocto、U-Boot、systemd 只有被目标证据确认时才出现。

## 常见误读

- “有设备树节点”不等于驱动已绑定；匹配、开始绑定或临时 driver/sysfs 关联不等于 `probe()` 成功；在正常 probe 路径中，成功 probe 后才记录绑定完成；绑定或 probe 成功仍不等于用户态接口可用。
- “模块已构建”不等于已加载；“镜像已生成”不等于已切换或已运行。
- `remoteproc`、RPMsg、mailbox、共享内存和硬件通知是不同机制；只在实现、配置或资源表分别确认后表达。
- 启动日志中的一次顺序不能自动推广成所有版本或所有启动路径的固定顺序。

## 版本与确认点

目标项目应固定 Linux kernel revision、设备描述最终内容、有效 `.config`、驱动构建清单、rootfs 内容、服务定义和必要运行记录。当前官方依据：Linux Driver Binding（https://docs.kernel.org/driver-api/driver-model/binding.html）、Linux v6.6 `drivers/base/dd.c`（https://github.com/torvalds/linux/blob/v6.6/drivers/base/dd.c）与 Remote Processor Framework（https://docs.kernel.org/staging/remoteproc.html）。滚动文档不能替代目标版本源码核对；v6.6 的 completed-bound 结论只适用于该固定源码路径。
