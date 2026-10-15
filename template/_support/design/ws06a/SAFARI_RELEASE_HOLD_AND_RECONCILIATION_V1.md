# Safari 发布阻塞与最终复验提案 V1

日期：2026-10-07，Asia/Taipei。状态：PROPOSAL ONLY / ACTIVE ROADMAP UNCHANGED。依据[实际 PLAN19](../../codex/prompts/v2.7-ws06a/iteration19-development-readiness-alternative-plan.md)，本轮仅设计；实际独立审查状态见[执行结果](../../codex/executions/v2.7-ws06a/iteration19/result.md)。

## 不变的发布义务

现有[Starter证据方法](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/docs/CORE_BROWSER_EVIDENCE.md)、[第17轮实际审查](../../codex/executions/v2.7-ws06a/iteration17/chatgpt-independent-review.md)、[冻结V2.6.5 QA](../../../../Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5/docs/QA_CHECKLIST.md)保持原义。真实Safari不能由Playwright-WebKit、Chrome补充观察、双引擎多数或unit positive替代。

开发准入延后取证时机，不能保证工具未来可用、Safari未来通过或一定可以无人完成商业发布；当前拒绝原因没有确定，不能把设置截图当修复证明。受工具拒绝的访问不能借AppleScript、其他控制工具或外部通道绕过。

## 阻塞清单

| 状态/动作 | Safari未取得且完整06A未接受时 |
| --- | --- |
| WS06A完整验收 | BLOCKED；原37/10保持，不能关闭 |
| AX-01/02/03、PA-01提升 | 不提升；visual focus/contrast另待人审 |
| WS03正式Gate | 不因开发续行关闭，等待正式复验 |
| 04A契约/05/04B | 第一阶段不自动解锁 |
| WS06B实施/验收Gate | 未解锁；确定性REF与真实采用仍分开 |
| WS07真实采用Gate | 不解锁，不继承历史事实/权利/人审 |
| WS08组装/release candidate | 不解锁，不创建声称通过的交付包 |
| push/tag/merge/部署/发布 | 本提案及准入均不授权这些动作 |

原先工程成果和方法设计仍有效，但不能计为全能力或商业完成。即使以后raw47全部通过，也须独立核实真实Safari商业发布检查义务；自动raw通过不删除前代QA所要求的代表性真实浏览器检查。

## 恢复正式路径

1. 来源相对稳定后冻结当前Starter/三件套接口与准确构建，重新捕获期望身份；不沿用第17轮旧source验新产品。
2. fresh完整47＋切片新增表面证据，核对原policy适用engine/host与控制是否仍成立；版本变了不直接套旧策略。
3. 通过工具明确允许的真实Safari应用通道或真实物理键盘取得当时失败病例/断言的补证：准确版本、host、视口、JS、实际按键、可见焦点、目标尺寸、真实ArrowRight scroll与附件。保持原键盘偏好，no-JS真实关闭并恢复。
4. 在新源实际运行verify:browser-closure；它只表示可提交独立审查，不自动ACCEPT。没有证据仍拒绝。
5. 正常stop预览，独立确认PID消失，再删除准确临时fixture并记录审计；失败或信号降级阻塞验收。现有manual preview仍为第17轮特意保留状态，本轮没有清理；若短期不再取证，应在后续有限计划中正常关闭，而不是长期闲置或虚报清理。
6. 独立审查完整06A；记录准确source/build和真实证据后才能关闭。
7. 逐片检查开发态实现是否仍与当前接口一致；后续源使证据过期时重跑所需回归及表面测试，独立恢复正式WS03 Gate及后续依赖。
8. 依原路线完成04/05/06B/07/08及所需人审、权利、视觉、主体和商业适用审查，再讨论正式交付。

## 真实失败的处理

若真实Safari键盘路径、尺寸或表格滚动失败，就保持BLOCKED，制定产品修复，使受影响切片证据STALE，重跑定向/全量/新47和Safari补证，再独立验收。不能因已经投入开发就授予P1豁免，不能将实际Safari失败重新归为Playwright输入profile问题。
