---
name: game_site_orchestrator
description: "Explicit Codex entrypoint for the existing seven-stage game website orchestrator CLI. Use to inspect, prepare, or (only after approval) run/resume a project; do not create a parallel orchestration implementation."
---

# Unified game-site orchestrator invocation adapter

This Skill is an INVOCATION ADAPTER for the real application. It is NOT another homepage research Skill, a parallel state machine, or a substitute for project-level `.codex/agents/game_site_orchestrator.toml`.

Work from `/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent`. Read `README.md`, `src/cli.mjs`, `src/orchestrator.mjs`, `src/pipeline.mjs` and the canonical workflow spec before selecting an action.

## Unified Entry V1: natural-language project intake (safe, no worker)

When the user says something like "帮我为 Hood Warfare 2 建一个攻略站",
FIRST use the pre-execution entry desk instead of invoking `run` or `retry`.
Translate **only explicitly provided** game name, Steam store URL/App ID,
objective, new-vs-existing mode, and user-confirmed paths to the versioned
entry input object. Never guess a Steam App ID, content materials, project
path, domain, or approval. If the intent is unclear, preview with missing
fields and ask the user. Do not paste credentials into an entry card.

From the trusted `agent/` project root, pipe the bounded JSON to
`node src/cli.mjs entry-preview -` using a **pipe**, not a heredoc.
A read-only zsh sandbox cannot create the temporary file underlying a
heredoc. Correct, temp-file-free example for already confirmed facts:

```sh
printf '%s\n' '{"mode":"new-site","gameIdentity":"Hood Warfare 2","objective":"English guide site","gameMetadata":{"steam":"https://store.steampowered.com/app/5155360/"}}' | node src/cli.mjs entry-preview -
```

Shell-quote any supplied string safely as data; do not interpolate arbitrary
user text into unescaped shell code. If exact safe quoting is unavailable,
return BLOCKED instead of creating a file or bypassing the read-only sandbox.
This command is
**read-only** and must be used before any draft creation. The output
validates the local eight-Skill hashes against the current manifest; do NOT
call `inventory` to conceal drift. Present the entire staged checklist
ordered by Skill, clearly marking "now", "later", "conditional" and
"verified" along with any BLOCKED reason.

If the user explicitly permits saving a run-scoped draft (no site changes),
choose a unique safe RUN_ID and call
`node src/cli.mjs entry-create - RUN_ID` with the exact reviewed card.
It saves only `agent/runs/RUN_ID/ENTRY_INTAKE_V1.json`, never a
pipeline manifest and never calls Codex or BrowserSkill.
`node src/cli.mjs entry-status RUN_ID` is read-only.
When the user adds information, propose a patch first, then call
`node src/cli.mjs entry-update - RUN_ID EXPECTED_REVISION`. Use the
revision reported by status; never overwrite a stale revision.
The same run ID is recoverable; only a new approved action can eventually
start the existing orchestrator.

Interpret entry states precisely:
- WAITING_FOR_USER: ask for only current missing facts. Late-stage inputs
  (especially the user's RAW keyword Markdown) appear in the staged
  checklist; never invent them. A later 10-minute reminder is not
  scheduled merely by creating a draft; no daemon timer is started.
- BLOCKED: missing/outdated Skill inventory or unsupported existing-project
  path; explain and request separate review. Do not update Skills silently.
- READY_FOR_APPROVAL: material-check entry gate passed, **NOT** a
  permission to execute any Skill or to publish a site.

Existing projects MUST use the separate versioned intake-card/allowlist
workflow. The current Entry V1 deliberately provides only a safe entry
preview for existing projects; it cannot bypass source protection.

DO NOT promote the saved Entry V1 document to a `manifest.json` or
automatically call `run/retry`. A separately approved execution plan must
identify the exact new project inputs, workspace, Skill lock and side
effects before the original orchestrator can be launched.

## Read-only inspection

For a health check, use `node --check src/cli.mjs` and inspect existing manifests/docs. `node src/cli.mjs review-card VALID_CARD.json` only reads its supplied input file and returns a summary; validate which card is used. Never execute `inventory` during read-only checks: it WRITES `config/skill-manifest.json`.

State the exact commands actually run and cite local evidence. If a command cannot execute, say BLOCKED; never invent results.

## When the user explicitly asks to create or resume a site task

First enumerate required game identity/platform/version, objective and user-provided original keyword Markdown. Obtain explicit approval for actual execution and affected workspace.

Use ONLY the existing program entrypoint:
- `node src/cli.mjs run INPUTS.json RUN_ID`
- `node src/cli.mjs retry INPUTS.json RUN_ID`

Never call individual Skills to bypass the pipeline; never implement another pipeline or duplicate approval workflow. Inputs and outputs must be placed in the agent root's allowed workspace and run directories; never modify existing game sites or templates by default.

The CLI may invoke a nested Codex worker; if nested execution, browser/network permissions, or approval capability are unavailable, preserve BLOCKED/WAITING_FOR_USER. Do not disable sandbox or silently switch execution providers.

`preflight` writes reports; `inventory` updates a manifest; `run` and `retry` can write files and start real workers. Do not run those without informed user authorization. Production GitHub push, deployment, DNS, GSC/GA4, ads or payments require explicit separate approvals.

Read actual CLI status JSON; exit code 2 may represent WAITING_FOR_USER/BLOCKED/PARTIAL/FAILED, not an application crash. Always report `run_id`, current stage, missing inputs, artifact paths, and approval blockers from existing records. Never claim a plan means deployment has occurred.

## Current scope

Do not modify `feishu-ai-employee/` or the original source Skills. For a smoke test, do ONLY `node --check src/cli.mjs` and inspect the CLI command surface. Name-based invocation syntax: `$game_site_orchestrator`.
