import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", origin = "http://localhost") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`${origin}${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
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
  assert.match(html, />30\.3k</);
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
