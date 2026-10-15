# Inner-page content policy

## Evidence status to page status

| Material status | Default page outcome | Publication condition |
| --- | --- | --- |
| COMPLETED | PUBLISHED | Evidence directly answers the intent and conflicts are resolved |
| PARTIAL | DRAFT | Promote only when the verified subset provides standalone value |
| BLOCKED | BLOCKED | Never expose as a public/indexable route |

A COMPLETED label is not automatic permission to publish unsupported details. A PARTIAL label is not automatic rejection when the confirmed subset fully answers a narrow intent.

## Article structure

Use an intent-specific outline. A useful default is:

1. Direct answer.
2. Essential explanation or current status.
3. Steps, requirements, options, or comparison.
4. Mistakes, limitations, or version notes.
5. Related next step.

Include only sections supported by evidence. Do not create an FAQ merely for SEO.

## Length

Target useful coverage rather than a fixed count. Most evidence-rich English guides will fall between 800 and 1,600 words. Shorter is acceptable for narrow intents. Never:

- Repeat the same fact in multiple sections.
- Expand an unsupported inference into advice.
- Add generic game background to inflate length.
- Convert source silence into a claim.

## SEO

- Title: natural exact keyword inclusion; normally 40–60 characters.
- Description: keyword included naturally; 140–160 characters.
- One clear H1.
- H2s aligned with search sub-intents.
- Stable slug derived from the final keyword without duplicating the game name unnecessarily.
- Canonical route only when the template supports canonical metadata correctly.
- No keyword stuffing or hidden text.

When the exact keyword makes a readable 60-character title impossible, prioritize clarity and record the exception rather than truncating into nonsense.

## Facts

Classify statements as:

- Stable fact.
- Version-sensitive fact.
- Strategy/opinion.
- Unconfirmed.

Version-sensitive facts need a visible or recorded verification date. Strategy must be framed as recommendation. Unconfirmed claims stay out of public copy.

Codes, drop rates, stats, requirements, class names, boss names, item names, and unlock conditions must match the material evidence exactly.

## Provenance

Keep source attribution in `docs/CONTENT_PROVENANCE.md`, keyed by page slug and claim group. Official links may appear publicly when useful. Do not publish competitor-guide links merely because they were research inputs.

Do not copy source prose or transcript wording at length. Synthesize and paraphrase.

## Related content

Prefer relationships in this order:

1. Explicit manual relationship supported by user journey.
2. Same narrow category and adjacent task.
3. Shared entities/mechanics.
4. Broader beginner/overview page.

Use two to four published pages only. Exclude the current page, drafts, blocked items, and merged synonyms.

## Draft handling

Use the template's supported draft mechanism when one exists. If the template has no safe draft exclusion:

- Do not create a public route.
- Keep the proposed outline and missing evidence in `CONTENT_GAPS.md`.
- Mark the page outcome DRAFT in the page manifest.

Never add a fake published page to satisfy a one-keyword-one-page count.
