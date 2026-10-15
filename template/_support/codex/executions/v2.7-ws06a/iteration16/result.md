# 第16轮：Live-Resize 两文件修复

状态：REPAIR_ACCEPTED_CLOSED / WS06A_BLOCKED。2026-10-06，用户明确授权第16轮并授权自主加快推进。本轮依据第15轮实际已接受规格；已收到原ChatGPT实际独立VERDICT=ACCEPT，有限Live-Resize修复关闭；全文见[实际独立审查](chatgpt-independent-review.md)。

## 产品结果与边界

仅改 Starter 的 `src/components/navigation/MobileNav.astro` 和 `tests/navigation-behavior.test.ts`。导航控制器保存语义身份，在断点切换导致BODY失焦时查询当前源节点并迁移到可见目标；主动离开导航、外部pointer及同模式失焦撤销迁移意图，旧microtask不覆盖新身份。原生markup、href、CSS、Escape/click/toggle语义未变。

两个文件精确采用PLAN15候选补丁，无额外产品调整。二文件差分见[product.diff](product.diff)，精确前后字节见preimages/、postimages/；[回退清单](rollback-manifest.json)只允许当前指纹匹配时恢复二文件原字节及模式。未提交、推送、标签、合并或发布。

官方Browser插件技能从本地官方bundled marketplace恢复，继续原ChatGPT页签；[实际恢复确认](chatgpt-resume-confirmation.md)已保存。未切换访问路径或新建聊天。

## 实际验证

| 验证 | 实际结果 | 原始输出 |
| --- | --- | --- |
| 原控制器 + 新测试 | exit1；8 FAIL / 21 PASS，形成真实RED | [unit-red.log](unit-red.log) |
| 新控制器，同一测试命令 | exit0；29 PASS | [unit-green-1.log](unit-green-1.log) |
| 修复专项浏览器控制 | exit0；Chromium R1–R10、Firefox R1–R3、双浏览器no-JS N1/N2，15/15 PASS | [focused-browser.log](focused-browser.log)、[详细事件](focused-browser-evidence.json) |
| root check | exit0；45 files / 711 tests；Astro0 errors/warnings/hints，无skip | [root-check.log](root-check.log) |
| unadopted final元验证 | exit0；validate/build各exit1，预期PP-02拒绝 | [unadopted-final.log](unadopted-final.log) |
| adopted final | exit0；validate/check/build各exit0；711 tests；无非法final marker或未批准legal routes | [adopted-final.log](adopted-final.log) |
| git diff --check | exit0 | [git-diff-check.log](git-diff-check.log) |
| 新源码，未改动的完整47矩阵 | exit1；37 PASS / 10 FAIL / 0 NOT_RUN，整体FAIL | [full-browser.log](full-browser.log)、[原始资格](browser-evidence/core-browser-evidence.json) |

专项首次运行是治理观察器拼接缺少分号导致SyntaxError，未产生可用产品病例；错误被finally的capture错误遮蔽。纯语法对照证实缺分号无法解析、补分号可解析。只修正治理脚本拼接后执行完整15病例，不重试产品断言、不人工补焦点或延长4秒等待。首次失败日志及证据以`.initial-infrastructure-failure`保留并已通过C2C记录释放。

新47矩阵与历史逐caseId/失败assertion比较：[qualification-comparison.json](qualification-comparison.json)。唯一状态变化是 `live-resize:chromium:shell-nav:899x800` FAIL→PASS；此前非WebKit PASS无回归，新失败assertion为0，病例集合不变。剩余10 FAIL均WebKit；原输入profile不可用及ArrowRight失败仍保留，没有实现第14轮策略或改写判定。

两次有效预览均用自己的Astro background PID正常stop exit0，独立确认PID消失、fixture删除、无fallback signal。专项见[清理审计](preview-cleanup-audit.json)，完整矩阵见[清理审计](browser-evidence/preview-cleanup-audit.json)。首次治理失败的预览也正常清理。

## 身份与完整性

- Starter branch `v2.7/evolution`，HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`，tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`不变。
- 本轮前源清单 `796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8`；修复后源清单 `6708a8a3d069b586ef4381d4151ae6772c6dfbebc051edcf60d3985e6afbc72f`，专项及完整矩阵绑定同一源。
- [完整性审计](integrity-check.json)：235候选文件精确比较，仅上述2文件有变化；743保护文件、冻结三件套/引用、既有路线、第13/14轮证据、规范、依赖、matrix/runner保持不变，errors=[]。
- Canonical Contract仍 `1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c`；FILE_SHA256实读核对一致。历史36/11文件SHA仍 `c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9`，未覆盖。
- Node22.22.0、Playwright1.63.0；Chromium153.0.8010.12/rev1243、Firefox155.0/rev1543、WebKit26.6/rev2359。完整fixture source/dist及引擎绑定在新资格identity内。

## 审查与后续

本地两文件修复验证通过，原ChatGPT实际独立审查ACCEPT，有限修复关闭。完整WS-06A仍BLOCKED，AX/PA、41项能力outcome、REF suite、真实项目采用和release均不提升。WS-04A设计输入与任务台账是单独治理准备，不纳入本轮产品验收。

独立审查接受本有限修复后，依据用户自主推进授权另制定WebKit验证策略的有限实施计划；不能把本轮37/10改写成全矩阵PASS，也不能将策略与源码修复混合执行。
