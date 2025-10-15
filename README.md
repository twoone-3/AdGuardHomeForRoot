# AdGuardHome for Root

[English](README_en.md) | 简体中文

![arm-64 support](https://img.shields.io/badge/arm--64-support-ef476f?logo=linux&logoColor=white&color=ef476f)
![arm-v7 support](https://img.shields.io/badge/arm--v7-support-ffa500?logo=linux&logoColor=white&color=ffa500)
![GitHub downloads](https://img.shields.io/github/downloads/twoone-3/AdGuardHomeForRoot/total?logo=github&logoColor=white&color=ffd166)
![License](https://img.shields.io/badge/License-MIT-9b5de5?logo=opensourceinitiative&logoColor=white)
[![Join Telegram Channel](https://img.shields.io/badge/Telegram-Join%20Channel-06d6a0?logo=telegram&logoColor=white)](https://t.me/+Q3Ur_HCYdM0xM2I1)
[![Join Telegram Group](https://img.shields.io/badge/Telegram-Join%20Group-118ab2?logo=telegram&logoColor=white)](https://t.me/+Q3Ur_HCYdM0xM2I1)

关注我们的频道获取最新消息，或加入我们的群组进行讨论！  

## 简介

- 本模块是一个在安卓设备上运行 [AdGuardHome](https://github.com/AdguardTeam/AdGuardHome) 的模块，提供了一个本地 DNS 服务器，能够屏蔽广告、恶意软件和跟踪器。
- 它可以作为一个本地广告拦截模块使用，也可以通过调整配置文件，转变为一个独立运行的 AdGuardHome 工具。
- 该模块支持 Magisk、KernelSU 和 APatch 等多种安装方式，适用于大多数 Android 设备。
- 该模块的设计初衷是为了提供一个轻量级的广告拦截解决方案，避免了使用 VPN 的复杂性和性能损失。
- 它可以与其他代理软件（如 [NekoBox](https://github.com/MatsuriDayo/NekoBoxForAndroid)、[FlClash](https://github.com/chen08209/FlClash)、[box for magisk](https://github.com/taamarin/box_for_magisk)、[akashaProxy](https://github.com/akashaProxy/akashaProxy) 等）共存，提供更好的隐私保护和网络安全。

## 特性

- 可选将本机 DNS 请求转发到本地 AdGuardHome 服务器
- 使用 [秋风广告规则](https://github.com/TG-Twilight/AWAvenue-Ads-Rule) 过滤广告，轻量，省电，少误杀
- 可从 <http://127.0.0.1:3000> 访问 AdGuardHome 控制面板，支持查询统计，修改 DNS 上游服务器以及自定义规则等功能

## 教程

1. 前往 [Release](https://github.com/twoone-3/AdGuardHomeForRoot/releases/latest) 页面下载模块
2. 检查 Android 设置 -> 网络和互联网 -> 高级 -> 私人 DNS，确保 `私人 DNS` 关闭
3. 在 root 管理器中安装模块，重启设备
4. 若看到模块运行成功的提示，则可以访问 <http://127.0.0.1:3000> 进入 AdGuardHome 后台，默认用户密码 root/root
5. 若需高级使用教程和常见问题解答，请访问 [docs](/docs/index.md)。

## 鸣谢

- [AWAwenue Ads Rule](https://github.com/TG-Twilight/AWAvenue-Ads-Rule)
- [AdguardHome_magisk](https://github.com/410154425/AdGuardHome_magisk)
- [akashaProxy](https://github.com/ModuleList/akashaProxy)
- [box_for_magisk](https://github.com/taamarin/box_for_magisk)

> 特别感谢赞助：
>
> - y******a - 200
> - 偶****** - 10
