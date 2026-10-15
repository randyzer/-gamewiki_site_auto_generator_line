# Acceptance checklist

## Inputs and safety

- [ ] Game name and absolute workspace were explicit.
- [ ] Target URL or existing project launch command was resolved.
- [ ] Workspace is outside the immutable template library.
- [ ] Audit mode and modification authority were recorded.
- [ ] Dirty Git state was handled before optimization.
- [ ] No package or browser was installed without approval.

## Coverage

- [ ] Homepage was audited.
- [ ] A representative list/category page was audited when present.
- [ ] A representative article/detail page was audited when present.
- [ ] Specialized layouts were added when materially different.
- [ ] Route-selection reasons were recorded.
- [ ] 360, 390, 768, 1024, 1440, and 1920 widths were covered or omissions explained.

## Evidence

- [ ] Screenshots correspond to the recorded route and viewport.
- [ ] Primary player flows were exercised.
- [ ] Keyboard focus and navigation were checked.
- [ ] Console, page errors, failed requests, and HTTP status were recorded.
- [ ] Automated contrast results are labelled approximate.
- [ ] Each finding has evidence, impact, repair, and verification.
- [ ] Taste observations are separated from measured defects.

## Game-guide quality

- [ ] Target-game identity is consistent.
- [ ] Homepage value and primary CTA are clear.
- [ ] Navigation connects home, categories, and articles.
- [ ] Long-form content and tables remain readable.
- [ ] Codes/tier/build components were tested when present.
- [ ] Media and advertising do not destabilize or obscure content.
- [ ] No demo residue, `待确认`, or placeholder public links remain.

## Optimization

- [ ] Product source changed only with explicit authorization.
- [ ] Approved scope was respected.
- [ ] No unrelated changes were overwritten.
- [ ] Each claimed fix was browser-retested.
- [ ] Build and relevant tests passed or failures were recorded.
- [ ] Before/after evidence and a change manifest exist.

## Outputs

- [ ] Audit JSON validates.
- [ ] Markdown report exists and is non-empty.
- [ ] Optimization plan exists and is non-empty.
- [ ] Required screenshots exist.
- [ ] `LATEST` points to the completed relative run.
