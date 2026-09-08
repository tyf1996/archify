# Bare-metal Boot and Safe State — Evidence Notes

本文件记录厂商中立设计 fixture 的证据边界；它不声称对应真实板卡、启动镜像或测量结果。

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | reset, runtimeInit, boardInit, calibrate, mainLoop | 主线按 Reset handler/vector entry→runtimeInit→boardInit→calibrate→mainLoop 表达；reset 是 boot 上下文的软件入口。 | design | A1 §5 / `bare-metal-boot.workflow.json` | known | 不证明向量地址、运行时库、板级代码或时钟配置。 |
| F-002 | calibrate | 校准是进入 mainLoop 前保留的必要设计步骤。 | design | A1 §5 / fixture edge `calibrate-mainLoop-complete` | known | 未指定校准对象、范围或验收阈值。 |
| F-003 | boardInit-safeState-timeout | boardInit 超时转向 safeState 是显式异常路径。 | design | A1 §5 / fixture edge ID | known | 不证明超时值、输出值或硬件保护覆盖。 |
| F-004 | safeState | safeState 的具体输出和失效模式未知。 | design | fixture evidence-gaps view | unknown | 需要板卡原理图、寄存器配置与安全需求。 |
