from pathlib import Path
import json
base=Path('/Users/randyz/work/coding/hot_words_web');root=base/'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE';out=base/'template/codex/executions/v2.7-ws03c/iteration30'
(out/'red-result.json').write_text(json.dumps({'exitCode':1,'failed':18,'passed':217,'tests':235,'files':4,'implementationWrittenBeforeRed':False,'evidence':'red-complete.log','initialRed':'red-targeted.log:14FAIL217PASS'},indent=2)+'\n')
p=root/'src/data/schemas/media.ts';s=p.read_text().replace('    trailer: mediaIdSchema.optional(),','    trailer: mediaIdSchema.optional(),\n    share: mediaIdSchema.optional(),').replace('    pages: z.array(pageMediaSchema),','    pages: z.array(pageMediaSchema),\n    defaultShare: mediaIdSchema.optional(),')
marker='    manifest.pages.forEach((page, index) => {'
s=s.replace(marker,'''    function checkShareReference(id: string, path: (string | number)[]) {
      const asset = assets.get(id);
      if (!asset || asset.type !== "image" || asset.alt === "") {
        context.addIssue({
          code: "custom",
          message: `Share image must reference an existing informative image asset: ${id}`,
          path,
        });
      }
    }
    if (manifest.defaultShare) checkShareReference(manifest.defaultShare, ["defaultShare"]);

'''+marker)
s=s.replace('      if (page.trailer) checkReference(page.trailer, "video", ["trailer"]);','      if (page.trailer) checkReference(page.trailer, "video", ["trailer"]);\n      if (page.share) checkShareReference(page.share, ["pages", index, "share"]);');p.write_text(s)
p=root/'src/data/media/catalog.ts';s=p.read_text().replace('    getPageMedia(pageId: string): ResolvedPageMedia {','''    getShareMedia(pageId: string): ImageAsset | undefined {
      if (!knownPageIds.has(pageId)) return undefined;
      const mapping = manifest.pages.find((page) => page.pageId === pageId);
      if (mapping?.share) return getImage(mapping.share);
      const hero = pages.get(pageId)?.heroMedia;
      if (hero?.alt) return hero;
      return manifest.defaultShare ? getImage(manifest.defaultShare) : undefined;
    },
    getPageMedia(pageId: string): ResolvedPageMedia {''');p.write_text(s)
p=root/'src/core/seo.ts';s=p.read_text().replace('import type { GameConfig }','import type { ImageAsset } from "../data/schemas/media";\nimport type { GameConfig }',1);marker='export function buildCanonicalUrl';s=s.replace(marker,'''/** Formats a resolved manifest asset; it does not select media or approve rights. */
export function resolveShareMetadata(config: GameConfig, image?: ImageAsset) {
  if (!image) return undefined;
  if (!image.alt) throw new Error("Share metadata requires an informative image.");
  return {
    url: buildCanonicalUrl(config, image.src),
    width: image.dimensions.width,
    height: image.dimensions.height,
    alt: image.alt,
  };
}

'''+marker,1);p.write_text(s)
p=root/'src/layouts/BaseLayout.astro';s=p.read_text().replace('import Footer', 'import { mediaCatalog } from "../data/media/catalog";\nimport Footer',1).replace('  serializeJsonLd,','  serializeJsonLd,\n  resolveShareMetadata,',1).replace('const canonical =', 'const share = resolveShareMetadata(siteConfig, mediaCatalog.getShareMedia(page.pageId));\nconst canonical =',1).replace('    <meta name="twitter:card" content="summary" />','''    {share && <>
      <meta property="og:image" content={share.url} />
      <meta property="og:image:width" content={share.width} />
      <meta property="og:image:height" content={share.height} />
      <meta property="og:image:alt" content={share.alt} />
      <meta name="twitter:image" content={share.url} />
      <meta name="twitter:image:alt" content={share.alt} />
    </>}
    <meta name="twitter:card" content={share ? "summary_large_image" : "summary"} />''');p.write_text(s)
p=root/'scripts/media-validation.ts';s=p.read_text().replace('import { resolveMediaPresentation }', 'import { resolveShareMetadata } from "../src/core/seo";\nimport type { ImageAsset } from "../src/data/schemas/media";\nimport { resolveMediaPresentation }',1).replace('name: "img" | "iframe" | "video" | "a"','name: "img" | "iframe" | "video" | "a" | "meta"')
s+='''

export function collectShareHtmlErrors(
  html: string,
  config: GameConfig,
  image: ImageAsset | undefined,
  localFileExists: (src: string) => boolean,
  required: boolean,
): string[] {
  const errors: string[] = [];
  const head = html.match(/<head\\b[^>]*>([\\s\\S]*?)<\\/head>/)?.[1] ?? "";
  const tags = openingTags(head, "meta").map(attributes);
  const expected = resolveShareMetadata(config, image);
  if (!expected) {
    if (required) errors.push("Share image is required for final indexable output.");
    if (tags.some(tag => tag.get("property") === "og:image" || tag.get("name") === "twitter:image")) errors.push("Share metadata has no resolved manifest image.");
    return errors;
  }
  const fields = [
    ["property", "og:image", expected.url],
    ["property", "og:image:width", String(expected.width)],
    ["property", "og:image:height", String(expected.height)],
    ["property", "og:image:alt", expected.alt],
    ["name", "twitter:image", expected.url],
    ["name", "twitter:image:alt", expected.alt],
    ["name", "twitter:card", "summary_large_image"],
  ];
  for (const [attribute, field, value] of fields) {
    const matches = tags.filter(tag => tag.get(attribute) === field);
    if (matches.length !== 1 || matches[0].get("content") !== value) errors.push(`Share metadata ${field} must match its resolved manifest image exactly once.`);
  }
  if (!localFileExists(image!.src)) errors.push(`Share image local output file is missing: ${image!.src}`);
  if (head.includes(image!.rightsRef) || tags.some(tag => tag.get("name") === "rightsRef" || tag.get("property") === "rightsRef")) errors.push("Share metadata exposes private rights evidence.");
  return errors;
}
''';p.write_text(s)
p=root/'scripts/audit-build.ts';s=p.read_text().replace('  collectMediaHtmlErrors,','  collectMediaHtmlErrors,\n  collectShareHtmlErrors,',1).replace('  const htmlBytes = Buffer.byteLength(html);','''  errors.push(...collectShareHtmlErrors(
    html,
    siteConfig,
    mediaCatalog.getShareMedia(page.pageId),
    (src) => isLocalMediaFile(src, outputDirectory),
    purpose === "final" && page.indexability === "index",
  ).map((error) => `[${page.route}] ${error}`));
  const htmlBytes = Buffer.byteLength(html);''',1);p.write_text(s)
p=root/'tests/helpers/core-build-fixture.ts';s=p.read_text().replace('  mkdtempSync,','  mkdtempSync,\n  mkdirSync,',1);marker='    writeFixtureGameConfig(fixtureRoot, adoptFixtureConfig(gameConfig));';s=s.replace(marker,marker+'''
    // A disposable share asset for technical final-build QA, never real-game rights evidence.
    mkdirSync(join(fixtureRoot, "public/media"), { recursive: true });
    writeFileSync(join(fixtureRoot, "public/media/qa-default-share.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#255588"/></svg>');
    const mediaPath = join(fixtureRoot, "src/data/media/media.json");
    const manifest = JSON.parse(readFileSync(mediaPath, "utf8"));
    const asset = { id: "qa.default-share", type: "image", src: "/media/qa-default-share.svg", alt: "Synthetic blue share illustration for technical QA", dimensions: { width: 1200, height: 630 }, rightsRef: "private/qa-default-share", sourceUrl: "https://example.com/qa-default-share" };
    if (manifest.assets.some((entry: { id: string }) => entry.id === asset.id)) throw new Error("Synthetic share asset ID conflict.");
    writeFileSync(mediaPath, JSON.stringify({ ...manifest, assets: [...manifest.assets, asset], defaultShare: asset.id }));''',1);p.write_text(s)
p=root/'tests/media-build.test.ts';s=p.read_text().replace('    ...mediaFixture,','    ...mediaFixture,\n    defaultShare: "qa.overview",',1);p.write_text(s)
