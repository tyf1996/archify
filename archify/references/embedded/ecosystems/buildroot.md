# Buildroot 生态参考

## 适用范围

Buildroot 是嵌入式 Linux 的构建生态。目标项目必须固定 Buildroot release／commit、defconfig、外部树、包配置和最终镜像清单。

## 编图要点

- Buildroot 可按配置生成交叉工具链、root filesystem、Linux kernel image 和 bootloader，组合关系由配置决定。
- `make` 负责下载、配置、编译、安装并生成选定目标；`output/images` 的文件才是用于放到目标上的镜像候选。
- `output/build`、`host`、`staging`、`target` 和 `images` 属于不同构建阶段／产物目录；`output/target` 不应直接当目标 rootfs。
- 构建依赖图、镜像内容、设备启动和运行时服务是不同视图；需要分别取证。
- Buildroot 通常只存在于开发机，不自动成为设备运行时服务；包 recipe／`.mk` 存在不等于包进入最终镜像。

## 确认点与反例

核对最终 `.config`、package 选择、rootfs manifest、`output/images` 文件 hash、bootloader／kernel 选择和设备切换记录。不能从 Buildroot 目录、单个包文件或构建成功推断设备已经运行该镜像。

官方依据：https://buildroot.org/downloads/manual/manual.html
