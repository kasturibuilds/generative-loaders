import { GitHubButton } from "../components/github-button";
import { BrandMark } from "../components/brand-mark";
import Link from "next/link";

const textVariants = "decode · typewriter · skeleton · cascade · focus · wipe · flip · redact · line · terminal · wave · dissolve · slice · tracking · coalesce · fragments";
const inlineVariants = "glyph · matrix · orbit · ripple · signal · spark · rotor · pixel-drift · chomp · snake · fold · gravity · domino · aperture · dot-pulse · vortex · halo · count-up";
const imageVariants = "skeleton · bands · tiles · scan · pixel-grid · resolution · coalesce · diffusion · raster · bloom · focus · shutter";

function Code({ children }: { children: string }) {
  return <pre className="docs-code"><code>{children}</code></pre>;
}

export default function DocsPage() {
  return <main className="docs-page" id="top">
    <nav className="nav shell docs-nav">
      <Link className="brand" href="/"><BrandMark />Generative Loaders</Link>
      <div className="nav-links"><a href="#quick-start">Quick start</a><a href="#components">Components</a><a href="#accessibility">Accessibility</a><a href="https://github.com/sponsors/kasturikhanke">Sponsor ↗</a></div>
      <div className="nav-actions"><GitHubButton compact /><Link className="nav-install" href="/#contexts">Examples <span>↗</span></Link></div>
    </nav>

    <header className="docs-hero shell">
      <h1>Documentation <span>v0.1.1</span></h1>
    </header>

    <div className="docs-layout shell">
      <aside className="docs-toc" aria-label="Documentation sections">
        <strong>On this page</strong>
        <a href="#quick-start">Quick start</a>
        <a href="#streaming">Streaming text</a>
        <a href="#components">Components</a>
        <a href="#props">Props reference</a>
        <a href="#accessibility">Accessibility</a>
        <a href="#styling">Styling & behavior</a>
        <a href="#troubleshooting">Troubleshooting</a>
      </aside>

      <article className="docs-content">
        <section id="quick-start">
          <p className="docs-kicker">01 · Start here</p>
          <h2>Quick start</h2>
          <p>Generative Loaders is a React component library for the waiting states unique to generative products. It requires React 18 or newer and Node 20 or newer.</p>
          <Code>{`npm install generative-loaders`}</Code>
          <p>Import the component and the stylesheet once in your app:</p>
          <Code>{`import { TextLoader } from "generative-loaders";
import "generative-loaders/styles.css";

export function Answer({ text }: { text: string }) {
  return <TextLoader text={text} variant="decode" />;
}`}</Code>
          <div className="docs-callout"><strong>The essential detail</strong><p>Pass the complete response received so far—not only the newest token. The loader detects the new suffix and animates it while keeping earlier text stable.</p></div>
        </section>

        <section id="streaming">
          <p className="docs-kicker">02 · Integration</p>
          <h2>Streaming text</h2>
          <p>Start with an empty string and append decoded chunks as they arrive. Replace the endpoint with your own streaming route.</p>
          <Code>{`"use client";

import { useState } from "react";
import { TextLoader } from "generative-loaders";
import "generative-loaders/styles.css";

export function StreamingAnswer() {
  const [text, setText] = useState("");

  async function generate() {
    setText("");
    const response = await fetch("/api/generate", { method: "POST" });
    if (!response.ok || !response.body) throw new Error("Generation failed");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      setText((current) => current + decoder.decode(value, { stream: true }));
    }
  }

  return <TextLoader text={text} variant="cascade" />;
}`}</Code>
        </section>

        <section id="components">
          <p className="docs-kicker">03 · Components</p>
          <h2>Choose the right primitive</h2>
          <div className="docs-component-grid">
            <div><span>Text</span><h3>TextLoader</h3><p>For response text that grows over time. Only the newly received suffix animates.</p></div>
            <div><span>Inline</span><h3>InlineLoader</h3><p>For buttons, status rows, and the short wait before any response arrives.</p></div>
            <div><span>Image</span><h3>ImageLoader</h3><p>For a reserved square frame while an image is being generated.</p></div>
          </div>
          <h3>Examples</h3>
          <Code>{`<TextLoader text={streamedText} variant="decode" color="#7c3aed" />

<span>
  <InlineLoader variant="orbit" /> Generating response…
</span>

<ImageLoader
  variant="tiles"
  size={192}
  radius={24}
  label="Generating product image"
/>`}</Code>
          <div className="docs-variants"><p><strong>Text variants</strong>{textVariants}</p><p><strong>Inline variants</strong>{inlineVariants}</p><p><strong>Image variants</strong>{imageVariants}</p></div>
        </section>

        <section id="props">
          <p className="docs-kicker">04 · Reference</p>
          <h2>Props</h2>
          <h3>TextLoader</h3>
          <div className="docs-table" role="table" aria-label="TextLoader props">
            <div role="row"><b>Prop</b><b>Type</b><b>Default</b><b>Purpose</b></div>
            <div role="row"><code>text</code><span>string</span><em>required</em><span>Complete response received so far.</span></div>
            <div role="row"><code>variant</code><span>TextLoaderVariant</span><em>required</em><span>Visual reveal treatment.</span></div>
            <div role="row"><code>color</code><span>CSS color</span><code>#111111</code><span>Loader and text color.</span></div>
            <div role="row"><code>speed</code><span>positive number</span><code>1</code><span>Animation speed multiplier.</span></div>
            <div role="row"><code>paused</code><span>boolean</span><code>false</code><span>Stops motion without removing content.</span></div>
            <div role="row"><code>className</code><span>string</span><span>—</span><span>Custom class on the root element.</span></div>
            <div role="row"><code>aria-label</code><span>string</span><span>normalized text</span><span>Overrides announced status text.</span></div>
          </div>
          <h3>InlineLoader</h3>
          <p>Requires <code>variant</code>. Also accepts <code>size</code> (default <code>1.15em</code>), <code>color</code> (default <code>currentColor</code>), <code>speed</code>, <code>paused</code>, <code>className</code>, and optional <code>label</code>.</p>
          <h3>ImageLoader</h3>
          <p>Requires <code>variant</code>. Also accepts <code>size</code> (default <code>10rem</code>), <code>radius</code> (default <code>10%</code>), <code>color</code>, <code>speed</code>, <code>paused</code>, <code>className</code>, and <code>label</code> (default “Generating image”). Numeric size and radius values are treated as pixels.</p>
        </section>

        <section id="accessibility">
          <p className="docs-kicker">05 · Accessibility</p>
          <h2>Accessible by default</h2>
          <ul>
            <li><strong>TextLoader</strong> uses a polite live status and exposes the received text while its visual layers remain hidden from assistive technology.</li>
            <li><strong>InlineLoader</strong> is hidden from assistive technology when no label is supplied. This prevents duplicate announcements when adjacent copy already says “Generating”. Add <code>label</code> when it stands alone.</li>
            <li><strong>ImageLoader</strong> announces “Generating image” by default. Use a more specific label when the context benefits from it.</li>
            <li>All loaders respect the user’s reduced-motion preference and retain their meaning without animation.</li>
          </ul>
        </section>

        <section id="styling">
          <p className="docs-kicker">06 · Styling</p>
          <h2>Styling and behavior</h2>
          <p>Use props for color, size, radius, and speed. Use <code>className</code> for layout concerns such as margins and alignment. Import the packaged stylesheet exactly once near your application root.</p>
          <Code>{`.answer-loader {
  display: block;
  max-width: 42rem;
  font: 500 1.125rem/1.65 system-ui, sans-serif;
}`}</Code>
          <p>The package is SSR-safe. Components that animate use client-side React behavior, but they render stable markup on the server. TypeScript types for every prop and variant are exported from the package root.</p>
        </section>

        <section id="troubleshooting">
          <p className="docs-kicker">07 · Help</p>
          <h2>Common pitfalls</h2>
          <div className="docs-faq">
            <details open><summary>The loader is unstyled</summary><p>Import <code>generative-loaders/styles.css</code> once in your root layout or application entry file.</p></details>
            <details><summary>Every update re-animates the full response</summary><p>Append chunks to one string. Replacing earlier text or remounting the component with a changing <code>key</code> resets suffix detection.</p></details>
            <details><summary>The inline status is not announced</summary><p>Add a <code>label</code> when the loader has no adjacent visible status copy. Leave it unset when nearby text already communicates the same activity.</p></details>
            <details><summary>Animation speed behaves unexpectedly</summary><p>Use a finite positive number. Invalid, zero, and negative values safely fall back to <code>1</code>.</p></details>
          </div>
          <div className="docs-end"><div><span>Still stuck?</span><h3>Open an issue with a small reproduction.</h3></div><GitHubButton /></div>
        </section>
      </article>
    </div>

    <footer className="footer shell"><Link className="brand" href="/"><BrandMark />Generative Loaders</Link><p>MIT licensed · React 18+ · <a href="https://github.com/sponsors/kasturikhanke">Sponsor ↗</a></p><a href="#top">Back to top ↑</a></footer>
  </main>;
}
