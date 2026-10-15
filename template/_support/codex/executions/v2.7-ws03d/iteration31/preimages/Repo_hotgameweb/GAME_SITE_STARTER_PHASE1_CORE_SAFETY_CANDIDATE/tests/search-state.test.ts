import { describe, expect, it } from "vitest";

import {
  buildSearchLocation,
  normalizeSearchResult,
  readSearchQuery,
} from "../src/core/search-state";

describe("search state", () => {
  it("reads and bounds a trimmed query from the URL", () => {
    expect(readSearchQuery("?q=%20Configure%20")).toBe("Configure");
    expect(readSearchQuery("?q=%20%20")).toBe("");
    expect(readSearchQuery(`?q=${"a".repeat(140)}`)).toHaveLength(120);
  });

  it("builds a stable same-page search location", () => {
    expect(buildSearchLocation("configure starter")).toBe(
      "/search/?q=configure+starter",
    );
    expect(buildSearchLocation("  ")).toBe("/search/");
  });

  it("normalizes local Pagefind results and strips markup", () => {
    expect(
      normalizeSearchResult({
        url: "/guides/getting-started/",
        meta: { title: "  Configure the starter  " },
        excerpt: "Use <mark>Page Inventory</mark> &amp; facts.",
      }),
    ).toEqual({
      url: "/guides/getting-started/",
      title: "Configure the starter",
      excerpt: "Use Page Inventory & facts.",
    });
  });

  it("uses readable fallbacks for missing result metadata", () => {
    expect(
      normalizeSearchResult({ url: "/guides/getting-started/" }),
    ).toEqual({
      url: "/guides/getting-started/",
      title: "Getting Started",
      excerpt: "Open this result to read the full page.",
    });
  });

  it("prefers the page description and bounds long snippets", () => {
    const result = normalizeSearchResult({
      url: "/guides/getting-started/",
      meta: { title: "Guide", description: `Focused ${"detail ".repeat(50)}` },
      excerpt: "Noisy excerpt",
    });

    expect(result?.excerpt.startsWith("Focused detail")).toBe(true);
    expect(result?.excerpt.length).toBeLessThanOrEqual(220);
    expect(result?.excerpt.endsWith("…")).toBe(true);
  });

  it("rejects external, protocol-relative, and malformed result URLs", () => {
    expect(normalizeSearchResult({ url: "https://example.com/" })).toBeNull();
    expect(normalizeSearchResult({ url: "//example.com/" })).toBeNull();
    expect(normalizeSearchResult({ url: "/../private/" })).toBeNull();
  });
});
