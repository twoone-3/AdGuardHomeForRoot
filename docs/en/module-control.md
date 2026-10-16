# Module Control

[← Back to documentation index](../index.md)

## Option 1: Module web UI (recommended)

Open the [module web UI](configuration.md#2-module-web-ui) and tap "Start core" or "Stop core". In root managers that support the action button, tapping the module's action button toggles the state (start ↔ stop).

## Option 2: The disable file (shell / file manager)

The module watches the `disable` file in `/data/adb/modules/AdGuardHome`:

- If the file exists, the module is disabled (core stopped, iptables rules removed)
- If the file does not exist, the module is enabled

Use these commands to switch states:

```shell
# disable
touch /data/adb/modules/AdGuardHome/disable
# enable
rm /data/adb/modules/AdGuardHome/disable
```

## Option 3: Call the helper script directly

You can also call the helper script from a shell:

```shell
/data/adb/agh/scripts/tool.sh start     # start
/data/adb/agh/scripts/tool.sh stop      # stop
/data/adb/agh/scripts/tool.sh toggle    # toggle (stop if running, start if stopped)
```

## How it works

The module has two parts: AdGuardHome itself, which runs a local DNS server with customizable filtering (listening on `127.0.0.1:5591` by default), and the iptables redirect rules, which send DNS queries addressed to port 53 (UDP/TCP) to AdGuardHome.

After boot the module waits for the boot animation to finish, starts AdGuardHome, and applies the iptables rules only once the DNS listener is up, so the device does not lose DNS while the core is still initializing.
