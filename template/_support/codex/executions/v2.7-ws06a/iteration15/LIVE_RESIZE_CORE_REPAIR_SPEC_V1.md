# Live-Resize Core Focus Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the existing Codex with ChatGPT workflow. Steps use checkbox syntax. 本轮仅规划，不授权实施或子代理派发。

**Goal:** 在899→901与901→899切换中恢复仍有效的导航身份，同时尊重用户主动离开导航的意图。

**Architecture:** 在正常focusin时保存语义身份，使用当前mode、BODY/HTML焦点丢失和新查询的源节点校验边界切换。外部focus/pointer与同模式失焦撤销迁移权限；microtask不得复活或删除新的身份。迁移时重新查询目标，保留现有原生details、Escape、映射与fallback。

**Tech Stack:** 现有Astro7.2.10 inline JavaScript、Vitest4.1.11、Node22.22.0、Playwright1.63.0；Chromium153.0.8010.12/rev1243、Firefox155.0/rev1543。不增加依赖。

---

状态：PLAN_ACCEPTED_NOT_IMPLEMENTED；实际ChatGPT第15轮独立审查VERDICT=ACCEPT，全文见result.md。本规格中的补丁只存在于Markdown，未写入产品、未编译或执行；不能作为修复成功证据。真正实施须另授权。原始ChatGPT PLAN15在 /Users/randyz/work/coding/hot_words_web/template/codex/prompts/v2.7-ws06a/iteration15-live-resize-core-repair-plan.md。

## 基线、范围与权威

未来仅可修改 /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/navigation/MobileNav.astro 和同一Starter下 tests/navigation-behavior.test.ts。

| 对象 | 精确当前SHA256 |
| --- | --- |
| MobileNav.astro | 05b304de672444c48d22f52fac30caf55d31addbb8dbc94cd87e98edc029813c |
| navigation-behavior.test.ts | dafbd7258566db89621d5d33b6610a85ea141106061b4766acb8bb3156a75f44 |
| Starter源清单 | 796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8 |
| Contract | 1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c |
| matrix | 000b8edd53f4eb99e569f81997dbefa2acbb304d38af61e4d9f9a05addf84371 |
| runner | 93b0200d5cec806091fd55ad5f4fd5da7dd835cba6aeefc5517efa76ec31d33c |
| 历史36/11证据 | c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9 |

branch=v2.7/evolution；HEAD=b067e8d4050478072f25a1dc78a8526cdd128cfd。前后19范围文件/235候选文件、743保护文件、冻结三件套、roadmap、第13/14轮证据需核对。当前47项36PASS/11FAIL保持原样。WebKit提案已接受、未实施。

未来不修改 navigation.test.ts、CSS、DesktopNav/Header、任何markup/href、Contract、矩阵、runner、validator、CI、依赖、SOP/QA/Execution Prompt/Master Prompt。第三个产品文件或需要扩大上述范围即STOP。源码实施与WebKit策略实施分开；不提交、推送、打标签、合并或发布。

## 修复模型与约束

- 缓存仅保存mode/pageId/kind；不缓存destination DOM引用。BODY恢复要求有有效导航意图、发生mode反转，且当前查询的源节点仍connected并已隐藏；源被删除则不恢复。
- 当前真实focus已在导航外时不能使用缓存。外部pointerdown即使未产生新的focusin、旧nav仍保持active，也必须撤销权限；不能只清缓存却仍从live active取回迁移权限。
- focusout microtask只可清除当时仍是同一记录的身份，不能重建旧记录或清掉迁移产生的新记录。same-mode BODY loss撤销；responsive BODY loss保留到MQL消费。
- 当前mode与上次处理mode相同直接返回；不监听generic resize。Mobile→desktop保留child/Hub映射和可见brand fallback；desktop→mobile仍为Menu summary，不改产品语义。
- fresh destination/summary/home检查connected、rect、visibility、display。有效身份且目的地缺失只可尝试可见brand；fallback不可用不得抛错或找随机链接。既有先focus父链接以展开submenu的操作仍保留。
- 原有Escape、toggle、same-document默认行为、ordinary navigation及no-JS结构全部保留。参考补丁中任何新断言失败都应停止分析，不弱化断言。

## Task 1：先建立红色回归

**Modify/Test:** 上述 tests/navigation-behavior.test.ts；保留所有现有describe/it。

- [ ] 核对并保存两个产品文件精确preimages、模式和符号链接状态；重新绑定当前source及Contract/matrix/runner。若不等于本规格基线则STOP。
- [ ] 先仅应用下方测试补丁；它只增强事件、可见性、连接与microtask环境，仍从真实MobileNav inline代码执行，不复制产品迁移算法。
- [ ] 用Node22.22.0从Starter目录运行 `npm run test -- tests/navigation-behavior.test.ts tests/navigation.test.ts`。新BODY race、microtask及pointer权限保护至少应在旧实现上暴露失败，保留实际输出。若无法形成红色证据，停止检查fixture，不制造假失败。

## Task 2：只修改inline controller

**Modify:** 上述 MobileNav.astro；仅script is:inline内部，完整参考差分见下。

- [ ] 在旧源码基线上应用下方controller补丁。该补丁是审查候选，不能绕过红/绿和真实浏览器验证；若实现需要偏离语义/扩大范围，先停止重新审查。
- [ ] 重跑相同targeted unit命令，要求现有和新增测试全部通过、无skip；若失败先定位最小原因，不能改断言迎合代码。
- [ ] 人工检查差分仅涉及两个文件且未改变原生markup、断点、click/Escape/toggle规则或依赖。保留精确postimage和未来实施过程所有失败输出。

## Task 3：真实浏览器修复控制

未来若第16轮得到源码实施授权，新增治理控制只放在 /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration16/live-resize-repair-control.ts，输出同目录focused-browser-evidence.json及preview-cleanup-audit.json；这些是未来计划定义的路径，本轮不创建。

- [ ] 沿用已有 tests/helpers/core-build-fixture.ts，必须从Starter根目录调用。创建一次adopted Field Notes final build并记录source/dist。使用已有diagnostic observers记录resize/MQL/focus/toggle/performance/checkpoints，观察真实键盘行为，不复制Core controller或注入修复逻辑。
- [ ] Chromium逐项执行下表，R1、R2分别fresh context，R3完整往返。Firefox额外验证R1/R2/R3，仍用真实Tab/Enter/Space/Escape。每个病例恰好一次流程；不retry-until-pass，不人工补焦点、不sleep-to-pass。现有4秒等待不延长，记录timeout当时状态。

| ID | 步骤 | 必须观察的结果 |
| --- | --- | --- |
| R1 | 899，Tab到Menu/Enter、Guides summary/Space、child；901 | guide.getting-started对应desktop child有焦点，mobile外层/nested关闭，MQ/CSS正确 |
| R2 | 独立901真实Tab到desktop child；899 | Menu summary焦点，移动可见、桌面隐藏 |
| R3 | 899 child→901对应child→899 | 全程真实焦点迁移，无人工补救 |
| R4 | 899 child，Escape两次到Menu，Shift+Tab到brand；901 | brand保持焦点，无desktop接管 |
| R5 | 901 child，Shift+Tab直到brand；899 | brand保持焦点，无Menu接管 |
| R6 | 899 child，真实pointer点击main非focusable空白区域；901 | 不自动进入desktop导航；记录实际活跃元素与事件顺序，不能调用内部revoke函数 |
| R7 | 899打开菜单并focus child；850 | 同一child仍有焦点，disclosures不自动关闭 |
| R8 | 901 desktop child；1200 | 同一child仍有焦点 |
| R9 | 899 child；仅在测试页面移除对应desktop target；901 | 有效源身份仍在，焦点到可见brand，无异常；不改fixture源码 |
| R10 | 899 child，Escape两次；901 | brand，不复用旧child身份 |
| N1/N2 | Chromium/Firefox分别JS disabled，390×844；真实键盘原生Menu、nested、child激活 | 导航到内容，article可访问，native披露结构保持 |

- [ ] 使用当前安装工具执行治理控制：

```sh
cd /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH node --import ./node_modules/tsx/dist/loader.mjs ../../template/codex/executions/v2.7-ws06a/iteration16/live-resize-repair-control.ts
```

期望控制exit0且所有病例完成真实断言；源/dist全程绑定。Astro preview --background捕获自身PID，finally执行同fixture的preview stop并独立确认PID消失、fixture删除、无fallback signal。无效/失败或不能安全清理即STOP。不会为该控制新增package script、CI或Vitest入口。

## Task 4：完整回归与新源证据

- [ ] focused unit与browser全部通过后，仍在相同Node/Starter执行 `npm run check`、`npm run verify:unadopted-final`、`npm run verify:adopted-final`、`git diff --check`，顺序逐条，分别保存exit/output。要求Astro clean、现有及新增tests通过、无skip；unadopted元验证确认validate/build仍因PP-02拒绝；adopted validate/check/build实际0且无非法final marker/legal输出。
- [ ] 新产品源不能用旧36/11证据验收。产生新目录，再执行当前未改动的完整47矩阵：

```sh
CORE_BROWSER_CONTRACT_MODE=FILE_SHA256 CORE_BROWSER_CONTRACT_PATH=/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md CORE_BROWSER_EVIDENCE_DIR=/Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration16/browser-evidence npm run check:browser
```

原36/11文件永久不覆盖。WebKit策略未实施，完整gate仍可能非零；应明确记录真实结果，不包装为PASS。修复专项要求live-resize Chromium行PASS、此前非WebKit PASS行无回归、无新失败类别。37/10仅是可能预期，不能预先断言；实际不同必须独立审查。完整WS-06A/AX/PA/组装/REF/release仍不获提升。
- [ ] 保存两个文件postimages、二文件diff、源/fixture/dist/engine身份、所有raw结果与cleanup，交实际ChatGPT独立审查本有限修复。

## Task 5：停止、回退和交接

- [ ] 任一新focus theft、same-mode改变焦点/open、Escape/native close残留child、目标不可用抛错或聚焦隐藏/断开元素、链接/no-JS回归、R1–R10失败、第三产品文件、依赖/Contract/matrix/runner/策略变化，即停止。禁止扩大修改、长timeout、generic resize强制focus、BODY tabindex补丁、只测forward或测试人工focus补救。
- [ ] 回退时仅当当前二文件hash等于记录的本轮postimage，才逐字节恢复各自preimage及模式；不符合则停止，保护其他未提交工作。禁止reset --hard、checkout .、clean -fd；历史失败和已审查证据保留。
- [ ] 第15轮计划审查接受后，再取得单独源码实施授权。默认继续同一Codex+ChatGPT工作流的inline执行，不开启新聊天或子代理，不自动commit/push/tag/merge。

## 可审查参考补丁（仅Markdown中，未实施/执行）

下述diff定义两个代码步骤的完整候选改动。测试使用模拟事件/CSS前提验证controller意图，不当作真实浏览器或完整可访问性证据。实施轮先只应用测试差分验证红色，再应用controller差分；实施时可在同一二文件范围内纠正真实测试暴露的实现问题，但不能改变本规格语义或放宽断言。

### src/components/navigation/MobileNav.astro

```diff
--- a/src/components/navigation/MobileNav.astro
+++ b/src/components/navigation/MobileNav.astro
@@ -92,6 +92,64 @@
       trigger(visible)?.focus({ preventScroll: true });
     };
 
+    const currentMode = () => mobileMode.matches ? "mobile" : "desktop";
+    const rootFor = (mode) => mode === "mobile" ? mobile : desktop;
+    const visible = (element) => element instanceof HTMLElement && element.isConnected &&
+      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden" &&
+      getComputedStyle(element).display !== "none";
+    const identityFor = (element) => {
+      if (!(element instanceof HTMLElement) || !element.isConnected) return null;
+      const mode = mobile.contains(element) ? "mobile" : desktop.contains(element) ? "desktop" : null;
+      if (!mode) return null;
+      const group = mode === "mobile" ? element.closest(".mobile-nav__group") : null;
+      const pageId = element.closest("[data-nav-page-id]")?.getAttribute("data-nav-page-id") ??
+        group?.querySelector(".mobile-nav__overview")?.getAttribute("data-nav-page-id") ?? null;
+      return { mode, pageId, kind: mode === "desktop" ? "desktop-page" : element === summary ?
+        "mobile-trigger" : group && element === trigger(group) ? "mobile-group" : "mobile-page" };
+    };
+    const sourceFor = (identity) => {
+      if (!identity) return null;
+      if (identity.kind === "mobile-trigger") return summary;
+      if (identity.kind === "mobile-group") {
+        const group = [...mobile.querySelectorAll(".mobile-nav__group")].find((element) =>
+          element.querySelector(".mobile-nav__overview")?.getAttribute("data-nav-page-id") === identity.pageId);
+        return group ? trigger(group) : null;
+      }
+      if (!identity.pageId) return null;
+      return [...rootFor(identity.mode).querySelectorAll("a[href]")].find((element) =>
+        identityFor(element)?.pageId === identity.pageId) ?? null;
+    };
+    let pendingIdentity = null;
+    let intentRevoked = false;
+    let previousMode = currentMode();
+    const revoke = () => { pendingIdentity = null; intentRevoked = true; };
+    const responsiveLoss = (identity, active) => {
+      if (!identity || identity.mode === currentMode() ||
+        active !== document.body && active !== document.documentElement) return false;
+      const source = sourceFor(identity);
+      return source instanceof HTMLElement && source.isConnected && !visible(source);
+    };
+    document.addEventListener("focusin", (event) => {
+      const identity = identityFor(event.target);
+      if (identity && identity.mode === currentMode() && visible(event.target)) {
+        pendingIdentity = identity;
+        intentRevoked = false;
+      } else if (!responsiveLoss(pendingIdentity, event.target)) revoke();
+    }, true);
+    document.addEventListener("pointerdown", (event) => {
+      if (!(event.target instanceof Element) || !mobile.contains(event.target) && !desktop.contains(event.target)) revoke();
+    }, true);
+    document.addEventListener("focusout", () => {
+      const observed = pendingIdentity;
+      if (!observed) return;
+      queueMicrotask(() => {
+        // An old event must not invalidate a newer focus record made by the handoff.
+        if (pendingIdentity !== observed) return;
+        if (identityFor(document.activeElement)) return;
+        if (!responsiveLoss(observed, document.activeElement)) revoke();
+      });
+    }, true);
+
     mobile.addEventListener("keydown", (event) => {
       if (event.key !== "Escape" || !(event.target instanceof Element)) return;
       const disclosure = event.target.closest("details[open]");
@@ -134,23 +192,34 @@
     });
 
     mobileMode.addEventListener("change", () => {
-      const active = document.activeElement;
+      const mode = currentMode();
+      if (mode === previousMode) return;
+      const outgoingMode = previousMode;
+      previousMode = mode;
+      const live = identityFor(document.activeElement);
+      const identity = intentRevoked ? null : live?.mode === outgoingMode ? live :
+        pendingIdentity?.mode === outgoingMode && responsiveLoss(pendingIdentity, document.activeElement) ? pendingIdentity : null;
+      revoke();
       close(mobile);
-      if (!(active instanceof HTMLElement)) return;
-      if (mobileMode.matches) {
-        if (desktop.contains(active)) summary.focus({ preventScroll: true });
-      } else if (mobile.contains(active)) {
-        const pageId = active.closest("[data-nav-page-id]")?.getAttribute("data-nav-page-id") ??
-          active.closest(".mobile-nav__group")?.querySelector(".mobile-nav__overview")?.getAttribute("data-nav-page-id");
-        const match = [...desktop.querySelectorAll("[data-nav-page-id]")]
-          .find((element) => element.getAttribute("data-nav-page-id") === pageId);
-        const destination = match?.matches("a[href]") ? match : match?.querySelector("a[href]");
-        // Parent focus exposes the existing focus-within submenu before selecting a child.
-        destination?.closest(".desktop-nav__group")?.querySelector(".desktop-nav__link")?.focus({ preventScroll: true });
-        if (destination instanceof HTMLElement && destination.getClientRects().length > 0 &&
-          getComputedStyle(destination).visibility !== "hidden") destination.focus({ preventScroll: true });
-        else home.focus({ preventScroll: true });
-      }
+      if (!identity) {
+        const current = identityFor(document.activeElement);
+        if (current?.mode === mode && visible(document.activeElement)) {
+          pendingIdentity = current;
+          intentRevoked = false;
+        }
+        return;
+      }
+      if (mode === "mobile") {
+        if (visible(summary)) summary.focus({ preventScroll: true });
+        return;
+      }
+      const match = [...desktop.querySelectorAll("[data-nav-page-id]")]
+        .find((element) => element.getAttribute("data-nav-page-id") === identity.pageId);
+      const destination = match?.matches("a[href]") ? match : match?.querySelector("a[href]");
+      const parent = destination?.closest(".desktop-nav__group")?.querySelector(".desktop-nav__link");
+      if (visible(parent)) parent.focus({ preventScroll: true });
+      if (visible(destination)) destination.focus({ preventScroll: true });
+      else if (visible(home)) home.focus({ preventScroll: true });
     });
     if (!mobileMode.matches) close(mobile);
   })();
```

### tests/navigation-behavior.test.ts

```diff
--- a/tests/navigation-behavior.test.ts
+++ b/tests/navigation-behavior.test.ts
@@ -13,6 +13,12 @@
   attributes: Record<string, string> = {};
   listeners: Record<string, (event: unknown) => void> = {};
   href = "";
+  hidden = false;
+  get isConnected(): boolean { return this.tag === "body" || Boolean(this.parentElement?.isConnected); }
+  remove() {
+    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
+    this.parentElement = undefined;
+  }
   constructor(readonly tag: string, readonly classes: string[], readonly activate: (element: ElementStub) => void) {}
   append<T extends ElementStub>(child: T): T { child.parentElement = this; this.children.push(child); return child; }
   contains(element: unknown): boolean { return this === element || this.children.some((child) => child.contains(element)); }
@@ -34,14 +40,25 @@
   setAttribute(name: string, value: string) { this.attributes[name] = value; }
   removeAttribute(name: string) { delete this.attributes[name]; }
   addEventListener(name: string, listener: (event: unknown) => void) { this.listeners[name] = listener; }
-  getClientRects() { return [{}]; }
+  getClientRects(): object[] {
+    if (!this.isConnected || this.hidden || this.parentElement?.getClientRects().length === 0) return [];
+    if (this.parentElement instanceof DetailsStub && !this.parentElement.open && this.tag !== "summary") return [];
+    return [{}];
+  }
   focus() { this.activate(this); }
 }
 class DetailsStub extends ElementStub { open = false; }
 
-function fixture(withDesktop = true) {
+function fixture(withDesktop = true, initialMobile = true) {
+  const documentListeners: Record<string, (event: unknown) => void> = {};
+  const microtasks: Array<() => void> = [];
   let active: ElementStub;
-  const activate = (element: ElementStub) => { active = element; };
+  const activate = (element: ElementStub) => {
+    if (active === element) return;
+    documentListeners.focusout?.({ target: active, relatedTarget: element });
+    active = element;
+    documentListeners.focusin?.({ target: element });
+  };
   const element = (tag: string, ...classes: string[]) => new ElementStub(tag, classes, activate);
   const body = element("body"); active = body;
   const header = body.append(element("header", "site-header"));
@@ -61,19 +78,36 @@
   const child = group.append(element("a")); child.href = "/guides/item/";
   child.attributes["data-nav-page-id"] = "guide.item";
   const main = body.append(element("main"));
-  const mode = { matches: true, change: () => {}, addEventListener: (_name: string, listener: () => void) => { mode.change = listener; } };
+  let matches = initialMobile;
+  const mode = {
+    get matches() { return matches; },
+    set matches(value: boolean) { matches = value; mobile.hidden = !value; desktop.hidden = value; },
+    change: () => {},
+    addEventListener: (_name: string, listener: () => void) => { mode.change = listener; },
+  };
+  mode.matches = initialMobile;
   runInNewContext(script ?? "", {
     Element: ElementStub, HTMLElement: ElementStub, HTMLDetailsElement: DetailsStub, URL,
-    document: { querySelector: (selector: string) => body.querySelector(selector), get activeElement() { return active; },
+    document: { body, documentElement: body,
+      addEventListener: (name: string, listener: (event: unknown) => void) => { documentListeners[name] = listener; },
+      querySelector: (selector: string) => body.querySelector(selector), get activeElement() { return active; },
       getElementById: (id: string) => id === "main-content" ? main : null },
     window: { location: { href: "https://field-notes.example/" }, matchMedia: () => mode },
-    getComputedStyle: () => ({ visibility: "visible" }),
+    queueMicrotask: (callback: () => void) => { microtasks.push(callback); },
+    getComputedStyle: (element: ElementStub) => ({ visibility: element.hidden ? "hidden" : "visible",
+      display: element.getClientRects().length ? "block" : "none" }),
   });
   const send = (name: string, target: ElementStub, key?: string) => {
     const event = { target, key, defaultPrevented: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
     mobile.listeners[name]?.(event); return event;
   };
-  return { mobile, group, summary, groupSummary, child, main, home, desktopParent, desktopChild, mode, send,
+  return { body, mobile, group, summary, groupSummary, child, main, home, desktopParent, desktopChild, mode, send,
+    browserBodyLoss: () => {
+      documentListeners.focusout?.({ target: active, relatedTarget: null });
+      active = body; // The recorded browser loss has no subsequent focusin to a user-chosen target.
+    },
+    flushMicrotasks: () => { while (microtasks.length) microtasks.shift()?.(); },
+    pointerOutside: () => { documentListeners.pointerdown?.({ target: main }); },
     get active() { return active; }, open: () => { mobile.open = true; group.open = true; } };
 }
 
@@ -152,3 +186,67 @@
     expect(native.mobile.listeners).toEqual({}); expect(native.mobile.open).toBe(true);
   });
 });
+
+
+describe("breakpoint focus migration intent", () => {
+  it("recovers mobile page identity after browser BODY loss precedes MQL", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.mode.matches = false;
+    view.browserBodyLoss(); view.flushMicrotasks(); view.mode.change();
+    expect(view.active).toBe(view.desktopChild);
+  });
+  it("recovers reverse identity after browser BODY loss precedes MQL", () => {
+    const view = fixture(true, false); view.desktopChild.focus(); view.mode.matches = true;
+    view.browserBodyLoss(); view.flushMicrotasks(); view.mode.change();
+    expect(view.active).toBe(view.summary);
+  });
+  it("does not steal outside focus on either crossing direction", () => {
+    for (const initialMobile of [true, false]) {
+      const view = fixture(true, initialMobile); view.open();
+      (initialMobile ? view.child : view.desktopChild).focus(); view.home.focus();
+      view.mode.matches = !initialMobile; view.mode.change(); expect(view.active).toBe(view.home);
+    }
+  });
+  it("revokes same-mode BODY loss before a later crossing", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.browserBodyLoss(); view.flushMicrotasks();
+    view.mode.matches = false; view.mode.change(); expect(view.active).toBe(view.body);
+  });
+  it("bounds missing-target fallback to visible connected home", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.desktopChild.remove();
+    view.mode.matches = false; view.browserBodyLoss(); view.mode.change(); expect(view.active).toBe(view.home);
+  });
+  it("leaves browser focus unchanged when missing target and home are unavailable", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.desktopChild.remove(); view.home.hidden = true;
+    view.mode.matches = false; view.browserBodyLoss();
+    expect(() => view.mode.change()).not.toThrow(); expect(view.active).toBe(view.body);
+  });
+  it("uses the updated group and outer-trigger identities after Escape", () => {
+    const group = fixture(); group.open(); group.child.focus(); group.send("keydown", group.child, "Escape");
+    group.mode.matches = false; group.browserBodyLoss(); group.mode.change(); expect(group.active).toBe(group.desktopParent);
+    const outer = fixture(); outer.open(); outer.child.focus(); outer.send("keydown", outer.child, "Escape");
+    outer.send("keydown", outer.groupSummary, "Escape"); outer.mode.matches = false;
+    outer.browserBodyLoss(); outer.mode.change(); expect(outer.active).toBe(outer.home);
+  });
+  it("uses Menu identity after native ancestor close", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.mobile.open = false; view.send("toggle", view.mobile);
+    expect(view.active).toBe(view.summary); view.mode.matches = false; view.browserBodyLoss(); view.mode.change();
+    expect(view.active).toBe(view.home);
+  });
+  it("does not reuse a removed outgoing semantic source", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.child.remove(); view.mode.matches = false;
+    view.browserBodyLoss(); view.mode.change(); expect(view.active).toBe(view.body);
+  });
+  it("does not migrate or close disclosures for unchanged media mode", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.mode.change();
+    expect(view.active).toBe(view.child); expect(view.mobile.open).toBe(true); expect(view.group.open).toBe(true);
+  });
+  it("respects outside pointer intent even if the old nav still has live focus", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.pointerOutside(); view.mode.matches = false;
+    view.mode.change(); expect(view.active).toBe(view.child); // The controller performs no focus call.
+  });
+  it("does not let an old microtask erase the newly migrated identity", () => {
+    const view = fixture(); view.open(); view.child.focus(); view.mode.matches = false;
+    view.browserBodyLoss(); view.mode.change(); view.flushMicrotasks(); expect(view.active).toBe(view.desktopChild);
+    view.mode.matches = true; view.browserBodyLoss(); view.flushMicrotasks(); view.mode.change();
+    expect(view.active).toBe(view.summary);
+  });
+});
```
