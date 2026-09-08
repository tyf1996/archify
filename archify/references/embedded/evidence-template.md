# 嵌入式证据整理模板

本文件是人工编写的证据交接模板，不是新增 Schema，不会由渲染器自动验证，也不把附属材料伪装成机器已验证事实。

## 使用说明

- 每条 claim 只表达已核对的事实；未知、矛盾和假设显式保留。
- `diagram_ids` 使用已有图稿中的稳定 ID；没有对应图 ID 时留空或写 `unknown`，不要编造节点。
- 多个仓库分别记录 revision；构建产物记录内容 hash；硬件资料记录文档号、修订和页码；测量记录条件、单位和范围。
- `class` 和 `status` 是文档词汇，不是新增 IR 枚举。按项目既有契约解释其含义。
- 运行值、设计预算、配置值和最坏界限分开填写；一次观测不代表最坏情况。
- 不粘贴专有源码正文、完整手册、密钥、内部绝对路径或未经许可资料。

## 固定列

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | node-or-edge-id | 已核对的简短事实 | source/config/observation/design/inference | repo revision、官方 URL 或手册页码 | known/unknown/conflict/not-applicable | 版本、配置、测量条件和未证明范围 |

## 参考写法

- `reference` 应能让下游作者回到具体文件、行、commit、官方 URL、文档 revision/page 或产物 hash。
- `status: known` 只表示该条 claim 的证据已找到，不表示整个系统已验证。
- `status: unknown` 用于缺少版本、配置、运行记录或硬件资料的关键事实；不要用零值或默认行为代替。
- `status: conflict` 同时保留冲突来源及需要裁定的上下文。
- `limits` 写清楚“证明到哪里为止”，例如绑定不证明 probe 成功、镜像生成不证明设备已启动。
