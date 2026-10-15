# Output contract

## Run directory

Use `docs/ui-ux-audit/YYYYMMDD-HHMMSS/`. Keep all screenshots and machine-readable data inside the run directory. Store a relative run path in `docs/ui-ux-audit/LATEST`.

## UI_UX_AUDIT.json

Required shape:

```json
{
  "schema_version": 1,
  "game": "Game Name",
  "mode": "audit-only",
  "target": "http://localhost:3000",
  "generated_at": "ISO-8601",
  "framework": "nextjs",
  "routes": [
    {
      "route": "/",
      "archetype": "home",
      "reason": "required"
    }
  ],
  "viewports": [360, 390, 768, 1024, 1440, 1920],
  "findings": [
    {
      "id": "UX-001",
      "severity": "HIGH",
      "category": "responsive",
      "route": "/guides",
      "viewport": "390x844",
      "state": "default",
      "evidence": "Table exceeds the viewport by 126 CSS pixels.",
      "impact": "Players cannot read the final columns.",
      "recommendation": "Wrap the table in a labelled horizontal scroll region.",
      "verification": "Recheck document width and scroll region at 390px.",
      "screenshot": "screenshots/guides/mobile-390.png",
      "status": "OPEN"
    }
  ],
  "summary": {
    "blocker": 0,
    "high": 1,
    "medium": 0,
    "low": 0,
    "note": 0
  },
  "verdict": "SHIP_WITH_FIXES"
}
```

Allowed verdicts:

- `SHIP`
- `SHIP_WITH_FIXES`
- `NEEDS_WORK`
- `BLOCKED`

## UI_UX_AUDIT_REPORT.md

Include:

- Target and run context.
- Pages, archetypes, viewports, and interactions tested.
- Evidence limitations and unavailable checks.
- Verdict.
- Findings ordered by severity.
- Screenshot references.
- Recommended repair order.
- Explicit statement that taste notes are not measured failures.

## UI_UX_OPTIMIZATION_PLAN.md

For each proposed change include:

- Finding ID.
- Files/components likely affected.
- Minimal repair.
- Risks.
- Verification command and browser reproduction.
- Approval status.

Creating this plan does not authorize implementation.

## UI_UX_CHANGE_MANIFEST.md

Required only when source changed. Include:

- Baseline Git state.
- Approved scope.
- Files changed and why.
- Dependencies changed; normally none.
- Findings addressed.
- Unrelated pre-existing changes preserved.

## UI_UX_RETEST_REPORT.md

Required only after optimization. Include:

- Original reproduction.
- Before/after screenshot pairs.
- Build/test results.
- Status for every approved finding.
- Remaining risks and blockers.
