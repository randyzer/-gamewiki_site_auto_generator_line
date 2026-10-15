# 第17轮：WebKit验证策略实现与真实键盘补证路径

状态：POLICY_IMPLEMENTATION_ACCEPTED / REAL_SAFARI_EVIDENCE_NOT_CAPTURED。完整WS-06A仍BLOCKED。2026-10-06，依据[实际PLAN17](../../../prompts/v2.7-ws06a/iteration17-webkit-policy-implementation-plan.md)完成实施并获原ChatGPT[实际独立ACCEPT](chatgpt-independent-review.md)，仅接受机制实现。用户已全权授权自主推进，后明确授权Safari原生GUI；该工具首次连接被URL安全限制终止，尚未发送核验按键。用户另明确要求Chrome试验，有限[Chrome补充检查](chrome-smoke/result.md)已完成，但不替代Safari证据。

## 实现范围

严格10文件：Starter新增closure verifier与46项测试，修改raw evidence模块、package script、Core evidence文档与QA；SOP三份方法文档及Master Prompt同步。具体文件/精确差分/回退见[integrity-check.json](integrity-check.json)、[product.diff](product.diff)、[rollback-manifest.json](rollback-manifest.json)。237候选文件、743保护文件审计errors=[]；Core源码、已接受Live-Resize修复、原47矩阵、runner、锁文件、CI、Canonical Contract、Registry及路线不变。未commit/push/tag/merge/release。

`validateBrowserEvidence`保留严格47/47PASS；新增snapshot验证只接受完整真实运行的结构与身份，不把FAIL改成PASS。单独closure verifier逐条核对精确失败详情、native probe/engine/host、已接受策略与10-process控制SHA、每个失败case/assertion、独立source/build、真实Safari键盘记录及实际artifact。无证据/未知类/新非WebKit故障/NOT_RUN/不完整覆盖均拒绝。只有证据完整才输出ELIGIBLE_FOR_INDEPENDENT_REVIEW，不自动关闭工作流或提升能力。

CLI独立核验当前Starter/HEAD/branch和Contract实字节；expected identity由独立session preparation/实际资格fixture物理捕获取得，未拿raw report自身identity当oracle。[实际捕获记录](qualification-identity-capture.json)在report生成前完成；相同fixture source、两次各自真实dist分别绑定。补证fixture source必须与raw fixture source一致；manual build由CLI现场读取临时目录，而不是相信JSON声明。

## 实际测试与失败保留

- 新模块测试最初因模块尚不存在而exit1、0 tests，见unit-red.log；不包装成行为RED。
- 初期79、86定向tests通过。首次root check因测试fixture字面量类型及deprecated日期API失败，实际日志root-check-initial-type-failure.log保留；最小类型/API修正后通过。
- 二次自查加入“另一个适配source不能替代”的负例，实际1 FAIL/86 PASS；收紧验证器后87/87定向PASS。红/绿见[manual-source-binding-red.log](manual-source-binding-red.log)、[green](manual-source-binding-green.log)。独立Safari记录只能用与raw完全相同的适配source，另绑定自己的实际final dist。
- 最终root/adopted：46 files / 757 tests，全PASS、无skip，Astro0 errors/warnings/hints；默认final仍validate/build PP-02拒绝；adopted validate/check/build实际exit0，非法final/legal输出缺席。[回归结果](regression-results.json)、root-check.log、unadopted-final.log、adopted-final.log、git-diff-check.log。
- 初次17矩阵及准备样本在加入source guard后失效，只作为前置原始证据保留，文件名后缀`.before-manual-source-binding-guard`。该未服务的旧临时fixture已准确删除，见[superseded-session-cleanup.json](superseded-session-cleanup.json)。没有把旧矩阵验收新source。
- 最终新源完整47执行：37 PASS / 10 WebKit FAIL / 0 NOT_RUN，raw命令exit1；与16相比caseStatus无变化、非WebKit无回归。新的390px table-local-scroll失败也是已观察的native ArrowRight路径；本轮40条失败断言（37环境profile、3scroll未决），与16相比多1条WK table assertion。**ChatGPT已独立接受该增量归为PRODUCT_EVIDENCE_UNRESOLVED，不将其计为PASS，不要求另开诊断轮。** [比较](qualification-comparison.json)、[原始资格](browser-evidence/core-browser-evidence.json)、full-browser.log。
- 实际closure命令绑定最终raw/native/expected/policy/control/当前manual fixture，仅不给real-keyboard-evidence，exit1且唯一错误`missing/invalid real Safari keyboard evidence`。输出真实10case/40assertion清单；[原始负例](closure-without-real-keyboard.log)、[实际状态](closure-without-real-keyboard-result.json)。没有使用synthetic positive造Safari证据。

最终自动qualification预览PID88831正常Astro stop exit0，独立确认gone、fixture删除、无fallback，见[browser cleanup](browser-evidence/preview-cleanup-audit.json)。前置矩阵自身PID也正常清理，记录原样保留。

## 已准备的具体补证动作

[实际逐项清单](REAL_SAFARI_KEYBOARD_CHECKLIST.md)与[精确40条覆盖](required-alternate-keyboard-coverage.json)已经准备。[keyboard-session.json](keyboard-session.json)保存单独受控manual preview：READY_FOR_REAL_KEYBOARD，http://127.0.0.1:60522，owned PID89278。此preview为待用户操作而明确保留，不冒充已cleanup；取证后必须同fixture正常stop、独立确认PID消失并删除该临时fixture。固定样本是same-source Field Notes final build，不改canonical目录。

[real-keyboard-evidence.pending.json](real-keyboard-evidence.pending.json)故意保留null结果/观察/操作者/日期/版本；schema会拒绝，不能改名当实际证据。真实Safari证据尚未取得、PASS为0。官方Browser当前仅iab/Chrome-extension/MCPApps，无Safari通道。用户已明确授权Safari原生GUI，但首次连接由工具URL安全限制终止；未操作Safari键盘。原Playwright-WebKit的输入profile失败已独立诊断，非登录/账号或C2C连接失败。用户随后明确指定Chrome，已通过其已连接扩展观察Tab/菜单/Escape/ArrowRight/404恢复；这些有限观察独立保存，不填入Safari JSON或原47矩阵。

## 实际独立审查与剩余边界

原ChatGPT完成实际独立审查，结论为ACCEPT — IMPLEMENTATION MECHANISM ONLY；核对了execution outputs 53–71、实际diff、代码、identity capture、回归及closure负例。确认strict raw gate未弱化、10文件范围成立、source/build独立绑定、负例真实拒绝、旧711 + 本轮46 =757全部通过。新390px失败归因接受，仍是PRODUCT_EVIDENCE_UNRESOLVED。原始回复见[chatgpt-independent-review.md](chatgpt-independent-review.md)，现场截图见[审查截图](screenshots/chatgpt-independent-review.png)。

实现机制无需继续诊断；唯一剩余实质Gate是真实Safari键盘补证和其最终独立closure review。审查特别要求target-size记录目标实际尺寸，不能只声明可达/可见/可激活或PASS；机器verifier仅给ELIGIBLE_FOR_INDEPENDENT_REVIEW，审查者仍必须检查真实记录及artifact。Safari替代通道已授权，但工具拒绝连接；Chrome可用不能构成Safari通道恢复。无需重复请求同一Safari授权。

WS-06A/AX-01/02/03/PA-01/WS-06B/REF/真实采用/release均不提升；visual focus/contrast仍DEFERRED，Registry outcome不变。WS04A输入不纳入本轮。拿不到真实Safari证据仍BLOCKED，不能因为policy代码或测试成功放行。
