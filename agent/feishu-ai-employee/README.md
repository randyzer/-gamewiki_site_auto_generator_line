# Feishu Adapter for the Gamewiki Agent

七阶段总控根目录为 `../`。本目录保留飞书 SDK、消息授权、SQLite 队列和运行服务；实际任务通过 `src/pipeline-adapter.mjs` 调用总控。

用户操作、配置、代码边界和本轮验收见 [总控说明](../README.md) 与 [验收报告](../VALIDATION_REPORT.md)。

```bash
npm test
node src/skill-inventory.mjs
node src/readiness.mjs
```

`skill-inventory` 更新总控 `../config/skill-manifest.json`，覆盖 Skill 及引用文件；`readiness` 只输出配置存在性，不证明飞书或真实 Codex 能力已联通。`AGENT_MODE` 不再选择首页 Mock 入口；总控使用显式注入的离线执行器进行测试。

离线消息集成已覆盖 `/start`、`/tasks`、`/status`、`/inputs`、`/input`、`/pause`、`/resume`、`/approve`、`/reject`、`/cancel` 和旧 `/ping`、`/help`、`/skills`。仅 allowlist 内用户的私聊文本会处理。新任务站点目录由总控分配。

任务状态和完成通知分别持久化，通知失败有限重试，不重跑任务。关键命令回复与状态变更在同一事务持久化，按 message_id 去重；重启只重试回复，三次耗尽后记录 FAILED。等待输入十分钟每轮最多提醒一次。任务正在运行时，暂停在当前阶段结束后生效。

`/approve ID DIGEST` 只确认当前部署计划；生产部署与外部账号操作需要另一个具体批准方案。

现有项目模式接收 `/start ` 加版本化 JSON 任务卡，目标必须已登记在 allowlist。Bodycam 的完整任务卡在 `../config/bodycam-existing-project.task.json`，具体操作及限制见 [现有项目模式](../EXISTING_PROJECT_MODE.md)。普通长表格不会自动转换成任务卡；代码已修改也不代表正在运行的机器人已启用新版。

`.env`、SQLite、日志、浏览器资料仍在本目录的忽略区域。不得打印、提交、复制凭据到报告。本轮只完成代码和离线联调，未重启正在运行的服务；既有服务此前的 `/ping` 历史证据不能代表新版已完成真实联调。
