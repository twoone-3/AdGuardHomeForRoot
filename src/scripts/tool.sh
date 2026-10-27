. /data/adb/agh/settings.conf
. /data/adb/agh/scripts/base.sh

# An upgrade keeps the user's existing settings.conf, so a key added to that
# file after the user installed is simply missing here and arrives empty.
startup_timeout="${startup_timeout:-120}"

move_to_system_cgroup() {
  echo $$ > /sys/fs/cgroup/cgroup.procs 2>/dev/null
  [ -f /dev/memcg/system/cgroup.procs ] && echo $$ > /dev/memcg/system/cgroup.procs 2>/dev/null
  [ -f /dev/cpuctl/system/cgroup.procs ] && echo $$ > /dev/cpuctl/system/cgroup.procs 2>/dev/null
  [ -f /dev/cpuset/system-background/cgroup.procs ] && echo $$ > /dev/cpuset/system-background/cgroup.procs 2>/dev/null
  [ -f /dev/blkio/cgroup.procs ] && echo $$ > /dev/blkio/cgroup.procs 2>/dev/null
}

move_to_system_cgroup

# A PID alone proves nothing: PIDs are recycled, and a stale agh.pid can point
# at any process on the device -- killing system_server reboots the phone.
is_agh_pid() {
  local pid="$1" comm state_line
  [ -n "$pid" ] && [ -r "/proc/$pid/stat" ] || return 1
  read -r comm <"/proc/$pid/comm" 2>/dev/null || return 1
  [ "$comm" = "AdGuardHome" ] || return 1
  # A zombie keeps its comm but can neither serve DNS nor be signalled.
  read -r state_line <"/proc/$pid/stat" 2>/dev/null || return 1
  state_line="${state_line##*) }"
  [ "${state_line%% *}" != "Z" ]
}

# Scan /proc instead of ps: in a root manager shell the available ps is Toybox,
# which only lists the current session and misses a surviving daemon.
find_agh_pid() {
  local p
  for p in /proc/[0-9]*; do
    if is_agh_pid "${p#/proc/}"; then
      echo "${p#/proc/}"
      return 0
    fi
  done
  return 1
}

# Print every live AdGuardHome PID, one per line.
find_agh_pids() {
  local p
  for p in /proc/[0-9]*; do
    is_agh_pid "${p#/proc/}" && echo "${p#/proc/}"
  done
}

# Remove the PID file only while it still points at the instance this run started.
clear_pid_file() {
  if [ "$(cat "$PID_FILE" 2>/dev/null)" = "$adg_pid" ]; then
    rm -f "$PID_FILE"
  fi
}

# Wait up to $2 seconds for PID $1 to exec the AdGuardHome binary.
wait_for_agh_pid() {
  local pid="$1" limit="${2:-10}" waited=0
  while [ "$waited" -lt "$limit" ]; do
    is_agh_pid "$pid" && return 0
    kill -0 "$pid" 2>/dev/null || return 1
    sleep 1
    waited=$((waited + 1))
  done
  is_agh_pid "$pid"
}

# Whether AdGuardHome is actually accepting DNS queries on $redir_port.
# Parses /proc/net/udp{,6} directly so it works without netstat/ss.
is_dns_listening() {
  local port_hex f
  port_hex=$(printf '%04X' "$redir_port")
  for f in /proc/net/udp /proc/net/udp6; do
    [ -r "$f" ] || continue
    awk -v pat=":$port_hex\$" 'NR > 1 && $2 ~ pat { found = 1 } END { exit !found }' "$f" && return 0
  done
  return 1
}

# Wait for the DNS listener before touching port 53: redirecting it earlier
# blackholes every query and Android flags the network as "no internet".
# Returns 0 = up, 1 = process died, 2 = timeout. The liveness check comes first:
# an old instance still holding the port must not look like our own success.
wait_for_dns_ready() {
  local waited=0
  while [ "$waited" -lt "$startup_timeout" ]; do
    is_agh_pid "$adg_pid" || return 1
    is_dns_listening && return 0
    sleep 1
    waited=$((waited + 1))
  done
  return 2
}

start_adguardhome() {
  local existing_pid ready_rc

  # check if AdGuardHome is already running
  if [ -f "$PID_FILE" ] && is_agh_pid "$(cat "$PID_FILE" 2>/dev/null)"; then
    log "AdGuardHome is already running" "AdGuardHome 已经在运行"
    exit 0
  fi

  # A soft reboot re-runs this without killing the daemon, so adopt it instead
  # of starting a second instance that would die on the busy port.
  existing_pid=$(find_agh_pid)
  if is_agh_pid "$existing_pid"; then
    echo "$existing_pid" >"$PID_FILE"
    log "AdGuardHome is already running [PID: $existing_pid]" "AdGuardHome 已经在运行 [PID: $existing_pid]"
    exit 0
  fi

  # Drop the stale PID; the new one is written only once the process is confirmed.
  rm -f "$PID_FILE"

  # to fix https://github.com/AdguardTeam/AdGuardHome/issues/7002
  export SSL_CERT_DIR="/system/etc/security/cacerts/"
  # set timezone
  export TZ="$timezone"

  # backup old log and overwrite new log
  if [ -f "$AGH_DIR/bin.log" ]; then
    mv "$AGH_DIR/bin.log" "$AGH_DIR/bin.log.bak"
  fi

  # run binary
  busybox setuidgid "$adg_user:$adg_group" "$BIN_DIR/AdGuardHome" >"$AGH_DIR/bin.log" 2>&1 &
  adg_pid=$!

  # A launch that loses the port race dies within milliseconds, so wait for a
  # real AdGuardHome instead of trusting the freshly forked PID.
  if ! wait_for_agh_pid "$adg_pid"; then
    log "😭 Error occurred, check logs for details" "😭 出现错误，请检查日志以获取详细信息"
    update_description "🔴 Error occurred" "🔴 启动过程出现错误"
    $SCRIPT_DIR/debug.sh
    exit 1
  fi
  echo "$adg_pid" >"$PID_FILE"

  # check if iptables is enabled
  if [ "$enable_iptables" = true ]; then
    # never hijack port 53 before the resolver can answer on it
    wait_for_dns_ready
    ready_rc=$?
    if [ "$ready_rc" -eq 0 ]; then
      log "DNS listener is up on port $redir_port" "DNS 监听已就绪，端口 $redir_port"
    elif [ "$ready_rc" -eq 1 ]; then
      # Process is gone: clear the PID and drop leftover redirect rules.
      clear_pid_file
      $SCRIPT_DIR/iptables.sh disable
      log "😭 AdGuardHome exited during startup, check logs for details" "😭 AdGuardHome 启动过程中退出，请检查日志以获取详细信息"
      update_description "🔴 Error occurred" "🔴 启动过程出现错误"
      $SCRIPT_DIR/debug.sh
      exit 1
    else
      log "😭 DNS listener did not come up within ${startup_timeout}s, skipping iptables to keep the device online" \
        "😭 DNS 监听在 ${startup_timeout} 秒内未就绪，跳过 iptables 以保持设备联网"
      update_description "🟡 Running [PID: $adg_pid] (iptables: SKIPPED, listener timeout)" \
        "🟡 运行中 [PID: $adg_pid] (iptables: 已跳过，监听超时)"
      return 0
    fi
    if $SCRIPT_DIR/iptables.sh enable; then
      log "🟢 AdGuardHome is running [PID: $adg_pid] (iptables: enabled)" "🟢 AdGuardHome 运行中 [PID: $adg_pid] (iptables: 已启用)"
      update_description "🟢 Running [PID: $adg_pid] (iptables: ON)" "🟢 运行中 [PID: $adg_pid] (iptables: 开启)"
    else
      log "😭 Error occurred applying iptables" "😭 应用 iptables 规则时出错"
      update_description "🔴 Error applying iptables" "🔴 应用 iptables 出错"
      $SCRIPT_DIR/iptables.sh disable
      exit 1
    fi
  else
    log "🟢 AdGuardHome is running [PID: $adg_pid] (iptables: disabled)" "🟢 AdGuardHome 运行中 [PID: $adg_pid] (iptables: 已禁用)"
    update_description "🟢 Running [PID: $adg_pid] (iptables: OFF)" "🟢 运行中 [PID: $adg_pid] (iptables: 关闭)"
  fi
}

stop_adguardhome() {
  local pids pid waited

  $SCRIPT_DIR/iptables.sh disable

  # Match by identity: the PID file may be stale and its number already reused.
  pids=$(find_agh_pids)
  if [ -n "$pids" ]; then
    pids=$(echo $pids)
    for pid in $pids; do
      kill "$pid" 2>/dev/null
    done
    # give the daemon a moment to flush its database before forcing it
    waited=0
    while [ "$waited" -lt 5 ] && [ -n "$(find_agh_pids)" ]; do
      sleep 1
      waited=$((waited + 1))
    done
    for pid in $(find_agh_pids); do
      kill -9 "$pid" 2>/dev/null
    done
    log "🔴 AdGuardHome stopped [PID: $pids]" "🔴 AdGuardHome 已停止 [PID: $pids]"
  else
    log "🔴 AdGuardHome is not running" "🔴 AdGuardHome 未在运行"
  fi

  rm -f "$PID_FILE"
  update_description "🔴 Stopped" "🔴 已停止"
}

toggle_adguardhome() {
  if [ -n "$(find_agh_pids)" ]; then
    stop_adguardhome
  else
    start_adguardhome
  fi
}

case "$1" in
start)
  start_adguardhome
  ;;
stop)
  stop_adguardhome
  ;;
toggle)
  toggle_adguardhome
  ;;
*)
  echo "Usage: $0 {start|stop|toggle}"
  exit 1
  ;;
esac
