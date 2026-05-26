(function() {
    let It = null, rr = 0;
    const ii = "/data/adb/agh";
    const settingsPath = ii + "/settings.conf";
    const binLogPath = ii + "/bin.log";
    const historyLogPath = ii + "/history.log";
    const scriptTool = ii + "/scripts/tool.sh";
    const scriptDebug = ii + "/scripts/debug.sh";
    const debugLogPath = ii + "/debug.log";
    const pidFile = ii + "/bin/agh.pid";
    const yamlPath = ii + "/bin/AdGuardHome.yaml";

    if (typeof ksu < "u" && typeof ksu.exec == "function") { It = ksu; }
    else if (typeof ap < "u" && typeof ap.exec == "function") { It = ap; }

    function exec(cmd) {
        return new Promise((resolve) => {
            if (!It) { resolve({ e: -1, s: "" }); return; }
            const cb = "_mc" + rr++;
            window[cb] = (code, out, err) => {
                delete window[cb];
                resolve({ e: code || 0, s: (out || "").replace(/\r/g, "") });
            };
            It.exec(cmd, "{}", cb);
        });
    }

    const $ = id => document.getElementById(id);
    const elements = {
        statusText: $('status-text'),
        statusContainer: $('status-container'),
        pidBadge: $('pid-badge'),
        version: $('agh-version'),
        logContent: $('log-content'),
        linkPanel: $('btn-link-panel'),
        fields: {
            enable_iptables: $('conf-enable_iptables'),
            block_ipv6_dns: $('conf-block_ipv6_dns'),
            redir_port: $('conf-redir_port'),
            adg_user: $('conf-adg_user'),
            adg_group: $('conf-adg_group')
        }
    };

    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        $('toast-container').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    async function refresh() {
        const marker = "::SPLIT::";
        const cmd = `
            [ -f ${pidFile} ] && cat ${pidFile} || echo ""; echo "${marker}";
            cat ${settingsPath} 2>/dev/null; echo "${marker}";
            grep -m1 "address:" ${yamlPath} | sed 's/.*address: *//'; echo "${marker}";
            /data/adb/agh/bin/AdGuardHome --version | head -1 | sed 's/.*version //'
        `;
        const res = await exec(cmd);
        const parts = res.s.split(marker).map(p => p.trim());
        
        const pid = parts[0];
        const isRunning = pid && /^\d+$/.test(pid);
        document.body.className = isRunning ? 'running' : 'stopped';
        elements.statusText.textContent = isRunning ? "运行中" : "已停止";
        if (isRunning) {
            elements.pidBadge.textContent = "PID: " + pid;
            elements.pidBadge.classList.remove('hidden');
        } else {
            elements.pidBadge.classList.add('hidden');
        }

        if (!window._loaded) {
            const conf = {};
            parts[1].split('\n').forEach(l => {
                const kv = l.split('=');
                if (kv.length === 2) conf[kv[0].trim()] = kv[1].trim();
            });
            for(let k in elements.fields) {
                const el = elements.fields[k];
                if (el.type === 'checkbox') el.checked = conf[k] === 'true';
                else el.value = conf[k] || "";
            }
            window._loaded = true;
        }

        window._webAddr = parts[2] || "127.0.0.1:3000";
        elements.version.textContent = (parts[3] || "...");
    }

    $('btn-start').onclick = async () => {
        showToast("正在启动...");
        await exec(`${scriptTool} start`);
        refresh();
    };

    $('btn-stop').onclick = async () => {
        showToast("正在停止...");
        await exec(`${scriptTool} stop`);
        refresh();
    };

    $('btn-save').onclick = async () => {
        let cmd = "";
        for (let k in elements.fields) {
            const el = elements.fields[k];
            const v = el.type === 'checkbox' ? el.checked : el.value;
            cmd += `sed -i "s/^${k}=.*/${k}=${v}/" ${settingsPath}; `;
        }
        await exec(cmd);
        showToast("配置已保存");
    };

    elements.linkPanel.onclick = () => {
        let addr = window._webAddr || "127.0.0.1:3000";
        if (addr.startsWith(":")) addr = "127.0.0.1" + addr;
        if (addr.startsWith("0.0.0.0")) addr = addr.replace("0.0.0.0", "127.0.0.1");
        window.open(`http://${addr}`, '_blank');
    };

    document.querySelectorAll('[data-tab]').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            b.classList.add('active');
            $('tab-' + b.dataset.tab).classList.add('active');
            if (b.dataset.tab === 'logs') loadLog();
        };
    });

    let logType = 'bin';
    async function loadLog() {
        elements.logContent.textContent = "读取中...";
        const path = logType === 'bin' ? binLogPath : historyLogPath;
        const res = await exec(`tail -n 100 ${path}`);
        if (!res.s) {
            elements.logContent.textContent = "暂无日志";
            return;
        }

        // Apply simple highlighting
        const lines = res.s.split('\n').map(line => {
            if (!line.trim()) return "";
            // Highlight Timestamps
            line = line.replace(/^(\d{4}[-/]\d{2}[-/]\d{2}\s\d{2}:\d{2}:\d{2}(\.\d+)?)/, '<span style="color:#888">$1</span>');
            // Highlight Levels
            line = line.replace(/\[(info|INFO|debug|DEBUG)\]/, '[<span style="color:#4CAF50">$1</span>]');
            line = line.replace(/\[(warn|WARN|warning|WARNING)\]/, '[<span style="color:#FFC107">$1</span>]');
            line = line.replace(/\[(error|ERROR|fatal|FATAL)\]/, '[<span style="color:#F44336">$1</span>]');
            // Status icons in history log
            line = line.replace(/(🟢|🔴|🧹|LOG)/g, '<span style="filter:drop-shadow(0 0 2px rgba(255,255,255,0.3))">$1</span>');
            return `<div>${line}</div>`;
        });

        elements.logContent.innerHTML = lines.join('');
        elements.logContent.scrollTop = elements.logContent.scrollHeight;
    }

    document.querySelectorAll('[data-log]').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('[data-log]').forEach(el => el.classList.remove('active'));
            b.classList.add('active');
            logType = b.dataset.log;
            loadLog();
        };
    });

    $('btn-refresh-log').onclick = loadLog;

    $('btn-debug').onclick = async () => {
        showToast("正在生成...");
        await exec(`${scriptDebug}`);
        showToast(`已生成至: ${debugLogPath}`);
    };

    $('btn-open-debug').onclick = async () => {
        // Use system action to open the file instead of internal viewer
        await exec(`am start -a android.intent.action.VIEW -d "file://${debugLogPath}" -t "text/plain" || am start -a android.intent.action.VIEW -d "content://com.android.externalstorage.documents/document/primary%3A${debugLogPath.replace(/^\/data\/adb\//, 'adb/')}" -t "text/plain"`);
        showToast("尝试调用系统程序打开...");
    };

    if (It) {
        refresh();
        setInterval(refresh, 5000);
    } else {
        elements.statusText.textContent = "请从模块管理器打开";
    }
})();
