# Output contract

## CONTENT_INTEGRATION_REPORT.md

Required sections:

- Input resolution.
- Baseline Git status.
- Template/content model inspected.
- Homepage field-to-component mapping.
- Identity and favicon changes.
- Inner-page outcome totals.
- Residue scan, including source game/brand names, source domains and routes, and the disposition of each match.
- Canonical site origin used for SEO, if confirmed.
- `robots.txt` and sitemap source/generator files inspected, old values removed or retained with rationale, and route/domain validation results.
- Commands and validation results.
- Files changed.
- Remaining blockers.
- Final status: COMPLETED, PARTIAL, or BLOCKED.

## CONTENT_PAGE_MANIFEST.json

```json
{
  "schema_version": 1,
  "game": "Game Name",
  "generated_at": "ISO-8601",
  "counts": {
    "keywords": 0,
    "published": 0,
    "draft": 0,
    "blocked": 0
  },
  "pages": [
    {
      "keyword": "Game Name beginner guide",
      "category": "Guide",
      "material_file": "Game Name beginner guide素材.md",
      "material_status": "COMPLETED",
      "outcome": "PUBLISHED",
      "route": "/guides/beginner-guide",
      "source_file": "content/guides/beginner-guide.mdx",
      "title_length": 52,
      "description_length": 154,
      "last_verified": "YYYY-MM-DD",
      "notes": []
    }
  ]
}
```

Rules:

- Every final keyword appears exactly once.
- Outcome is PUBLISHED, DRAFT, or BLOCKED.
- BLOCKED has no public route or source file.
- Draft route/source fields may be null when the template has no safe draft system.
- Counts exactly match the page array.

## CONTENT_PROVENANCE.md

For each published or draft page record:

- Page slug/keyword.
- Upstream material file.
- Official sources used.
- Third-party evidence retained internally.
- Version/date context.
- Important claims and supporting sources.
- Conflicts and resolution.
- Any omitted uncertain details.

Do not expose secrets, cookies, raw full transcripts, or copied articles.

## CONTENT_GAPS.md

Classify gaps:

- FACT
- MEDIA
- LEGAL
- LOCALIZATION
- TECHNICAL (including unconfirmed site origin, stale sitemap URLs, or a robots sitemap directive that still points to the source site)
- SOURCE CONFLICT
- LAUNCH BLOCKER

Each gap includes affected page/module, missing item, impact, and safe next action.

## Public implementation

The exact content paths depend on the selected template. Preserve its content model and route conventions. Do not create a second parallel registry when the existing registry can represent the pages.
