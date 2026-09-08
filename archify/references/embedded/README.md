# 嵌入式领域参考

本目录是 Archify 的按需知识层。它帮助 Agent 选择取证范围、解释执行机制并保持未知事实可见；它不新增图种、IR 字段或自动证明能力。

## 使用入口

1. 先按问题选择 `embedded-linux.md`、`rtos.md` 或 `bare-metal.md`。
2. 需要具体生态 API、配置或构建流程时，再读取 `ecosystems/` 下对应文件。
3. Linux、RTOS 和裸机共存时组合读取相关领域文档；不要把整机强制归为单一环境。
4. `evidence-template.md` 只用于人工整理证据，不是 Schema，也不会被渲染器自动验证。

## 取证边界

- 先固定目标板卡／芯片修订、构建目标、软件版本、port、有效配置和镜像身份。
- 只读取回答当前问题所需的入口、配置、实现和产物，不按文件数量或 SDK 全量扫描。
- 区分源码／配置事实、构建结果、运行时观测、用户提供的设计事实和推断。
- 源文件存在不等于参与目标构建；配置输入不等于最终有效配置；镜像存在不等于设备已启动。
- 多仓库分别记录 revision；构建产物记录 hash；硬件资料记录文档号、修订和页码；测量记录条件、单位和范围。
- 缺少关键版本或产物时保留未知，不用常见平台行为补全结论。

## 语义护栏

- 区分执行实体与回调／延后处理机制；callback 和 work handler 的实际上下文由对应内核、配置及注册／调用链确定，未知时明确标注。task、thread 也可能只是同一生态中的命名差异，不强制拆成不同调度实体。
- wake、ready、调度请求、上下文切换和真正运行分别表达；唤醒不等于立即运行。
- 数据搬运、共享／映射、所有权、完成通知和后续处理分别表达；控制路径不替代数据路径。
- sequence 和动画表达顺序，不表达真实时间比例；预算、观测值和最坏界限分别标注。
- 领域文档不得引用未批准的新字段；具体字段形状以现有 Schema 和通用 authoring contract 为准。

## A1 语义速查

完整角色目录以 [Schema 说明](../../schemas/README.md#embedded-interface-a1) 为准：七个原有 component type 是 legacy 兼容子集；嵌入式新增 `software`、`process`、`thread`、`task`、`isr`、`hardware`、`buffer`、`memory`、`bus`。

- `embedded-runtime` 可用于五种既有图种；`deployment-ownership` 仅用于 Architecture。
- execution domain 的 `id` 必须唯一，`label` 只要求非空；`environment` 是 `linux`、`rtos` 或 `bare-metal`。裸机的 runtime/version 表示固件身份。
- `linux-kernel` 表示内核线程／进程上下文，`linux-irq` 表示非线程化中断上下文；threaded IRQ 不自动归为 `linux-irq`。
- `software` 可以跨多个执行上下文；task/thread 可能只是同一生态中的命名差异，不强制拆成不同调度实体。
- 画像只在事实充分时启用，不证明调度、API 合法性、DMA、缓存一致性或实时界限；缺少必需事实时保留未知或阻断画像。

其他包内文档链接此处，不重复定义角色与画像范围。

## 官方依据

领域材料中的官方依据、版本边界与反例见各文档末尾。K0 证据包位于 lane 交接目录，仅作为作者线索，不随 Skill 作为运行时依赖。

通用图种仍只有 `architecture`、`workflow`、`sequence`、`dataflow` 和 `lifecycle`；嵌入式领域名称只负责知识路由。
