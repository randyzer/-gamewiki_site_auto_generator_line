# BrowserSkill 0.3.2 favicon.io upload — safe upstream reproduction draft

**Status: NOT SUBMITTED to GitHub.** This document records a verified local issue and a proposed upstream investigation. No third-party account action, daemon patch or browser permission change was performed in this task.

## Environment

- Mac mini, macOS with Chrome BrowserSkill extension 0.3.2
- BrowserSkill CLI `bsk 0.3.2`
- `bsk doctor --json`: 8/8 checks okay (daemon, local identity, extension connection, protocol compatibility)
- Chrome "Allow access to file URLs" explicitly **ENABLED** and independently read back from the Chrome extension profile
- Public site `https://favicon.io/favicon-converter/`
- Synthetic test-only 512×512 RGBA PNG; not any private or third-party asset
- Owned browser window/session, real Mac human approval per command

## Repro facts

1. Create a fresh isolated bsk session and tab; navigate the current tab to `https://favicon.io/favicon-converter/`.
2. In browser, verify exactly one `input[type=file]`, visible and enabled. A unique visible Dropzone contains it; no visible associated `label` or button.
3. Execute a single `bsk upload` with:
   - explicit `--selector 'input[type="file"]'`
   - explicit `--mode input`
   - absolute existing test PNG file supplied via `--file`
   - correct owned `--session`, `--tab-id`, `--timeout 18s`, `--json`
4. Actual command has a distinct human approval. Host verifies PNG bytes, SHA256, and tool snapshot exists.
5. Observed result after timeout: command result `COMMAND_TIMEOUT`, CLI exit code `3`, `bskReason=UNVERIFIED`, `effectState=unverified`, stderr length 0. Earlier tests at a 30s limit showed the same behavior. Actual site acceptance cannot be established.
6. Stop. Do **not** replay the failed upload or switch to drop mode because `effect_state` is unknown. Close only the owned session with an additional approval.

## What remains unknown

- Whether the CLI times out before receiving an extension file-chooser event, or the extension has an incompatible direct-input behavior on this page.
- Whether a distinct visible chooser label would work: none was identified on this exact favicon.io page.
- Whether the BrowserSkill extension could reliably return `reason=file_input_not_activated, effect_state=none` in this situation. Current output is unverified, so the existing one-shot Drop mechanism is correctly blocked.
- The user **manually** completed an equivalent test on the same website: genuine downloaded `favicon_io.zip` passed 7-member binary checks, and its 512px image matched the uploaded synthetic PNG pixels 100%. This separates website conversion functionality from the bsk upload failure, but is not a BrowserSkill automated transfer test.

## Suggested upstream fix or instrumentation (without bypasses)

- Emit a stable machine-readable error with explicit `reason`, `effect_state` on all `bsk upload --json` failure and timeout paths. If the effect cannot be established, emit `unknown`, never imply `none`.
- Differentiate attempted click/file chooser activation from successful dispatch and site acceptance.
- Investigate behavior when the target selector references the actual visible `input[type=file]` instead of a chooser-triggering button/label, including Dropzone React components.
- Add integration tests for input-mode failure followed by **manually approved, same-session, same-file-hash** Drop-mode fallback only on explicit `file_input_not_activated + effect_state=none`.
- Never dump raw page text, cookies, local file paths or private error payloads into shareable logs.

## Safe local tracking

The agent currently has an explicitly opt-in, user-approved manual favicon handoff path in `M3_HOMEPAGE_MANUAL_FAVICON_FALLBACK_2026-10-14.md`. This does **not** fix or enable automatic BrowserSkill upload/download. The production policy remains `atomicFileTransferSupported=false`.

No additional real uploads were made during creation of this issue draft.
