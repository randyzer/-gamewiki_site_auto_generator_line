import { describe, expect, it } from "vitest";
import { coreBrowserMatrix, validateBrowserCoverage, type BrowserRow } from "./matrix";

const completeRows = (): BrowserRow[] => coreBrowserMatrix.map((entry) => ({
  ...entry, status: "passed", browserVersion: "verified-test-version",
  assertions: entry.requiredAssertions.map((name) => ({ name, passed: true })),
}));

describe("Core browser evidence completeness", () => {
  it("requires 27 baseline, 3 no-JS, 12 boundary, 4 motion and 1 resize rows", () => {
    expect(coreBrowserMatrix).toHaveLength(47);
    expect(coreBrowserMatrix.filter((entry) => entry.kind === "baseline")).toHaveLength(27);
    expect(validateBrowserCoverage(completeRows())).toEqual([]);
  });
  it.each(["missing", "skipped", "duplicate", "unexpected", "assertion", "engine", "viewport", "javascript"])(
    "rejects %s evidence", (defect) => {
      const rows = completeRows();
      if (defect === "missing") rows.pop();
      if (defect === "skipped") rows[0].status = "skipped";
      if (defect === "duplicate") rows.push(rows[0]);
      if (defect === "unexpected") rows.push({ ...rows[0], id: "unplanned" });
      if (defect === "assertion") rows[0].assertions.pop();
      if (defect === "engine") rows[0].browserVersion = "";
      if (defect === "viewport") rows[0].width = 1;
      if (defect === "javascript") rows[0].javascript = false;
      expect(validateBrowserCoverage(rows).length).toBeGreaterThan(0);
    },
  );
});
