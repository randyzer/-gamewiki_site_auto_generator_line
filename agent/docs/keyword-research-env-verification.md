# Keyword worker environment verification — 2026-10-16

Branch: `fix/keyword-research-env`. Base: `56726db931d26229ddda3fa10e7521f0d3c50776`.

## Result

The real Codex CLI 0.153.0 worker passed all three requested commands with exit code 0 under the keyword-stage profile. No research was performed. The verifier checked credential values before recording output and removed its temporary run directory in `finally`.

The worker's result schema deliberately uses `status: BLOCKED` for this synthetic run, because it does not produce research artifacts. The separate verification result is `acceptance: PASSED`; all three command outputs and exit codes are checked independently.

## Codex 0.153 environment inheritance evidence

The locally installed binary reports `codex-cli 0.153.0`. Its embedded `ShellEnvironmentPolicyTomlRaw` configuration fields include `inherit`, `ignore_default_excludes`, `set`, and `include_only`. The real worker accepted these options with `--strict-config` and successfully read the inherited variable without its value being placed in CLI arguments.

Only KEYWORD_RESEARCH uses:

```toml
shell_environment_policy.inherit = "all"
shell_environment_policy.ignore_default_excludes = true
shell_environment_policy.include_only = ["PATH", "TMPDIR", "SERPER_API_KEY"]
```

`YTDLP_COOKIES_FILE` is added to this name whitelist only when configured. `set` contains the pinned PATH and TMPDIR, never credential values. Other stages use `inherit = "none"` and omit both credential names from their arguments. Tests cover both optional-cookie cases and all seven other stages.

## yt-dlp launch and explicitly relaxed constraints

The original direct-script requirement failed in the macOS sandbox at the Homebrew venv interpreter link. On 2026-10-16 the user authorized relaxing constraints and continuing to completion.

The final wrapper executes the framework Python binary from the same pinned Python installation, with `-I` and `__PYVENV_LAUNCHER__` pointing to the original venv interpreter. CPython discovers the original `pyvenv.cfg` and installed dependencies. It executes the original resolved yt-dlp entry point; no Homebrew installation files are edited and no packages are copied or installed. The shebang interpreter must resolve to the pinned Python; the framework binary must remain inside its already-readable Python root.

The read-only libexec root remains included. After resolving the interpreter issue, sandbox diagnostics exposed external certifi and OpenSSL dependencies. The additional keyword-only read grants are exactly:

```text
/opt/homebrew/Cellar/certifi/2026.7.22/lib/python3.14/site-packages/certifi
/opt/homebrew/Cellar/openssl@3/3.6.3/lib/libssl.3.dylib
/opt/homebrew/Cellar/openssl@3/3.6.3/lib/libcrypto.3.dylib
```

The helper resolves these installed versions at runtime and checks that each target stays within its named Homebrew formula. `DYLD_LIBRARY_PATH` selects the canonical OpenSSL library directory, but only the two library files receive read grants. No entire Homebrew, Cellar, opt, or OpenSSL directory is authorized. Network and write permissions are unchanged.

These are the differences from the original task: indirect framework-Python launch replaces direct script execution for the Homebrew venv, three narrowly scoped dependency reads are added, and ChatGPT review replaces Claude review per the user's later prohibition. The supported venv layout is macOS Homebrew; incompatible layouts fail closed at host preflight.

## Actual three-command output

1. `[ -n "$SERPER_API_KEY" ] && echo present || echo missing` — exit 0:

```text
present
```

2. The generated wrapper `--version` — exit 0:

```text
2026.08.19
```

3. The resolved fixed Python plus the absolute locked `research_cli.py` path and `check` — exit 0:

```json
{
  "serper_api_key": "present",
  "yt_dlp": "2026.08.19",
  "javascript_runtimes": {
    "deno": "missing",
    "node": "/usr/local/bin/node",
    "bun": "missing",
    "qjs": "missing"
  },
  "cookie_file": "not configured"
}
```

This validates startup/environment, not external Serper/YouTube requests or subtitle retrieval. Optional cookie inheritance was covered by unit tests; no cookie file was configured during the real run.

## Tests

Tests were added before the corresponding implementation. The framework regressions initially gave 17 pass / 3 fail. The dependency assertions initially gave 19 pass / 2 fail. Review added two further failing regressions for missing venv configuration and an unpinned standalone interpreter; both passed after tightening the fallback. Final targeted executor and permission tests: 35 pass / 0 fail.

Required completion commands:

```sh
cd agent && node src/cli.mjs inventory && node --test tests/*.test.mjs
```

Inventory exited 0. Final TAP summary:

```text
1..640
# tests 654
# suites 0
# pass 654
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

`git diff --check` and JavaScript syntax checks passed. `codex-skills/` is unchanged. No push or amend was performed.

ChatGPT independently reviewed the final code and complete test/worker outputs in C2C task `c2c_7b2e`, iteration 7: **ACCEPT**, no remaining blocking findings. The review is retained in [the collaboration conversation](https://chatgpt.com/c/6acdf447-28b8-83ec-b7ac-539dfd1103eb). Claude was not used after the user's prohibition.

Reproduce the real worker validation with a key already present in the host environment:

```sh
cd agent
node scripts/verify-keyword-worker-env.mjs /tmp/keyword-worker-verification.json
```

The script requires exactly the three intended commands, three zero exit codes, `present`, and matching yt-dlp versions. It rejects credential values before output/report persistence and cleans the generated run directory on success or failure.

Final real-run source SHA-256 identities:

| File (relative to agent/) | SHA-256 |
| --- | --- |
| src/skill-executor.mjs | cfd7a56aa69f11eafc8f0f6161af40ef1bbfb946722bddb552cdca7562070b79 |
| src/keyword-ytdlp.mjs | 173976969e61e6eda5454ba018278354781b9b760c084471417b042bce3642a5 |
| src/worker-permissions.mjs (unchanged) | f74cc4075f434ec4a977883e182698d599c76a1b9ab4c4db80b382268211ea57 |
| scripts/verify-keyword-worker-env.mjs | 0eaf6231187f521560e56b8ed57a105dcb50c7268f0eb2a29be629b592782079 |

The final worker reported that its shell tool did not expose a `login` argument; the launch configuration nevertheless sets `allow_login_shell=false`, and all three recorded commands used `/bin/zsh -c` without a login flag.
