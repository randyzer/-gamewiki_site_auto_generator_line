# Output contract

Write the final report to `docs/TEMPLATE_SELECTION_REPORT.md` in the copied game workspace.

# {Game Name} Template Selection Report

## Decision

- Game:
- Selected main template:
- Template source path:
- Destination path:
- Decision status: SELECTED / NEEDS USER DECISION / BLOCKED
- Research date:
- Copy status: COPIED / NOT COPIED
- Source integrity: VERIFIED UNCHANGED / NOT VERIFIED

## Game design brief

| Attribute | Finding | Evidence |
| --- | --- | --- |
| Platform and genre | ... | URL or supplied file |
| Core player loop | ... | ... |
| Visual tone | ... | ... |
| Main search intents | ... | ... |
| Expected IA | ... | ... |
| Article/media needs | ... | ... |

Clearly label inferences.

## Template scorecard

| Rank | Template | IA /25 | Visual /20 | Content /20 | Article /15 | Discovery /10 | Safety /10 | Total /100 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | ... | ... | ... | ... | ... | ... | ... | ... |

## Evidence by template

### {Template}

- Strengths for this game:
- Mismatches:
- Evidence inspected:
- Score rationale:

Repeat for every candidate.

## Why the selected template wins

State the three to five decisive reasons, followed by the main compromises. Do not describe a cosmetic resemblance as architectural fit.

## Supplemental module recommendations

| Priority | Module | Source template and file | Player value | Dependencies | Conflict/risk | Effort |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | ... | ... | ... | ... | ... | Low/Medium/High |

Use zero to five rows. These are recommendations only and are not copied.

## Copy record

- Eligible source file count:
- Aggregate source hash:
- Aggregate destination hash:
- Excluded paths/patterns:
- Manifest:
- Source before/after match:
- Destination file verification:
- `TEMPLATE_RESIDUE_SCAN.json` status, scan scope, candidate source game/brand/domain/route identities, match count, and limitations:

## Template URL and identity residue scan

Write the machine-readable scan to `docs/TEMPLATE_RESIDUE_SCAN.json` with this structure:

```json
{
  "schema_version": 1,
  "game": "Target Game",
  "source_template": "tempX_based_example",
  "destination": "/absolute/game/workspace",
  "scan_status": "COMPLETE",
  "scope": ["robots.txt", "sitemap.xml", "metadata/config", "public copy", "routes"],
  "candidate_source_identities": {"game_names": [], "brands": [], "domains": [], "routes": []},
  "matches": [
    {"file": "public/sitemap.xml", "type": "absolute_url", "value": "https://old.example/old-path", "confidence": "HIGH"}
  ],
  "limitations": []
}
```

`scan_status` is `COMPLETE`, `PARTIAL`, or `BLOCKED`. Do not put secret values in this file. The human report must state that this is a source-residue scan, not proof that all site identity is correct. The content-integrator should consume the scan when present and repeat the scan against the target implementation.

## Adaptation boundaries

The next phase may change branding, theme, content, taxonomy, media, SEO, and selected modules in the copied workspace. It must not mutate the template source or claim that demo assets and fictional content belong to the target game.

## Open decisions

List only decisions still requiring user or implementation-stage judgment.

---

The machine-readable copy record is `docs/template-copy-manifest.json`. It must include:

```json
{
  "schema_version": 1,
  "game": "Game Name",
  "source": "/absolute/template/path",
  "destination": "/absolute/game/path",
  "copied_at": "ISO-8601 timestamp",
  "excluded_patterns": [],
  "file_count": 0,
  "source_tree_sha256_before": "...",
  "source_tree_sha256_after": "...",
  "destination_tree_sha256": "...",
  "source_unchanged": true,
  "destination_verified": true,
  "files": {
    "relative/path": "sha256"
  }
}
```

The destination aggregate hash covers copied template files only and excludes the manifest, selection report, and `TEMPLATE_RESIDUE_SCAN.json` added after copying.
