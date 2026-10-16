# 开发与打包

[← 返回文档目录](../index.md)

面向开发者的说明。普通用户请从[文档目录](../index.md)开始阅读。

## 目录结构

```text
.
├── src/                  # 模块源码（打包时映射到 ZIP 根目录）
│   ├── bin/              # AdGuardHome.yaml 与其它运行所需文件
│   ├── scripts/          # tool.sh / iptables.sh / inotify.sh / debug.sh / base.sh
│   ├── webroot/          # 模块管理页 (Web UI)
│   ├── customize.sh      # 安装脚本（含保留/备份配置逻辑）
│   ├── service.sh        # 开机启动
│   ├── action.sh         # root 管理器 action 按钮
│   ├── uninstall.sh      # 卸载脚本
│   ├── settings.conf     # 模块配置
│   ├── module.prop       # 模块信息
│   └── META-INF/         # 安装器
├── docs/                 # 用户文档（index.md 为索引，zh/ 与 en/ 分别为中英文）
├── cache/                # 打包缓存与输出（已被 .gitignore 忽略）
├── pack.ps1              # Windows 打包脚本
├── pack.sh               # Linux / macOS / CI 打包脚本
├── version.json          # 版本与更新信息
└── changelog.md          # 当前版本的更新说明（同时作为 Release 正文）
```

## 本地打包

`pack.ps1`（Windows）与 `pack.sh`（Linux / macOS / CI）逻辑一致：下载并缓存最新版 AdGuardHome，与 `src/` 一起打包成模块 ZIP，CI 打包同样复用 `pack.sh`。

Windows（需要已安装 7-Zip，脚本会调用 `C:\Program Files\7-Zip\7z.exe`）：

```powershell
.\pack.ps1
```

Linux / macOS（需要 `curl` 或 `wget`、`tar`，以及 `zip`、`7z`/`7za`、`python3` 三者之一）：

```shell
./pack.sh          # 打包 arm64 + armv7
./pack.sh arm64    # 仅打包 arm64
./pack.sh armv7    # 仅打包 armv7
```

运行脚本后会自动完成：

1. 创建 `cache` 目录（如果尚未存在）。
2. 下载并缓存最新版本的 AdGuardHome（仅在 `cache` 目录中未找到缓存时执行下载）。
3. 将 AdGuardHome 与 `src/` 的内容打包成 ZIP（输出至 `cache/AdGuardHomeForRoot_<arch>.zip`）。

产物 ZIP 的结构与 `src/` 一致，AdGuardHome 二进制位于 `bin/AdGuardHome`。脚本具有缓存机制：如果 `cache` 目录中已存在 AdGuardHome 的缓存版本，则不会重复下载，从而节省时间和带宽。

## CI 与发版

推送形如 `YYYYMMDD` 的 tag 会触发 [`pack.yml`](../../.github/workflows/pack.yml)：

1. 校验 tag 必须为 8 位日期（`YYYYMMDD`）
2. 以矩阵方式调用 `pack.sh arm64` / `pack.sh armv7` 构建两个架构的包
3. 自动创建 GitHub Release，正文取自 `changelog.md`，附件为两个 ZIP

发版前请同步更新以下文件：

- `version.json`：`versionCode` 递增，`version` 使用 `YYYYMMDD`
- `src/module.prop`：`version` 与 `versionCode`
- `changelog.md`：仅保留**当前版本**的变更，中英各一段

## 提交规范

仓库使用 [Conventional Commits](https://www.conventionalcommits.org/)，常用前缀：`feat`、`fix`、`docs`、`chore`、`ci`、`refactor`。
