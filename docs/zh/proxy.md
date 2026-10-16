# 与代理软件共存

[← 返回文档目录](../index.md)

代理软件主要分为两类。

## 代理应用

如 [NekoBox](https://github.com/MatsuriDayo/NekoBoxForAndroid)、[FlClash](https://github.com/chen08209/FlClash) 等。这些应用通常具有图形化界面，便于用户配置和管理代理规则。

这类软件可手动配置 DNS：将域名解析服务器改为 `127.0.0.1:5591`，即可使用本地的 AdGuardHome 作为 DNS 服务器。

代理应用的 `分应用代理/访问控制` 功能非常实用。通过将国内应用设置为绕过模式，可以减少不必要的流量经过代理，同时这些绕过的应用仍然能够正常屏蔽广告。

## 代理模块

如 [box_for_magisk](https://github.com/taamarin/box_for_magisk)、[akashaProxy](https://github.com/akashaProxy/akashaProxy) 等。这些模块通常运行在系统层级，适合需要更高权限或更深度集成的场景。

如果使用代理模块，强烈建议禁用模块的 iptables 转发规则（将 `settings.conf` 中的 `enable_iptables` 设为 `false`）。禁用后，模块仅运行 AdGuardHome 本身。随后，将代理模块的上游 DNS 服务器配置为 `127.0.0.1:5591`，即可确保代理软件的所有 DNS 查询通过 AdGuardHome 进行广告屏蔽。

```yaml
dns:
  # ...
  default-nameserver:
    - 223.5.5.5
  nameserver:
    - 127.0.0.1:5591
  # ...
```

## 相关

- DNS 查询已经指向 AdGuardHome，但广告屏蔽仍不生效：见[常见问题](faq.md)
- 使用 FlClash 后无法访问部分网站：见[常见问题](faq.md)
