# 配置

[← 返回文档目录](../index.md)

## 1. AdGuardHome 后台

模块默认的 AdGuardHome 后台地址为 `http://127.0.0.1:3000`（具体取决于 `AdGuardHome.yaml` 中的 `address` 配置），可以通过浏览器直接访问，默认账号和密码均为 `root`。

在 AdGuardHome 后台，你可以执行以下操作：

- 查看详细的 DNS 查询统计与过滤图表
- 修改 DNS 上游、黑名单、DNSSEC 等高级配置
- 管理客户端接入与规则订阅读取

## 2. 模块管理页 (Web UI)

如果你使用的是 **KernelSU**、**APatch** 或支持 WebUI 的 **Magisk** 版本，可以通过点击模块列表中的“管理”按钮进入图形化配置界面。

在模块管理页中，你可以：

- **图形化修改配置**：直接调整 `settings.conf` 中的参数（如 iptables 开关、IPv6 拦截、运行用户组等），无需手动编辑文件。
- **状态快览**：实时查看核心运行状态、PID 以及版本号，并可一键进入 AdGuardHome 后台。
- **服务控制**：支持一键“启动”、“停止”、“重启”核心服务。
- **日志查看**：内置实时高亮的“核心日志”与“模块运行历史”查看器。
- **维护工具**：支持一键导出调试日志，并可直接调用系统文件查看器打开生成的 `debug.log`。
- **密码计算**：在“密码计算”分页中把明文密码转换为 `AdGuardHome.yaml` 所需的 bcrypt 哈希，可一键复制或直接写回配置文件（写入前自动备份为 `.bak`，写入后需重启核心才会生效）。该分页自模块版本 `20261016`（versionCode 54）起提供。

如果你更倾向于使用独立 App 管理 AdGuardHome 核心，可以尝试使用 [AdGuard Home Manager](https://github.com/JGeek00/adguard-home-manager) 应用。

## 3. settings.conf 参数表

模块配置文件为 `/data/adb/agh/settings.conf`，可直接编辑，也可以通过 [模块管理页](#2-模块管理页-web-ui) 图形化修改其中部分参数。修改后需要重启模块才会生效。

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `enable_iptables` | `true` | 是否启用内置 iptables 规则（把发往本机 `53` 端口的 DNS 查询重定向到 AdGuardHome）。设为 `false` 时模块只运行 AdGuardHome，需要自行将系统或代理的 DNS 指向 `127.0.0.1:5591` |
| `block_ipv6_dns` | `true` | 阻断 IPv6 的 DNS 请求（`REJECT`）。仅在 `enable_iptables=true` 时生效；设为 `false` 时改为把 IPv6 的 DNS 劫持到 AdGuardHome（需要系统支持 IPv6 NAT，否则自动跳过） |
| `redir_port` | `5591` | DNS 重定向端口，须与 `AdGuardHome.yaml` 中的 `dns.port` 一致 |
| `startup_timeout` | `120` | 应用 iptables 前等待 DNS 监听就绪的最长秒数；超时会跳过 iptables 以保证设备正常联网，详见 [故障排查](troubleshooting.md#状态显示-iptables-已跳过监听超时) |
| `adg_user` / `adg_group` | `root` / `net_raw` | 运行 AdGuardHome 的用户与用户组；iptables 规则会跳过该用户，避免 AdGuardHome 自身的查询被重定向 |
| `ignore_dest_list` | 空 | 需要绕过 iptables 的**目的**地址列表（空格分隔），例如上游 DNS 服务器地址 |
| `ignore_src_list` | 空 | 需要绕过 iptables 的**源**地址列表（空格分隔），例如代理应用 TUN 虚拟网卡的地址，详见 [常见问题](faq.md) |
| `timezone` | `Asia/Shanghai` | 传给 AdGuardHome 的时区配置 |

> 文件末尾的 `AGH_DIR`、`BIN_DIR`、`SCRIPT_DIR`、`PID_FILE`、`MOD_PATH` 为内部路径定义，请勿修改。

## 4. 模块目录与配置文件

模块的文件结构主要分为以下两个目录：

- **`/data/adb/agh`**：包含 AdGuardHome 的核心文件，包括二进制文件、工具脚本和配置文件。
- **`/data/adb/modules/AdGuardHome`**：存储模块的启动脚本和运行时数据文件。

模块的配置文件也分为两部分：

- **`/data/adb/agh/bin/AdGuardHome.yaml`**：AdGuardHome 的主配置文件（后台地址、DNS 端口、上游、规则等）。
- **`/data/adb/agh/settings.conf`**：模块的配置文件，参数说明见 [上一节](#3-settingsconf-参数表)。

配置的备份与删除行为见 [安装与升级](install.md#升级)。
