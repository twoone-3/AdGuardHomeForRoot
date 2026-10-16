# 常见问题

[← 返回文档目录](../index.md)

### **Q: 模块安装后无法正常运行怎么办？**

**A:**

- 确保设备的 **私人 DNS** 功能已关闭（原因见下一条）：
  前往 **设置 -> 网络和互联网 -> 高级 -> 私人 DNS**，并将其设置为关闭。
- 确认已重启设备，并检查 AdGuardHome 进程是否在运行：

  ```shell
  ps | grep AdGuardHome
  ```

- 若进程未运行，请查看[模块运行日志](troubleshooting.md#日志文件说明)。

### **Q: 为什么必须关闭「私人 DNS」？**

**A:**

私人 DNS（DoT / DoH）走的是 853 / 443 端口，不经过 53 端口，模块的 iptables 重定向无法接管这类查询，广告拦截会因此失效。请在 **设置 -> 网络和互联网 -> 高级 -> 私人 DNS** 中将其关闭，让系统 DNS 回到 53 端口。

### **Q: 忘记 AdGuardHome 后台密码怎么办？**

**A:**

- 打开[模块管理页](configuration.md#2-模块管理页-web-ui)，切换到“密码计算”分页（KernelSU / APatch 管理器中的“管理”按钮）。
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

### **Q: 如何添加自定义拦截规则？**

**A:**

打开 [AdGuardHome 后台](configuration.md#1-adguardhome-后台)，在“过滤器 -> 自定义过滤规则”中添加自建规则或规则源，保存后立即生效，无需重启模块。也可以在同一后台的“DNS 设置”中修改上游 DNS、启用 DNSSEC 等。

### **Q: 如何仅使用 DNS 服务而不使用 iptables 转发规则？**

**A:**

- 编辑 **`/data/adb/agh/settings.conf`** 文件。
- 将 `enable_iptables` 参数设置为 `false`。
- 保存文件后，重启模块。

此时需要自行把系统或代理软件的 DNS 指向 `127.0.0.1:5591`，具体见[与代理软件共存](proxy.md)。

### **Q: 使用代理模块时，广告屏蔽无效怎么办？**

**A:**

- 确保代理模块的上游 DNS 服务器配置为 **`127.0.0.1:5591`**。
- 检查代理模块的配置文件，确保所有 DNS 查询通过 AdGuardHome。
- 检查是否更新广告屏蔽规则，或者更换为其他规则源。

详细配置见[与代理软件共存](proxy.md)。

### **Q: 模块是否会影响设备性能？**

**A:**

- 模块对性能的影响较小，但在低性能设备上可能会有轻微延迟。
- 推荐使用 **arm64** 版本以获得更好的性能。

### **Q: 使用模块后，无法访问 Google 怎么办？**

**A:**

- 如果你用的是 FlClash，可尝试在 `settings.conf` 中填入以下配置：

  ```ini
  ignore_src_list="172.19.0.1"
  ```

  `172.19.0.1` 是 FlClash TUN 虚拟网卡的地址（其他代理应用或配置可能不同）。填入后，源地址为 `172.19.0.1` 的 DNS 查询会绕过本模块的 iptables 转发，不再被重定向到 AdGuardHome，从而避免与代理的 TUN 模式互相干扰。
- 若填写后仍无法访问，通常是节点质量问题，可先更换节点再测试。

### **Q: 状态显示 `🟡 运行中 (iptables: 已跳过，监听超时)` 怎么办？**

**A:**

说明核心启动太慢，模块为保证联网跳过了 iptables，此时 DNS 并未经过 AdGuardHome。排查方法见[故障排查](troubleshooting.md#状态显示-iptables-已跳过监听超时)。

### **Q: 如何升级模块？升级会不会丢失配置？**

**A:**

在 root 管理器中直接覆盖安装新版本即可，安装时会询问是否保留原有配置（默认保留），详见[安装与升级](install.md#升级)。
