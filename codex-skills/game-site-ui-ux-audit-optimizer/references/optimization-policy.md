# Optimization policy

## Authorization boundary

Audit-only is always the safe default. Do not edit product files unless the user explicitly requests optimization.

Before optimization:

1. Record the repository root and Git status.
2. List existing changes relevant to the planned files.
3. Ask for confirmation when the worktree is dirty.
4. Freeze the approved finding IDs or severity range.
5. Preserve baseline screenshots and report.

## Repair order

1. Wrong-game content, broken routes, inaccessible core tasks, and launch blockers.
2. Responsive breakage, navigation, article readability, and serious contrast/focus defects.
3. Media stability, advertising collisions, and interaction feedback.
4. Visual consistency.
5. Optional polish.

Fix root causes in shared components or tokens when evidence shows the issue is shared. Avoid broad rewrites for isolated findings.

## Change restrictions

Do not without separate approval:

- Install or upgrade packages.
- Replace the framework or routing model.
- Change the selected template.
- Add a new design system parallel to existing tokens.
- Replace factual text.
- Create unsupported languages.
- Change analytics, ads, authentication, payments, or deployment.
- Delete user assets or unrelated files.
- Rewrite all pages to satisfy a taste preference.

## Verification

For every fixed finding, repeat:

- The same route.
- The same viewport.
- The same state or interaction.
- The same automated check when applicable.

Record one of:

- FIXED
- PARTIALLY_FIXED
- NOT_FIXED
- NOT_RETESTED
- ACCEPTED_RISK

A code change without browser reproduction is NOT_RETESTED, not FIXED.

## Git safety

Never reset, checkout away, stash, amend, or overwrite user changes without explicit authorization. Commit only when requested or when the current task explicitly includes creating an independent Git-ready skill.
