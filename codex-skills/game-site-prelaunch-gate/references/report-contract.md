# Report Contract

## `PRELAUNCH_ACCEPTANCE.json`

Use UTF-8 JSON with this top-level structure:

```json
{
  "schema_version": "1.0",
  "run_id": "2026-10-10T120000Z",
  "game": "Example Game",
  "project_path": "/absolute/path",
  "expected_domain": "https://example.test",
  "mode": "audit-only",
  "coverage": {"routes_expected": 0, "routes_checked": 0, "limitations": []},
  "pages": [{
    "path": "/",
    "release_status": "PUBLISHED",
    "title": "",
    "description": "",
    "h1": "",
    "target_keyword": "",
    "body_word_count": 0,
    "keyword_count": 0,
    "keyword_density": null,
    "checks": {"desktop": "PASS", "mobile_390": "PASS"}
  }],
  "checks": [],
  "seo_url_audit": {
    "robots": {"status": "PASS", "http_status": 200, "sitemap_directives": []},
    "sitemap": {"status": "PASS", "http_status": 200, "loc_count": 0, "domain_mismatches": [], "missing_published_routes": [], "draft_or_blocked_routes": []}
  },
  "findings": [{
    "id": "PL-001",
    "severity": "P1",
    "status": "OPEN",
    "page": "/",
    "category": "technical-seo",
    "evidence": "Observed value and source",
    "recommendation": "Bounded action",
    "source": "file or viewport evidence"
  }],
  "repairs": [],
  "disposition": "暂不建议上线"
}
```

Use unique finding IDs (`PL-001`, incrementing). Allowed finding severities are `P0`, `P1`, `P2`, `NOTE`; statuses include `OPEN`, `FIXED`, `NEEDS_CONFIRMATION`, and `ACCEPTED_WITH_REASON`. Do not put secrets or full credential values into JSON, screenshots, or logs.

## Markdown report sections

`PRELAUNCH_ACCEPTANCE_REPORT.md` must include:

1. Decision and counts by severity/status.
2. Scope, domain, mode, runtime, preview URL, and coverage limitations.
3. Complete page inventory and route-source discrepancies.
4. Finding table with ID, severity, page, evidence, status.
5. Per-page TDH/keyword table.
6. Content/provenance/manual confirmation gaps.
7. Link, technical SEO, responsive, accessibility, performance, and secret-scan results; explicitly include robots/sitemap production responses, new-domain checks, published-route membership, and draft/blocked exclusions.
8. Build/typecheck/lint/test and production-preview results.
9. Completed repairs and retest outcomes.
10. Final launch disposition and exact remaining gate.

`REPAIR_MANIFEST.md` must list modified paths, what changed, why the issue was confirmed, validation command/results, and remaining risk. If nothing changed, say `No project files changed` and record audit-only or no qualifying repairs.
