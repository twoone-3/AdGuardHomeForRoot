# 安装与升级

[← 返回文档目录](../index.md)

## 系统要求

- 设备已 root，且已安装 [Magisk](https://github.com/topjohnwu/Magisk) / [KernelSU](https://github.com/tiann/KernelSU) / [APatch](https://github.com/bmax121/APatch) 之一
- 模块提供 arm64 与 armv7 两个版本，一般推荐 **arm64**：性能更优，且与大多数现代设备兼容

## 安装步骤

1. 前往 [Release](https://github.com/twoone-3/AdGuardHomeForRoot/releases/latest) 页面下载对应架构的 zip 文件
2. 打开 **设置 -> 网络和互联网 -> 高级 -> 私人 DNS**，将其关闭（原因见 [常见问题](faq.md)）
3. 在 root 管理器中安装模块，完成后重启设备
4. 模块启动成功后，可访问 <http://127.0.0.1:3000> 进入 [AdGuardHome 后台](configuration.md#1-adguardhome-后台)，默认账号和密码均为 `root`

## 升级

在 root 管理器中直接安装新版本 zip 覆盖安装即可。由于模块会保留用户配置，安装脚本会在检测到旧版本时询问是否保留原有配置文件：

| 操作 | 结果 |
| --- | --- |
| 音量上键，或 30 秒内无操作 | **保留**原有的 `settings.conf` 与 `AdGuardHome.yaml` |
| 音量下键 | **不保留**：原文件被就地备份为 `settings.conf.bak`、`AdGuardHome.yaml.bak`，随后写入新版本自带的配置 |

> 注意：备份文件与原文件位于同一目录（`/data/adb/agh/` 与 `/data/adb/agh/bin/`），并非独立的备份目录。

## 卸载

在 root 管理器中移除模块时，`/data/adb/agh` 目录会被一并删除，**其中包含 AdGuardHome 配置、拦截规则与全部日志**。如需保留，请在卸载前自行备份该目录。

## 端口总览

| 端口 | 用途 | 说明 |
| --- | --- | --- |
| `53` | 系统 DNS | 由 iptables 规则重定向到 AdGuardHome，仅在 `enable_iptables=true` 时生效 |
| `5591` | AdGuardHome DNS 监听端口 | 定义于 `AdGuardHome.yaml` 的 `dns.port`，须与 `settings.conf` 的 `redir_port` 保持一致 |
| `3000` | AdGuardHome 后台 | 定义于 `AdGuardHome.yaml` 的 `http.address` |

其中 `5591` 与 `3000` 默认只监听 `127.0.0.1`，即仅本机可访问，不会暴露到局域网。
