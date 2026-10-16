# 故障排查

[← 返回文档目录](../index.md)

如果模块运行不符合预期，你可以通过查看以下日志文件进行排查。

## 日志文件说明

你可以直接在[模块管理页](configuration.md#2-模块管理页-web-ui)的“查看日志”分页中实时查看，也可以手动打开物理文件：

1. **`/data/adb/agh/history.log` (模块运行日志)**
   - **用途**：排查“为什么模块显示已启动但没效果”或“为什么模块启动失败”。
   - **模块管理页**：对应“运行历史”选项卡。

2. **`/data/adb/agh/bin.log` (核心服务日志)**
   - **用途**：排查“Web 界面打不开”、“DNS 解析报错”等程序本身的问题。
   - **模块管理页**：对应“核心日志”选项卡。

## 导出与查看调试信息

如果遇到疑难问题，建议使用维护工具：

- **模块管理页操作**：在“维护中心”点击“生成调试日志”，完成后点击“本地打开日志”即可直接查看。
- **Shell 操作**：执行 `sh /data/adb/agh/scripts/debug.sh`，信息将汇总至 `/data/adb/agh/debug.log`。

## 常见状态标识

状态显示在 root 管理器的模块描述中（中英文取决于系统语言）：

| 状态 | 含义 |
| --- | --- |
| `🟢 运行中 [PID: xxx] (iptables: 开启)` | 核心与 iptables 转发规则均已正常运行 |
| `🟢 运行中 [PID: xxx] (iptables: 关闭)` | 核心运行中，但未启用 iptables（`enable_iptables=false`），此时 DNS 不会被自动接管 |
| `🟡 运行中 [PID: xxx] (iptables: 已跳过，监听超时)` | 核心运行中，但 `startup_timeout` 秒内 DNS 监听未就绪，为保证联网跳过了 iptables |
| `🔴 已停止` | 模块处于停止状态 |
| `🔴 应用 iptables 出错` | 核心已启动，但应用 iptables 规则失败，请查看 `history.log` |
| `🔴 启动过程出现错误` | 核心未能启动，模块会自动生成 `debug.log`，请查看 `bin.log` |

## 状态显示 `iptables: 已跳过，监听超时`

这表示 AdGuardHome 在 `startup_timeout`（默认 120 秒）内没有在重定向端口上监听，模块为了不让设备失去 DNS 而跳过了 iptables。此时核心仍在运行，但系统 DNS 并未经过 AdGuardHome。常见原因：

- 拦截规则列表过大，或上游 DNS 不可达，导致核心初始化过慢
- 设备性能较低或开机后系统繁忙

处理建议：

1. 在[模块管理页](configuration.md#2-模块管理页-web-ui)查看“核心日志”，确认是规则加载慢还是上游连接失败
2. 在 AdGuardHome 后台精简过滤规则，或更换可用的上游 DNS
3. 如确属初始化较慢，可调大 `settings.conf` 中的 `startup_timeout`（参数含义见 [settings.conf 参数表](configuration.md#3-settingsconf-参数表)）
4. 修改后重启模块使其重新应用 iptables
