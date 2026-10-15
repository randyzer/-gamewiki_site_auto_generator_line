# 直接在用户指定目录建站：方案 A 验证

基线：`0b8d2eb`，分支 `feat/configurable-paths`。不修改 `codex-skills/`，不调用真实 Codex worker，不 push。

## 行为与边界

新输入 paths 只接受 siteDirectory、researchDirectory、rawKeywordsFile，均为绝对路径；网站直接位于 siteDirectory。research 可以在 site 内，反向嵌套拒绝。新 site 仅允许指定 research 目录及 .DS_Store，拒绝其他条目并列出最多十项。旧 manifest 中的 projectRoot 和旧 site 子目录只在恢复时兼容；旧占位写法只有解析结果与原记录路径完全相同时才接受。

stage 3 worker 在 run/template-copy/site 调用锁定的 copy_template.py，写临时模板报告；对用户 site/research 只读。原有 native 输出区用于 worker-result，未增加其他授权。宿主先验证原生模板产物、全树预检冲突，然后按文件复制；保留权限并校验前后 SHA256。manifest 仅改 destination 字段，不新增 staging_destination。stage 3 正式产物路径为 site/docs 下的文件。宿主也拒绝临时模板内 .git/、.agents/、.codex/、.aws/，延续已有 worker 的保护规则。

run/TEMPLATE_MERGE_RECEIPT.json 保存来源、目标、文件数、源/目标树哈希，以及每个已写入或尝试写入文件的路径、状态、哈希和模式。directories 另记尝试创建的目录（含 site 和缺失父目录），状态为 CREATING/CREATED/REUSED。中途失败保留回执与临时源；不自动回滚、不删除任何用户文件。合并成功后删除临时 site；若仅清理失败，合并仍为 MERGED，独立记录 cleanup.status=FAILED 并在阶段证据提示 cleanup pending。目录可复用；已有文件和模板 backgroundinformation/research 条目在任何 site 写入前拒绝。manifest.files 以外的文件仅允许清单自身及两个规定的模板报告，其他文件一律拒绝。

## 先失败后实现

`node --test tests/direct-site.test.mjs` 首次 17 项中 14 项失败，覆盖缺少宿主合并、冲突全量预检、嵌套 research、新运行条目清单、stage 3 只读 site 和旧 manifest 恢复。原有相对路径等校验仍通过。后续添加旧占位输入恢复回归，确认失败后实现仅针对旧 manifest 的兼容。

## 真实脚本验证

复现命令（从 agent 执行，快照须已在本地，脚本不会替代下载）：

```sh
node scripts/verify-direct-site.mjs ../.template-cache/24ea6a252c7217e346cc63996cbd3161c6e87052 /tmp/direct-site-real-validation.json
```

使用本地已缓存、干净且来源可核验的 GitHub 快照：

- 来源：`https://github.com/randyzer/-gamewiki_site_auto_generator_line.git`
- commit：`24ea6a252c7217e346cc63996cbd3161c6e87052`
- 模板：`temp3_based_gamblewithyourfriends.net`
- 真实 `copy_template.py --dry-run` 和复制均退出 0；51 个模板源文件，源树 SHA256 为 `d6be36b1dd22aadc53428db8f478990331e918db2e30b4e5c6ac8e12a1f96628`。
- 替身 worker 写入模板选择报告与残留扫描，宿主共合并 54 个文件；回执为 MERGED。
- 真实 content-integrator `preflight.py` 模板清单检查通过：有 package.json、页面根、选择报告、复制清单，destination 等于用户根目录，没有额外 site/。
- preflight 整体退出 2（预期），ready=false，缺项仅为 homepage research、icon ZIP、keywords.json、keyword materials directory；本次未进行游戏资料调研，因此不声称整个内容整合可启动。
- 关键词文件前后 SHA256 均为 `8c375be94358cf452e66866c4b8828c4780069adaaaf2b7e2835166e09836613`；.DS_Store 字节保持不变。
- 验证结束已删除整个临时根目录，缓存快照前后均验证干净。用户实际游戏目录未被触碰。

完整逐文件合并回执、复制输出和 preflight JSON 由脚本写到指定报告路径。仅 destination 的值和 JSON 排版会变化，manifest 其他字段值保持原样。失败场景定位到回执的 COPYING/COPIED 路径，保留已写入文件供人工处理。

## 最终验收

`node src/cli.mjs inventory` 成功，`node --test tests/*.test.mjs` 为 617/617 通过、0 失败。`git diff --check` 通过，codex-skills/ 无改动。路径、合并和执行器相关定向测试为 73/73 通过。

首次全量验收遇到既有 GitHub 查询的 HTTP/2 framing layer 错误；经用户明确授权，仅本轮进程使用 Git `http.version=HTTP/1.1` 重跑，未修改全局配置、来源、测试或生产网络实现：

```sh
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.version GIT_CONFIG_VALUE_0=HTTP/1.1 node src/cli.mjs inventory
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.version GIT_CONFIG_VALUE_0=HTTP/1.1 node --test tests/*.test.mjs
```

与提示词的边界说明：保留既有 native 输出区的写权限以返回 worker-result；仅 site 的写权限由 stage 3 移交宿主。宿主额外延续 .git/.agents/.codex/.aws 禁写规则。旧 projectRoot 只在已有 manifest 的恢复边界接受，不作为新输入字段。未新增审批框架。

## Claude 初审与修复

Claude 本机 CLI 仅开放 Read/Glob/Grep，初审未发现 P0/P1，提出四项 P2。全部先补失败测试再修复：非 PASSED 的临时产物验证要保留 worker 原状态/证据/缺项；回执补目录写入记录；清理失败与合并失败分开；拒绝未列入模板清单的额外文件（仅放行两个规定的报告和清单自身）。修复后再次完成上面的真实 temp3 验证与全量 617 项测试。合并中的每个文件本来已有前后哈希校验，第四项修复进一步约束文件必须来自模板清单或规定报告。

Claude 已只读复查四项修复，结论为全部有效，未发现新的可确认 P0/P1/P2。原文见 [CLAUDE_DIRECT_SITE_RECHECK.md](CLAUDE_DIRECT_SITE_RECHECK.md)。Claude 未运行测试，测试结论来自本轮实际命令输出。
