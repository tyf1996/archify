# 嵌入式编图深度与语义完整性

本参考用于在 author JSON 前确定编图范围、视图职责和证据边界。它不新增图种、Schema 字段或自动证明能力。

## Authoring Depth

Authoring Depth（编图深度）描述作者要回答到什么程度，与 Viewer 的 Reading Depth `MAP / READ / FULL` 无关。

| 编图深度 | 适用请求 | 默认职责 |
|---|---|---|
| `overview` | 总览、结构、组成、边界，或宽泛的整理／梳理请求 | 用有界 Architecture 说明核心实体、归属、边界和一条主路径。 |
| `mechanism` | 如何工作、动作如何推进、交互顺序、数据移动或状态变化 | 按问题选择一种机制图；只有请求同时要求整体结构时才补概览。 |
| `source-interaction` | 源码交互、实现路径、函数／handler 调用或代码级顺序 | 使用与问题匹配的既有图种，并增加有界源码、有效配置和 revision 证据。 |

判定优先级是 `source-interaction`、`mechanism`、`overview`。深度词不决定图种：结构与归属用 Architecture，动作与条件用 Workflow，交互顺序用 Sequence，数据移动用 Dataflow，状态变化用 Lifecycle。

宽泛的嵌入式子系统整理请求默认采用 `overview + architecture`。如果用户只说“运行机制”或“源码交互”，却未说明重点是结构、动作、顺序、数据还是状态，图种会实质变化；此时只问一个问题。单独的 OS、运行环境或硬件机制名称仍是低置信背景，不直接选择图种。

## 编图前盘点

在 author JSON 前完成实体、边界、关系、证据和未知项五项轻量盘点。盘点可以保存在工作笔记或证据交接中，不进入图 JSON。

1. **Entities：** 稳定 ID、对象种类、职责、执行域、执行上下文、计划出现的视图。
2. **Boundaries：** 与问题相关的硬件、执行域、权限域、地址空间及其他边界；不同维度不互相替代。
3. **Relationships：** `from`、`to`、方向、实际接口／动作、Schema `mechanism`、同步／异步和主路径归属。
4. **Evidence：** source、config、observation、design、inference，以及对应 revision、有效配置、产物或观测范围。
5. **Unknowns：** unknown、conflict、not-applicable，以及它是否阻止当前深度或 `embedded-runtime` 画像。

关键未知项不以零值、默认平台行为或常见实现补齐。源文件存在、被构建、被注册、被调用和运行观测是不同事实。

## 视图分工

### 概览

- 保持一条明显主路径和最多 12 个主实体，不设最低节点数。
- 只呈现回答概览问题所需的实体；次要对象可以进入专题图。
- 不为满足节点预算合并独立的硬件 actor、ISR、线程／任务／进程、buffer／memory 或恢复控制对象。
- `meta.views` 是同一拓扑内的阅读章节，不能代替不同图种或不同抽象层级的独立图。

### 机制专题

- Architecture：运行归属、软硬件边界和跨域结构。
- Workflow：reset、init、update、recovery 等动作与条件。
- Sequence：调用、IRQ、通知、返回和异步完成顺序。
- Dataflow：数据搬运、缓冲、交接、消费、丢弃或回流。
- Lifecycle：对象状态、事件、条件、恢复和终态。

专题图保留问题需要的实体和关系，不受概览节点预算约束。仍应保持一个清晰主题，避免把互不相关的机制堆进一张图。

### 源码交互

源码交互不是第六图种。Architecture 可以使用现有 revision-pinned `components[].sources` 和 `--repo-root`。Workflow、Sequence、Dataflow 和 Lifecycle 的源码引用只进入人工证据材料；当前 renderer 不验证这些图种的仓库来源。

缺少目标 revision、有效配置、构建边界或相关入口时，不声称图已证明源码行为。用户接受设计级表达时，将事实类别标为 design，并保留源码事实 unknown。

## 实体与关系保真

- 同一真实实体在不同图中复用相同稳定 ID、`type`、`execution_domain` 和有证据的 `execution_context`。
- 同名但职责、地址空间或执行身份不同的对象使用不同 ID。
- 同一有向关系只有在端点和 `mechanism` 都一致时复用关系 ID。
- 请求、搬运、通知、消费和恢复是不同事实时使用不同关系 ID。
- 概览可以省略专题关系，但不能反转方向、改变机制或把 unknown 改成 known。

## 语义角色盘点

证据材料和测试 fixture 可以使用以下文档级 `semantic_role`。这些值不是 Schema 枚举，也不替代关系 `mechanism`。

| `semantic_role` | 检查重点 |
|---|---|
| `data-movement` | 数据由谁搬运、从哪里到哪里，是否与控制请求分开。 |
| `control` | 请求、配置、生命周期控制或状态推进的方向和条件。 |
| `irq-notification` | IRQ、通知、ready、调度请求和真正执行是否被正确区分。 |
| `buffer-handoff` | 写入、所有权／可用性交接、消费、回收或丢弃是否分开。 |
| `recovery` | 错误检测、恢复请求、恢复动作和返回活跃状态是否可见。 |

关系是否必需由当前问题和证据决定。对已确认的关键关系使用 `semanticChecks.requiredRelations`；不要从 label、端点类型或常见平台结构猜测缺席关系。

## 语义完整性检查

交付机制专题前确认：

1. 软件模块、执行实体、硬件 actor、buffer、memory 和 bus 已按问题需要分开。
2. 执行域和执行上下文来自证据；callback、threaded handler 和 deferred work 不按名称猜上下文。
3. 数据移动与控制关系分开。
4. IRQ／通知与数据搬运、ready、调度请求和真正执行分开。
5. 缓冲写入、交接、消费、回收或丢弃按已知事实分开。
6. 正常完成、错误通知和恢复动作有独立关系或明确 unknown。
7. 关键关系进入 `semanticChecks.requiredRelations`。
8. 跨图共享实体和关系保持 ID、种类、域、上下文、方向和机制一致。
9. source、config、observation、design、inference 及其 limits 没有混写。
10. 图和回执不声称证明调度、WCET、缓存一致性、电气或功能安全。

`embedded-runtime` 和 validator 继续只检查显式 IR。通过本清单、证据盘点和回归 fixture 建立语义完整性下限，不把缺席事实转化为自动推断。
