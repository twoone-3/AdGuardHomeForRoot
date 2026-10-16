# FAQ

[← Back to documentation index](../index.md)

### **Q: The module does not work after installation. What should I check?**

**A:**

- Make sure **Private DNS** is turned off (see the next question):
  **Settings -> Network & Internet -> Advanced -> Private DNS**, set it to off.
- Make sure you rebooted, and check whether the AdGuardHome process is running:

  ```shell
  ps | grep AdGuardHome
  ```

- If the process is not running, check the [module run log](troubleshooting.md#log-files).

### **Q: Why must I turn off Private DNS?**

**A:**

Private DNS (DoT / DoH) uses ports 853 / 443 and never touches port 53, so the module's iptables redirect cannot take over those queries and ad blocking stops working. Turn it off in **Settings -> Network & Internet -> Advanced -> Private DNS** so system DNS goes back to port 53.

### **Q: I forgot the AdGuardHome panel password. What do I do?**

**A:**

- Open the [module web UI](configuration.md#2-module-web-ui) and switch to the "Password" tab (the "Manage" button in KernelSU / APatch managers).
- Enter the username (default `root`) and a new password, then tap "Calculate hash" — the bcrypt hash is computed locally in the page.
- Tap "Write config" and confirm once more. The hash is written to `/data/adb/agh/bin/AdGuardHome.yaml` and the original file is backed up as `AdGuardHome.yaml.bak`.
- Restart the core and log in with the new password.

Alternatively, tap "Copy" after calculating the hash and edit `/data/adb/agh/bin/AdGuardHome.yaml` yourself, replacing `password` in the `users` section with that hash:

```yaml
users:
  - name: root
    password: $2b$12$D3zeMIBFfzcQTqGqB.k7GOkMvqx1jgsrdiRCn2kwOHl.kNmmPfMom
```

Note: the `password` field must contain a bcrypt hash (60 characters starting with `$2b$12$`), never a plaintext password. A higher `cost` is more secure but slower to compute; 10–12 is usually enough.

### **Q: How do I add custom blocking rules?**

**A:**

Open the [AdGuardHome panel](configuration.md#1-adguardhome-panel) and add your own rules or rule lists under "Filters -> Custom filtering rules". Changes take effect immediately, no module restart needed. You can also change upstream DNS servers and enable DNSSEC under "DNS settings" in the same panel.

### **Q: How do I use DNS only, without the iptables redirect rules?**

**A:**

- Edit **`/data/adb/agh/settings.conf`**.
- Set `enable_iptables` to `false`.
- Save the file and restart the module.

You then have to point your system or proxy DNS at `127.0.0.1:5591` yourself; see [Coexistence with proxy software](proxy.md).

### **Q: Ads are not blocked when using a proxy module. What should I check?**

**A:**

- Make sure the proxy module's upstream DNS server is set to **`127.0.0.1:5591`**.
- Check the proxy module configuration to ensure all DNS queries go through AdGuardHome.
- Check whether the blocking rule lists have been updated, or try a different rule source.

See [Coexistence with proxy software](proxy.md) for the full setup.

### **Q: Does the module affect device performance?**

**A:**

- The impact is small, but you may notice a slight delay on low-end devices.
- The **arm64** build is recommended for better performance.

### **Q: I cannot access Google after enabling the module. What should I do?**

**A:**

- If you use FlClash, try adding the following to `settings.conf`:

  ```ini
  ignore_src_list="172.19.0.1"
  ```

  `172.19.0.1` is the address of the FlClash TUN interface (other proxy apps or configurations may differ). With this set, DNS queries whose source address is `172.19.0.1` bypass the module's iptables redirect instead of being sent to AdGuardHome, which avoids conflicts with the proxy's TUN mode.
- If it still does not work, the proxy node quality is usually the cause; try another node.

### **Q: The status shows `🟡 Running (iptables: SKIPPED, listener timeout)`. What should I do?**

**A:**

It means the core started too slowly and the module skipped iptables to keep the device online, so DNS does not go through AdGuardHome. See [Troubleshooting](troubleshooting.md#status-shows-iptables-skipped-listener-timeout) for the details.

### **Q: How do I upgrade the module? Will I lose my configuration?**

**A:**

Just install the new version over the existing module in your root manager. The installer asks whether to keep the existing configuration (keep is the default); see [Installation and upgrade](install.md#upgrade).
