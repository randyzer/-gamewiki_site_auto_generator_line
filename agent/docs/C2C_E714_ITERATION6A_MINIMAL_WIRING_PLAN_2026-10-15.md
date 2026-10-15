# 第六轮 A：最小可信宿主接线计划

用户明确批准官方客户端可信的单用户开发验收模型；复用唯一Pipeline。真实工具验证前入口继续拒绝，具体G1批准前不建站。

1. 在既有worker模块固定官方原生CLI的绝对/真实路径、版本和SHA256，执行前复验。保留strict/ephemeral/ignore-user-config/ignore-rules/approval-never、无命令网络和能力禁用；任务不能改变这些配置。修复本地favicon路径仍错误要求图像生成工具的提示矛盾。
2. 沿原审批绑定加入可信宿主选定的executionStages；消费时重新构造同一作用范围，GUI明确展示，只允许该范围内执行。普通旧测试/接口默认行为保持。orchestrator把已有shouldPause传入当前状态，宿主在首页结束后停下，不另建状态机。
3. 固定正式bootstrap从宿主策略加载CLI和宿主验证证据；不接受任意options、executor或布尔隔离声明。真实验证证据缺失/漂移继续ENTRY_HOST_ISOLATION_UNVERIFIED。
4. 宿主读取run专用来源审核索引，沿已有归属回执/每命令审批采集公开信息；没有索引或有效回执则BLOCKED，不自行采集或换工具。
5. 定向RED→GREEN、入口专项、完整回归。准备一次正式CLI工具smoke，验证现有实际命令/写入工具边界和禁用能力配置，不再运行Docker或重复同等文件canary。先展示准确命令、合成材料/范围、超时/停止条件，再申请该具体验证批准。
6. 工具验证接受后，准备准确G1任务卡、来源/图标及写入范围，经具体批准运行同一Pipeline至首页原生验收；G1未通过不进入后续。

主要修改现有executor/permissions、bootstrap/入口脚本、审批绑定/本地host/GUI、orchestrator、official-source-host与对应现有测试。只为阶段范围在现有许可中正确绑定而修改审批模块；不扩展一般授权框架。CLI策略和审核证据不由业务task JSON提供。

定向检查：`node --test tests/worker-permissions.test.mjs tests/entry-host-bootstrap.test.mjs tests/entry-approval.test.mjs tests/macos-entry-human-approval.test.mjs tests/official-source-host.test.mjs tests/m3-dual-favicon-skill.test.mjs`。

回归：`npm run test:entry-host`、`npm test`；相关模块`node --check`。不修改原始Skill/模板/关键词/站点，不执行发布、DNS、广告或Git push。
