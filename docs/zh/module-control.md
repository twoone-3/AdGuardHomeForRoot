# 模块控制

[← 返回文档目录](../index.md)

## 方法一：通过模块管理页 (推荐)

进入[模块管理页](configuration.md#2-模块管理页-web-ui)，点击顶部的“启动核心”或“停止核心”按钮即可完成控制；在支持 action 按钮的 root 管理器中，点击模块的“操作/执行”按钮等同于切换状态（启动 ↔ 停止）。

## 方法二：通过配置文件标识 (Shell / 文件管理器)

模块会实时监测 `/data/adb/modules/AdGuardHome` 目录下的 `disable` 文件：

- 存在该文件则禁用模块（停止核心并移除 iptables 规则）
- 不存在该文件则启用模块

你可以使用以下命令进行灵活切换：

```shell
# 停用
touch /data/adb/modules/AdGuardHome/disable
# 启用
rm /data/adb/modules/AdGuardHome/disable
```

## 方法三：直接调用工具脚本

你也可以在 Shell 中直接调用工具脚本：

```shell
/data/adb/agh/scripts/tool.sh start     # 启动
/data/adb/agh/scripts/tool.sh stop      # 停止
/data/adb/agh/scripts/tool.sh toggle    # 切换（运行则停止，停止则启动）
```

## 模块工作原理

本模块可以分为两部分：一部分是 AdGuardHome 本身，它在本地搭建了一个可自定义拦截功能的 DNS 服务器（默认监听 `127.0.0.1:5591`）；另一部分是 iptables 转发规则，它负责将发往本机 53 端口的 DNS 查询（UDP/TCP）重定向到 AdGuardHome 处理。

开机后模块会等待系统启动动画结束，再启动 AdGuardHome；确认 DNS 监听就绪后才会应用 iptables 规则，避免在核心尚未就绪时劫持 53 端口导致设备短时间内无法联网。
