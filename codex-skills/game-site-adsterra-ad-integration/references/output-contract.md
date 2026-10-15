# Output Contract

Create a timestamped run under `<project>/docs/ad-integration/<run-id>/`. Preserve earlier runs.

## `AD_PLACEMENT_PLAN.md`

Before source edits, record:

- Game/site, canonical target, project framework, and inspected route groups.
- Ad format and code behavior inferred from the supplied snippet; redact IDs and never include the full code.
- Each proposed route, slot/component, rationale, format, desktop/mobile treatment, and excluded areas.
- Existing ad tags, consent/CSP/privacy dependencies, loading and performance risks.
- Local checks, deployment path, approval requirements, and post-deployment acceptance checks.

## `AD_INTEGRATION_MANIFEST.json`

Use UTF-8 JSON:

```json
{
  "schema_version": 1,
  "run_id": "YYYYMMDD-HHMMSS",
  "project_path": "/absolute/path",
  "production_url": "https://example.test",
  "ad_network": "Adsterra",
  "ad_format": "",
  "ad_code_sha256": "",
  "changed_files": [],
  "placements": [
    {
      "route_pattern": "/guides/*",
      "component": "",
      "desktop_behavior": "",
      "mobile_behavior": "",
      "status": "IMPLEMENTED"
    }
  ],
  "deployment": {
    "status": "NOT_STARTED",
    "commit": "",
    "url": ""
  }
}
```

Do not include the full ad code, passwords, tokens, or private keys.

## `AD_INTEGRATION_REPORT.md`

Update after deployment with:

- Plan and user confirmation reference.
- Changed files and code hash; deployment provider/status, production URL, and commit.
- Route and viewport test matrix.
- Separate results for script requested, script loaded, ad rendered, and impression/revenue observability.
- Console/network errors, overlaps, responsive issues, consent/CSP constraints, and screenshots.
- Final disposition: `PASS`, `PARTIAL`, `FAIL`, or `BLOCKED`.
- Remaining work and explicit limits of the test.

A `PASS` requires successful deployment and observed expected ad rendering on the approved route/viewport checks, with no blocking integration or layout defect. If ad delivery is blocked by an ad blocker, geography, consent state, fill, or provider-side behavior, report that cause and use `PARTIAL` or `BLOCKED`. Never infer revenue from code or rendering.
