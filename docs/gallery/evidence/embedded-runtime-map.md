# Embedded Runtime Map — Evidence Notes

本文件记录厂商中立设计 fixture 的证据边界，不是自动验证的 Schema 输入，也不代表真实固件或实测系统。

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | sensor-controlTask-sample, controlTask-sharedBuffer-produce, sharedBuffer-linuxService-consume | 主线按 sensor→controlTask→sharedBuffer→linuxService 表达设计的数据交接；第一跳是 IRQ 触发的概览 handoff，ISR 和后续读取细节省略。 | design | A1 §5 / `embedded-runtime-map.architecture.json` | known | IRQ 不表示数据搬运或 task 立即执行；不证明缓冲区大小、所有权、零拷贝或缓存一致性。 |
| F-002 | controlTask-linuxService-notify | 跨核通知与共享缓冲访问是不同的已声明关系。 | design | A1 §5 / fixture relation ID | known | 不证明 mailbox/RPMsg/remoteproc 等具体实现。 |
| F-003 | watchdog-controlTask-recover | watchdog 对 controlTask 的关系仅表示恢复控制请求。 | design | A1 §5 / fixture relation ID | known | 不证明 watchdog 已启用、复位覆盖范围或恢复成功。 |
| F-004 | controlTask, sharedBuffer, linuxService | 优先级、缓冲容量、延迟预算和缓存责任未提供。 | design | fixture evidence-gaps view | unknown | 缺少目标硬件、构建配置、trace 与测量条件。 |
