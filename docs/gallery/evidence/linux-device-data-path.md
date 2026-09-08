# Linux Device Data Path — Evidence Notes

本文件记录厂商中立 Linux 数据路径设计 fixture 的证据边界，不声称设备已经绑定、DMA 已配置或性能已经测量。

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | peripheral-dma-source, dma-kernelBuffer-transfer | 外设到 DMA 控制器再到 kernelBuffer 的关系分别使用 bus 与 dma 机制。 | design | A1 §5 / fixture flow IDs | known | 不证明总线协议、DMA 描述符、IOMMU 或设备绑定。 |
| F-002 | kernelBuffer-userProcess-read | kernelBuffer 向 userProcess 交付缓冲样本，跨越内核与用户态；访问 API 未指定。 | design | A1 §5 / fixture flow ID | known | 不证明具体 system call、阻塞行为或 mmap/复制策略，也不把缓冲区当作 syscall 发起者。 |
| F-003 | kernelBuffer-drop-overflow | kernelBuffer 溢出会进入可见 drop path。 | design | A1 §5 / fixture flow ID | known | 不证明阈值、丢帧计数持久性或恢复保证。 |
| F-004 | dma, kernelBuffer, userProcess | 缓冲区容量、缓存策略、吞吐量和 ownership 未知。 | design | fixture evidence-gaps view | unknown | 需要驱动、有效配置与 trace/仪器记录。 |
