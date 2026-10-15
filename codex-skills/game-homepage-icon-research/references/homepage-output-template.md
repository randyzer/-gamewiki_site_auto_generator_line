# Homepage output template

Use this structure. Adapt labels and content to the actual game; do not force unavailable metrics.

## 1. Theme basics

Include:

- Exact game name, platform, developer, publisher, release state, store/app ID
- Verified official site/store
- Verified official community and announcements
- Verified Discord, Reddit, X, YouTube, support, and platform market when available
- One verified official trailer; if absent, one relevant popular video
- A short note for unavailable official channels rather than guessed links
- A player-facing facts table with snapshot date
- Plain source URLs so the saved Markdown is self-contained

Do not include competitor guide sites.

## 2. Homepage JSON

Use this schema:

~~~json
{
  "home": {
    "meta": {
      "title": "Game Wiki — Keyword 1, Keyword 2",
      "description": "140–160 character SEO description"
    },
    "hero": {
      "eyebrow": "Independent Fan-Made Community Wiki",
      "title": "Game Name",
      "description": "Two or three sentences explaining the core loop and player value.",
      "stats": [
        "Released Mon D, YYYY",
        "Updated Mon D, YYYY",
        "Player-facing fact",
        "Player-facing fact"
      ],
      "primaryCta": "Start Beginner Guide",
      "secondaryCta": "Game-specific secondary action",
      "tertiaryCta": "View Latest Updates",
      "videoLabel": "Official trailer or Featured gameplay overview"
    },
    "start": {
      "eyebrow": "Start Here",
      "title": "Your Game Name Journey",
      "cards": [
        {
          "number": "1",
          "title": "Beginner Guide",
          "description": "First-hour onboarding and early mistakes."
        },
        {
          "number": "2",
          "title": "Game-specific early priority",
          "description": "What players search during their first two hours."
        },
        {
          "number": "3",
          "title": "Different core system",
          "description": "Core mechanic teaching."
        },
        {
          "number": "4",
          "title": "Different advanced system",
          "description": "Distinctive or advanced mechanic."
        }
      ]
    },
    "aboutGame": {
      "title": "What is Game Name?",
      "paragraphs": [
        "Two or three sentences about genre, platform, and core gameplay.",
        "Two or three sentences about distinctive systems and player goals."
      ],
      "stats": [
        {
          "label": "Developer",
          "value": "Verified studio"
        },
        {
          "label": "Platform",
          "value": "Verified platform"
        },
        {
          "label": "Genre",
          "value": "Verified genre"
        }
      ],
      "cta": "Explore All Guides"
    },
    "finalCta": {
      "title": "Ready to Master Game Name?",
      "description": "Action-oriented closing copy.",
      "primary": "Read the Beginner Guide",
      "secondary": "Play on Platform"
    }
  },
  "footer": {
    "aboutTitle": "Game Name Wiki",
    "about": "Two or three sentences describing the independent fan guide and non-affiliation.",
    "description": "One concise game description.",
    "playGame": "Play Game Name",
    "officialDiscord": "Verified label and URL, or Not confirmed",
    "officialYoutube": "Verified label and URL, or Featured video label and URL",
    "communityTool": "Verified official/platform tool, or Not available",
    "privacyPolicy": "Privacy Policy",
    "termsOfService": "Terms of Service"
  },
  "sidebarCodes": "暂无",
  "metadata": {
    "title": "Game Wiki — Keyword 1, Keyword 2",
    "description": "140–160 character value description",
    "keywords": "game, platform, concise keyword list"
  }
}
~~~

## 3. SEO self-check

Report measured character counts and validate:

- home.meta.title at most 60
- metadata.title at most 60
- metadata.description 140–160
- metadata.keywords at most 100
- hero.stats contains strings only
- start.cards contains exactly four objects
- aboutGame.stats contains label and value pairs
- footer.about contains two or three sentences
- sidebarCodes contains verified codes or 暂无

## 4. Theme colors

State whether dark or light should be the default and explain the decision from official visual tone and gameplay.

Return variables in this format:

~~~css
/* Navigation theme - light */
--nav-theme: H S% L%;
--nav-theme-light: H S% L%;

/* Navigation theme - dark */
--nav-theme: H S% L%;
--nav-theme-light: H S% L%;
~~~

Optionally add background, surface, foreground, muted foreground, border, and danger tokens.

## 5. Localization

Recommend no more than four languages, ordered by likely traffic and player demand.

Constraints:

- Include English.
- Exclude Chinese unless explicitly requested.
- Search and use the official localized game title for each selected language.
- Prefer evidence from supported interface languages, developer market, official communities, regional activity, and monetization potential.
- Give the locale route, such as /en/, /ja/, or /pt-br/.
- Do not translate the brand name when the official store leaves it untranslated.

## 6. Implementation boundaries

Include game-specific warnings such as:

- Dynamic values need timestamps and refresh policies.
- Codes require official verification.
- Different editions or platforms must not be mixed.
- The site must disclose its independent fan-made status.
- Market prices and live status must show freshness.
