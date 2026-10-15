from pathlib import Path
import json
base=Path('/Users/randyz/work/coding/hot_words_web'); root=base/'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE'; out=base/'template/codex/executions/v2.7-ws03b/iteration28'
(out/'red-result.json').write_text(json.dumps({'exitCode':1,'failed':9,'passed':189,'tests':198,'files':3,'implementationWrittenBeforeRed':False,'invalidInitialInvocation':'red.log: ENOENT at workspace cwd; excluded','validEvidence':'red-targeted.log'},indent=2)+'\n')
p=root/'src/data/schemas/media.ts'; s=p.read_text(); s=s.replace('const commonAssetShape = {','''const httpsUrlSchema = z.url().refine(
  (value) => /^https:\\/\\//i.test(value) && URL.canParse(value) && new URL(value).protocol === "https:",
  { message: "Media URL must use HTTPS." },
);
const dimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();
const creditSchema = z.object({
  text: z.string().trim().min(1),
  url: httpsUrlSchema.optional(),
}).strict();

function isSafeEquivalentPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") &&
    !/[\\\\%?#\\s]/.test(value) &&
    value.slice(1).split("/").every(segment => segment !== "." && segment !== ".." && /^[a-z0-9._-]*$/i.test(segment));
}
const accessibleEquivalentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().trim().min(1) }).strict(),
  z.object({
    kind: z.literal("link"),
    label: z.string().trim().min(1),
    href: z.union([httpsUrlSchema, z.string().refine(isSafeEquivalentPath, "Use a safe root-relative path or HTTPS URL.")]),
  }).strict(),
]);

const commonAssetShape = {'''); start=s.index('  sourceUrl: z.url().refine('); end=s.index('\n};',start); s=s[:start]+'''  sourceUrl: httpsUrlSchema,
  dimensions: dimensionsSchema,
  // An evidence pointer is required; it never implies rights approval.
  rightsRef: z.string().trim().min(1),
  credit: creditSchema.optional(),'''+s[end:]; s=s.replace('    alt: descriptiveTextSchema,','    alt: descriptiveTextSchema,\n    accessibleEquivalent: accessibleEquivalentSchema,');p.write_text(s)
p=root/'src/core/media-presentation.ts';p.write_text('''import type { MediaAsset } from "../data/schemas/media";

/** Public presentation of a validated asset. Evidence and workflow fields stay private. */
export function resolveMediaPresentation(asset: MediaAsset) {
  return {
    id: asset.id,
    type: asset.type,
    dimensions: { width: asset.dimensions.width, height: asset.dimensions.height },
    ratio: { width: asset.dimensions.width, height: asset.dimensions.height },
    publicCredit: asset.credit
      ? { text: asset.credit.text, ...(asset.credit.url ? { url: asset.credit.url } : {}) }
      : null,
    source: { url: asset.sourceUrl, label: asset.type === "image" ? "Image source" : "Video source" },
    videoEquivalent: asset.type === "video"
      ? asset.accessibleEquivalent.kind === "text"
        ? { kind: "text" as const, text: asset.accessibleEquivalent.text }
        : { kind: "link" as const, label: asset.accessibleEquivalent.label, href: asset.accessibleEquivalent.href }
      : null,
  };
}
''')
p=root/'src/data/media/catalog.ts';s=p.read_text().replace('import pageInventory', 'import { resolveMediaPresentation } from "../../core/media-presentation";\nimport pageInventory',1).replace('    getAsset,','    getAsset,\n    getPresentation(id: string) {\n      return resolveMediaPresentation(getAsset(id));\n    },');p.write_text(s)
p=root/'src/components/media/GameMedia.astro';s=p.read_text().replace('import VideoEmbed','import { resolveMediaPresentation } from "../../core/media-presentation";\nimport VideoEmbed');s=s.replace('const { eager', 'const presentation = resolveMediaPresentation(asset);\nconst { eager');s=s.replace('<img src={asset.src} alt={asset.alt}', '<img src={asset.src} alt={asset.alt} width={presentation.dimensions.width} height={presentation.dimensions.height}');s=s.replace('<a href={asset.sourceUrl}', '''{presentation.publicCredit && <span class="media-credit">{presentation.publicCredit.url ? <a href={presentation.publicCredit.url} rel="noreferrer">{presentation.publicCredit.text}</a> : presentation.publicCredit.text}</span>}
      <a href={presentation.source.url}''');s=s.replace('Image source <span', '{presentation.source.label} <span');p.write_text(s)
p=root/'src/components/media/VideoEmbed.astro';s=p.read_text().replace('import { isLocalVideoPath', 'import { resolveMediaPresentation } from "../../core/media-presentation";\nimport { isLocalVideoPath');s=s.replace('const isLocalVideo =', 'const presentation = resolveMediaPresentation(asset);\nconst equivalent = presentation.videoEquivalent!;\nconst isLocalVideo =');s=s.replace('<div class="video-embed">','<div class="video-embed" style={`--media-aspect-ratio: ${presentation.ratio.width} / ${presentation.ratio.height}`}>');s=s.replace('  <figcaption>','''  <p class="media-equivalent">{equivalent.kind === "text" ? equivalent.text : <a href={equivalent.href} rel="noreferrer">{equivalent.label}</a>}</p>
  <figcaption>''');s=s.replace('    <a href={asset.sourceUrl}', '''    {presentation.publicCredit && <span class="media-credit">{presentation.publicCredit.url ? <a href={presentation.publicCredit.url} rel="noreferrer">{presentation.publicCredit.text}</a> : presentation.publicCredit.text}</span>}
    <a href={presentation.source.url}''').replace('Video source <span','{presentation.source.label} <span');p.write_text(s)
p=root/'src/styles/global.css';s=p.read_text();assert s.count('aspect-ratio: 16 / 9;')>=1;pos=s.index('.video-embed {');s=s[:pos]+s[pos:].replace('aspect-ratio: 16 / 9;', 'aspect-ratio: var(--media-aspect-ratio);',1);p.write_text(s)
p=root/'scripts/media-validation.ts';s=p.read_text().replace('import type { GameConfig }','import { resolveMediaPresentation } from "../src/core/media-presentation";\nimport type { GameConfig }');s=s.replace('    const body = match[2];','''    const body = match[2];
    const presentation = resolveMediaPresentation(asset);
    const decodeText = (text: string) => attributes(`value="${text.replace(/"/g, "&quot;")}"`).get("value") ?? "";
    if (decodeText(body).includes(asset.rightsRef) || /\\bright[s]?Ref\\b/.test(body + match[1])) errors.push(`Media ${id} exposes private rights evidence.`);
    if (presentation.publicCredit) {
      const credit = body.match(/<span\\b[^>]*class="media-credit"[^>]*>([\\s\\S]*?)<\\/span>/)?.[1];
      if (!credit || decodeText(tagText(credit)) !== presentation.publicCredit.text ||
          (presentation.publicCredit.url && !openingTags(credit, "a").some(tag => attributes(tag).get("href") === presentation.publicCredit!.url))) errors.push(`Media ${id} public credit does not match its asset.`);
    }''');s=s.replace('      if (!localFileExists(asset.src)) errors.push(`Media ${id} local image', '''      if (attrs.get("width") !== String(presentation.dimensions.width) || attrs.get("height") !== String(presentation.dimensions.height)) errors.push(`Media ${id} intrinsic image dimensions do not match its asset.`);
      if (!localFileExists(asset.src)) errors.push(`Media ${id} local image''');s=s.replace('    } else {\n      if (asset.src.startsWith', '''    } else {
      const wrapper = body.match(/<div\\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/)?.[0] ?? "";
      const style = attributes(wrapper).get("style") ?? "";
      if (!style.split(";").some(declaration => declaration.trim() === `--media-aspect-ratio: ${presentation.ratio.width} / ${presentation.ratio.height}`)) errors.push(`Media ${id} video ratio does not match its dimensions.`);
      const equivalent = presentation.videoEquivalent!;
      const equivalentHtml = body.match(/<p\\b[^>]*class="media-equivalent"[^>]*>([\\s\\S]*?)<\\/p>/)?.[1];
      const equivalentText = equivalent.kind === "text" ? equivalent.text : equivalent.label;
      if (!equivalentHtml || decodeText(tagText(equivalentHtml)) !== equivalentText ||
          (equivalent.kind === "link" && !openingTags(equivalentHtml, "a").some(tag => attributes(tag).get("href") === equivalent.href))) errors.push(`Media ${id} accessible equivalent does not match its asset.`);
      if (asset.src.startsWith''');p.write_text(s)
# Existing scenarios retain their identity and original negative triggers; explicit metadata only.
for name in ['media.test.ts','media-rendering.test.ts']:
 p=root/'tests'/name;s=p.read_text();s=s.replace('  type: "image" as const,','  type: "image" as const,\n  dimensions: { width: 1200, height: 675 },\n  rightsRef: "private/qa-image",',1).replace('  type: "video" as const,','  type: "video" as const,\n  dimensions: { width: 800, height: 600 },\n  rightsRef: "private/qa-video",\n  accessibleEquivalent: { kind: "text" as const, text: "A synthetic route crosses three checkpoints." },',1)
 if name=='media-rendering.test.ts':
  s=s.replace('responsive gallery and 16:9 iframe sizing','responsive gallery and authored-ratio iframe sizing').replace('aspect-ratio:\\s*16\\s*\\/\\s*9;', 'aspect-ratio:\\s*var\\(--media-aspect-ratio\\);').replace('loads a hero eagerly without adding dimension metadata','loads a hero eagerly with intrinsic dimensions and without srcset variants').replace('expect(html).not.toMatch(/\\b(?:width|height|srcset)="/);', 'expect(html).toContain(\'width="1200"\');\n    expect(html).toContain(\'height="675"\');\n    expect(html).not.toMatch(/\\bsrcset="/);')
 p.write_text(s)
p=root/'tests/media-build.test.ts';s=p.read_text().replace('JSON.stringify(mediaFixture)', '''JSON.stringify({
    ...mediaFixture,
    assets: mediaFixture.assets.map(asset => {
      // Explicit migration of these known synthetic assets; never a production schema default.
      if (asset.id === "qa.overview") return { ...asset, dimensions: { width: 1200, height: 675 }, rightsRef: "private/qa-overview" };
      if (asset.id === "qa.detail") return { ...asset, dimensions: { width: 800, height: 600 }, rightsRef: "private/qa-detail" };
      if (asset.id === "qa.trailer") return { ...asset, dimensions: { width: 1920, height: 1080 }, rightsRef: "private/qa-trailer", accessibleEquivalent: { kind: "text", text: "Public animation test trailer, with no game association." } };
      throw new Error(`Unmigrated synthetic media asset: ${asset.id}`);
    }),
  })''');p.write_text(s)
p=root/'tests/media-audit.test.ts';s=p.read_text().replace('type: "image" as const,','type: "image" as const, dimensions: { width: 800, height: 600 }, rightsRef: "private/qa-image",',1).replace('type: "video" as const,','type: "video" as const, dimensions: { width: 800, height: 600 }, rightsRef: "private/qa-video", accessibleEquivalent: { kind: "text" as const, text: "A synthetic route crosses three checkpoints." },',1).replace('loading="lazy" decoding="async"','loading="lazy" decoding="async" width="800" height="600"',1).replace('<div class="video-embed">', '<div class="video-embed" style="--media-aspect-ratio: 800 / 600">').replace('</div><figcaption>', '</div><p class="media-equivalent">${video.accessibleEquivalent.text}</p><figcaption>');p.write_text(s)
p=root/'tests/homepage.test.ts';s=p.read_text().replace('      id: "home.hero",','      id: "home.hero",\n      dimensions: { width: 800, height: 600 },\n      rightsRef: "private/qa-home-hero",');p.write_text(s)
