/**
 * AdGuardHome for Root - WebUI Application
 * 内嵌中英文翻译，支持切换
 */

// ==================== 语言数据（内嵌） ====================
var langData = {
  zh: {
    // 状态
    running: '运行中',
    stopped: '已停止',
    loading: '加载中...',
    noapi: '无 API',
    // 统计卡片
    stats_title: '查询日志统计',
    stat_queries: 'DNS查询',
    stat_blocked: '规则拦截',
    stat_time: '处理耗时',
    // 按钮
    btn_start: '启动',
    btn_stop: '停止',
    btn_restart: '重启',
    btn_debug: '调试信息',
    btn_save: '保存设置',
    btn_webpanel: 'AdGuardHome 网页管理面板',
    // 设置页面
    settings_title: '设置',
    iptables_title: '启用 iptables',
    iptables_desc: '通过 iptables 重定向 DNS 请求',
    ipv6_title: '阻止 IPv6 DNS',
    ipv6_desc: '阻止 IPv6 的 DNS 请求',
    redir_port: '重定向端口（必须与 AdGuardHome DNS 端口一致）',
    run_user: '运行用户',
    run_group: '运行用户组',
    bypass_dest: '绕过目标（空格分隔）',
    bypass_src: '绕过来源（空格分隔）',
    // Toast 消息
    save_ok: '设置已保存成功',
    save_fail: '保存设置失败',
    start_ok: '启动成功',
    stop_ok: '停止成功',
    restart_ok: '重启成功',
    start_fail: '启动失败',
    stop_fail: '停止失败',
    restart_fail: '重启失败',
    debug_ok: '调试信息已收集至 /data/adb/agh/debug.log',
    // 日志
    log_empty: '暂无日志',
    // 页脚
    mit: 'MIT 协议',
    // 标签栏
    tab_main: '主页',
    tab_settings: '设置',
    // 帮助弹窗
    help_title: '指标说明',
    help_dns: 'DNS查询',
    help_dns_desc: 'AdGuard Home 核心处理的 DNS 查询总数。',
    help_blocked: '规则拦截',
    help_blocked_desc: '被过滤规则拦截的 DNS 请求数量。',
    help_time: '处理耗时',
    help_time_desc: '处理每个 DNS 请求的平均耗时（秒）。',
    help_note: '数据通过 AdGuard Home OpenAPI 实时获取，统计周期由核心配置决定。',
    help_close: '关闭',
    // 语言切换
    language_title: '语言',
    language_desc: '选择界面显示语言',
    // 认证
    auth_hint: '认证失败，请输入 AdGuardHome Web UI 账号密码',
    username: '用户名',
    password: '密码',
    confirm: '确认'
  },
  en: {
    running: 'Running',
    stopped: 'Stopped',
    loading: 'Loading...',
    noapi: 'No API',
    stats_title: 'Query Log Statistics',
    stat_queries: 'DNS queries',
    stat_blocked: 'Blocked',
    stat_time: 'Avg time',
    btn_start: 'Start',
    btn_stop: 'Stop',
    btn_restart: 'Restart',
    btn_debug: 'Debug Info',
    btn_save: 'Save Settings',
    btn_webpanel: 'AdGuardHome Web Panel',
    settings_title: 'Settings',
    iptables_title: 'Enable Iptables',
    iptables_desc: 'Redirect DNS requests via iptables',
    ipv6_title: 'Block IPv6 DNS',
    ipv6_desc: 'Block DNS requests over IPv6',
    redir_port: 'Redirect Port (must match AdGuardHome DNS port)',
    run_user: 'Run User',
    run_group: 'Run User Group',
    bypass_dest: 'Bypass Destinations (space-separated)',
    bypass_src: 'Bypass Sources (space-separated)',
    save_ok: 'Settings saved successfully',
    save_fail: 'Failed to save settings',
    start_ok: 'Start successful',
    stop_ok: 'Stop successful',
    restart_ok: 'Restart successful',
    start_fail: 'Start failed',
    stop_fail: 'Stop failed',
    restart_fail: 'Restart failed',
    debug_ok: 'Debug info collected to /data/adb/agh/debug.log',
    log_empty: 'No log entries',
    mit: 'MIT License',
    tab_main: 'Main',
    tab_settings: 'Settings',
    help_title: 'Statistics Help',
    help_dns: 'DNS Queries',
    help_dns_desc: 'Total number of DNS queries processed by AdGuard Home.',
    help_blocked: 'Blocked',
    help_blocked_desc: 'Number of DNS requests blocked by filtering rules.',
    help_time: 'Processing Time',
    help_time_desc: 'Average processing time per DNS request (seconds).',
    help_note: 'Data is obtained via AdGuard Home OpenAPI, and the statistical period is determined by the core configuration.',
    help_close: 'Close',
    language_title: 'Language',
    language_desc: 'Select interface language',
    auth_hint: 'Authentication failed, please enter AdGuardHome Web UI credentials',
    username: 'Username',
    password: 'Password',
    confirm: 'Confirm'
  }
};

var curLang = localStorage.getItem('agh_lang') || 'zh';

// ==================== Module API Layer ====================
var ModuleAPI = {
  _api: null,

  init: function() {
    if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
      this._api = ksu;
    } else if (typeof ap !== 'undefined' && typeof ap.exec === 'function') {
      this._api = ap;
    }
  },

  isAvailable: function() {
    return this._api !== null;
  },

  exec: function(command) {
    if (!this._api) {
      return { errno: -1, stdout: '' };
    }
    try {
      var result = this._api.exec(command);
      return {
        errno: 0,
        stdout: (result || '').replace(/\r/g, '')
      };
    } catch (e) {
      return { errno: -1, stdout: '' };
    }
  },

  toast: function(msg) {
    if (this._api && typeof this._api.toast === 'function') {
      try { this._api.toast(msg); } catch (e) {}
    }
  }
};

ModuleAPI.init();

// ==================== Utility Functions ====================
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3000;
  var container = document.getElementById('toastContainer');
  var toastEl = document.createElement('div');
  toastEl.className = 'toast ' + type;
  toastEl.textContent = message;
  container.appendChild(toastEl);
  setTimeout(function() {
    toastEl.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function() { toastEl.remove(); }, 300);
  }, duration);
}

function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// ==================== Paths ====================
var AGH_DIR = '/data/adb/agh';
var CONF_FILE = AGH_DIR + '/settings.conf';
var PID_FILE = AGH_DIR + '/bin/agh.pid';
var LOG_FILE = AGH_DIR + '/history.log';
var SCRIPT_DIR = AGH_DIR + '/scripts';
var BIN_DIR = AGH_DIR + '/bin';
var MODULE_PROP = '/data/adb/modules/AdGuardHome/module.prop';

// ==================== State ====================
var currentSettings = {};
var settingsChanged = false;
var isRunning = false;
var webPort = '3000';
var webUser = 'root';
var webPassword = 'root';
var statsFailCount = 0;
var statsAuthVisible = false;

// ==================== Tab / Page Switching ====================
var currentPage = 0;
var pageCount = 2;

function switchTab(index) {
  if (index < 0 || index >= pageCount) return;
  currentPage = index;

  var container = document.getElementById('pagesContainer');
  container.classList.remove('no-transition');
  container.style.transform = 'translateX(' + (-index * 50) + '%)';

  var tabs = document.querySelectorAll('.floating-tab-item');
  for (var i = 0; i < tabs.length; i++) {
    if (i === index) {
      tabs[i].classList.add('active');
    } else {
      tabs[i].classList.remove('active');
    }
  }

  var floatingTab = document.getElementById('floatingTab');
  if (floatingTab) {
    floatingTab.classList.remove('tab-hidden');
  }
}

// ==================== Touch Swipe Support ====================
(function() {
  var startX = 0;
  var startY = 0;
  var deltaX = 0;
  var swiping = false;
  var container = null;

  function getContainer() {
    if (!container) {
      container = document.getElementById('pagesContainer');
    }
    return container;
  }

  function onTouchStart(e) {
    var tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    deltaX = 0;
    swiping = false;
  }

  function onTouchMove(e) {
    if (!startX && !startY) return;

    var dx = e.touches[0].clientX - startX;
    var dy = e.touches[0].clientY - startY;

    if (!swiping) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        swiping = true;
        getContainer().classList.add('no-transition');
      } else {
        return;
      }
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
    }

    deltaX = dx;

    var pageWidth = window.innerWidth;
    var baseOffset = -currentPage * pageWidth;
    var offset = baseOffset + deltaX;

    var minOffset = -(pageCount - 1) * pageWidth;
    if (offset > 0) offset = offset * 0.3;
    if (offset < minOffset) offset = minOffset + (offset - minOffset) * 0.3;

    getContainer().style.transform = 'translateX(' + offset + 'px)';
  }

  function onTouchEnd(e) {
    if (!swiping) return;
    swiping = false;

    var threshold = window.innerWidth * 0.2;

    if (deltaX < -threshold && currentPage < pageCount - 1) {
      switchTab(currentPage + 1);
    } else if (deltaX > threshold && currentPage > 0) {
      switchTab(currentPage - 1);
    } else {
      switchTab(currentPage);
    }

    deltaX = 0;
  }

  document.addEventListener('DOMContentLoaded', function() {
    var c = getContainer();
    if (c) {
      c.addEventListener('touchstart', onTouchStart, { passive: true });
      c.addEventListener('touchmove', onTouchMove, { passive: false });
      c.addEventListener('touchend', onTouchEnd, { passive: true });
    }
  });
})();

// ==================== 应用语言（更新所有带 data-i18n 的元素） ====================
function applyLanguage() {
  var l = langData[curLang];
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    if (l[key] !== undefined) {
      el.innerText = l[key];
    }
  });
  // 更新状态栏文字（特殊处理，因为状态动态变化）
  var statusEl = document.getElementById('statusText');
  if (statusEl) {
    var isRunningNow = document.getElementById('statusBadge').classList.contains('running');
    statusEl.innerText = isRunningNow ? l.running : l.stopped;
  }
  // 高亮当前语言按钮
  document.querySelectorAll('.lang-option-btn').forEach(function(btn) {
    if (btn.dataset.lang === curLang) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

// ==================== Status Check ====================
function checkStatus() {
  var badge = document.getElementById('statusBadge');
  var statusText = document.getElementById('statusText');
  var pidBadge = document.getElementById('pidBadge');

  var running = false;
  var pid = '-';

  var pidResult = ModuleAPI.exec('cat ' + PID_FILE + ' 2>/dev/null');
  pid = pidResult.stdout.trim();

  if (pid && /^\d+$/.test(pid)) {
    running = true;
  } else {
    pid = '-';
  }

  isRunning = running;
  badge.className = 'status-badge ' + (running ? 'running' : 'stopped');
  statusText.textContent = running ? langData[curLang].running : langData[curLang].stopped;

  pidBadge.textContent = 'PID: ' + pid;

  document.getElementById('btnStart').disabled = running;
  document.getElementById('btnStop').disabled = !running;
  document.getElementById('btnRestart').disabled = !running;
}

// ==================== Load Settings ====================
function getConf(key) {
  var r = ModuleAPI.exec('grep "^' + key + '=" ' + CONF_FILE + ' 2>/dev/null | cut -d= -f2');
  return (r.stdout || '').replace(/\r/g, '').trim();
}

function getConfQuoted(key) {
  return getConf(key).replace(/^"|"$/g, '');
}

function loadSettings() {
  var settings = {};
  settings.enable_iptables = getConf('enable_iptables');
  settings.block_ipv6_dns = getConf('block_ipv6_dns');
  settings.redir_port = getConf('redir_port') || '5591';
  settings.adg_user = getConf('adg_user') || 'root';
  settings.adg_group = getConf('adg_group') || 'net_raw';
  settings.ignore_dest_list = getConfQuoted('ignore_dest_list');
  settings.ignore_src_list = getConfQuoted('ignore_src_list');

  currentSettings = settings;
  applySettingsToUI(settings);
}

function applySettingsToUI(settings) {
  document.getElementById('setEnableIptables').checked = (settings.enable_iptables === 'true');
  document.getElementById('setBlockIpv6').checked = (settings.block_ipv6_dns === 'true');
  document.getElementById('setRedirPort').value = settings.redir_port || '5591';
  document.getElementById('setAdgUser').value = settings.adg_user || 'root';
  document.getElementById('setAdgGroup').value = settings.adg_group || 'net_raw';
  document.getElementById('setIgnoreDest').value = settings.ignore_dest_list || '';
  document.getElementById('setIgnoreSrc').value = settings.ignore_src_list || '';

  settingsChanged = false;
  document.getElementById('btnSaveSettings').disabled = true;
}

function onSettingChange() {
  settingsChanged = true;
  document.getElementById('btnSaveSettings').disabled = false;
}

// ==================== Save Settings ====================
function saveSettings() {
  showLoading(true);

  var enableIptables = document.getElementById('setEnableIptables').checked;
  var blockIpv6 = document.getElementById('setBlockIpv6').checked;
  var redirPort = document.getElementById('setRedirPort').value || '5591';
  var adgUser = document.getElementById('setAdgUser').value || 'root';
  var adgGroup = document.getElementById('setAdgGroup').value || 'net_raw';
  var ignoreDest = document.getElementById('setIgnoreDest').value || '';
  var ignoreSrc = document.getElementById('setIgnoreSrc').value || '';

  var cmd =
    "sed -i 's#^enable_iptables=.*#enable_iptables=" + enableIptables + "#' " + CONF_FILE +
    " && sed -i 's#^block_ipv6_dns=.*#block_ipv6_dns=" + blockIpv6 + "#' " + CONF_FILE +
    " && sed -i 's#^redir_port=.*#redir_port=" + redirPort + "#' " + CONF_FILE +
    " && sed -i 's#^adg_user=.*#adg_user=" + adgUser + "#' " + CONF_FILE +
    " && sed -i 's#^adg_group=.*#adg_group=" + adgGroup + "#' " + CONF_FILE +
    " && sed -i 's#^ignore_dest_list=.*#ignore_dest_list=\"" + ignoreDest + "\"#' " + CONF_FILE +
    " && sed -i 's#^ignore_src_list=.*#ignore_src_list=\"" + ignoreSrc + "\"#' " + CONF_FILE;

  var result = ModuleAPI.exec(cmd);

  if (result.errno === 0) {
    settingsChanged = false;
    document.getElementById('btnSaveSettings').disabled = true;
    showToast(langData[curLang].save_ok, 'success');
  } else {
    showToast(langData[curLang].save_fail, 'error');
  }

  showLoading(false);
}

// ==================== Log Viewer ====================
function loadLog() {
  if (!ModuleAPI.isAvailable()) return;
  var result = ModuleAPI.exec("awk '{a[NR]=$0}END{for(i=(NR>5?NR-4:1);i<=NR;i++)printf \"%s::NL::\",a[i]}' " + LOG_FILE + " 2>/dev/null");
  var logViewer = document.getElementById('logViewer');
  if (logViewer) {
    var raw = (result.stdout || '').trim();
    var lines = raw.split('::NL::').filter(function(l) { return l !== ''; });
    var content = lines.join('\n');
    logViewer.textContent = content || langData[curLang].log_empty;
    logViewer.scrollTop = logViewer.scrollHeight;
  }
}

// ==================== Stats Help Modal ====================
function toggleStatsHelp() {
  var overlay = document.getElementById('statsHelpOverlay');
  if (overlay) {
    overlay.classList.add('visible');
  }
}

function closeStatsHelp() {
  var overlay = document.getElementById('statsHelpOverlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }
}

// ==================== Stats View Switching ====================
function showStatsDataView() {
  statsAuthVisible = false;
  var dataView = document.getElementById('statsDataView');
  var authView = document.getElementById('statsAuthView');
  if (dataView) dataView.style.display = '';
  if (authView) authView.style.display = 'none';
}

function showStatsAuthView() {
  statsAuthVisible = true;
  var dataView = document.getElementById('statsDataView');
  var authView = document.getElementById('statsAuthView');
  if (dataView) dataView.style.display = 'none';
  if (authView) authView.style.display = '';
}

function submitCredentials() {
  var userEl = document.getElementById('authUser');
  var passEl = document.getElementById('authPassword');
  if (userEl) webUser = userEl.value || 'root';
  if (passEl) webPassword = passEl.value || 'root';
  statsFailCount = 0;
  showStatsDataView();
  loadStats();
}

// ==================== Query Log Statistics ====================
function loadStats() {
  if (!ModuleAPI.isAvailable()) return;
  if (!isRunning) return;
  if (webPort === '-') return;
  if (statsAuthVisible) return;

  var url = 'http://127.0.0.1:' + webPort + '/control/stats';
  var auth = webUser + ':' + webPassword;
  var cmd = 'wget -qO- --user=' + webUser + ' --password=' + webPassword + ' ' + url + ' 2>/dev/null || curl -s -u ' + auth + ' ' + url + ' 2>/dev/null';

  var result = ModuleAPI.exec(cmd);
  var raw = (result.stdout || '').trim();

  var queriesEl = document.getElementById('statQueries');
  var blockedEl = document.getElementById('statBlocked');
  var timeEl = document.getElementById('statTime');

  if (!raw || raw.charAt(0) !== '{') {
    statsFailCount++;
    if (queriesEl) queriesEl.textContent = '-';
    if (blockedEl) blockedEl.textContent = '-';
    if (timeEl) timeEl.textContent = '-';
    if (statsFailCount >= 2) {
      showStatsAuthView();
    }
    return;
  }

  try {
    var stats = JSON.parse(raw);

    if (queriesEl) queriesEl.textContent = (typeof stats.num_dns_queries === 'number') ? stats.num_dns_queries : '-';
    if (blockedEl) blockedEl.textContent = (typeof stats.num_blocked_filtering === 'number') ? stats.num_blocked_filtering : '-';
    if (timeEl) timeEl.textContent = (typeof stats.avg_processing_time === 'number') ? stats.avg_processing_time.toFixed(2) + 's' : '-';
    statsFailCount = 0;
  } catch (e) {
    statsFailCount++;
    if (queriesEl) queriesEl.textContent = '-';
    if (blockedEl) blockedEl.textContent = '-';
    if (timeEl) timeEl.textContent = '-';
    if (statsFailCount >= 2) {
      showStatsAuthView();
    }
  }
}

// ==================== Control ====================
function controlAdGuard(action) {
  showLoading(true);

  var cmd;
  switch (action) {
    case 'start':
      cmd = SCRIPT_DIR + '/tool.sh start';
      break;
    case 'stop':
      cmd = SCRIPT_DIR + '/tool.sh stop';
      break;
    case 'restart':
      cmd = SCRIPT_DIR + '/tool.sh stop; sleep 1; ' + SCRIPT_DIR + '/tool.sh start';
      break;
    default:
      showLoading(false);
      return;
  }

  var result = ModuleAPI.exec(cmd);

  if (result.errno === 0) {
    var okKey = action + '_ok';
    showToast(langData[curLang][okKey], 'success');
  } else {
    var failKey = action + '_fail';
    showToast(langData[curLang][failKey], 'error');
  }

  setTimeout(function() {
    checkStatus();
    loadLog();
    showLoading(false);
  }, 2000);
}

// ==================== Open AdGuardHome ====================
function openAdGuardHome() {
  var url = (webPort !== '-') ? ('http://127.0.0.1:' + webPort) : 'http://127.0.0.1:3000';
  window.open(url, '_blank');
}

// ==================== Debug Info ====================
function collectDebugInfo() {
  showLoading(true);
  ModuleAPI.exec(SCRIPT_DIR + '/debug.sh 2>/dev/null');
  showToast(langData[curLang].debug_ok, 'success');
  showLoading(false);
}

// ==================== Load Web Port ====================
function loadWebPort() {
  var result = ModuleAPI.exec("grep 'address:' " + BIN_DIR + "/AdGuardHome.yaml 2>/dev/null | head -1");
  var line = result.stdout.trim();
  var match = line.match(/address:\s*\S+:(\d+)/);
  if (match && match[1]) {
    webPort = match[1];
  } else {
    webPort = '3000';
  }
}

// ==================== Load Version ====================
function loadVersion() {
  var result = ModuleAPI.exec('grep "^version=" ' + MODULE_PROP + ' 2>/dev/null | cut -d= -f2');
  var version = result.stdout.trim();
  if (version) {
    document.getElementById('versionText').textContent = 'v' + version;
  }
}

// ==================== Scroll Hide Floating Tab ====================
function setupScrollHideTab() {
  var pages = document.querySelectorAll('.page');
  var floatingTab = document.getElementById('floatingTab');
  if (!floatingTab) return;

  for (var i = 0; i < pages.length; i++) {
    (function(page) {
      page.addEventListener('scroll', function() {
        var atTop = page.scrollTop <= 2;
        var atBottom = page.scrollTop + page.clientHeight >= page.scrollHeight - 2;

        if (atTop || atBottom) {
          floatingTab.classList.remove('tab-hidden');
        } else {
          floatingTab.classList.add('tab-hidden');
        }
      });
    })(pages[i]);
  }
}

// ==================== Initialize ====================
function init() {
  if (!ModuleAPI.isAvailable()) {
    document.getElementById('noApiWarning').style.display = 'block';
    document.getElementById('statusBadge').className = 'status-badge stopped';
    document.getElementById('statusText').textContent = langData[curLang].noapi;
    return;
  }

  loadSettings();
  checkStatus();
  loadWebPort();
  loadVersion();
  loadLog();
  loadStats();
  setupScrollHideTab();

  // 绑定语言切换按钮
  document.querySelectorAll('.lang-option-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      curLang = this.dataset.lang;
      localStorage.setItem('agh_lang', curLang);
      applyLanguage();
      checkStatus(); // 刷新状态文本
    });
  });
  applyLanguage();

  switchTab(0);
}

// Auto-refresh every 5 seconds
setInterval(function() {
  if (ModuleAPI.isAvailable()) {
    checkStatus();
    loadLog();
    loadStats();
  }
}, 5000);

// Start
document.addEventListener('DOMContentLoaded', init);