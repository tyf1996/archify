# Firmware Update State — Evidence Notes

本文件记录厂商中立镜像对象 lifecycle fixture 的证据边界。它不代表完整设备启动状态机或真实升级实现。

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | downloading, verifying, trial, confirmed | 主线按 downloading→verifying→trial→confirmed 表达镜像对象状态。 | design | A1 §5 / `firmware-update-state.lifecycle.json` | known | 不证明网络、分区表、bootloader 或实际镜像可启动。 |
| F-002 | verifying-recovery-failed | verifying 失败进入 recovery。 | design | A1 §5 / fixture transition ID | known | 不指定验证算法、信任根或错误分类。 |
| F-003 | trial-rollback-timeout, rollback-recovery-complete | confirmation timeout 是 trial→rollback 的设计条件，随后进入 recovery；超时阈值数值未知。 | design | A1 §5 / fixture transition IDs | known | 不指定 trial 时长、回滚实现或掉电行为。 |
| F-004 | verifying, trial, confirmed | 签名方案、确认门槛、功耗故障处理与安全属性未知。 | design | fixture evidence-gaps view | unknown | 需要目标版本、有效配置和测试/运行证据。 |
