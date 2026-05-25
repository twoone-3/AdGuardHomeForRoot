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
        // Combined command for speed
        const marker = "::SPLIT::";
        const cmd = `
            [ -f ${pidFile} ] && cat ${pidFile} || echo ""; echo "${marker}";
            cat ${settingsPath} 2>/dev/null; echo "${marker}";
            grep -m1 "address:" ${yamlPath} | sed 's/.*address: *//'; echo "${marker}";
            /data/adb/agh/bin/AdGuardHome --version | sed 's/.*version //'
        `;
        const res = await exec(cmd);
        const parts = res.s.split(marker).map(p => p.trim());
        
        // PID / Status
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

        // Settings (only on first load or if focus is lost to avoid overwriting user input)
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

        // Web Address
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

    // Tabs
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
        elements.logContent.textContent = res.s || "暂无日志";
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

    $('btn-clear-cache').onclick = async () => {
        showToast("正在重启并清理...");
        await exec(`${scriptTool} stop && ${scriptTool} start`);
        refresh();
    };

    $('btn-debug').onclick = async () => {
        showToast("正在生成...");
        await exec(scriptDebug);
        showToast("生成成功");
    };

    $('btn-open-debug').onclick = async () => {
        elements.logContent.textContent = "读取调试日志中...";
        const res = await exec(`tail -n 1000 ${debugLogPath} || echo "调试日志尚未生成，请先点击生成"`);
        
        // Switch to logs tab
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        document.querySelector('[data-tab="logs"]').classList.add('active');
        $('tab-logs').classList.add('active');
        
        elements.logContent.textContent = res.s || "日志为空";
        elements.logContent.scrollTop = 0;
        showToast("已加载调试日志");
    };

    if (It) {
        refresh();
        setInterval(refresh, 5000);
    } else {
        elements.statusText.textContent = "请从模块管理器打开";
    }
})();
