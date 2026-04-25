// AdGuardHome for Root - i18n 多语言翻译
//
// 想加新语言的话：随便复制一个语言块（en 或 zh 都行），把语言代码改了，
// 然后 value 翻译一遍就行。键名别动。翻译完了记得去 detectLang() 加个检测。
//
// 用法就三个：
//   t('key')                  拿翻译文本
//   t('key', {name: 'xxx'})   替换占位符，文本里写 {name}
//   applyLocale()             一键翻译整个页面里带 [data-i18n] 的元素

'use strict';

var LANG = 'en';

var I18N = {

  // English（默认，兜底用的）
  en: {
    api_warn_title:      'Module API Unavailable',
    api_warn_desc:       'Please open this page via KernelSU or APatch module manager',
    stats_title:         'Query Statistics',
    stat_queries:        'DNS Queries',
    stat_blocked:        'Blocked',
    stat_time:           'Avg Time',
    auth_hint:           'Authentication failed, please enter credentials',
    label_username:      'Username',
    label_password:      'Password',
    btn_login:           'Confirm Login',
    open_panel:          'AdGuardHome Web Panel',
    control_title:       'Service Control',
    btn_start:           'Start',
    btn_stop:            'Stop',
    btn_restart:         'Restart',
    btn_debug:           'Debug',
    settings_title:      'Module Settings',
    redirect_title:      'Network Redirect',
    set_iptables:        'Enable Iptables',
    set_iptables_desc:   'Redirect DNS requests via iptables',
    set_block_ipv6:      'Block IPv6 DNS',
    set_block_ipv6_desc: 'Block DNS requests over IPv6',
    advanced_title:      'Advanced',
    label_redir_port:    'Redirect Port',
    label_run_user:      'Run User',
    label_run_group:     'Run Group',
    label_ignore_dest:   'Bypass Destinations (space-separated)',
    label_ignore_src:    'Bypass Sources (space-separated)',
    btn_save:            'Save Settings',
    tab_home:            'Home',
    tab_control:         'Control',
    tab_log:             'Logs',
    tab_settings:        'Settings',
    log_title:           'Run Logs',
    modal_stats_title:   'Metrics',
    modal_dns_queries:   'DNS Queries',
    modal_dns_desc:      'Total DNS queries processed by AdGuardHome',
    modal_blocked:       'Blocked',
    modal_blocked_desc:  'DNS requests blocked by filtering rules',
    modal_avg_time:      'Avg Processing Time',
    modal_avg_desc:      'Average time per DNS request (seconds)',
    modal_note:          'Data fetched via AdGuardHome OpenAPI in real-time',
    btn_close:           'Close',
    status_running:      'Running',
    status_stopped:      'Stopped',
    status_noapi:        'No API',
    chart_title:         'Query Trend',
    top_title:           'Top Rankings',
    top_queried:         'Top Queried',
    top_blocked:         'Top Blocked',
    top_clients:         'Top Clients',
    filter_title:        'Filter Rules',
    protection_title:    'Protection',
    tools_title:         'Maintenance',
    btn_clear_cache:     'Clear Cache',
    btn_reset_stats:     'Reset Stats',
    btn_prot_on:         'Enable Protection',
    btn_prot_off:        'Pause Protection',
    btn_prot_off30:      'Pause 30s',
    log_module:          'Module Log',
    log_query:           'Query Log',
    log_bin:             'Core Log',
    log_empty:           'No log entries',
    toast_saved:         'Settings saved',
    toast_save_fail:     'Failed to save settings',
    toast_start_ok:      'Start successful',
    toast_stop_ok:       'Stop successful',
    toast_restart_ok:    'Restart successful',
    toast_action_fail:   'Action failed',
    toast_debug:         'Debug info saved to debug.log',
    btn_clear_log:       'Clear Log',
    toast_log_cleared:   'Log cleared',
    prot_on:             'Protection On',
    prot_off:            'Protection Paused',
    toast_prot_on:       'Protection enabled',
    toast_prot_off:      'Protection paused',
    toast_cache_cleared: 'Cache cleared',
    toast_stats_reset:   'Stats reset'
  },

  // 简体中文
  zh: {
    api_warn_title:      'Module API 不可用',
    api_warn_desc:       '请通过 KernelSU 或 APatch 模块管理器打开此页面',
    stats_title:         '查询统计',
    stat_queries:        'DNS 查询',
    stat_blocked:        '规则拦截',
    stat_time:           '平均耗时',
    auth_hint:           '认证失败，请输入账号密码',
    label_username:      '用户名',
    label_password:      '密码',
    btn_login:           '确认登录',
    open_panel:          'AdGuardHome Web 面板',
    control_title:       '服务控制',
    btn_start:           '启动',
    btn_stop:            '停止',
    btn_restart:         '重启',
    btn_debug:           '调试',
    settings_title:      '模块设置',
    redirect_title:      '网络重定向',
    set_iptables:        '启用 Iptables',
    set_iptables_desc:   '通过 iptables 重定向 DNS 请求',
    set_block_ipv6:      '屏蔽 IPv6 DNS',
    set_block_ipv6_desc: '阻止 IPv6 上的 DNS 请求',
    advanced_title:      '高级参数',
    label_redir_port:    '重定向端口',
    label_run_user:      '运行用户',
    label_run_group:     '运行用户组',
    label_ignore_dest:   '绕过目标地址 (空格分隔)',
    label_ignore_src:    '绕过来源地址 (空格分隔)',
    btn_save:            '保存设置',
    tab_home:            '主页',
    tab_control:         '控制',
    tab_log:             '日志',
    tab_settings:        '设置',
    log_title:           '运行日志',
    modal_stats_title:   '指标说明',
    modal_dns_queries:   'DNS 查询',
    modal_dns_desc:      'AdGuardHome 核心处理的 DNS 查询总数',
    modal_blocked:       '规则拦截',
    modal_blocked_desc:  '被过滤规则拦截的 DNS 请求数量',
    modal_avg_time:      '平均耗时',
    modal_avg_desc:      '处理每个 DNS 请求的平均耗时（秒）',
    modal_note:          '数据通过 AdGuardHome OpenAPI 实时获取',
    btn_close:           '关闭',
    status_running:      '运行中',
    status_stopped:      '已停止',
    status_noapi:        '无 API',
    chart_title:         '查询趋势',
    top_title:           '热门排行',
    top_queried:         '热门查询',
    top_blocked:         '热门拦截',
    top_clients:         '活跃客户端',
    filter_title:        '过滤规则',
    protection_title:    '保护控制',
    tools_title:         '维护工具',
    btn_clear_cache:     '清除缓存',
    btn_reset_stats:     '重置统计',
    btn_prot_on:         '启用保护',
    btn_prot_off:        '暂停保护',
    btn_prot_off30:      '暂停30秒',
    log_module:          '模块日志',
    log_query:           '查询日志',
    log_bin:             '核心日志',
    log_empty:           '暂无日志',
    toast_saved:         '设置已保存',
    toast_save_fail:     '保存设置失败',
    toast_start_ok:      '启动成功',
    toast_stop_ok:       '停止成功',
    toast_restart_ok:    '重启成功',
    toast_action_fail:   '操作失败',
    toast_debug:         '调试信息已保存至 debug.log',
    btn_clear_log:       '清理日志',
    toast_log_cleared:   '日志已清理',
    prot_on:             '保护已启用',
    prot_off:            '保护已暂停',
    toast_prot_on:       '保护已启用',
    toast_prot_off:      '保护已暂停',
    toast_cache_cleared: '缓存已清除',
    toast_stats_reset:   '统计已重置'
  },
};

// 自动检测系统语言。加了新语言的话在这里补一行 if 就行
// 比如日语：if (n.indexOf('ja') === 0) return 'ja';
function detectLang() {
  var n = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (n.indexOf('zh') === 0) return 'zh';
  // if (n.indexOf('ja') === 0) return 'ja';
  return 'en';
}

function t(k, r) {
  var d = I18N[LANG] || I18N.en;
  var v = d[k] || I18N.en[k] || k;
  if (r) for (var x in r) v = v.replace('{' + x + '}', r[x]);
  return v;
}

function applyLocale() {
  LANG = detectLang();
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
  var e = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < e.length; i++) e[i].textContent = t(e[i].getAttribute('data-i18n'));
}