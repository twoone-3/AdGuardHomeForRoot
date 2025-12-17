. /data/adb/agh/settings.conf
. /data/adb/agh/scripts/base.sh

start_adguardhome() {
  # check if AdGuardHome is already running
  if [ -f "$PID_FILE" ] && ps | grep -w "$adg_pid" | grep -q "AdGuardHome"; then
    log "AdGuardHome is already running" "AdGuardHome 已经在运行"
    exit 0
  fi

  # to fix https://github.com/AdguardTeam/AdGuardHome/issues/7002
  export SSL_CERT_DIR="/system/etc/security/cacerts/"
  # set timezone to Shanghai
  export TZ="Asia/Shanghai"

  # backup old log and overwrite new log
  if [ -f "$AGH_DIR/bin.log" ]; then
    mv "$AGH_DIR/bin.log" "$AGH_DIR/bin.log.bak"
  fi

  # run binary
  busybox setuidgid "$adg_user:$adg_group" "$BIN_DIR/AdGuardHome" >"$AGH_DIR/bin.log" 2>&1 &
  adg_pid=$!

  # check if AdGuardHome started successfully
  if ps | grep -w "$adg_pid" | grep -q "AdGuardHome"; then
    echo "$adg_pid" >"$PID_FILE"
    # check if iptables is enabled
    if [ "$enable_iptables" = true ]; then
      $SCRIPT_DIR/iptables.sh enable
      log "🥰 started PID: $adg_pid iptables: enabled" "🥰 启动成功 PID: $adg_pid iptables 已启用"
      update_description "🥰 Started PID: $adg_pid iptables: enabled" "🥰 启动成功 PID: $adg_pid iptables 已启用"
    else
      log "🥰 started PID: $adg_pid iptables: disabled" "🥰 启动成功 PID: $adg_pid iptables 已禁用"
      update_description "🥰 Started PID: $adg_pid iptables: disabled" "🥰 启动成功 PID: $adg_pid iptables 已禁用"
    fi
  else
    log "😭 Error occurred, check logs for details" "😭 出现错误，请检查日志以获取详细信息"
    update_description "😭 Error occurred, check logs for details" "😭 出现错误，请检查日志以获取详细信息"
    $SCRIPT_DIR/debug.sh
    exit 1
  fi
}

stop_adguardhome() {
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    kill $pid || kill -9 $pid
    rm "$PID_FILE"
    log "AdGuardHome stopped (PID: $pid)" "AdGuardHome 已停止 (PID: $pid)"
  else
    pkill -f "AdGuardHome" || pkill -9 -f "AdGuardHome"
    log "AdGuardHome force stopped" "AdGuardHome 强制停止"
  fi
  update_description "❌ Stopped" "❌ 已停止"
  $SCRIPT_DIR/iptables.sh disable
}

toggle_adguardhome() {
  if [ -f "$PID_FILE" ] && ps | grep -w "$(cat $PID_FILE)" | grep -q "AdGuardHome"; then
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
