# RTOS IRQ Handoff — Evidence Notes

本文件记录厂商中立 RTOS 设计 fixture 的事实边界，不代表真实固件或实测系统。Sequence 的 y 顺序是交互顺序，不是实测时间比例。

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | peripheral-isr-assert | 外设向 ISR 发出 sample IRQ。 | design | A1 §5 / fixture message ID | known | 不指定中断控制器、优先级、port 或实际 IRQ 号。 |
| F-002 | isr-queue-enqueue, queue-worker-dequeue | ISR 进行非阻塞入队尝试；仅在入队被接受且 worker 随后获得调度时，worker 才取得该 sample。 | design | A1 §5 / fixture message IDs | known | 不证明 API 可从 ISR 调用、立即调度或实际处理时延。 |
| F-003 | queue-recovery-full | 入队因队列满被拒绝时请求 recovery；被拒绝的 sample 不进入 worker 成功消费路径。 | design | A1 §5 / fixture message ID | known | 不指定丢弃、覆盖、阻塞或重试策略。 |
| F-004 | isr, queue, worker | IRQ 优先级、队列深度、截止时间和唤醒延迟未知。 | design | fixture evidence-gaps view | unknown | 需要目标 RTOS、port、配置和观测记录。 |
