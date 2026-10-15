# 真实 Safari 键盘核验清单

状态：READY_FOR_REAL_KEYBOARD；已绑定最终新源47矩阵。未取得任何Safari PASS。

固定本地样本：[http://127.0.0.1:60522](http://127.0.0.1:60522)。实际Core的Field Notes最终构建，源码/构建身份见keyboard-session.json。

自动资格仍完整保留47行。补证只覆盖失败的WebKit病例/断言，不重写原FAIL。最终实际矩阵为37 PASS / 10 FAIL；补证必须覆盖下表10病例、40断言（37条环境profile阻断、3条原生滚动证据未决）。

## 操作约束

- 记录Safari实际版本、操作者和日期；记录浏览器视口CSS尺寸（不是外部窗口尺寸）。
- 仅普通Tab/Shift+Tab/Enter/Space/Escape/ArrowRight。不要调用focus()/改scrollLeft或注入键盘事件；不以Option/Alt+Tab替代。
- 保持Safari/macOS现有键盘导航偏好，不为通过测试修改设置。普通Tab达不到链接即如实记FAIL。
- 每个病例从指定route重新开始，保证当前JS状态。no-JS病例必须真正关闭JavaScript并刷新，最后恢复原JS设置。
- 每项记录按键、操作前后焦点/可见结果及独立截图/录像/观察记录；不得从unit fixture或其他引擎复制PASS。

## 逐项键盘路径

| 断言 | 实际操作与成功证据 |
| --- | --- |
| skip-keyboard | 新载入route，首个Tab到Skip to content，Enter到main，再Tab从main之后继续；焦点可见并跳过重复头部 |
| footer-keyboard | 用Tab到页脚Back to top，Enter激活；记录实际目标/URL/滚动及后续焦点 |
| navigation-keyboard / target-size | 移动端Menu→Enter、Guides summary→Space、child；桌面parent→child；目标可达、焦点可见、可激活，记录目标实际尺寸 |
| nested-cleanup | 已打开Menu/Guides，child上Escape到Guides，再Escape到Menu；层级关闭、焦点恢复；重新打开确认nested不残留 |
| ordinary-navigation | child链接真实Enter，实际进入Getting Started文章，URL及可见article正确 |
| same-document-focus | 当前route的同文档链接真实激活，披露关闭，实际焦点落到对应目的地；没有reload或隐藏焦点 |
| recovery-navigation | 真404页面，用Tab到恢复链接，Enter进入实际首页/索引 |
| table-local-scroll | article里Tab到横向表格region，真实按一次ArrowRight，看到内容横移；记录before/after scroll及真实键到达，整页不横向溢出 |

## 待补证病例

| caseId | 视口 | JS | route | 必需断言 |
| --- | --- | --- | --- | --- |
| baseline:webkit:shell-nav:390x844 | 390×844 | True | [/](http://127.0.0.1:60522/) | footer-keyboard, skip-keyboard, navigation-keyboard, target-size, nested-cleanup, ordinary-navigation, same-document-focus |
| baseline:webkit:content-detail:390x844 | 390×844 | True | [/guides/getting-started/](http://127.0.0.1:60522/guides/getting-started/) | footer-keyboard, skip-keyboard, table-local-scroll |
| baseline:webkit:recovery-404:390x844 | 390×844 | True | [/__ws06a_missing_route__/](http://127.0.0.1:60522/__ws06a_missing_route__/) | footer-keyboard, skip-keyboard, recovery-navigation |
| baseline:webkit:shell-nav:768x1024 | 768×1024 | True | [/](http://127.0.0.1:60522/) | footer-keyboard, skip-keyboard, navigation-keyboard, target-size, nested-cleanup, ordinary-navigation, same-document-focus |
| baseline:webkit:content-detail:768x1024 | 768×1024 | True | [/guides/getting-started/](http://127.0.0.1:60522/guides/getting-started/) | footer-keyboard, skip-keyboard, table-local-scroll |
| baseline:webkit:recovery-404:768x1024 | 768×1024 | True | [/__ws06a_missing_route__/](http://127.0.0.1:60522/__ws06a_missing_route__/) | footer-keyboard, skip-keyboard, recovery-navigation |
| baseline:webkit:shell-nav:1280x800 | 1280×800 | True | [/](http://127.0.0.1:60522/) | footer-keyboard, skip-keyboard, navigation-keyboard, ordinary-navigation |
| baseline:webkit:content-detail:1280x800 | 1280×800 | True | [/guides/getting-started/](http://127.0.0.1:60522/guides/getting-started/) | footer-keyboard, skip-keyboard, table-local-scroll |
| baseline:webkit:recovery-404:1280x800 | 1280×800 | True | [/__ws06a_missing_route__/](http://127.0.0.1:60522/__ws06a_missing_route__/) | footer-keyboard, skip-keyboard, recovery-navigation |
| no-js:webkit:shell-nav:390x844 | 390×844 | False | [/](http://127.0.0.1:60522/) | footer-keyboard, skip-keyboard, navigation-keyboard, target-size |

## 保存与验收

结果保存为本目录real-keyboard-evidence.json，严格字段见Starter closure verifier及Core evidence文档。每条必须有实际观察artifact。只有实际记录完整并经独立审查才能关闭WS06A；工程实现成功不等于此项通过。

本手工preview是为核验而特意保留的受控会话，PID及fixtureRoot在keyboard-session.json。核验后同fixture执行npm run preview -- stop，独立确认PID消失，再删该临时fixture，保存cleanup审计；不使用信号降级。
