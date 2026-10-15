from pathlib import Path
import json,datetime
base=Path('/Users/randyz/work/coding/hot_words_web');root=base/'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE';out=base/'template/codex/executions/v2.7-ws03c/iteration30'
(out/'stale-state.json').write_text(json.dumps({'state':'STALE','priorAcceptance':'iteration29 WS03B continuation','reason':'First WS03C test mutation; prior acceptance is historical only for subsequent source','at':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
p=root/'tests/media.test.ts';p.write_text(p.read_text()+r'''

describe("WS03C share references in the media authority", () => {
  const explicit = { ...image, id: "share.explicit" };
  const fallback = { ...image, id: "share.default" };
  it("accepts share references without adding visual placement data", () => {
    const input = { assets: [image, explicit, fallback], defaultShare: fallback.id, pages: [{ pageId: "home", hero: image.id, share: explicit.id }] };
    expect(parseMediaManifest(input)).toEqual(input);
    const catalog = createMediaCatalog(input, ["home", "guide.caldera"]);
    expect(catalog.getPageMedia("home")).toEqual({ heroMedia: image, galleryMedia: [] });
  });
  it("resolves explicit share before informative hero before default", () => {
    const catalog = createMediaCatalog({ assets: [image, explicit, fallback], defaultShare: fallback.id, pages: [{ pageId: "home", hero: image.id, share: explicit.id }, { pageId: "guide.caldera", hero: image.id }] }, ["home", "guide.caldera", "about"]);
    const resolve = (catalog as unknown as { getShareMedia: (pageId: string) => unknown }).getShareMedia;
    expect(resolve).toBeTypeOf("function");
    expect(resolve("home")).toEqual(explicit);
    expect(resolve("guide.caldera")).toEqual(image);
    expect(resolve("about")).toEqual(fallback);
  });
  it("skips decorative hero and does not infer share media from galleries", () => {
    const decorative = { ...image, alt: "" };
    const catalog = createMediaCatalog({ assets: [decorative, fallback], defaultShare: fallback.id, pages: [{ pageId: "home", hero: decorative.id, gallery: [fallback.id] }] }, ["home"]);
    const resolve = (catalog as unknown as { getShareMedia: (pageId: string) => unknown }).getShareMedia;
    expect(resolve).toBeTypeOf("function");expect(resolve("home")).toEqual(fallback);
    const noDefault = createMediaCatalog({ assets: [decorative, fallback], pages: [{ pageId: "home", hero: decorative.id, gallery: [fallback.id] }] }, ["home"]);
    expect((noDefault as unknown as { getShareMedia: (pageId: string) => unknown }).getShareMedia("home")).toBeUndefined();
  });
  it("returns undefined when no share image exists without inventing a placeholder", () => {
    const catalog = createMediaCatalog({ assets: [], pages: [] }, ["home"]);
    const resolve = (catalog as unknown as { getShareMedia: (pageId: string) => unknown }).getShareMedia;
    expect(resolve).toBeTypeOf("function");expect(resolve("home")).toBeUndefined();
  });
  it.each(["missing.asset", video.id, "decorative"])("rejects invalid explicit and default share image %s", id => {
    const assets = [image, video, { ...image, id: "decorative", alt: "" }];
    expect(mediaManifestSchema.safeParse({ assets, pages: [{ pageId: "home", share: id }] }).success).toBe(false);
    expect(mediaManifestSchema.safeParse({ assets, pages: [], defaultShare: id }).success).toBe(false);
  });
  it("does not let a share-only mapping create an inventory page", () => {
    expect(() => createMediaCatalog({ assets: [image], pages: [{ pageId: "unknown", share: image.id }] }, ["home"])).toThrow(/inventory/);
  });
});
''')
p=root/'tests/seo.test.ts';p.write_text(p.read_text()+r'''

it("formats resolved share media as a narrow public HTTPS metadata payload", async () => {
  const module = await import("../src/core/seo");
  const resolve = Reflect.get(module, "resolveShareMetadata") as (config: typeof siteConfig, image?: unknown) => unknown;
  expect(resolve).toBeTypeOf("function");
  const image = { id: "qa.share", type: "image", src: "/media/share.svg", alt: "A synthetic blue share illustration", dimensions: { width: 1200, height: 630 }, rightsRef: "private/qa-share", sourceUrl: "https://example.com/qa-source", credit: { text: "QA author" } };
  expect(resolve(siteConfig, image)).toEqual({ url: new URL(image.src, siteConfig.site.url).href, width: 1200, height: 630, alt: image.alt });
  expect(resolve(siteConfig, undefined)).toBeUndefined();
  expect(JSON.stringify(resolve(siteConfig, image))).not.toMatch(/rightsRef|sourceUrl|credit|private\/qa-share/);
});
''')
p=root/'tests/media-audit.test.ts';p.write_text(p.read_text()+r'''

describe("WS03C generated share metadata audit", () => {
  const config = { site: { url: "https://field-notes.example" } };
  const share = { ...image, alt: "A synthetic route share illustration" };
  const url = new URL(share.src, config.site.url).href;
  const html = `<head><meta property="og:image" content="${url}"><meta property="og:image:width" content="800"><meta property="og:image:height" content="600"><meta property="og:image:alt" content="${share.alt}"><meta name="twitter:image" content="${url}"><meta name="twitter:image:alt" content="${share.alt}"><meta name="twitter:card" content="summary_large_image"></head>`;
  async function audit() {
    const module = await validation();
    const collect = Reflect.get(module, "collectShareHtmlErrors") as (html: string, config: unknown, share: unknown, exists: (path: string) => boolean, required: boolean) => string[];
    expect(collect).toBeTypeOf("function");return collect;
  }
  it("requires share metadata on final indexable output but permits no-image optional output", async () => {
    const collect = await audit();
    expect(collect(html, config, share, () => true, true)).toEqual([]);
    expect(collect("<head></head>", config, undefined, () => true, true).join(" ")).toMatch(/share|required/i);
    expect(collect("<head></head>", config, undefined, () => true, false)).toEqual([]);
  });
  it.each([
    [url, "https://wrong.example/other.svg"],
    ['content="800"', 'content="1"'],
    ['content="600"', 'content="1"'],
    [share.alt, "A different illustration"],
    ['content="summary_large_image"', 'content="summary"'],
  ])("rejects conflicting share metadata: %s", async (before, after) => {
    expect((await audit())(html.replace(before, after), config, share, () => true, true).length).toBeGreaterThan(0);
  });
  it("rejects missing local output, duplicate metadata and private evidence leaks", async () => {
    const collect = await audit();
    expect(collect(html, config, share, () => false, true).join(" ")).toMatch(/missing|local/);
    expect(collect(html.replace("</head>", `<meta property="og:image" content="${url}"></head>`), config, share, () => true, true).length).toBeGreaterThan(0);
    expect(collect(html.replace("</head>", `<meta name="rightsRef" content="${share.rightsRef}"></head>`), config, share, () => true, true).join(" ")).toMatch(/private|rights/i);
  });
});
''')
p=root/'tests/media-build.test.ts';p.write_text(p.read_text()+r'''

it("generates page hero fallback and project default share metadata without a visual share placement", () => {
  for (const route of ["guides/getting-started/index.html", "about/index.html"]) {
    const html = readFileSync(join(fixtureRoot, "dist", route), "utf8");
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="675"');
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).not.toContain('data-media-placement="share"');
    expect(html).not.toContain("private/qa-");
  }
});
''')
