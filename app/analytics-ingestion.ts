// Public, deliberately lossy analytics. No raw IP addresses or arbitrary URLs
// are stored. Durable global budgets bound writes even if visitor IDs rotate.
export const MAX_BODY_BYTES = 2048;
export const EVENTS_PER_MINUTE = 120;
export const EVENTS_PER_DAY = 10000;
const PATHS = new Set(["/", "/docs"]);
const EVENTS = new Set(["page_view", "install_copy", "npm_outbound"]);
const SOURCES = new Set(["direct", "reddit", "github", "linkedin", "x", "twitter", "newsletter", "social"]);

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError(415, "Expected application/json");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw new RequestError(413, "Payload too large");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Missing payload");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw new RequestError(413, "Payload too large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestError(400, "Invalid JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RequestError(400, "Expected an object");
  return parsed as Record<string, unknown>;
}

function label(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[a-z0-9_.-]{1,80}$/.test(value)) throw new RequestError(400, "Invalid attribution");
  return value;
}

function referrerCategory(value: string) {
  if (value === "direct" || value === "internal") return value;
  const hosts: Record<string, string> = { "reddit.com": "reddit", "github.com": "github", "linkedin.com": "linkedin", "x.com": "x", "t.co": "x", "twitter.com": "x", "google.com": "google", "bing.com": "bing" };
  return Object.hasOwn(hosts, value) ? hosts[value] : "other";
}

export async function recordAnalytics(request: Request, db?: D1Database): Promise<Response> {
  try {
    const origin = request.headers.get("origin");
    // Origin is only a browser abuse signal, never authentication.
    if (origin && origin !== new URL(request.url).origin) throw new RequestError(403, "Cross-origin events are not accepted");
    const payload = await readPayload(request);
    const { event, path, visitorId } = payload;
    if (typeof event !== "string" || !EVENTS.has(event)) throw new RequestError(400, "Unsupported event");
    if (typeof path !== "string" || !PATHS.has(path)) throw new RequestError(400, "Unsupported path");
    if (visitorId !== undefined && visitorId !== "" && (typeof visitorId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId))) throw new RequestError(400, "Invalid visitor ID");
    const submittedSource = label(payload.source, "direct");
    const source = SOURCES.has(submittedSource) ? submittedSource : "other";
    const campaign = label(payload.campaign, "untagged");
    const referrer = referrerCategory(label(payload.referrer, "direct"));
    if (!db) return Response.json({ error: "Analytics storage is unavailable" }, { status: 503 });
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const minute = Math.floor(now.getTime() / 60000);
    // Atomic conditional upsert, avoiding read/check/write races across Workers.
    // One row prevents the limiter itself growing with attacker-selected keys.
    const admitted = await db.prepare(`
      INSERT INTO analytics_budget (id, minute, minute_count, day, day_count)
      VALUES (1, ?, 1, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        minute = excluded.minute,
        minute_count = CASE WHEN analytics_budget.minute = excluded.minute THEN analytics_budget.minute_count + 1 ELSE 1 END,
        day = excluded.day,
        day_count = CASE WHEN analytics_budget.day = excluded.day THEN analytics_budget.day_count + 1 ELSE 1 END
      WHERE (analytics_budget.minute != excluded.minute OR analytics_budget.minute_count < ?)
        AND (analytics_budget.day != excluded.day OR analytics_budget.day_count < ?)
      RETURNING id
    `).bind(minute, day, EVENTS_PER_MINUTE, EVENTS_PER_DAY).first();
    if (!admitted) return Response.json({ error: "Analytics capacity reached" }, { status: 429, headers: { "Retry-After": "60" } });

    const cutoff = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    const statements = [
      // Bounded cleanup on accepted traffic; no unbounded data migration.
      db.prepare("DELETE FROM analytics_daily WHERE rowid IN (SELECT rowid FROM analytics_daily WHERE day < ? LIMIT 500)").bind(cutoff),
      db.prepare("DELETE FROM analytics_visitors WHERE rowid IN (SELECT rowid FROM analytics_visitors WHERE day < ? LIMIT 500)").bind(cutoff),
      db.prepare(`INSERT INTO analytics_daily (day, event, path, source, campaign, referrer, count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(day, event, path, source, campaign, referrer)
        DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`).bind(day, event, path, source, campaign, referrer),
    ];
    if (event === "page_view" && visitorId) statements.push(db.prepare(`
      INSERT INTO analytics_visitors (day, visitor_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(day, visitor_id) DO NOTHING`).bind(day, visitorId));
    await db.batch(statements);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof RequestError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Analytics event was not recorded" }, { status: 503 });
  }
}
