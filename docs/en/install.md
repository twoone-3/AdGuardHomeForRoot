# Installation and Upgrade

[← Back to documentation index](../index.md)

## Requirements

- A rooted device with [Magisk](https://github.com/topjohnwu/Magisk) / [KernelSU](https://github.com/tiann/KernelSU) / [APatch](https://github.com/bmax121/APatch) installed
- Two builds are provided: arm64 and armv7. **arm64** is recommended: it performs better and is compatible with most modern devices

## Installation

1. Download the zip for your architecture from the [Release](https://github.com/twoone-3/AdGuardHomeForRoot/releases/latest) page
2. Open **Settings -> Network & Internet -> Advanced -> Private DNS** and turn it off (see [FAQ](faq.md))
3. Install the module in your root manager and reboot the device
4. Once the module is running, open <http://127.0.0.1:3000> to access the [AdGuardHome panel](configuration.md#1-adguardhome-panel); the default username and password are both `root`

## Upgrade

Install the new zip over the existing module in your root manager. Because the module keeps your configuration, the installer detects an older installation and asks whether to keep the existing config files:

| Action | Result |
| --- | --- |
| Volume Up, or no input within 30 seconds | **Keep** the existing `settings.conf` and `AdGuardHome.yaml` |
| Volume Down | **Do not keep**: the old files are backed up in place as `settings.conf.bak` and `AdGuardHome.yaml.bak`, then the new defaults are installed |

> Note: the backups sit next to the original files (`/data/adb/agh/` and `/data/adb/agh/bin/`), not in a separate backup directory.

## Uninstall

Removing the module in your root manager deletes the `/data/adb/agh` directory, **including the AdGuardHome configuration, filter rules and all logs**. Back it up first if you want to keep them.

## Ports

| Port | Purpose | Notes |
| --- | --- | --- |
| `53` | System DNS | Redirected to AdGuardHome by the iptables rules, only when `enable_iptables=true` |
| `5591` | AdGuardHome DNS listener | Defined by `dns.port` in `AdGuardHome.yaml`; must match `redir_port` in `settings.conf` |
| `3000` | AdGuardHome panel | Defined by `http.address` in `AdGuardHome.yaml` |

`5591` and `3000` listen on `127.0.0.1` only by default, so they are not exposed to the local network.
