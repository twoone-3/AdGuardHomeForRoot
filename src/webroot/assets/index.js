(function () {
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
    const binPath = ii + "/bin/AdGuardHome";

    if (typeof ksu < "u" && typeof ksu.exec == "function") { It = ksu; }
    else if (typeof ap < "u" && typeof ap.exec == "function") { It = ap; }

    // tool.sh start waits up to startup_timeout (120s by default) for the DNS
    // listener, so start/stop need a much longer budget than everything else.
    const DEFAULT_TIMEOUT = 15000;
    const LONG_TIMEOUT = 180000;

    function exec(cmd, timeout) {
        return new Promise((resolve) => {
            if (!It) { resolve({ e: -1, s: "" }); return; }
            const cb = "_mc" + rr++;
            const timer = setTimeout(() => {
                delete window[cb];
                resolve({ e: -2, s: "" });
            }, timeout || DEFAULT_TIMEOUT);
            window[cb] = (code, out, err) => {
                clearTimeout(timer);
                delete window[cb];
                resolve({
                    e: code || 0,
                    s: (out || "").replace(/\r/g, ""),
                    err: (err || "").replace(/\r/g, "")
                });
            };
            It.exec(cmd, "{}", cb);
        });
    }

    // POSIX single-quote escaping. Every path and value that reaches the shell
    // goes through this so user input cannot terminate the quoted argument.
    function shq(s) {
        return "'" + String(s).replace(/'/g, "'\\''") + "'";
    }

    const $ = id => document.getElementById(id);
    const t = (key) => window.i18n?.t(key) || key;
    let currentStatus = "checking";
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

    // settings.conf values are written back with sed, so each field is held to a
    // charset that cannot break out of the substitution (no & / \ or quotes).
    const FIELD_RULES = {
        enable_iptables: { label: "settings.enable_iptables" },
        block_ipv6_dns: { label: "settings.block_ipv6" },
        redir_port: { label: "settings.redir_port", test: (v) => /^\d+$/.test(v) && +v >= 1 && +v <= 65535 },
        adg_user: { label: "settings.user", test: (v) => /^[A-Za-z0-9_.-]{1,32}$/.test(v) },
        adg_group: { label: "settings.group", test: (v) => /^[A-Za-z0-9_.-]{1,32}$/.test(v) }
    };

    let toastCount = 0;

    function showToast(msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.textContent = msg;
        $('toast-container').appendChild(el);
        toastCount++;
        setTimeout(() => {
            el.remove();
            toastCount--;
        }, 3000);
        while (toastCount > 3) {
            const first = $('toast-container').firstElementChild;
            if (!first) break;
            first.remove();
            toastCount--;
        }
    }

    // Runs fn with the button disabled so a double tap cannot fire twice.
    async function withBusy(btn, fn) {
        if (!btn || btn.disabled) return;
        btn.disabled = true;
        try {
            await fn();
        } finally {
            btn.disabled = false;
        }
    }

    function reportExec(res) {
        if (res.e === -2) { showToast(t("toast.exec_timeout")); return false; }
        if (res.e !== 0) {
            showToast(`${t("toast.cmd_failed")} ${res.e}`);
            return false;
        }
        return true;
    }

    // Parse "key=value" lines, skipping comments. Values may contain '='.
    function parseConf(text) {
        const conf = {};
        (text || "").split('\n').forEach(l => {
            const line = l.trim();
            if (!line || line.startsWith('#')) return;
            const i = line.indexOf('=');
            if (i < 1) return;
            conf[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        });
        return conf;
    }

    let confLoaded = false;
    let webAddr = "127.0.0.1:3000";
    let refreshing = false;

    async function refresh() {
        if (refreshing) return;
        refreshing = true;
        try {
            const marker = "::SPLIT::";
            const cmd = `
                [ -f ${shq(pidFile)} ] && cat ${shq(pidFile)} || echo ""; echo "${marker}";
                cat ${shq(settingsPath)} 2>/dev/null; echo "${marker}";
                grep -m1 "address:" ${shq(yamlPath)} | sed 's/.*address: *//'; echo "${marker}";
                ${shq(binPath)} --version 2>/dev/null | head -5 | grep -oE '[0-9]+\\.[0-9]+[^ ,]*' | head -1
            `;
            const res = await exec(cmd);
            if (res.e === -2) return;
            const parts = res.s.split(marker).map(p => p.trim());

            const pid = parts[0] || "";
            const isRunning = /^\d+$/.test(pid);
            document.body.className = isRunning ? 'running' : 'stopped';
            currentStatus = isRunning ? "running" : "stopped";
            elements.statusText.textContent = t(`status.${currentStatus}`);
            if (isRunning) {
                elements.pidBadge.textContent = "PID: " + pid;
                elements.pidBadge.classList.remove('hidden');
            } else {
                elements.pidBadge.classList.add('hidden');
            }

            // Loaded once so the 5s poll does not clobber values being typed.
            if (!confLoaded) {
                const conf = parseConf(parts[1]);
                for (let k in elements.fields) {
                    const el = elements.fields[k];
                    if (el.type === 'checkbox') el.checked = conf[k] === 'true';
                    else el.value = conf[k] || "";
                }
                confLoaded = true;
            }

            webAddr = parts[2] || "127.0.0.1:3000";
            elements.version.textContent = parts[3] ? "v" + parts[3] : "...";
        } finally {
            refreshing = false;
        }
    }

    $('btn-start').onclick = () => withBusy($('btn-start'), async () => {
        showToast(t("toast.starting"));
        const res = await exec(`${shq(scriptTool)} start`, LONG_TIMEOUT);
        reportExec(res);
        refresh();
    });

    $('btn-stop').onclick = () => withBusy($('btn-stop'), async () => {
        showToast(t("toast.stopping"));
        const res = await exec(`${shq(scriptTool)} stop`, LONG_TIMEOUT);
        reportExec(res);
        refresh();
    });

    $('btn-save').onclick = () => withBusy($('btn-save'), async () => {
        const values = {};
        const bad = [];
        for (let k in elements.fields) {
            const el = elements.fields[k];
            const rule = FIELD_RULES[k];
            const v = el.type === 'checkbox' ? String(el.checked) : el.value.trim();
            if (rule.test && !rule.test(v)) {
                bad.push(t(rule.label));
                continue;
            }
            values[k] = v;
        }
        if (bad.length) {
            showToast(`${t("toast.invalid_field")} ${bad.join(", ")}`);
            return;
        }

        // sed only rewrites keys that already exist, so append the missing ones
        // instead of silently dropping the change.
        const cur = parseConf((await exec(`cat ${shq(settingsPath)}`)).s);
        let cmd = "";
        for (let k in values) {
            if (k in cur) {
                cmd += `sed -i ${shq(`s/^${k}=.*/${k}=${values[k]}/`)} ${shq(settingsPath)}; `;
            } else {
                cmd += `printf '%s\\n' ${shq(`${k}=${values[k]}`)} >> ${shq(settingsPath)}; `;
            }
        }
        const res = await exec(cmd);
        if (reportExec(res)) showToast(t("toast.saved"));
        refresh();
    });

    elements.linkPanel.onclick = () => withBusy(elements.linkPanel, async () => {
        let addr = webAddr || "127.0.0.1:3000";
        if (addr.startsWith(":")) addr = "127.0.0.1" + addr;
        if (addr.startsWith("0.0.0.0")) addr = addr.replace("0.0.0.0", "127.0.0.1");
        const url = `http://${addr}`;
        // window.open stays inside the manager's edge-to-edge WebView, which draws
        // the panel under the status bar (issues #43/#44). Hand it to a browser
        // that applies its own insets, and fall back if there is none.
        const res = await exec(`am start -a android.intent.action.VIEW -d ${shq(url)}`);
        if (res.e !== 0) window.open(url, '_blank');
    });

    const tabButtons = Array.from(document.querySelectorAll('[data-tab]'));

    function activateTab(name, focus) {
        tabButtons.forEach(b => {
            const on = b.dataset.tab === name;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
            if (on && focus) b.focus();
        });
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.toggle('active', el.id === 'tab-' + name);
        });
        if (name === 'logs') loadLog();
        if (name === 'password') loadYamlUser();
    }

    tabButtons.forEach((b, i) => {
        b.onclick = () => activateTab(b.dataset.tab);
        b.onkeydown = (e) => {
            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const next = tabButtons[(i + step + tabButtons.length) % tabButtons.length];
            activateTab(next.dataset.tab, true);
        };
    });

    // Log rows are built from text nodes: the log contains DNS hostnames, which
    // are attacker-controlled, so the output must never be parsed as HTML.
    const LOG_TOKEN_RE =
        /(\d{4}[-/]\d{2}[-/]\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?)|(\[(?:info|debug|warn|warning|error|fatal)\])|(\u{1F7E2}|\u{1F534}|\u{1F9F9}|LOG)/giu;

    function tokenClass(m) {
        if (m[1]) return 'lg-ts';
        // Third alternative (status icon / LOG marker) leaves the level group unset.
        if (!m[2]) return 'lg-ico';
        const lvl = m[2].slice(1, -1).toLowerCase();
        if (lvl === 'info' || lvl === 'debug') return 'lg-info';
        if (lvl === 'warn' || lvl === 'warning') return 'lg-warn';
        return 'lg-error';
    }

    function renderLog(text) {
        const frag = document.createDocumentFragment();
        text.split('\n').forEach(line => {
            if (!line.trim()) return;
            const row = document.createElement('div');
            let last = 0, m;
            LOG_TOKEN_RE.lastIndex = 0;
            while ((m = LOG_TOKEN_RE.exec(line)) !== null) {
                if (m.index > last) row.appendChild(document.createTextNode(line.slice(last, m.index)));
                const span = document.createElement('span');
                span.className = tokenClass(m);
                span.textContent = m[0];
                row.appendChild(span);
                last = m.index + m[0].length;
            }
            if (last < line.length) row.appendChild(document.createTextNode(line.slice(last)));
            frag.appendChild(row);
        });
        elements.logContent.textContent = '';
        elements.logContent.appendChild(frag);
    }

    let logType = 'bin';
    let logText = '';
    let logState = 'waiting';

    const LOG_PLACEHOLDER = {
        waiting: 'logs.waiting',
        loading: 'toast.loading',
        empty: 'toast.no_logs'
    };

    function setLogPlaceholder(state) {
        logState = state;
        logText = '';
        elements.logContent.textContent = t(LOG_PLACEHOLDER[state]);
    }

    async function loadLog() {
        setLogPlaceholder('loading');
        const path = logType === 'bin' ? binLogPath : historyLogPath;
        const res = await exec(`tail -n 100 ${shq(path)}`, 30000);
        if (res.e === -2) { showToast(t("toast.exec_timeout")); setLogPlaceholder('empty'); return; }
        if (!res.s) { setLogPlaceholder('empty'); return; }
        logState = 'loaded';
        logText = res.s;
        renderLog(logText);
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

    $('btn-refresh-log').onclick = () => withBusy($('btn-refresh-log'), loadLog);

    $('btn-debug').onclick = () => withBusy($('btn-debug'), async () => {
        showToast(t("toast.generating"));
        const res = await exec(shq(scriptDebug), LONG_TIMEOUT);
        if (reportExec(res)) showToast(`${t("toast.generated")} ${debugLogPath}`);
    });

    $('btn-open-debug').onclick = () => withBusy($('btn-open-debug'), async () => {
        if ((await exec(`[ -f ${shq(debugLogPath)} ]`)).e !== 0) {
            showToast(t("toast.debug_missing"));
            return;
        }
        // /data/adb is not reachable through the external-storage documents
        // provider, so stage a copy where an external reader can actually get it.
        const shared = '/sdcard/Download/agh-debug.log';
        const staged = await exec(`cp -f ${shq(debugLogPath)} ${shq(shared)} 2>/dev/null`);
        const target = staged.e === 0 ? shared : debugLogPath;
        const res = await exec(`am start -a android.intent.action.VIEW -d ${shq('file://' + target)} -t ${shq('text/plain')}`);
        showToast(res.e === 0 ? t("toast.opening_file") : `${t("toast.cmd_failed")} ${res.e}`);
    });

    // ==================== 密码计算 (AdGuardHome.yaml · bcrypt) ====================

    const pwEl = {
        user: $('pw-user'),
        plain: $('pw-plain'),
        confirm: $('pw-confirm'),
        cost: $('pw-cost'),
        result: $('pw-result'),
        status: $('pw-status'),
        generate: $('btn-pw-generate'),
        clear: $('btn-pw-clear'),
        copy: $('btn-pw-copy'),
        apply: $('btn-pw-apply')
    };

    // bcrypt 哈希形如 $2b$12$<22 字符盐><31 字符摘要>
    const HASH_RE = /^\$2[abxy]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;
    let pwBusy = false;
    let pwApplyArmed = 0;

    function setPwStatus(msg) {
        pwEl.status.textContent = msg || '';
    }

    async function readYamlLines() {
        const res = await exec(`cat ${shq(yamlPath)}`, 30000);
        if (res.e !== 0 || !res.s) return null;
        return res.s.split('\n');
    }

    /** users 段的行号范围（左闭右开，不含 users: 自身与下一段的起始行） */
    function usersRange(lines) {
        let start = -1;
        for (let i = 0; i < lines.length; i++) {
            if (/^users:[ \t]*$/.test(lines[i])) { start = i + 1; break; }
        }
        if (start < 0) return null;

        let end = lines.length;
        for (let i = start; i < lines.length; i++) {
            if (/^[^\s#]/.test(lines[i])) { end = i; break; }
        }
        return { start: start, end: end };
    }

    /**
     * 列出 users 段中的所有用户
     * nameLine / pwLine 为 1 基行号；pwLine 为 -1 表示该条目没有 password 行
     */
    function listUsers(lines) {
        const range = usersRange(lines);
        if (!range) return [];

        const users = [];
        let entry = -1;
        for (let i = range.start; i <= range.end; i++) {
            const line = lines[i] || '';
            const isEntry = i < range.end && /^\s*-\s*name:/.test(line);
            if (!isEntry && i !== range.end) continue;

            if (entry >= 0) {
                const m = /^\s*-\s*name:\s*(.+?)\s*$/.exec(lines[entry]);
                if (m) {
                    let pwLine = -1;
                    for (let j = entry + 1; j < i; j++) {
                        if (/^\s*password:/.test(lines[j])) { pwLine = j + 1; break; }
                    }
                    users.push({
                        name: m[1].replace(/^["']|["']$/g, ''),
                        nameLine: entry + 1,
                        pwLine: pwLine
                    });
                }
            }
            entry = i;
        }
        return users;
    }

    /** 切入密码页时，用配置文件里的用户名预填输入框 */
    async function loadYamlUser() {
        if (pwEl.user.value) return;
        const lines = await readYamlLines();
        const users = lines ? listUsers(lines) : [];
        pwEl.user.value = users.length ? users[0].name : 'root';
    }

    async function generatePwHash() {
        if (pwBusy) return;
        if (!window.bcrypt) { showToast(t('toast.pw_no_lib')); return; }

        const plain = pwEl.plain.value;
        if (!plain) { showToast(t('toast.pw_empty')); return; }
        if (plain !== pwEl.confirm.value) { showToast(t('toast.pw_mismatch')); return; }

        const cost = parseInt(pwEl.cost.value, 10);
        if (!(cost >= window.bcrypt.MIN_COST && cost <= window.bcrypt.MAX_COST)) {
            showToast(`${t('toast.pw_cost')} ${window.bcrypt.MIN_COST}-${window.bcrypt.MAX_COST}`);
            return;
        }

        pwBusy = true;
        pwEl.generate.disabled = true;
        pwEl.result.value = '';
        setPwStatus(t('toast.pw_computing'));
        const started = Date.now();
        try {
            pwEl.result.value = await window.bcrypt.hash(plain, cost, (progress) => {
                setPwStatus(`${t('toast.pw_computing')} ${Math.round(progress * 100)}%`);
            });
            setPwStatus(`${t('toast.pw_done')} (${((Date.now() - started) / 1000).toFixed(2)}s)`);
            showToast(t('toast.pw_done'));
        } catch (err) {
            setPwStatus('');
            showToast(err && err.message === 'BCRYPT_PASSWORD_TOO_LONG'
                ? t('toast.pw_too_long')
                : t('toast.pw_fail'));
        } finally {
            pwBusy = false;
            pwEl.generate.disabled = false;
        }
    }

    async function copyPwHash() {
        const hash = pwEl.result.value;
        if (!hash) { showToast(t('toast.pw_empty')); return; }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(hash);
                showToast(t('toast.pw_copied'));
                return;
            }
        } catch (err) {
            // 剪贴板 API 不可用（非安全上下文）时回退到 execCommand
        }

        pwEl.result.focus();
        pwEl.result.setSelectionRange(0, hash.length);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        showToast(ok ? t('toast.pw_copied') : t('toast.pw_copy_fail'));
    }

    /** 把哈希写回 AdGuardHome.yaml 中该用户的 password 行 */
    async function applyPwHash() {
        const hash = pwEl.result.value.trim();
        const user = pwEl.user.value.trim();
        if (!HASH_RE.test(hash)) { showToast(t('toast.pw_empty')); return; }
        if (!user) { showToast(t('toast.pw_user')); return; }

        const lines = await readYamlLines();
        if (!lines) { showToast(t('toast.pw_yaml_read')); return; }

        const entry = listUsers(lines).find((u) => u.name === user);
        if (!entry) { showToast(t('toast.pw_user_missing')); return; }
        if (entry.pwLine < 0) { showToast(t('toast.pw_no_field')); return; }

        // 属于危险操作：5 秒内连续点击两次才会真正写入
        if (Date.now() - pwApplyArmed > 5000) {
            pwApplyArmed = Date.now();
            setPwStatus(t('toast.pw_confirm'));
            showToast(t('toast.pw_confirm'));
            return;
        }
        pwApplyArmed = 0;

        // 单引号包 sed 脚本：bcrypt 哈希里的 $ 在双引号里会被 shell 当变量展开，
        // 必须用单引号才能原样写入；哈希只含 ./A-Za-z0-9，不会破坏 sed 语法
        const indent = (/^\s*/.exec(lines[entry.pwLine - 1]) || [''])[0];
        const newLine = indent + 'password: ' + hash;

        await exec(`cp -f ${shq(yamlPath)} ${shq(yamlPath + '.bak')}`);
        const res = await exec(`sed -i ${shq(`${entry.pwLine}s|.*|${newLine}|`)} ${shq(yamlPath)}`);
        const written = res.e === 0
            ? (await exec(`sed -n ${shq(`${entry.pwLine}p`)} ${shq(yamlPath)}`)).s.trim()
            : '';

        if (written !== newLine.trim()) {
            setPwStatus('');
            showToast(t('toast.pw_apply_fail'));
            return;
        }
        setPwStatus(`${t('toast.pw_applied')} · ${t('toast.pw_restart')}`);
        showToast(t('toast.pw_applied'));
    }

    pwEl.generate.onclick = () => withBusy(pwEl.generate, generatePwHash);
    pwEl.copy.onclick = () => withBusy(pwEl.copy, copyPwHash);
    pwEl.apply.onclick = () => withBusy(pwEl.apply, applyPwHash);
    pwEl.clear.onclick = () => {
        pwEl.plain.value = '';
        pwEl.confirm.value = '';
        pwEl.result.value = '';
        pwEl.cost.value = window.bcrypt ? window.bcrypt.DEFAULT_COST : 12;
        pwApplyArmed = 0;
        setPwStatus('');
    };

    document.addEventListener("languageChanged", () => {
        if (currentStatus === "running" || currentStatus === "stopped") {
            elements.statusText.textContent = t(`status.${currentStatus}`);
        }

        // Re-translate the placeholder without throwing away loaded log lines.
        if (logState === 'loaded') renderLog(logText);
        else setLogPlaceholder(logState);
    });

    // Translations arrive asynchronously, so the placeholder is filled in by the
    // languageChanged handler rather than here; the markup carries the fallback.
    if (It) {
        refresh();
        setInterval(refresh, 5000);
    } else {
        currentStatus = "unavailable";
        elements.statusText.textContent = t("toast.open_manager");
        // Without a manager bridge these cannot run. Tabs, the log panel and the
        // local-only password hash stay usable so the page is still testable.
        ['btn-start', 'btn-stop', 'btn-save', 'btn-debug', 'btn-open-debug', 'btn-pw-apply']
            .forEach(id => { const el = $(id); if (el) el.disabled = true; });
    }
})();
