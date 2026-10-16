# Configuration

[← Back to documentation index](../index.md)

## 1. AdGuardHome Panel

The default panel address is `http://127.0.0.1:3000` (it depends on the `address` setting in `AdGuardHome.yaml`). Open it in a browser; the default username and password are both `root`.

From the panel you can:

- View detailed DNS query statistics and filtering charts
- Change DNS upstreams, blocklists, DNSSEC and other advanced settings
- Manage client access and rule subscriptions

## 2. Module Web UI

If you use **KernelSU**, **APatch**, or a **Magisk** build that supports WebUI, tap the "Manage" button in the module list to open the graphical configuration page.

In the module web UI you can:

- **Edit settings graphically**: change parameters in `settings.conf` (iptables switch, IPv6 blocking, run-as user/group, etc.) without editing files by hand.
- **Status overview**: live core status, PID and version, plus a shortcut to the AdGuardHome panel.
- **Service control**: start, stop and restart the core with one tap.
- **Logs**: built-in highlighted viewers for the core log and the module run history.
- **Maintenance**: export a debug bundle with one tap and open the generated `debug.log` with the system file viewer.
- **Password calculator**: turn a plaintext password into the bcrypt hash required by `AdGuardHome.yaml`; copy it or write it back to the config file (a `.bak` backup is created first, and the core must be restarted for it to take effect). Available since module version `20261016` (versionCode 54).

If you prefer a standalone app to manage the AdGuardHome core, try [AdGuard Home Manager](https://github.com/JGeek00/adguard-home-manager).

## 3. settings.conf Reference

The module configuration file is `/data/adb/agh/settings.conf`. You can edit it directly, or change some of the values graphically in the [module web UI](#2-module-web-ui). Restart the module for changes to take effect.

| Parameter | Default | Description |
| --- | --- | --- |
| `enable_iptables` | `true` | Enable the built-in iptables rules (redirect DNS queries sent to port `53` on this device to AdGuardHome). When `false`, only AdGuardHome runs and you must point the system or proxy DNS to `127.0.0.1:5591` yourself |
| `block_ipv6_dns` | `true` | Block IPv6 DNS requests (`REJECT`). Only effective when `enable_iptables=true`; when `false`, IPv6 DNS is hijacked to AdGuardHome instead (requires IPv6 NAT support, otherwise it is skipped automatically) |
| `redir_port` | `5591` | DNS redirect port; must match `dns.port` in `AdGuardHome.yaml` |
| `startup_timeout` | `120` | Maximum seconds to wait for the DNS listener before applying iptables; on timeout iptables is skipped so the device keeps working, see [Troubleshooting](troubleshooting.md#status-shows-iptables-skipped-listener-timeout) |
| `adg_user` / `adg_group` | `root` / `net_raw` | User and group that AdGuardHome runs as; the iptables rules skip this user so AdGuardHome's own queries are not redirected |
| `ignore_dest_list` | empty | **Destination** addresses to bypass (space separated), for example upstream DNS servers |
| `ignore_src_list` | empty | **Source** addresses to bypass (space separated), for example a proxy app's TUN interface address, see [FAQ](faq.md) |
| `timezone` | `Asia/Shanghai` | Timezone passed to AdGuardHome |

> The `AGH_DIR`, `BIN_DIR`, `SCRIPT_DIR`, `PID_FILE` and `MOD_PATH` entries at the end of the file define internal paths; do not modify them.

## 4. Module Directories and Configuration Files

The module uses two directories:

- **`/data/adb/agh`**: AdGuardHome core files, including the binary, helper scripts and configuration.
- **`/data/adb/modules/AdGuardHome`**: the module's boot scripts and runtime data.

There are also two configuration files:

- **`/data/adb/agh/bin/AdGuardHome.yaml`**: the main AdGuardHome configuration (panel address, DNS port, upstreams, rules, ...).
- **`/data/adb/agh/settings.conf`**: the module configuration, documented in [the previous section](#3-settingsconf-reference).

How configuration is backed up and deleted is explained in [Installation and upgrade](install.md#upgrade).
