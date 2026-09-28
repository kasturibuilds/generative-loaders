import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { fileURLToPath } from "node:url";

const serverRoot = fileURLToPath(new URL("../dist/server", import.meta.url));
const modulePaths = ["index.js", ...readdirSync(serverRoot, { recursive: true }).filter(path => /\.m?js$/.test(path) && path !== "index.js")];
const runtime = new Miniflare(convertV4MiniflareOptions({
  name: "security-test",
  routes: ["*/*"],
  modules: modulePaths.map(path => ({ type: "ESModule", path: `${serverRoot}/${path}`, contents: readFileSync(`${serverRoot}/${path}`, "utf8") })),
  modulesRoot: fileURLToPath(new URL("../dist/server", import.meta.url)),
  compatibilityDate: "2026-09-26",
  compatibilityFlags: ["nodejs_compat"],
  cf: false,
  assets: { directory: fileURLToPath(new URL("../dist/client", import.meta.url)), binding: "ASSETS" },
  d1Databases: ["DB"],
  bindings: { ANALYTICS_ALLOWED_EMAILS: "owner@example.com" },
}));
after(() => runtime.dispose());

async function render(pathname = "/", origin = "http://localhost", headers = {}) {
  return runtime.dispatchFetch(`${origin}${pathname}`, { headers: { accept: "text/html", ...headers }, redirect: "manual" });
}

test("redirects the generated Sites hostname to the canonical domain", async () => {
  const response = await render(
    "/docs?source=sites",
    "https://progress-narrative.kkasturi2502.chatgpt.site",
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://generativeloaders.com/docs?source=sites");
});

test("server-renders the text loader gallery", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Generative Loaders/);
  assert.match(html, /aria-label="Homepage view"/);
  assert.match(html, />Loaders</);
  assert.match(html, />In Use</);
  for (const variant of ["Decode", "Typewriter", "Skeleton", "Cascade", "Focus", "Wipe", "Flip", "Redact", "Line by line", "Terminal", "Wave", "Dissolve", "Slice", "Tracking", "Coalesce", "Fragments"]) {
    assert.match(html, new RegExp(`>${variant}<`));
  }
  assert.match(html, /npm install generative-loaders/);
  assert.match(html, /Text loaders/);
  assert.match(html, /Inline loaders/);
  assert.match(html, /Image loaders/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-label="Copy Decode code"/);
  assert.match(html, /aria-label="Copy Typewriter code"/);
  assert.doesNotMatch(html, />Playground</);
  assert.match(html, />Docs</);
  assert.match(html, />GitHub</);
  assert.match(html, />84k</);
  assert.doesNotMatch(html, />API</);
  assert.doesNotMatch(html, /Ideas arrive quietly/);
  assert.doesNotMatch(html, /Progress Narrative|Thinking steps|codex-preview|react-loading-skeleton/i);
});

test("server-renders complete library documentation", async () => {
  const response = await render("/docs");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Documentation — Generative Loaders/);
  assert.match(html, />Quick start</);
  assert.match(html, />Streaming text</);
  assert.match(html, />TextLoader</);
  assert.match(html, />InlineLoader</);
  assert.match(html, />ImageLoader</);
  assert.match(html, />Accessibility</);
  assert.match(html, /generative-loaders\/styles\.css/);
  assert.match(html, /React 18 or newer/);
});

test("uses matching CSP nonces for every rendered executable script", async () => {
  const response = await render("/", "https://generativeloaders.com");
  const csp = response.headers.get("content-security-policy");
  const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("strict-transport-security"), /max-age=/);
  const html = await response.text();
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
  assert.ok(tags.length > 1);
  for (const tag of tags) {
    if (/type="application\/(?:json|ld\+json)"/.test(tag)) continue;
    assert.ok(tag.includes(`nonce="${nonce}"`), `Missing matching nonce: ${tag}`);
  }
});

test("anonymous analytics stays behind sign-in with no shared caching", async () => {
  const response = await render("/analytics", "https://generativeloaders.com");
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/signin-with-chatgpt?return_to=%2Fanalytics");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "no-store");
});

test("keeps the pending chat skeleton wide enough to render", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.context-message-assistant\s*\{[^}]*width:78%/);
  assert.match(css, /\.context-chat-copy\s*\{[^}]*flex:1;[^}]*min-width:0/);
});

test("ships renamed metadata and social artwork", async () => {
  const [layout, packageJson, packageManifest] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../packages/generative-loaders/package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Generative Loaders/);
  assert.match(layout, /text, inline, and image loaders/);
  assert.match(layout, /generative-loaders-og\.png/);
  assert.match(layout, /https:\/\/generativeloaders\.com/);
  assert.match(layout, /alternates:\s*\{ canonical: "\/" \}/);
  assert.match(packageJson, /generative-loaders-workspace/);
  assert.match(packageManifest, /"name": "generative-loaders"/);
  assert.doesNotMatch(`${layout}${packageJson}${packageManifest}`, /Progress Narrative|codex-preview|react-loading-skeleton/i);
  assert.doesNotMatch(`${packageJson}${packageManifest}`, /"name"\s*:\s*"progress-narrative"/i);
  await access(new URL("../public/generative-loaders-og.png", import.meta.url));
});


const analyticsOwner = { "oai-authenticated-user-id": "verified-owner", "oai-authenticated-user-email": "owner@example.com" };
test("analytics rejects a different signed-in account", async () => {
  const response = await render("/analytics", "https://generativeloaders.com", { ...analyticsOwner, "oai-authenticated-user-email": "other@example.com" });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("private analytics preserves historical data and filters seven-day reports", async () => {
  const db = await runtime.getD1Database("DB");
  for (const file of readdirSync("drizzle").filter(name => name.endsWith(".sql")).sort()) {
    for (const sql of readFileSync(`drizzle/${file}`, "utf8").split("--> statement-breakpoint")) {
      if (sql.trim()) await db.prepare(sql.trim()).run();
    }
  }
  const today = new Date().toISOString().slice(0,10);
  const earlier = new Date(Date.now()-10*86400000).toISOString().slice(0,10);
  await db.batch([
    db.prepare("INSERT INTO analytics_daily(day,event,count) VALUES (?, 'page_view', 3)").bind(today),
    db.prepare("INSERT INTO analytics_daily(day,event,count) VALUES (?, 'page_view', 8)").bind(earlier),
    db.prepare("INSERT INTO analytics_daily(day,event,count) VALUES (?, 'code_copy:text:decode', 2)").bind(today),
  ]);
  const response = await render("/analytics?days=7", "https://generativeloaders.com", analyticsOwner);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const html = await response.text();
  assert.match(html, /Page views<\/span><strong>3<\/strong>/);
  assert.match(html, /Code copies by variant/);
  assert.match(html, /text \/ decode/);
  const monthly = await render("/analytics", "https://generativeloaders.com", analyticsOwner);
  assert.equal(monthly.status, 200);
  assert.match(await monthly.text(), /Page views<\/span><strong>11<\/strong>/);
  const event = await runtime.dispatchFetch("https://generativeloaders.com/api/analytics/events", { method:"POST", headers:{...analyticsOwner, "content-type":"application/json", origin:"https://generativeloaders.com"}, body:JSON.stringify({event:"github_click", path:"/"}) });
  assert.equal(event.status,204);
  assert.equal(await db.prepare("SELECT COUNT(*) AS count FROM analytics_daily WHERE event = 'github_click'").first("count"),0);
});
