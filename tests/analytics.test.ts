// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTraffic, getDownloads } from "../app/analytics/report";
import { recordAnalytics } from "../app/analytics-ingestion";
import { hasAnalyticsAccess } from "../app/analytics-access";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(`drizzle/${file}`, "utf8"));
  const db = {
    prepare: (sql: string) => ({ bind: (...values: (string | number)[]) => ({
      first: async () => sqlite.prepare(sql).get(...values) ?? null,
      all: async () => ({ success: true, results: sqlite.prepare(sql).all(...values) }),
      run: () => sqlite.prepare(sql).run(...values),
    }) }),
    batch: async (statements: {run: () => unknown}[]) => { sqlite.exec("BEGIN"); try { const result = statements.map((s) => s.run()); sqlite.exec("COMMIT"); return result; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } },
  } as unknown as D1Database;
  return { sqlite, db };
}
function event(name: string, headers: Record<string, string> = {}) {
  return new Request("https://generativeloaders.com/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://generativeloaders.com", ...headers }, body: JSON.stringify({ event: name, path: "/", visitorId: "00000000-0000-4000-8000-000000000001" }) });
}
afterEach(() => vi.unstubAllGlobals());

describe("expanded private reports", () => {
  it("preserves existing totals and groups loader-specific actions without a schema migration", async () => {
    const { sqlite, db } = database();
    try {
      const today = new Date().toISOString().slice(0, 10);
      sqlite.prepare("INSERT INTO analytics_daily(day,event,count) VALUES (?, 'install_copy', 12)").run(today);
      for (const name of ["page_view", "page_view", "github_click", "code_copy:text:decode", "code_copy:image:tiles", "collection_select:inline", "variant_select:inline:orbit", "theme_select:dark"]) expect((await recordAnalytics(event(name), db)).status).toBe(204);
      const report = await getTraffic(db, 7);
      expect(report?.days).toHaveLength(7);
      expect(report?.days.at(-1)).toMatchObject({pageViews: 2, visitors: 1});
      expect(report?.installCopies).toBe(12);
      expect(report?.githubClicks).toBe(1);
      expect(report?.actions.find((row) => row.name === "code_copy")?.count).toBe(2);
      expect(report?.copies).toEqual(expect.arrayContaining([{name: "text:decode", count: 1}, {name: "image:tiles", count: 1}]));
      expect(report?.collections).toEqual([{name: "inline", count: 1}]);
      expect(report?.variants).toEqual([{name: "inline:orbit", count: 1}]);
      expect(report?.themes).toEqual([{name: "dark", count: 1}]);
      expect((await recordAnalytics(event("code_copy:text:secret-arbitrary-value"), db)).status).toBe(400);
    } finally { sqlite.close(); }
  });
  it("distinguishes database failure from zero traffic", async () => {
    expect(await getTraffic(undefined, 30)).toBeNull();
    const { sqlite, db } = database();
    try { expect((await getTraffic(db, 30))?.days.every((row) => row.pageViews === 0)).toBe(true); } finally { sqlite.close(); }
  });
  it("honors privacy signals and requires same-origin event requests", async () => {
    const { sqlite, db } = database();
    try {
      for (const headers of [{ DNT: "1" }, { "Sec-GPC": "1" }, { "User-Agent": "Googlebot" }] as Record<string,string>[]) expect((await recordAnalytics(event("page_view", headers), db)).status).toBe(204);
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM analytics_daily").get()?.n).toBe(0);
      expect((await recordAnalytics(event("page_view", { Origin: "" }), db)).status).toBe(403);
    } finally { sqlite.close(); }
  });
  it("fails closed for anonymous users, other accounts, and an unset allowlist", () => {
    const user = {userId: "verified", email: "owner@example.com"};
    expect(hasAnalyticsAccess(user, "owner@example.com")).toBe(true);
    expect(hasAnalyticsAccess(null, "owner@example.com")).toBe(false);
    expect(hasAnalyticsAccess({...user, userId: ""}, "owner@example.com")).toBe(false);
    expect(hasAnalyticsAccess(user, undefined)).toBe(false);
    expect(hasAnalyticsAccess({...user, email: "other@example.com"}, "owner@example.com")).toBe(false);
  });
  it("reports npm failures separately and requests complete UTC days", async () => {
    const fetcher = vi.fn(async () => Response.json({downloads:[{day:"2026-09-27",downloads:25}]})); vi.stubGlobal("fetch", fetcher);
    const result = await getDownloads(7);
    expect(result?.total).toBe(25);
    expect(result?.end).toBe(new Date(Date.now()-86400000).toISOString().slice(0,10));
    vi.stubGlobal("fetch", vi.fn(async () => {throw new Error("unavailable");}));
    expect(await getDownloads(30)).toBeNull();
  });
});
