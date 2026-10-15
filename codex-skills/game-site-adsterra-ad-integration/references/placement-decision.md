# Placement Decision

Determine placement from four inputs: the code's actual behavior, the route's user task, the rendered layout, and device size. Recheck Adsterra's current publisher instructions when a format or implementation detail is uncertain.

## Classify the ad code first

- **Inline banner/native unit:** needs a real slot in a page/component. Identify its expected dimensions and whether the code is responsive.
- **Script plus container pattern:** if the snippet pairs an asynchronous `invoke.js` script with a `<div id="container-{zone_id}">`, treat both as one placement. Put the script and matching container in the framework-appropriate location, preserve all supplied attributes and the exact matching zone/container ID, and ensure the ID is unique in the rendered document. Do not duplicate the same zone across multiple containers unless the current Adsterra instructions explicitly support it.
- **Dashboard-defined Native Banner:** when the dashboard identifies a container pattern as a Native Banner with a 4:1 widget layout and inherited font/color, treat that zone as an in-flow native unit, reserve a responsive 4:1 slot, and preserve the selected styling. Do not infer these settings for other zones; use their own dashboard settings.
- **Global overlay/social-bar or in-page push:** generally loads once from the shared layout if the user's code requires site-wide behavior. Explain its visibility and interruption behavior; never duplicate it per route.
- **Popunder/interstitial or other triggered format:** identify the trigger and affected actions/routes. Do not change the trigger or attach it to a navigation, copy, download, or other primary action.
- **Direct link/smart link:** treat as an explicit link destination, not a display slot. Never replace ordinary navigation or disguise an ad link as a site control.
- If one code snippet combines formats or its behavior cannot be established, stop and clarify before implementation.

## Match placements to game-guide page flow

Use actual site components and content order; these are starting candidates, not fixed rules:

| Page type | Candidate placement | Avoid |
| --- | --- | --- |
| Homepage | After the hero/primary navigation and first useful content block | Above or inside primary navigation, hero CTA, or first-use action |
| Category/list | After the introduction or first logical group of cards | Near filters, pagination, category tabs, or card controls |
| Guide/article | After the introduction or between complete sections on sufficiently long pages | Inside a procedure, table, code block, code-copy control, or heading |
| Desktop detail layout | Existing sidebar only when it remains visible without narrowing or obscuring the article | Sticky overlays that cover reading controls or content |
| Mobile | In-flow slot between sections, sized for the mobile layout | Overlays or fixed units covering navigation, text, or tap targets |

Do not force ads onto every route. Exclude draft, blocked, legal, search, or utility pages unless the user explicitly requests them and the format is appropriate. Keep ad labels clear; never imitate site notices, download buttons, game controls, or navigation.

## Evaluate each candidate

For every proposed slot, record:

1. Route or route group and the component/file that renders it.
2. User task and nearby content/control.
3. Ad format, expected behavior, and dimensions inferred from the code or current official instructions.
4. Desktop/mobile rendering and whether a reserved-size responsive container is needed.
5. Loading strategy, duplicate-loading risk, CSP/consent/privacy dependency, and performance risk.
6. Why the slot is useful and what would make it unacceptable.

Prefer one low-interruption in-content placement per page archetype for the initial rollout. Add another only when the page is long enough, there is a natural content boundary, and the first placement does not harm the task. Do not use a universal numeric density rule.

## Measure after deployment

Test the changed route archetypes at 360, 390, 768, 1024, and 1440 CSS pixels where the site supports them. Inspect slot position, rendered dimensions, overlap, overflow, console/network errors, duplicate requests, and layout stability. Do not click ads.

Use Adsterra's publisher statistics to assess impressions and performance by site/ad placement when the user has authorized access. Use page engagement and performance data to check for user-experience costs. Test one placement or format change at a time; traffic and ad fill can vary by geography, device, browser, and time.

A successful script request is not proof that an ad rendered. A rendered ad is not proof of an impression, click, payout, or acceptable long-term performance.

## Current official references

- Adsterra: [How to put ads on your website](https://adsterra.com/blog/how-put-ads-on-your-website-and-get-paid/)
- Adsterra: [Ad placement strategies](https://adsterra.com/blog/ad-placement-strategies/)
- Adsterra: [Publisher statistics and placements](https://adsterra.com/blog/adsterra-statistics-for-publishers-and-webmasters/)

Recheck the official publisher dashboard and current documentation at execution time; formats, code and reporting behavior can change.
