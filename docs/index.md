# 教程 (Tutorials)

> **For English Users:** This module is primarily designed for Chinese users. If you require the documentation in English, we kindly recommend using a reliable translation tool.

## 安装 (Installation)

本模块仅适用于已经 root 的安卓设备，支持 [Magisk](https://github.com/topjohnwu/Magisk) / [KernelSU](https://github.com/tiann/KernelSU) / [APatch](https://github.com/bmax121/APatch) 等 root 工具

在 Release 页面下载 zip 文件，提供了 arm64 和 armv7 两个版本。一般推荐使用 arm64 版，因为它在性能上更优，并且与大多数现代设备兼容。

---

## 配置 (Configuration)

### 1. AdGuardHome 核心后台
模块默认的 AdGuardHome 后台地址为 `http://127.0.0.1:3000`（具体取决于 `AdGuardHome.yaml` 中的 `address` 配置），可以通过浏览器直接访问，默认账号和密码均为 `root`。

在核心后台，你可以执行以下操作：
- 查看详细的 DNS 查询统计与过滤图表
- 修改 DNS 上游、黑名单、DNSSEC 等高级配置
- 管理客户端接入与规则订阅读取

### 2. 模块管理页面 (Web UI)
如果你使用的是 **KernelSU**、**APatch** 或支持 WebUI 的 **Magisk** 版本，可以通过点击模块列表中的“管理”按钮进入图形化配置界面。

在管理页面中，你可以：
- **图形化修改配置**：直接调整 `settings.conf` 中的参数（如 iptables 开关、IPv6 拦截、运行用户组等），无需手动编辑文件。
- **状态快览**：实时查看核心运行状态、PID 以及版本号，并可一键进入核心后台。
- **服务控制**：支持一键“启动”、“停止”、“重启”核心服务。
- **日志查看**：内置实时高亮的“核心日志”与“模块运行历史”查看器。
- **维护工具**：支持一键导出调试日志，并可直接调用系统文件查看器打开生成的 `debug.log`。
- **密码计算**：在“密码计算”分页中把明文密码转换为 `AdGuardHome.yaml` 所需的 bcrypt 哈希，可一键复制或直接写回配置文件（写入前自动备份为 `.bak`），无需在设备上安装 `htpasswd` 等工具。

如果你更倾向于使用独立 App 管理 AdGuardHome 核心，可以尝试使用 [AdGuard Home Manager](https://github.com/JGeek00/adguard-home-manager) 应用。

---

## 模块控制 (Module Control)

### 方法一：通过模块管理页面 (推荐)
进入模块 Web UI 界面，点击顶部的“启动核心”或“停止核心”按钮即可完成控制。

### 方法二：通过配置文件标识 (Shell/文件管理器)
模块实时监测`/data/adb/modules/AdGuardHome`目录下的`disable`文件：
- 存在该文件则禁用模块
- 不存在该文件则启用模块

你可以使用以下命令进行灵活切换：
```shell
# 停用
touch /data/adb/modules/AdGuardHome/disable
# 启用
rm /data/adb/modules/AdGuardHome/disable
```

此外，你也可以在 Shell 中直接调用工具脚本：
```shell
/data/adb/agh/scripts/tool.sh start    # 启动
/data/adb/agh/scripts/tool.sh stop     # 停止
```

本模块可以分为两部分，一部分是 AdGuardHome 本身，它在本地搭建了一个可自定义拦截功能的 DNS 服务器，另一部分是 iptables 转发规则，它负责将本机所有53端口出口流量重定向到 AdGuardHome

---

## 故障排查 (Troubleshooting)

如果模块运行不符合预期，你可以通过查看以下日志文件进行排查：

### 日志文件说明

你可以直接在**模块管理页面 (Web UI)** 的“查看日志”分页中实时查看，也可以手动打开物理文件：

1. **`/data/adb/agh/history.log` (模块运行日志)**
   - **用途**：排查“为什么模块显示已启动但没效果”或“为什么模块启动失败”。
   - **Web UI**：对应“运行历史”选项卡。

2. **`/data/adb/agh/bin.log` (核心服务日志)**
   - **用途**：排查“Web 界面打不开”、“DNS 解析报错”等程序本身的问题。
   - **Web UI**：对应“核心日志”选项卡。

### 导出与查看调试信息

如果遇到疑难问题，建议使用维护工具：

- **Web UI 操作**：在“维护中心”点击“生成调试日志”，完成后点击“本地打开日志”即可直接查看。
- **Shell 操作**：执行 `sh /data/adb/agh/scripts/debug.sh`，信息将汇总至 `/data/adb/agh/debug.log`。

### 常见状态标识 (显示在 Magisk/KSU 描述中)

- `🟢 [PID: xxx] 运行中...`: 核心及防火墙规则均已成功运行。
- `🔴 已停止`: 模块处于停止状态。
- `🔴 Error occurred / 应用 iptables 出错`: 启动过程中出现关键性错误，请通过 Web UI 或查看 `history.log` 排查。

---

## 与代理软件共存 (Coexistence with Proxy Software)

代理软件主要分为两类：

**代理应用**：如 [NekoBox](https://github.com/MatsuriDayo/NekoBoxForAndroid)、[FlClash](https://github.com/chen08209/FlClash) 等。这些应用通常具有图形化界面，便于用户配置和管理代理规则。

这类软件可手动配置 DNS 部分，将域名解析服务器改为 127.0.0.1:5591 即可使用本地的 adgh 作为DNS服务器

代理应用的 `分应用代理/访问控制` 功能非常实用。通过将国内应用设置为绕过模式，可以减少不必要的流量经过代理，同时这些绕过的应用仍然能够正常屏蔽广告。

**代理模块**：如 [box_for_magisk](https://github.com/taamarin/box_for_magisk)、[akashaProxy](https://github.com/akashaProxy/akashaProxy) 等。这些模块通常运行在系统层级，适合需要更高权限或更深度集成的场景。

如果使用代理模块，强烈建议禁用模块的 iptables 转发规则。禁用后，模块仅运行 AdGuardHome 本身。随后，将代理模块的上游 DNS 服务器配置为 `127.0.0.1:5591`，即可确保代理软件的所有 DNS 查询通过 AdGuardHome 进行广告屏蔽。

```yaml
dns:
  # ...
  default-nameserver:
    - 223.5.5.5
  nameserver:
    - 127.0.0.1:5591
  # ...
```

---

## 模块目录与配置文件 (Module Directory and Configuration Files)

模块的文件结构主要分为以下两个目录：

- **`/data/adb/agh`**：包含 AdGuardHome 的核心文件，包括二进制文件、工具脚本和配置文件。
- **`/data/adb/modules/AdGuardHome`**：存储模块的启动脚本和运行时数据文件。

模块的配置文件也分为两部分：

- **`/data/adb/agh/bin/AdGuardHome.yaml`**：AdGuardHome 的主配置文件。
- **`/data/adb/agh/settings.conf`**：模块的配置文件，具体说明请参考文件内的注释。

在更新模块时，用户可以选择是否保留原有的配置文件。如果选择不保留，系统会自动将原配置文件备份到 **`/data/adb/agh/backup`** 目录，以确保数据安全。

---

## 模块打包 (Module Packaging)

模块根目录下提供了一个名为 `pack.ps1` 的打包脚本，用户可以通过它快速生成模块的安装包。

在 Windows 系统上，打开 PowerShell 并执行以下命令：

```powershell
.\pack.ps1
```

运行脚本后，以下操作将自动完成：

1. 创建 `cache` 目录（如果尚未存在）。
2. 下载并缓存最新版本的 AdGuardHome（仅在 `cache` 目录中未找到缓存时执行下载）。
3. 将 AdGuardHome 与模块的其他文件打包成一个 ZIP 文件。

该脚本的设计确保了高效性：如果 `cache` 目录中已存在 AdGuardHome 的缓存版本，则无需重复下载，从而节省时间和带宽。

## 常见问题 (Frequently Asked Questions)

### **Q: 模块安装后无法正常运行怎么办？**  

**A:**  

- 检查 AdGuardHome 是否在运行：  
  使用以下命令查看进程状态：  

  ```shell
  ps | grep AdGuardHome
  ```

- 确保设备的 **私人 DNS** 功能已关闭：  
  前往 **设置 -> 网络和互联网 -> 高级 -> 私人 DNS**，并将其设置为关闭。

### **Q: 如何更改 AdGuardHome 的默认端口？**  

**A:**  

- 打开 **`/data/adb/agh/bin/AdGuardHome.yaml`** 文件。  
- 修改 `bind_host` 的端口号为所需值。  
- 保存文件后，重启模块以应用更改。

### **Q: 忘记 AdGuardHome 后台密码怎么办？**

**A:**

- 打开模块 **Web UI**，切换到“密码计算”分页（KernelSU / APatch 管理器中的“管理”按钮）。
- 填入用户名（默认 `root`）和新密码，点击“计算哈希”，页面会在本地算出 bcrypt 哈希。
- 点击“写入配置”，再点击一次以确认，哈希会被写入 `/data/adb/agh/bin/AdGuardHome.yaml`，原文件会被备份为 `AdGuardHome.yaml.bak`。
- 重启核心后使用新密码登录。

当然，你也可以在“计算哈希”后点击“复制”，然后手动编辑 `/data/adb/agh/bin/AdGuardHome.yaml`，把 `users` 段中的 `password` 替换为该哈希：

```yaml
users:
  - name: root
    password: $2b$12$D3zeMIBFfzcQTqGqB.k7GOkMvqx1jgsrdiRCn2kwOHl.kNmmPfMom
```

需要注意：`password` 字段必须填入 bcrypt 哈希（形如 `$2b$12$` 开头的 60 个字符），不能直接填入明文密码；`cost` 越大越安全，计算也越慢，一般使用 10–12 即可。  

### **Q: 如何禁用模块的 iptables 转发规则？**  

**A:**  

- 编辑 **`/data/adb/agh/settings.conf`** 文件。  
- 将 `ENABLE_IPTABLES` 参数设置为 `false`。  
- 保存文件后，重启模块。

### **Q: 使用代理模块时，广告屏蔽无效怎么办？**  

**A:**  

- 确保代理模块的上游 DNS 服务器配置为 **`127.0.0.1:5591`**。  
- 检查代理模块的配置文件，确保所有 DNS 查询通过 AdGuardHome。

### **Q: 模块是否会影响设备性能？**  

**A:**  

- 模块对性能的影响较小，但在低性能设备上可能会有轻微延迟。  
- 推荐使用 **arm64** 版本以获得更好的性能。

### **Q：使用模块后，无法访问 Google 怎么办？**

**A:**

- 如果你用的是 FlClash，可尝试在`settings.conf`填入以下配置：

```ini
ignore_src_list="172.19.0.1"
```

此问题与节点质量有关，有的机场不改也没问题
