// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { recordAnalytics, EVENTS_PER_MINUTE, EVENTS_PER_DAY } from "../app/analytics-ingestion";
import { prepareSecureRequest, secureResponse } from "../worker/security";

describe("analytics safeguards using real SQLite", () => {
  let sqlite: DatabaseSync;
  let db: D1Database;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
    sqlite = new DatabaseSync(":memory:");
    for (const file of readdirSync("drizzle").filter(file => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(`drizzle/${file}`, "utf8"));
    type Bound = { first: () => Promise<unknown>; run: () => void };
    db = {
      prepare: (sql: string) => ({ bind: (...args: (string | number)[]) => ({
        first: async () => sqlite.prepare(sql).get(...args) ?? null,
        run: () => sqlite.prepare(sql).run(...args),
      }) }),
      batch: async (statements: Bound[]) => {
        sqlite.exec("BEGIN");
        try { for (const stmt of statements) stmt.run(); sqlite.exec("COMMIT"); }
        catch (error) { sqlite.exec("ROLLBACK"); throw error; }
        return [];
      },
    } as unknown as D1Database;
  });
  afterEach(() => { sqlite.close(); vi.useRealTimers(); });
  const payload = { event: "page_view", path: "/", visitorId: "00000000-0000-4000-8000-000000000001" };
  const request = (body: unknown = payload, headers: Record<string, string> = {}) => new Request("https://generativeloaders.com/api/analytics/events", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
  });

  it("records legitimate traffic and deduplicates daily visitors", async () => {
    expect((await recordAnalytics(request(), db)).status).toBe(204);
    expect((await recordAnalytics(request(), db)).status).toBe(204);
    expect(sqlite.prepare("SELECT count FROM analytics_daily").get()?.count).toBe(2);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM analytics_visitors").get()?.n).toBe(1);
  });
  it("rejects malformed payloads and unexpected dimensions without writing", async () => {
    for (const value of [null, [], {}, { ...payload, path: "/analytics" }, { ...payload, visitorId: "arbitrary" }, { ...payload, campaign: "a'; DROP TABLE analytics_daily;--" }]) {
      expect((await recordAnalytics(request(value), db)).status).toBe(400);
    }
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM analytics_budget").get()?.n).toBe(0);
  });
  it("bounds request bytes even without content-length", async () => {
    expect((await recordAnalytics(request({ ...payload, extra: "x".repeat(3000) }), db)).status).toBe(413);
    expect((await recordAnalytics(request(payload, { "content-length": "3000" }), db)).status).toBe(413);
    expect((await recordAnalytics(request(payload, { "content-type": "text/plain" }), db)).status).toBe(415);
  });
  it("compares the entire Origin including protocol", async () => {
    for (const origin of ["https://example.com", "http://generativeloaders.com", "null"]) expect((await recordAnalytics(request(payload, { origin }), db)).status).toBe(403);
    expect((await recordAnalytics(request(payload, { origin: "https://generativeloaders.com" }), db)).status).toBe(204);
  });
  it("enforces global admission across concurrent requests and resets next minute", async () => {
    const results = await Promise.all(Array.from({ length: EVENTS_PER_MINUTE + 5 }, () => recordAnalytics(request(), db)));
    expect(results.filter(r => r.status === 204)).toHaveLength(EVENTS_PER_MINUTE);
    expect(results.filter(r => r.status === 429)).toHaveLength(5);
    expect(sqlite.prepare("SELECT count FROM analytics_daily").get()?.count).toBe(EVENTS_PER_MINUTE);
    vi.setSystemTime(new Date("2026-09-28T12:01:00Z"));
    expect((await recordAnalytics(request(), db)).status).toBe(204);
  });
  it("enforces the daily budget despite a fresh minute, then resets next day", async () => {
    sqlite.prepare("INSERT INTO analytics_budget VALUES (1, 0, 0, '2026-09-28', ?)").run(EVENTS_PER_DAY);
    expect((await recordAnalytics(request(), db)).status).toBe(429);
    vi.setSystemTime(new Date("2026-09-29T00:00:00Z"));
    expect((await recordAnalytics(request(), db)).status).toBe(204);
  });
  it("cleans expired rows while retaining the 30-day boundary", async () => {
    for (const day of ["2026-08-29", "2026-08-30"]) {
      sqlite.prepare("INSERT INTO analytics_visitors(day,visitor_id) VALUES (?,?)").run(day, payload.visitorId);
      sqlite.prepare("INSERT INTO analytics_daily(day,event) VALUES (?, 'page_view')").run(day);
    }
    await recordAnalytics(request(), db);
    expect(sqlite.prepare("SELECT day FROM analytics_visitors ORDER BY day").all().map(r => r.day)).toEqual(["2026-08-30", "2026-09-28"]);
    expect(sqlite.prepare("SELECT day FROM analytics_daily ORDER BY day").all().map(r => r.day)).toEqual(["2026-08-30", "2026-09-28"]);
  });
  it("fails closed when storage is absent", async () => expect((await recordAnalytics(request())).status).toBe(503));
  it("treats arbitrary referrer labels, including object property names, as other", async () => {
    expect((await recordAnalytics(request({ ...payload, referrer: "constructor", source: "unknown" }), db)).status).toBe(204);
    const row = sqlite.prepare("SELECT source, referrer FROM analytics_daily").get();
    expect(row?.source).toBe("other");
    expect(row?.referrer).toBe("other");
  });
});

describe("browser security boundary", () => {
  it("replaces attacker-selected nonces and generates fresh ones", () => {
    const input = new Request("https://generativeloaders.com/", { headers: { "x-nonce": "attacker", "content-security-policy": "script-src 'unsafe-inline'" } });
    const first = prepareSecureRequest(input);
    const second = prepareSecureRequest(input);
    expect(first.request.headers.get("x-nonce")).not.toBe("attacker");
    expect(first.csp).not.toBe(second.csp);
    expect(first.csp).toContain("'strict-dynamic'");
    expect(first.csp.split(";")[1]).not.toContain("unsafe-inline");
  });
  it("marks private redirects and RSC responses as uncacheable", () => {
    for (const path of ["/analytics", "/analytics/", "/api/analytics/events"]) {
      const { request, csp } = prepareSecureRequest(new Request(`https://generativeloaders.com${path}`));
      const response = secureResponse(Response.redirect("https://generativeloaders.com/signin-with-chatgpt", 307), request, csp);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    }
  });
  it("preserves immutable asset caching and the SVG optimizer policy", () => {
    const { request, csp } = prepareSecureRequest(new Request("https://generativeloaders.com/_vinext/image"));
    const response = secureResponse(new Response("", { headers: { "content-type": "image/svg+xml", "content-security-policy": "sandbox", "cache-control": "public, max-age=3600" } }), request, csp);
    expect(response.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });
});
