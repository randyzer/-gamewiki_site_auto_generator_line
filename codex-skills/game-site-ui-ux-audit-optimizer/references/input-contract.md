# Input contract

## Required user values

- Game name.
- Absolute target game workspace.

Default to audit-only. Source modification requires an explicit request to optimize or fix.

## Target resolution

Accept one of:

1. A user-supplied HTTP(S) URL.
2. An already-running local URL.
3. A project that can be started with an existing package script and existing dependencies.

Never guess a remote production domain. Never install dependencies or browser binaries during input resolution.

Recognized page roots:

- `app/`
- `pages/`
- `src/pages/`

Recognized primary frameworks are Next.js and Astro. Other frameworks require an explicit confirmation that the detected start/build commands are correct.

## Derived project context

Check, when present:

- `docs/TEMPLATE_SELECTION_REPORT.md`
- `docs/template-copy-manifest.json`
- `docs/CONTENT_INTEGRATION_REPORT.md`
- `docs/CONTENT_PAGE_MANIFEST.json`
- `docs/CONTENT_PROVENANCE.md`
- `docs/CONTENT_GAPS.md`

Absence is a warning unless the requested comparison needs that artifact.

## Consolidated missing-input question

Ask once and list only unresolved items:

```text
开始游戏攻略站UI/UX审计前，还需要确认：

- 游戏名：
- 目标游戏工作目录：
- 审计目标：现有URL，或允许使用项目现有脚本启动本地站点
- 优化授权：默认只审计；如需修改，请明确允许的范围

在确认前，我不会启动服务、安装依赖、生成报告或修改源码。
```

## Preflight blockers

- Empty game name.
- Missing or non-absolute workspace.
- Workspace inside the immutable template library.
- Missing `package.json`.
- No recognized page root.
- No usable URL and no usable existing start/preview script.
- Requested optimization without explicit authorization.
- Dirty Git worktree not acknowledged before optimization.

Browser automation availability is reported separately. If neither an agent browser nor project-local Playwright is available, pause and request a dependency decision.

Preflight is read-only. Its optional JSON output must be outside the target workspace.
