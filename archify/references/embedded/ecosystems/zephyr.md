# Zephyr 生态参考

## 适用范围

本文依据当前 Zephyr 官方文档整理通用取证规则。目标项目必须固定 Zephyr commit、board、SoC、overlay、Kconfig 输入和最终构建目录产物。

## Devicetree 与设备

- board DTS、SoC DTSI 和 overlay 是输入；构建目录中的 `zephyr.dts` 才是合并后的最终 devicetree 证据。
- `status = "okay"` 是节点启用条件之一；它不单独证明驱动已构建、初始化成功或设备 ready。
- `DEVICE_DT_GET()` 可构建期取得设备指针；调用 API 前检查 `device_is_ready()`。
- 驱动未被 Kconfig 构建可能导致链接错误；应同时检查最终 `.config` 和构建结果。
- overlay 的自动查找顺序和显式 `DTC_OVERLAY_FILE`／`EXTRA_DTC_OVERLAY_FILE` 不能混写。

## 线程与调度

线程有 ready／unready、优先级和调度状态；ISR 可替代当前线程，ISR 返回也是调度点。优先级方向、cooperative／preemptible、时间片和 `K_NO_WAIT` 约束只按对应 Zephyr 版本与 API 解释。

## 确认点与反例

不要把 overlay 片段当完整硬件描述，不要把 `struct device` 指针当 ready，不要把当前文档的默认查找顺序当目标工程实际输入。需要记录 `zephyr.dts`、`zephyr/.config`、board 和构建 revision。

官方依据：https://docs.zephyrproject.org/latest/build/dts/howtos.html、https://docs.zephyrproject.org/latest/build/kconfig/setting.html、https://docs.zephyrproject.org/latest/kernel/services/threads/index.html
