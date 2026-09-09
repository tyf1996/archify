# 嵌入式证据整理模板

本文件是人工编写的证据交接模板，不是新增 Schema，不会由渲染器自动验证，也不把附属材料伪装成机器已验证事实。

## 使用说明

- 每条 claim 只表达已核对的事实；未知、矛盾和假设显式保留。
- `diagram_ids` 使用已有图稿中的稳定 ID；没有对应图 ID 时留空或写 `unknown`，不要编造节点。
- 多个仓库分别记录 revision；构建产物记录内容 hash；硬件资料记录文档号、修订和页码；测量记录条件、单位和范围。
- `class` 和 `status` 是文档词汇，不是新增 IR 枚举。按项目既有契约解释其含义。
- 运行值、设计预算、配置值和最坏界限分开填写；一次观测不代表最坏情况。
- 不粘贴专有源码正文、完整手册、密钥、内部绝对路径或未经许可资料。

## 编图前盘点

以下表格用于 author JSON 前的轻量盘点。`authoringDepth`、`semantic_role` 和各盘点列都是文档词汇，不是新增 IR 字段，也不会被 renderer 自动验证。

### Scope 与视图计划

| target | authoringDepth | question | version/build boundary | planned views | blocking unknowns |
|---|---|---|---|---|---|
| 目标系统或子系统 | overview/mechanism/source-interaction | 本轮要回答的问题 | revision、有效配置、镜像或设计范围 | 图种、职责和输出顺序 | 会改变图种、事实或画像的未知项 |

Authoring Depth 与 Viewer Reading Depth `MAP / READ / FULL` 无关。宽泛整理默认使用 `overview`；只有答案类别会实质改变图种时才追问一个问题。

### Entity inventory

| stable_id | kind | responsibility | execution_domain | execution_context | views | evidence/status |
|---|---|---|---|---|---|---|
| entity-id | software/process/thread/task/isr/hardware/buffer/memory/bus 或既有类型 | 简短职责 | 已声明域或 unknown | 有证据的上下文或 unknown | 出现该实体的视图 | reference；known/unknown/conflict |

同一真实实体跨图复用 ID、类型、域和有证据的上下文。同名但职责、地址空间或执行身份不同的对象使用不同 ID。概览可以省略次要实体，不能把独立硬件、执行实体、缓冲或恢复对象合并来满足节点预算。

### Boundary inventory

| boundary | kind | members | evidence/status | limits |
|---|---|---|---|---|
| boundary-name | hardware/execution-domain/privilege-domain/address-space/power-domain/clock-domain 或既有边界 | 稳定实体 ID | reference；known/unknown/conflict | 图形包含不证明的隔离或归属 |

### Relationship inventory

| relation_id | from | to | mechanism | semantic_role | sync/async | evidence/status | limits |
|---|---|---|---|---|---|---|---|
| from-to-purpose | source-id | target-id | Schema 已支持的 mechanism | data-movement/control/irq-notification/buffer-handoff/recovery | 已知模式或 unknown | reference；known/unknown/conflict | 未证明范围 |

同一有向关系只有在端点和 `mechanism` 都一致时跨图复用关系 ID。请求、搬运、通知、消费和恢复是不同事实时分别建关系；对已确认的关键关系使用 `semanticChecks.requiredRelations`。

### Unknown／conflict list

| item | affects | status | needed evidence | authoring action |
|---|---|---|---|---|
| 未知或冲突事实 | 图种／深度／实体／关系／画像 | unknown/conflict/not-applicable | 需要的源码、配置、产物或观测 | 保留 unknown、提出一个问题或阻断画像 |

## 固定列

| fact_id | diagram_ids | claim | class | reference | status | limits |
|---|---|---|---|---|---|---|
| F-001 | node-or-edge-id | 已核对的简短事实 | source/config/observation/design/inference | repo revision、官方 URL 或手册页码 | known/unknown/conflict/not-applicable | 版本、配置、测量条件和未证明范围 |
| F-002 | node-or-edge-id | 正常 probe 成功后记录绑定完成 | source | Linux v6.6 `drivers/base/dd.c`，固定 commit/行范围 | known | 不适用于手工绑定等特殊路径；不证明用户态接口 ready |

## 参考写法

- `reference` 应能让下游作者回到具体文件、行、commit、官方 URL、文档 revision/page 或产物 hash。
- `status: known` 只表示该条 claim 的证据已找到，不表示整个系统已验证。
- `status: unknown` 用于缺少版本、配置、运行记录或硬件资料的关键事实；不要用零值或默认行为代替。
- `status: conflict` 同时保留冲突来源及需要裁定的上下文。
- `limits` 写清楚“证明到哪里为止”，例如匹配、开始绑定或临时 driver/sysfs 关联不证明 probe 成功；已核对的正常路径中成功 probe 后才记为绑定完成；绑定/probe 成功仍不证明用户态接口 ready；镜像生成不证明设备已启动。
