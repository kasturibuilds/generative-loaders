export type NamedCount = { name: string; count: number };
export type DayCount = { day: string; pageViews: number; visitors: number };
export type Traffic = { days: DayCount[]; pages: NamedCount[]; referrers: NamedCount[]; campaigns: NamedCount[]; actions: NamedCount[]; collections: NamedCount[]; variants: NamedCount[]; copies: NamedCount[]; themes: NamedCount[]; installCopies: number; npmClicks: number; githubClicks: number };

export async function getTraffic(db: D1Database | undefined, days: number): Promise<Traffic | null> {
  try {
    if (!db) return null;
    const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const query = async <T>(sql: string) => {
      const result = await db.prepare(sql).bind(cutoff).all<T>();
      if (!result.success) throw new Error("Query failed");
      return result.results;
    };
    const ranking = (prefix: string) => query<NamedCount>(`SELECT substr(event, ${prefix.length + 2}) AS name, SUM(count) AS count FROM analytics_daily WHERE day >= ? AND event LIKE '${prefix}:%' GROUP BY event ORDER BY count DESC LIMIT 20`);
    const [daily, visitors, pages, referrers, campaigns, actions, collections, variants, copies, themes] = await Promise.all([
      query<{day: string; count: number}>("SELECT day, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= ? GROUP BY day ORDER BY day"),
      query<{day: string; count: number}>("SELECT day, COUNT(*) AS count FROM analytics_visitors WHERE day >= ? GROUP BY day ORDER BY day"),
      query<NamedCount>("SELECT path AS name, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= ? GROUP BY path ORDER BY count DESC LIMIT 8"),
      query<NamedCount>("SELECT referrer AS name, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= ? AND referrer != 'internal' GROUP BY referrer ORDER BY count DESC LIMIT 8"),
      query<NamedCount>("SELECT source || ' / ' || campaign AS name, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= ? AND campaign != 'untagged' GROUP BY source, campaign ORDER BY count DESC LIMIT 8"),
      query<NamedCount>("SELECT CASE WHEN instr(event, ':') > 0 THEN substr(event, 1, instr(event, ':') - 1) ELSE event END AS name, SUM(count) AS count FROM analytics_daily WHERE event != 'page_view' AND day >= ? GROUP BY name ORDER BY count DESC"),
      ranking("collection_select"), ranking("variant_select"), ranking("code_copy"), ranking("theme_select"),
    ]);
    const viewMap = new Map(daily.map((row) => [row.day, Number(row.count)]));
    const visitorMap = new Map(visitors.map((row) => [row.day, Number(row.count)]));
    const counts = new Map(actions.map((row) => [row.name, Number(row.count)]));
    return {
      days: Array.from({ length: days }, (_, i) => { const day = new Date(Date.parse(cutoff) + i * 86400000).toISOString().slice(0, 10); return { day, pageViews: viewMap.get(day) ?? 0, visitors: visitorMap.get(day) ?? 0 }; }),
      pages, referrers, campaigns, actions, collections, variants, copies, themes,
      installCopies: counts.get("install_copy") ?? 0, npmClicks: counts.get("npm_outbound") ?? 0, githubClicks: counts.get("github_click") ?? 0,
    };
  } catch { console.error("Analytics report unavailable"); return null; }
}
export async function getDownloads(days: number) {
  const end = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const start = new Date(Date.parse(end) - (days - 1) * 86400000).toISOString().slice(0, 10);
  try {
    const response = await fetch(`https://api.npmjs.org/downloads/range/${start}:${end}/generative-loaders`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json() as { downloads?: {day: string; downloads: number}[] };
    if (!Array.isArray(data.downloads) || !data.downloads.every((row) => Number.isFinite(row.downloads) && row.downloads >= 0)) return null;
    return { start, end, total: data.downloads.reduce((sum, row) => sum + row.downloads, 0) };
  } catch { return null; }
}
