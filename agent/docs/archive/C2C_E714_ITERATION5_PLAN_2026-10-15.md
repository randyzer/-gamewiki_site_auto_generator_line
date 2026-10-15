# C2C e714 / iteration 5 限定合成探测

已获得用户明确批准；原方案见 G0_ISOLATED_HOST_PROBE_PROPOSAL_2026-10-14.md。当前engine已恢复，仍用原desktop-linux context。

1. 由DockerCLI查询官方library/node的node:22-bookworm-slim真实manifest，选本机LinuxARM64/v8的准确digest，仅下载该digest；无insecure/替代registry/其它镜像提供方。
2. TEST-only脚本默认只预览。实际模式必须指定已核验并下载的digest；拒绝tag、其他提供方、rootUID、非本轮run目录。没有自动pull、没有业务Pipeline。
3. 创建一次临时合成容器：network none、readonly rootfs、cap-drop ALL、no-new-privileges、nonroot、pids64、memory512MiB、CPU1；启动最多30秒。只挂合成script/input为readonly及output为write，不挂HOME/CODEX_HOME、docker socket、Agent根、真实Skill/关键词/图标/审批材料。
4. 创建后、启动前读取实际container配置并逐项复验；不符合就移除本轮container并BLOCKED。固定Node脚本检查准许读写、只读输入写拒绝、未挂载五类宿主样本、子进程继承、host loopback正/负控制、kernel cgroup资源值与nonroot/capabilities。
5. 保存实际命令、退出码、固定脚本/输入/宿主前后SHA256、digest、清理检查。只移除本轮container，保留TEST证据与镜像，不清理其它数据。模型认证/全部工具/GUI/可信审批一律NOT_TESTED，不解除生产门。
6. 定向参数测试先RED、实现后GREEN，node --check；实际探测有新失败仅诊断最多两次，不扩大限制。最终npm test在agent根执行，保存真实输出，提交同一ChatGPT审查。
