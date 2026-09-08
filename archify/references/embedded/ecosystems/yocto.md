# Yocto Project 生态参考

## 适用范围

本文依据 Yocto Project 6.0-tip Concepts 文档整理构建阶段语义。目标项目必须固定 Yocto／OpenEmbedded／BitBake revision、machine、distro、layer 和最终 manifest。

## 编图要点

- recipe 描述构建过程；OpenEmbedded 将产物拆成 packages 并放入 package feeds，再由 BitBake 生成 root filesystem image。
- `do_rootfs` 根据 `IMAGE_INSTALL`、`PACKAGE_EXCLUDE`、`IMAGE_FEATURES`、`PACKAGE_CLASSES` 和 `IMAGE_LINGUAS` 等变量决定镜像内容或包后端。
- `WORKDIR` 是 recipe 构建位置；recipe、package feed、image 和设备运行时文件分属不同阶段。
- layer、recipe 解析、package 生成、image 生成和设备刷写／启动必须分别表达。

## 确认点与反例

核对 machine／distro 配置、layer revision、最终 image manifest、包 feed、镜像 hash 以及设备切换和启动记录。recipe 被解析或 package 被生成不等于包已安装；image 生成不等于设备已启动。

官方依据：https://docs.yoctoproject.org/current/overview-manual/concepts.html
