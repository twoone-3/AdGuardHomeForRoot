# Changelog

- 修复软重启后启停模块可能误杀系统进程的严重问题：瞬态 AdGuardHome 进程的 PID 会覆盖 agh.pid，该 PID 被复用到系统进程后，关闭模块会向它发送 SIGTERM（实测击中 system_server）导致设备重启 (#85)
- Fix a critical bug where starting/stopping the module after a soft reboot could kill a system process: a transient AdGuardHome PID overwrote agh.pid, the PID was later reused by a system process, and stopping the module sent it SIGTERM (system_server in practice), rebooting the device (#85)
- 进程身份改为按 /proc/<pid>/comm 校验：重入检测不再依赖 ps，软重启后直接接管仍在运行的核心；确认进程存活后才写入 PID；停止时只终止真正的 AdGuardHome 进程 (#85)
- Identify processes by /proc/<pid>/comm: the re-entry check no longer relies on ps, a core that survived a soft reboot is adopted instead of respawned, the PID is written only after the process is confirmed, and stop only signals real AdGuardHome processes (#85)
- 监听就绪检测先校验进程存活；service.sh 启动前清理残留的 inotifyd；修复 ksud 更新模块描述缺少 KSU_MODULE；安装器不再用 pkill -f 误杀自身 (#85)
- Check process liveness before the DNS listener check, clean up stale inotifyd instances in service.sh, pass KSU_MODULE when updating the module description via ksud, and stop the installer's pkill -f from matching itself (#85)
- 文档拆分为中文 / 英文两个目录，统一以 docs/index.md 作为双语索引
- Split the docs into Chinese / English directories with docs/index.md as the shared bilingual index
