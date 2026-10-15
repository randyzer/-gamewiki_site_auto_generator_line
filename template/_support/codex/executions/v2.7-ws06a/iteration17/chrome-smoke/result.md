# Chrome 固定样本补充检查

日期：2026-10-06，Asia/Taipei。用户明确要求“用chrome浏览器试一下”。使用已连接Chrome扩展通道的AX键盘接口；没有操作ChatGPT外部页签，没有使用被拒绝的Computer Use通道，也没有修改产品代码或浏览器键盘偏好。

结果：Chrome页面及键盘通道可用，完成以下有限观察。原始记录见[observations.json](observations.json)，这是补充smoke，不是47项资格矩阵或Safari替代证据。

- 桌面首个Tab聚焦Skip链接且DOM报告focus-visible；Enter激活`#main-content`。此时实际activeElement仍为BODY，未声称main获得DOM焦点。另在404页验证激活skip后的下一Tab跳过头部，到达正文恢复链接。
- 移动视口请求390×844，实际document client为375×844（可见滚动条占宽）；尺寸原样记录。Tab到Menu，目标94×44；Enter打开外层，Tab到Guides，Enter打开内层。
- 第一次Escape关闭内层并恢复Guides；第二次Escape关闭外层并恢复Menu；最终open details为0。
- 文章通过6次Tab实际到达Reference comparison region；ArrowRight使scrollLeft从0到40。区域client345/scroll780，document client/scroll均375，没有整页横向溢出。见[实际滚动截图](mobile-table-after-arrow.png)。
- 真404页面的skip→Enter→Tab到Back to home；Enter实际返回首页，URL及Field Notes标题已观察。见[恢复链接截图](mobile-404-keyboard.png)。

临时viewport override已reset。没有注入focus()/scrollLeft/键盘事件，没有启用Safari/macOS导航设置。Chrome实际版本未采集；本报告不具有完整browser qualification身份，不填Safari JSON、不更新原raw矩阵、不关闭WS06A。

先前Safari原生GUI已获得用户明确授权；工具在首次`getApp("Safari")`时以当前浏览器URL不允许Computer Use为由终止，未发送核验按键。该限制不是用户未授权或账号未登录，不能通过Chrome结果消除。真实Safari证据仍为0，后续需实际可用Safari通道或用户手工核验及独立closure审查。

原controlled preview仍为待Safari取证明确保留，cleanupRequired=true；本次没有谎报它已停止或临时fixture已删除。源/构建复核见[source-binding.json](source-binding.json)。
