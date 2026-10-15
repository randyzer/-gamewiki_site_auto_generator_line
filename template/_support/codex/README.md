# Codex Collaboration Workspace

Purpose: fixed execution-record workspace for the AI Architect + Codex Engineer operating model.

## Directory contract

- `prompts/` — exact prompts approved for Codex execution.
- `executions/` — Codex execution summaries/results.
- `verifications/` — independent AI Architect verification after each execution.

## Required task flow

1. AI Architect defines current session objective and architecture/task boundary.
2. Prompt is saved under `prompts/<phase>/<task>/prompt.md` before execution.
3. Codex executes only the saved task boundary.
4. Execution result is saved under the matching `executions/` path.
5. AI Architect independently checks goal, scope, diff, tests and regression.
6. Verification is saved under the matching `verifications/` path.
7. Only an accepted task may proceed to the next task/commit gate.

## Prompt minimum fields

Every prompt must state:
- project objective and current phase
- exact workspace
- task goal
- allowed files/actions
- forbidden files/actions
- acceptance criteria
- required tests/evidence
- STOP conditions

Chat messages are not the execution system of record. Saved prompt/result/verification artifacts are.
