import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "../components/brand-mark";
import { requireChatGPTUser } from "../chatgpt-auth";
import { hasAnalyticsAccess } from "../analytics-access";
import { CampaignLinkBuilder } from "./campaign-link-builder";
import { getDownloads, getTraffic, type NamedCount } from "./report";

export const metadata: Metadata = { title: "Analytics — Generative Loaders", description: "Private traffic and package analytics for Generative Loaders.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const format = (value: number) => new Intl.NumberFormat("en-US").format(value);
const names: Record<string, string> = { install_copy: "Install copies", npm_outbound: "npm clicks", github_click: "GitHub clicks", code_copy: "Code copies", collection_select: "Collection selections", variant_select: "Variant selections", theme_select: "Theme changes", view_select: "Gallery / In Use", format_select: "Example formats" };
function label(name: string) { return names[name] ?? name.replaceAll(":", " / "); }
function Ranking({ title, rows, empty = "No activity yet." }: { title: string; rows: NamedCount[]; empty?: string }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return <article className="analytics-panel"><div className="panel-heading"><h2>{title}</h2></div>{rows.length ? <div className="analytics-ranking">{rows.map((row) => <div key={row.name}><span>{label(row.name)}</span><i aria-hidden="true"><b style={{ width: `${row.count / max * 100}%` }} /></i><strong>{format(row.count)}</strong></div>)}</div> : <p className="analytics-empty">{empty}</p>}</article>;
}

async function AnalyticsView({ days }: { days: number }) {
  const returnTo = days === 30 ? "/analytics" : "/analytics?days=7";
  const user = await requireChatGPTUser(returnTo);
  if (!hasAnalyticsAccess(user, env.ANALYTICS_ALLOWED_EMAILS)) notFound();
  const [traffic, downloads] = await Promise.all([getTraffic(env.DB, days), getDownloads(days)]);
  const views = traffic?.days.reduce((sum, row) => sum + row.pageViews, 0);
  const visitors = traffic?.days.reduce((sum, row) => sum + row.visitors, 0);
  const maxViews = Math.max(...(traffic?.days.map((row) => row.pageViews) ?? []), 1);
  return <main className="analytics-page">
    <nav className="analytics-nav shell"><Link className="brand" href="/"><BrandMark />Generative Loaders</Link><div><Link href="/">Gallery</Link><Link href="/docs">Docs</Link><a href="/signout-with-chatgpt?return_to=%2F">Sign out</a></div></nav>
    <header className="analytics-hero analytics-hero-compact shell"><div><p className="analytics-kicker">Private · Generative Loaders</p><h1>Analytics</h1><p>Traffic, referrals, loader interest, and npm downloads.</p></div><nav className="analytics-period" aria-label="Report period"><Link aria-current={days === 7 ? "page" : undefined} href="/analytics?days=7">7 days</Link><Link aria-current={days === 30 ? "page" : undefined} href="/analytics">30 days</Link><a href={returnTo}>Refresh</a></nav></header>
    {!traffic && <div className="analytics-unavailable shell" role="alert"><p>Website analytics is temporarily unavailable. Your counts have not been reset.</p><a href={returnTo}>Try again</a></div>}
    <section className="analytics-summary shell" aria-label="Analytics summary">
      <article><span>Page views</span><strong>{views === undefined ? "Unavailable" : format(views)}</strong><small>Last {days} days</small></article>
      <article><span>Daily visitors, summed</span><strong>{visitors === undefined ? "Unavailable" : format(visitors)}</strong><small>Daily estimates · includes repeat days</small></article>
      <article><span>Install copies</span><strong>{traffic ? format(traffic.installCopies) : "Unavailable"}</strong><small>Successful copies · last {days} days</small></article>
      <article><span>npm downloads</span><strong>{downloads ? format(downloads.total) : "Unavailable"}</strong><small>{downloads ? `${downloads.start} – ${downloads.end}` : "npm data temporarily unavailable"}</small></article>
    </section>
    {traffic && <section className="analytics-grid shell">
      <article className="analytics-panel analytics-wide"><div className="panel-heading"><h2>Traffic by day</h2><small>UTC · today is partial</small></div>
        {views ? <div className="analytics-table-scroll"><table className="analytics-table"><caption className="sr-only">Daily page views and estimated visitors</caption><thead><tr><th scope="col">Date</th><th scope="col">Page views</th><th scope="col">Daily visitors</th><th scope="col" className="analytics-trend">Trend</th></tr></thead><tbody>{[...traffic.days].reverse().map((row) => <tr key={row.day}><th scope="row">{row.day}</th><td>{format(row.pageViews)}</td><td>{format(row.visitors)}</td><td className="analytics-trend"><i aria-hidden="true" style={{ width: `${row.pageViews / maxViews * 100}%` }} /></td></tr>)}</tbody></table></div> : <p className="analytics-empty analytics-chart-empty">No visits recorded in this period. New visits will appear here.</p>}
      </article>
      <Ranking title="Top pages" rows={traffic.pages} /><Ranking title="Referrals" rows={traffic.referrers} />
      <Ranking title="Actions" rows={traffic.actions} /><Ranking title="Collections selected" rows={traffic.collections} />
      <Ranking title="Code copies by variant" rows={traffic.copies} /><Ranking title="Variants selected in examples" rows={traffic.variants} />
      <Ranking title="Light / dark choices" rows={traffic.themes} />
      <article className="analytics-panel"><div className="panel-heading"><h2>Campaigns</h2></div>{traffic.campaigns.length ? <ul className="analytics-campaigns">{traffic.campaigns.map((row) => <li key={row.name}><span>{row.name}</span><strong>{format(row.count)}</strong></li>)}</ul> : <p className="analytics-empty">No tagged campaign traffic yet.</p>}<CampaignLinkBuilder /></article>
    </section>}
    <footer className="analytics-footer analytics-explanation shell"><div><p>Reports cover the last {days} days. Visitor IDs rotate daily; totals are not unique people across the period. Local previews, recognized bots, privacy opt-outs, and signed-in dashboard users are excluded.</p><p>Collection and variant counts measure deliberate choices, not default views or hovers. Tracking is best effort and may be blocked or limited. No raw IP addresses, email addresses, copied code, or full referrer URLs are stored.</p><p>npm uses complete UTC days and includes automated and repeat downloads. Existing website history is preserved; newly added events start with this update.</p></div><Link href="/">Back to gallery →</Link></footer>
  </main>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams ?? {};
  return <AnalyticsView days={params.days === "7" ? 7 : 30} />;
}
