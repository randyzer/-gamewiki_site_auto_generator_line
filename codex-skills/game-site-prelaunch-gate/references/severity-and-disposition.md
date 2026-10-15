# Severity and Launch Disposition

## Severity

- **P0 — critical:** production build fails; site or core user journey is unavailable; core route returns 404; confirmed severe false game information; or a likely live credential is exposed in current files.
- **P1 — launch blocker:** material canonical/robots/sitemap error; public template residue that misidentifies the game; a primary page or mobile journey is unusable; required legal/compliance content is still a draft; or core navigation/content is broken.
- **P2 — non-blocking:** useful improvements that do not prevent correct use or launch, such as a missing optional social image, secondary interaction issue, or content-depth opportunity.
- **NOTE:** limitation, context, or observation that is not a defect.

Assign severity based on user impact and launch risk, not aesthetic preference. Attach route and reproducible evidence. A suspected issue without adequate evidence is `NEEDS_CONFIRMATION`, not a confirmed P0/P1.

## Check statuses

Use `PASS`, `FAIL`, `BLOCKED`, `NOT CONFIGURED`, or `NOT APPLICABLE`. A blocked/unconfigured critical check is not a pass. Name the limitation and its effect on the conclusion.

## Disposition rules

1. Any open P0 or P1, failed critical check, or material coverage gap: `暂不建议上线`.
2. No open P0/P1, but one or more P2: `可以上线，但有P2待办`.
3. No open findings and all required checks pass: `可以上线`.
4. Use `完成指定修复后可上线` only when the remaining gate is a single, concrete repair or human confirmation with a stated completion criterion. If the requirement remains unresolved at final reporting, prefer `暂不建议上线`.

Do not upgrade a result based on the user's requested outcome. If an item requires unknown legal, business, factual, or media information, identify the owner/input needed and keep the gate open.
