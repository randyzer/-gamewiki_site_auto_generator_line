# 现有项目模式

当前实现保护原项目，在隔离候选目录运行；不会自动写回、提交或发布。Bodycam 使用登记的目标 ID `bodycam`，客户端不能指定任意外部目录。

## 已提供的任务卡

`config/bodycam-existing-project.task.json` 已整理游戏身份、关键词文件、正式域名、GitHub 仓库和 Vercel 偏好。游戏基础信息标记为用户提供、未完成本轮核验。广告正文单独保存在 `config/bodycam-ad.html`，任务卡仅引用文件名，不执行脚本。

```bash
node agent/src/cli.mjs review-card agent/config/bodycam-existing-project.task.json
npm exec --yes --package=node@22.22.0 -- node agent/src/cli.mjs preflight agent/config/bodycam-existing-project.task.json bodycam-preflight-002
npm exec --yes --package=node@22.22.0 -- node agent/src/cli.mjs run agent/config/bodycam-existing-project.task.json BODYCAM_NEW_RUN_ID
```

重复 `run` 会恢复同一个检查点；BLOCKED/FAILED 必须显式使用 `retry`。任务卡改变后应使用新的运行 ID，旧审批不会用于新任务卡。

`run` / `retry` 返回 BLOCKED、FAILED、PARTIAL 或 WAITING_FOR_USER 时，CLI 退出码为 2；输出中的阶段状态仍是判断依据。

快照策略版本不兼容时会要求新运行 ID，不会更新旧 baseline 来绕过保护。`bodycam-existing-001` 使用首次快照规则；后续排除 `.DS_Store` 的策略使该旧运行需要重新建候选。原始记录保留。

## 飞书入口

新版启用并完成真实消息验证后，可向授权私聊发送 `/start ` 加完整任务卡 JSON。原来的长表格不会自动解析为该任务卡；当前机器人服务尚未重启，不能把已修改的文件视为新版已上线。

完整可复制的消息另存为 `config/bodycam-feishu-message.txt`。该消息是准备好的输入，不是已发送的飞书任务。

用户的重构任务授权候选生成。`/approve` 仍只确认部署计划，不授权原项目写回，也不授权 GitHub/Vercel/DNS 或广告发布。Promotion 目前仅提供 dry-run 校验。

## 保护及执行证据

- baseline 包含 Git HEAD、分支、远端、工作树状态、逐文件 SHA256/权限和原始关键词摘要。
- `.git`、环境文件、凭据路径、依赖和构建缓存不复制；非敏感 untracked 研究资料保留。
- 快照先写隔离临时目录，经摘要验证后原子提交；pending 记录支持复制中断及已提交但未保存 baseline 的恢复。
- 模板复制阶段为 SKIPPED/NOT_APPLICABLE，不伪造复制 manifest。
- 候选优先沿用 legacy `background_information`，不会同时创建两个研究根目录。
- 源码漂移、关键词同路径变更、受保护文件删除和候选锁文件变更会阻断审查。
- dry-run 审批绑定目标、运行、baseline、候选摘要、精确文件列表和任务卡摘要，并重新核验当前源/候选内容。

## 当前能力限制

已增加明确的 `EXISTING_PROJECT_CONTENT_ADAPTER_V1`。它以真实 Git 基线、Astro 候选快照、当前 Skill 锁和已验收研究哈希替代模板复制前置条件，写入 `EXISTING_PROJECT_ADOPTION.json` 与 `EXISTING_PROJECT_ADOPTION_REPORT.md`；不会伪造模板报告或声称原始模板 preflight 通过。

内容验收要求候选原始关键词、受保护资料、锁文件保持完整，拒绝 Git/凭据路径、采用记录篡改和草稿索引绕过。宿主清理旧 dist 并重新运行原有项目检查及 build，再验证实际页面、图标字节、canonical、robots 和 sitemap。测试允许明确注入结构 fixture builder；真实入口默认使用项目构建，不接受 worker 声称“已构建”作为证明。

这套扩展已做离线契约验证，尚未在 Bodycam 的真实研究产物上运行。候选依赖未安装，真实 Astro 构建也未验证；缺资料、缺依赖、构建失败或无可验证静态输出均应准确 BLOCKED，不能降低门槛。不得把适配器测试通过说成 Bodycam 已重构完成。

UI 优化仍在 worker 启动前安全阻断；真实广告注入、promotion 和生产 release 尚未实现。真实调研工具故障必须先诊断，不能换成未经批准的渠道。

首轮 Bodycam 实际预检因当前进程 Node 22.16.0 不匹配而阻断。使用临时 Node 22.22.0 后第二轮预检通过，Git HEAD 与原始关键词保持未修改。实际 CLI 试跑记录位于 `runs/bodycam-existing-001/`；最终阶段结果以该目录的 manifest 为准。

此次真实首页 worker 返回 BLOCKED，没有产生调研正文、原始图标 PNG 或 favicon.io ZIP。已确认本机 bsk 0.3.2 服务与扩展正常，但限制进程访问现有连接会被拒绝；这不代表用户本机未登录。工具诊断记录在 `runs/bodycam-tool-probe-001/`。

用户批准后，当前 Codex 宿主已完成逐命令只读联调：准确的 Bodycam Steam 页面读取通过，独立窗口成功关闭，证据见 `runs/bodycam-readonly-browser-001/`。此结果不代表限制子进程或受控工具服务已验证，也不能作为站点完成或可上线证明。

最新只读预检 `runs/bodycam-preflight-003/` 在 Node 22.22.0 下通过。原 HEAD、Git 状态和关键词摘要保持不变。因真实浏览器能力尚未恢复，没有启动后续候选研究 run。

浏览器命令门保持沙箱，公开读取采用实际 URL 和游戏身份同步检查，只返回指定公开字段。启动许可不会批准单条命令；每条命令须有独立、限时、一次性宿主授权。当前 stdio 子进程没有受支持的宿主审批接口，所以生产入口返回 `APPROVAL_CAPABILITY_UNAVAILABLE`，执行器在启动浏览器 worker 前阻断。新版提取器和协议仅完成 fake bsk 验证，受控工具服务尚未启用。

阶段 0、1、4、5 的默认入口同样阻断，缺少或无效的启动许可不会触发浏览器 worker。宿主按固定 schema 重新净化公开返回字段，未经验证的内容不写入结果或审计日志。非浏览器阶段保留原执行方式；当前真实七阶段流程仍未跑通。

当前 bsk 无法将文件传输与目标页面 URL 原子绑定，真实上传/下载在读取本地文件前就会返回 `TRANSFER_CONTEXT_UNVERIFIABLE`。访问方案及最新边界见 `BROWSER_ACCESS_PLAN.md`；自动审批拒绝后的受控接口代码不是自动获准执行的证明。
