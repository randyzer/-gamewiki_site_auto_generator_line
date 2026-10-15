# Homepage and global integration policy

## Semantic mapping

Map researched content by function, not by component name.

| Research concept | Possible template destinations |
| --- | --- |
| Hero | hero, intro, masthead, lead panel |
| Start Here | quick start, first steps, beginner path, checklist |
| Game Overview | overview, about, gameplay loop, field briefing |
| Codes | codes card, utility panel, sidebar status, FAQ |
| Final CTA | closing CTA, next step, play section |
| Official links | header, footer, social links, CTA |
| Stats | stat grid, fact strip, metadata panel |

If a template lacks a concept:

1. Use the nearest truthful existing module when possible.
2. Do not add a large new subsystem.
3. Record an important unmapped requirement as a gap.

## Identity replacement

Build an explicit replacement inventory before editing:

- Demo product name and short name.
- Demo domain.
- Demo developer/publisher.
- Demo platforms.
- Demo communities.
- Fictional game objects and statistics.
- Demo image labels and alt text.
- Theme vocabulary that would misrepresent the target game.

Do not run an unrestricted repository-wide replace. Apply targeted edits to user-visible data, metadata, content, and configuration.

After integration, scan public source and content. Allow template names only in provenance files:

- `docs/TEMPLATE_SELECTION_REPORT.md`
- `docs/template-copy-manifest.json`
- `docs/CONTENT_PROVENANCE.md`
- `docs/CONTENT_INTEGRATION_REPORT.md`

## Facts and CTAs

- Every external URL must come from verified upstream research.
- Never turn a missing URL into `#`, a fake domain, or a competitor homepage.
- Remove or disable unsupported CTAs truthfully.
- Do not call editorial ordering “Popular” or “Trending” unless supported by data.
- Preserve dates as dates; do not relabel publication dates as update dates.

## Theme

Use existing theme tokens or CSS custom properties. Apply HSL values centrally. Do not scatter hardcoded colors across components.

Check:

- Text/background contrast.
- Focus visibility.
- Hover and disabled states.
- Light/dark mode behavior if both modes exist.
- Logo/favicon readability.

## Legal content

Content integration cannot invent legal identity. Missing operator name, contact channel, jurisdiction, or policy details remain launch blockers. A neutral independent fan-site disclaimer does not replace a complete privacy policy or terms review.

## Localization

Recommended languages are planning data. Implement localization only when complete translated content, routing, metadata, navigation, and switcher behavior are available. Never advertise a language merely because it appeared in the research recommendation.
