# C2C e714 / iteration 2 实施计划

沿用 ChatGPT 已接受的 iteration 1；整体目标仍为 G0–G6，不创建第二条 Pipeline。

1. 真实执行器命名权限：核对 CLI 支持的 `default_permissions`，移除互斥 `--sandbox`；默认 root deny，固定阶段产物写入、锁定 Skill/上游/批准副本只读、模板只读、站点按阶段写入。GUI/模型认证/进程边界独立核查；未验证不解除生产 gate。
2. 独立恢复批准：以真实 manifest、Skill lock、批准输入及站点摘要绑定剩余阶段和 attempt；可信宿主新签发并一次消费，恢复抢占必须独占；未知 IN_PROGRESS 副作用先对账，禁止自动重放。
3. 通用真实输入预检：完整关键词、原始表格行与 Markdown 行号、截断/缺失记录及 SHA256 可追溯；派生材料仅写独立预检目录，保留原件。Wallpaper Engine 为用户指定验收对象，不增加专用编排器。
4. 测试先行：新增 profile 范围、恢复篡改/重放/并发/中断、关键词完整来源测试。`npm run test:entry-host`、`npm test`、相关 `node --check`；真实 OS 探测单独记录，禁止把 mock 当真实 worker。
5. 更新验收记录及总体路线图，用 C2C record/EXECUTED 交给同一 ChatGPT 会话复核。真实站点执行前提交具体任务卡；生产发布始终未授权。

修改范围：`agent/src/worker-permissions.mjs`、`skill-executor.mjs`、`worker-isolation.mjs`；既有审批、宿主及 orchestrator；必要的通用恢复/预检小模块；对应测试和文档。原始 Skills、模板、原站及用户关键词不修改。
