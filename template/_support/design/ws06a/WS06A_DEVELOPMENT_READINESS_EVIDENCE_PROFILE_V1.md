# 有限开发准入证据要求 V1

日期：2026-10-07，Asia/Taipei。状态：PROPOSAL ONLY / ACTIVE ROADMAP UNCHANGED。依据[实际 PLAN19](../../codex/prompts/v2.7-ws06a/iteration19-development-readiness-alternative-plan.md)，本轮仅设计；实际独立审查状态见[执行结果](../../codex/executions/v2.7-ws06a/iteration19/result.md)。

## 当前实测证据与本轮重算

原始[第17轮47矩阵](../../codex/executions/v2.7-ws06a/iteration17/browser-evidence/core-browser-evidence.json) SHA256：`ea30f494c31872d3b262fe011859afba14a42bd7f12ec9f685ee92f38ffdb5ef`。本轮没有重新执行浏览器矩阵，只读取、核对身份并重算：

| engine | 病例结果 | 断言结果 |
| --- | --- | --- |
| Chromium | 27 PASS | 327 PASS |
| Firefox | 10 PASS | 110 PASS |
| WebKit | 10 FAIL | 70 PASS / 40 FAIL |

47计划/47执行，0 NOT_RUN；原始overall FAIL保持。Safari proof0；visualFocus、contrast仍DEFERRED。不要把70条WebKit局部通过当作10个病例通过。

本轮调用未修改的[closure verifier](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure.ts)，[实际输出](../../codex/executions/v2.7-ws06a/iteration19/closure-recheck.json)仍exit1/BLOCKED，唯一错误是缺失真实Safari；完整分类10病例/40断言成立，不重新解释该验收决定。

## 准确遗留集合

[residual-set-v1.json](../../codex/executions/v2.7-ws06a/iteration19/residual-set-v1.json)保存40条初始定位记录：caseId、category、role、route、CSS viewport、JavaScript、motion、assertion与原policy disposition。37为ENVIRONMENT_PROFILE_BLOCKED、3为PRODUCT_EVIDENCE_UNRESOLVED。它是冻结比较输入，不是PASS、例外或规范权威。

后续失败必须属于这个准确集合，且仍符合当时有效策略的原始detail/控制证明；同名断言或“也是Tab问题”不足以加入。40→39可减少；出现集合外第41项立即BLOCKED并独立诊断。用替换失败、改route/视口/JS、少测required assertion的方法实现数量不增加也不允许。

## 双引擎映射

[实际映射](../../codex/executions/v2.7-ws06a/iteration19/dual-engine-counterpart-audit.json)重算40/40 Chromium与40/40 Firefox，共80/80。每条要求同category、role、route、viewport、JS、motion与assertion，目标行及断言均PASS、无重复或缺失。

这是 cross-engine corroboration，只说明在另两引擎没观察到对应失败；不能称Safari/WebKit等价或多数投票验收。后续仍失败的每条必须重建其新源两引擎映射。

## 拟议初始准入必要条件

- 当前源与独立捕获的期望身份一致，不能拿raw自报identity充当独立oracle；计划、raw/native/control来自同一次有依据的执行。
- 完整47、0漏测/skip/NOT_RUN，原始断言完整，不修改matrix/runner/raw gate。
- 所有非WebKit病例/断言通过，已修复live-resize仍通过；无新基础设施错误。
- 初始10/40准确失败、37/3分类成立，policy/arrow控制原字节匹配，未知分类0。
- 双引擎80/80准确对应；不是拿Chrome smoke、旧711/757测试或合成positive作新浏览器执行。
- 当时来源/构建、工具和证据可复核，正常预览清理可验证；保存审核人、日期、下一切片范围与未决Safari问题。
- 独立接受治理修订以后，再独立裁定准入；本轮只是描述这些条件。

## 来源及失效条件

每份拟议准入记录必须绑定：三件套准确版本与增量来源、Starter branch/head/working-tree manifest、Contract SHA、matrix/runner/closure脚本SHA、锁定Playwright版本、policy/control/raw/native/expected SHA、fixture source/dist、三个engine版本/revision、host/platform/arch、采集/审查日期、具体下一切片。

当前规范为 `1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c`；Playwright1.63.0，Chromium153.0.8010.12/rev1243、Firefox155.0/rev1543、WebKit26.6/rev2359，darwin-arm64。本轮现场只读核对Starter及manual fixture source与旧身份一致，不签发准入、不称旧报告为本日新运行。

任一产品源、配置、fixture内容/final dist或验证来源/版本/宿主变化，准入立即STALE。治理修订改变方法时也须核实新方法与旧来源可比较性，不自行继承签署。准入限定下一切片，不是永久授权；下一源必须重新跑47及切片证据并独立续行。没有明确期限/复查触发/审查者的记录不接受；具体准入记录的期限在实际审查时明确。

## 双重失败关闭

完整验收器、原browser命令/CI仍保持严格47/47PASS或既有真实Safari补证路径；开发准入计算不改变它们的exit/result。开发准入拒绝新错误，完整验收拒绝缺证据，二者都不能默认成功。若实施时需要新生产checker/API或修改这些旧入口，停止并重新限定计划；本设计没有实现checker。
