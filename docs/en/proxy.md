# Coexistence with Proxy Software

[← Back to documentation index](../index.md)

Proxy software generally falls into two categories.

## Proxy apps

Examples: [NekoBox](https://github.com/MatsuriDayo/NekoBoxForAndroid), [FlClash](https://github.com/chen08209/FlClash). These apps have a graphical interface, which makes proxy rules easy to configure and manage.

You can configure DNS manually in these apps: set the domain name server to `127.0.0.1:5591` to use the local AdGuardHome as the DNS server.

The per-app proxy / access control feature is very useful. Setting domestic apps to bypass mode reduces the traffic that goes through the proxy, while those apps still get ad blocking.

## Proxy modules

Examples: [box_for_magisk](https://github.com/taamarin/box_for_magisk), [akashaProxy](https://github.com/akashaProxy/akashaProxy). These modules run at the system level and suit scenarios that need higher privileges or deeper integration.

When using a proxy module, we strongly recommend disabling the module's iptables redirect rules (set `enable_iptables` to `false` in `settings.conf`). The module then only runs AdGuardHome. Next, point the proxy module's upstream DNS server to `127.0.0.1:5591` so that every DNS query made by the proxy goes through AdGuardHome for ad blocking.

```yaml
dns:
  # ...
  default-nameserver:
    - 223.5.5.5
  nameserver:
    - 127.0.0.1:5591
  # ...
```

## Related

- DNS queries already point at AdGuardHome but ads are still not blocked: see the [FAQ](faq.md)
- Some sites are unreachable after enabling FlClash: see the [FAQ](faq.md)
