# Changelog

- 新增 Web UI “密码计算”分页：在本地把明文密码算成 AdGuardHome.yaml 所需的 bcrypt 哈希，可一键复制或双击确认直接写回配置文件（自动备份为 .bak，写入后需重启核心）
- Add password generator tab in Web UI: compute the bcrypt hash locally, copy it or write it back to AdGuardHome.yaml with double-confirm (.bak backup, restart the core to take effect)
- 新增 pack.sh（bash 版打包脚本），GitHub workflow 复用同一脚本打包
- Add pack.sh and reuse it in the GitHub workflow for packaging
- 更新文档
- Update docs