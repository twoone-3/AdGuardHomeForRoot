until [ $(getprop init.svc.bootanim) = "stopped" ]; do
  sleep 12
done

/data/adb/agh/scripts/tool.sh start

# A soft reboot leaves the previous inotifyd running; clear it so the module is
# not started/stopped several times at once on every toggle.
busybox pkill -f "inotifyd /data/adb/agh/scripts/inotify.sh" 2>/dev/null ||
  pkill -f "inotifyd /data/adb/agh/scripts/inotify.sh" 2>/dev/null

inotifyd /data/adb/agh/scripts/inotify.sh /data/adb/modules/AdGuardHome:d,n &
