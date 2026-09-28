import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "../components/brand-mark";
import { requireChatGPTUser } from "../chatgpt-auth";
import { CampaignLinkBuilder } from "./campaign-link-builder";

export const metadata: Metadata = {
  title: "Analytics — Generative Loaders",
  description: "Private traffic and package analytics for Generative Loaders.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PACKAGE_NAME = "generative-loaders";
const PUBLISHED_ON = "2026-08-08";
type DownloadDay = { day: string; downloads: number };
type NamedCount = { name: string; count: number };
type DayCount = { day: string; pageViews: number; visitors: number };

function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function displayDay(day: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)); }

async function requireAnalyticsAccess() {
  const user = await requireChatGPTUser("/analytics");
  const allowed = (env.ANALYTICS_ALLOWED_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) notFound();
}

async function getDownloads() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch(`https://api.npmjs.org/downloads/range/${PUBLISHED_ON}:${today}/${PACKAGE_NAME}`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json() as { downloads?: DownloadDay[] };
    return data.downloads ?? [];
  } catch { return []; }
}

async function getTraffic() {
  const empty = { days: [] as DayCount[], pages: [] as NamedCount[], referrers: [] as NamedCount[], campaigns: [] as NamedCount[], installCopies: 0, npmClicks: 0 };
  try {
    if (!env.DB) return empty;
    const [daily, visitors, pages, referrers, campaigns, actions] = await Promise.all([
      env.DB.prepare(`SELECT day, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= date('now', '-29 days') GROUP BY day ORDER BY day`).all<{ day: string; count: number }>(),
      env.DB.prepare(`SELECT day, COUNT(*) AS count FROM analytics_visitors WHERE day >= date('now', '-29 days') GROUP BY day ORDER BY day`).all<{ day: string; count: number }>(),
      env.DB.prepare(`SELECT path AS name, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= date('now', '-29 days') GROUP BY path ORDER BY count DESC LIMIT 8`).all<NamedCount>(),
      env.DB.prepare(`SELECT referrer AS name, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= date('now', '-29 days') AND referrer != 'internal' GROUP BY referrer ORDER BY count DESC LIMIT 8`).all<NamedCount>(),
      env.DB.prepare(`SELECT source || ' / ' || campaign AS name, SUM(count) AS count FROM analytics_daily WHERE event = 'page_view' AND day >= date('now', '-29 days') AND campaign != 'untagged' GROUP BY source, campaign ORDER BY count DESC LIMIT 8`).all<NamedCount>(),
      env.DB.prepare(`SELECT event AS name, SUM(count) AS count FROM analytics_daily WHERE event != 'page_view' AND day >= date('now', '-29 days') GROUP BY event`).all<NamedCount>(),
    ]);
    const visitorMap = new Map((visitors.results ?? []).map((row) => [row.day, Number(row.count)]));
    const actionMap = new Map((actions.results ?? []).map((row) => [row.name, Number(row.count)]));
    return {
      days: (daily.results ?? []).map((row) => ({ day: row.day, pageViews: Number(row.count), visitors: visitorMap.get(row.day) ?? 0 })),
      pages: (pages.results ?? []).map((row) => ({ name: row.name, count: Number(row.count) })),
      referrers: (referrers.results ?? []).map((row) => ({ name: row.name, count: Number(row.count) })),
      campaigns: (campaigns.results ?? []).map((row) => ({ name: row.name, count: Number(row.count) })),
      installCopies: actionMap.get("install_copy") ?? 0,
      npmClicks: actionMap.get("npm_outbound") ?? 0,
    };
  } catch { return empty; }
}

function Ranking({ rows, empty }: { rows: NamedCount[]; empty: string }) {
  if (!rows.length) return <p className="analytics-empty">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return <div className="analytics-ranking">{rows.map((row) => <div key={row.name}><span>{row.name}</span><i><b style={{ width: `${(row.count / max) * 100}%` }} /></i><strong>{formatNumber(row.count)}</strong></div>)}</div>;
}

export default async function AnalyticsPage() {
  await requireAnalyticsAccess();
  const [downloads, traffic] = await Promise.all([getDownloads(), getTraffic()]);
  const totalDownloads = downloads.reduce((sum, day) => sum + day.downloads, 0);
  const totalViews = traffic.days.reduce((sum, day) => sum + day.pageViews, 0);
  const totalVisitors = traffic.days.reduce((sum, day) => sum + day.visitors, 0);
  const maxViews = Math.max(...traffic.days.map((day) => day.pageViews), 1);

  return <main className="analytics-page">
    <nav className="analytics-nav shell"><Link className="brand" href="/"><BrandMark />Generative Loaders</Link><div><Link href="/">Gallery</Link><Link href="/docs">Docs</Link><a href="/signout-with-chatgpt?return_to=%2F">Sign out</a></div></nav>
    <header className="analytics-hero shell"><div><p className="analytics-kicker">Private analytics · last 30 days</p><h1>Your site’s pulse, in one place.</h1><p>Traffic, acquisition, product interest, and npm distribution. Anonymous traffic estimates with limited attribution and daily visitor identifiers.</p></div><span className="data-status live"><i />Live tracking</span></header>
    <section className="analytics-summary shell" aria-label="Analytics summary">
      <article><span>Page views</span><strong>{formatNumber(totalViews)}</strong><small>Last 30 days</small></article>
      <article><span>Daily visitors</span><strong>{formatNumber(totalVisitors)}</strong><small>Privacy-friendly estimate</small></article>
      <article><span>Install copies</span><strong>{formatNumber(traffic.installCopies)}</strong><small>Last 30 days</small></article>
      <article><span>Npm downloads</span><strong>{formatNumber(totalDownloads)}</strong><small>Since publication</small></article>
    </section>
    <section className="analytics-grid shell">
      <article className="analytics-panel analytics-wide"><div className="panel-heading"><div><span>01</span><h2>Traffic by day</h2></div><small>Views / visitors</small></div>
        {traffic.days.length ? <div className="traffic-chart">{traffic.days.map((day) => <div className="traffic-column" key={day.day}><span>{formatNumber(day.pageViews)}</span><div><i style={{ height: `${Math.max((day.pageViews / maxViews) * 100, 4)}%` }} /></div><small>{displayDay(day.day)}</small><b>{day.visitors} visitors</b></div>)}</div> : <p className="analytics-empty analytics-chart-empty">Traffic will appear here after the new tracker receives its first visits.</p>}
      </article>
      <article className="analytics-panel"><div className="panel-heading"><div><span>02</span><h2>Top pages</h2></div><small>30 days</small></div><Ranking rows={traffic.pages} empty="No page data yet." /></article>
      <article className="analytics-panel"><div className="panel-heading"><div><span>03</span><h2>Referrers</h2></div><small>30 days</small></div><Ranking rows={traffic.referrers} empty="No referral data yet." /></article>
      <article className="analytics-panel"><div className="panel-heading"><div><span>04</span><h2>Campaigns</h2></div><small>Tagged visits</small></div><Ranking rows={traffic.campaigns} empty="No tagged campaign traffic yet." /><CampaignLinkBuilder /></article>
      <article className="analytics-panel"><div className="panel-heading"><div><span>05</span><h2>Product interest</h2></div><small>30 days</small></div><div className="analytics-actions"><div><span>Install command copies</span><strong>{formatNumber(traffic.installCopies)}</strong></div><div><span>Clicks through to npm</span><strong>{formatNumber(traffic.npmClicks)}</strong></div></div></article>
    </section>
    <footer className="analytics-footer shell"><span>Counts begin when this version goes live; past website visits cannot be reconstructed.</span><Link href="/">Back to gallery →</Link></footer>
  </main>;
}
