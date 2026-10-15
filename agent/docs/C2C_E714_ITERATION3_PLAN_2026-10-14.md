# C2C e714 / iteration 3 实施计划

ChatGPT 接受 iteration 2 的有限工程验收；生产 gate 仍阻断，整体 G0–G6 未完成。

1. 原恢复模块支持明确输入 patch：字段白名单、before/after、新材料字节摘要、首个失效阶段/下游范围；禁止身份/工作区/广告/UI 写入权限变更；新宿主批准后只用已有 updateUserInputs。
2. 不覆盖 APPROVED_INPUTS.json；版本化材料/批准记录及宿主维护的当前引用保存新批准。准确 manifest 独占消费；完整历史保留；已启动许可仍校验完整性。
3. 单独确认部署计划：仅当前 WAITING_FOR_USER/planDigest；计划文件摘要与来源新鲜度复验；新的本地人工挑战；确认只更新 deploymentPlanApproval，worker 0 次，deploymentExecuted=false。
4. 为 G1 补齐官方公开来源契约：准确 URL/final URL/身份/来源类型/时间/摘要/逐命令批准，继承现有 bsk 宿主门。默认缺能力 BLOCKED，不增加浏览器替代路径或 Wallpaper 专用编排器。
5. 回归验证覆盖缺项补充后续跑、旧批准失效、材料漂移/并发/拒绝、无 worker 计划确认、来源不足阻断；全量 npm test、入口专项与 node --check。记录真实/合成/未运行的范围后交同一 ChatGPT 复核。

实现仅修改 agent/ 的审批、Pipeline 适配、小型来源契约及对应测试/文档；不改原始 Skill、模板、原站或关键词，不调用真实浏览器/业务 worker，不发布。
