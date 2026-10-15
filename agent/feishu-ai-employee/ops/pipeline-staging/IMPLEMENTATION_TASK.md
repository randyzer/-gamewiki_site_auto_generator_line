# Codex implementation task: seven-stage Game Site Agent orchestration

Staging root (write only here):
/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/feishu-ai-employee/ops/pipeline-staging

Read-only primary specification:
/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/AGENT_TASK_CARD_AND_WORKFLOW_SPEC_V0.1.md
Read-only existing skills:
/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/codex-skills

Implement *only* new files:
- src/pipeline.mjs
- tests/pipeline.test.mjs
- ops/PIPELINE_IMPLEMENTATION_NOTES.md

DO NOT edit existing main.mjs/core.mjs/agent.mjs/workflow.mjs/.env, existing game sites, templates, source Skills, or Git. Do not deploy, push, change credentials, request broad permissions, or run risky shell commands. No additional dependencies.

Build a strict pure orchestration core using Node.js ESM that can later be integrated with the existing Feishu queue. It must support:

1. Seven mandatory stages in this order:
game-homepage-icon-research,
game-innerpage-keyword-information-research,
game-site-template-selector,
game-site-content-integrator,
game-site-ui-ux-audit-optimizer,
game-site-prelaunch-gate,
game-site-deploy-and-measurement.
Optional eighth stage game-site-adsterra-ad-integration only if explicitly enabled with user-supplied ad code.

2. Version lock (read inventory manifest at /Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/feishu-ai-employee/data/skill-manifest.json; verify each referenced source file SHA256; detect changes), no mutation of source skill files, no automatic upgrades from unverified repos.

3. Input list ordered by stage, with must-have now vs later. Game identity, absolute project path and user objective before starting. Explicit raw keywords Markdown file provided by user before keyword stage, never invent keywords. Canonical origin for content if needed; deployment stage needs domain, repo, DNS and explicit authorization.

4. Deterministic states NOT_STARTED,READY,IN_PROGRESS,WAITING_FOR_USER,BLOCKED,PASSED,PARTIAL,FAILED,SKIPPED. No stage auto-passes on PARTIAL, BLOCKED or missing artifacts. Evidence and resume checkpoint per stage.

5. Approval gates for UI changes, git push, DNS, production deployment, GSC/GA4, advertising scripts. Audit-only is default. Pipeline may create a deployment *plan*, but never automatically execute deployment even if stage outputs look passed.

6. Executor is an injectable async function (skill, context) => {status, artifacts, evidence, missing_inputs}, so tests run fully offline and no actual Codex or external tool calls. Validate executor output and prevent path escape/unsafe output target (no symlinks/template source). Keep outputs under provided workspace directory.

7. Persist a serializable run manifest; use explicit user input updating to resume WAITING stage; prevent duplicate stage invocation and concurrency bugs. Do not write to site folder before inputs pass.

8. At least 12 tests including missing inputs, keyword requirement, approval, state transition, wrong project artifact, resume, SHA mismatch, never deploy by default, optional ad branch, partial failure, checkpoint persistence.

9. Ensure Node 22 syntax and tests pass with node --test tests/pipeline.test.mjs, report exact results. If spec questions remain, document limitations rather than invent assumptions.

This creates a separate orchestration module, not yet wired to live Feishu until reviewed and approved.