# Troubleshooting

[← Back to documentation index](../index.md)

If the module does not behave as expected, check the log files below.

## Log files

You can watch them live in the [module web UI](configuration.md#2-module-web-ui) (the "Logs" tab), or open the files directly:

1. **`/data/adb/agh/history.log` (module run log)**
   - **Use it for**: "the module shows as running but has no effect" or "the module failed to start".
   - **Web UI tab**: "Run history".

2. **`/data/adb/agh/bin.log` (core log)**
   - **Use it for**: the panel not loading, DNS resolution errors and other core problems.
   - **Web UI tab**: "Core log".

## Debug bundle

For tricky problems, use the maintenance tools:

- **Web UI**: under "Maintenance" tap "Generate debug log", then "Open log locally".
- **Shell**: run `sh /data/adb/agh/scripts/debug.sh`; everything is collected into `/data/adb/agh/debug.log`.

## Status markers

The status is shown in the root manager's module description (the language follows your system locale):

| Status | Meaning |
| --- | --- |
| `🟢 Running [PID: xxx] (iptables: ON)` | Core and iptables rules are both running |
| `🟢 Running [PID: xxx] (iptables: OFF)` | Core is running but iptables is disabled (`enable_iptables=false`), so DNS is not hijacked |
| `🟡 Running [PID: xxx] (iptables: SKIPPED, listener timeout)` | Core is running, but the DNS listener was not ready within `startup_timeout` seconds, so iptables was skipped to keep the device online |
| `🔴 Stopped` | The module is stopped |
| `🔴 Error applying iptables` | The core started but applying the iptables rules failed; check `history.log` |
| `🔴 Error occurred` | The core failed to start; a `debug.log` is generated automatically, check `bin.log` |

## Status shows `iptables: skipped, listener timeout`

This means AdGuardHome did not start listening on the redirect port within `startup_timeout` (120 seconds by default), and the module skipped the iptables rules so the device would not lose DNS. The core is still running, but system DNS does not go through AdGuardHome. Common causes:

- A very large filter list, or unreachable upstream DNS servers, making core startup slow
- A slow device, or a busy system right after boot

What to try:

1. Check the "Core log" in the [module web UI](configuration.md#2-module-web-ui) to see whether rules are loading slowly or upstreams fail to connect
2. Trim the filter lists in the AdGuardHome panel, or switch to a working upstream DNS
3. If startup is simply slow, increase `startup_timeout` in `settings.conf` (see the [settings.conf reference](configuration.md#3-settingsconf-reference))
4. Restart the module so the iptables rules are applied again
