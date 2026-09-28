"use client";

import { ImageLoader, InlineLoader, TextLoader, type ImageLoaderVariant, type InlineLoaderVariant, type TextLoaderVariant } from "generative-loaders";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { track } from "./lib/analytics";
import type { AnalyticsEvent } from "./lib/analytics-events";
import { BrandMark } from "./components/brand-mark";
import { GitHubButton } from "./components/github-button";

const sampleText = "Ideas arrive quietly,\nthen become something clear.";

const loaders: Array<{ id: TextLoaderVariant; name: string }> = [
  { id: "decode", name: "Decode" },
  { id: "typewriter", name: "Typewriter" },
  { id: "skeleton", name: "Skeleton" },
  { id: "cascade", name: "Cascade" },
  { id: "focus", name: "Focus" },
  { id: "wipe", name: "Wipe" },
  { id: "flip", name: "Flip" },
  { id: "redact", name: "Redact" },
  { id: "line", name: "Line by line" },
  { id: "terminal", name: "Terminal" },
  { id: "wave", name: "Wave" },
  { id: "dissolve", name: "Dissolve" },
  { id: "slice", name: "Slice" },
  { id: "tracking", name: "Tracking" },
  { id: "coalesce", name: "Coalesce" },
  { id: "fragments", name: "Fragments" },
];

const inlineLoaders: Array<{ id: InlineLoaderVariant; name: string; copy: string }> = [
  { id: "glyph", name: "Glyph", copy: "Finding the right shape…" },
  { id: "matrix", name: "Matrix", copy: "Mapping the response…" },
  { id: "orbit", name: "Orbit", copy: "Gathering context…" },
  { id: "ripple", name: "Ripple", copy: "Thinking this through…" },
  { id: "signal", name: "Signal", copy: "Reading the details…" },
  { id: "spark", name: "Spark", copy: "Composing an answer…" },
  { id: "rotor", name: "Rotor", copy: "Spinning up an idea…" },
  { id: "pixel-drift", name: "Pixel drift", copy: "Resolving the picture…" },
  { id: "chomp", name: "Chomp", copy: "Working through the queue…" },
  { id: "snake", name: "Snake", copy: "Following the thread…" },
  { id: "fold", name: "Fold", copy: "Turning this over…" },
  { id: "gravity", name: "Gravity", copy: "Drawing signals inward…" },
  { id: "domino", name: "Domino", copy: "Setting things in motion…" },
  { id: "aperture", name: "Aperture", copy: "Bringing it into focus…" },
  { id: "dot-pulse", name: "Dot pulse", copy: "Picking up the next step…" },
  { id: "vortex", name: "Vortex", copy: "Gathering the pieces…" },
  { id: "halo", name: "Halo", copy: "Holding the thought…" },
  { id: "count-up", name: "Count up", copy: "Tracking progress…" },
];

const imageLoaders: Array<{ id: ImageLoaderVariant; name: string }> = [
  { id: "skeleton", name: "Skeleton" },
  { id: "bands", name: "Bands" },
  { id: "tiles", name: "Tiles" },
  { id: "scan", name: "Scan" },
  { id: "pixel-grid", name: "Pixel grid" },
  { id: "resolution", name: "Resolution" },
  { id: "coalesce", name: "Coalesce" },
  { id: "diffusion", name: "Diffusion" },
  { id: "raster", name: "Raster" },
  { id: "bloom", name: "Bloom" },
  { id: "focus", name: "Focus" },
  { id: "shutter", name: "Shutter" },
];

const resolveCells = Array.from({ length: 16 }, (_, index) => ({
  index,
  x: index % 4,
  y: Math.floor(index / 4),
}));

const resolutionResolveCells = Array.from({ length: 36 }, (_, index) => ({
  index,
  x: index % 6,
  y: Math.floor(index / 6),
}));

const diffusionResolveCells = Array.from({ length: 25 }, (_, index) => ({
  index,
  x: index % 5,
  y: Math.floor(index / 5),
  delay: ((index * 7) % 25) * .022,
}));

const speeds = [0.75, 1, 1.5];
const spring = { type: "spring" as const, stiffness: 340, damping: 30 };
const installCommand = "npm install generative-loaders";
type Theme = "light" | "dark";
type LoaderCollection = "text" | "inline" | "image";
type HomepageView = "loaders" | "in-use";
type ContextFormat = "button" | "chat" | "page" | "image";

function PlaybackControls({ paused, speed, onPauseToggle, onRestart, onSpeedChange }: {
  paused: boolean;
  speed: number;
  onPauseToggle: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
}) {
  return <div className="playback-controls" aria-label="Animation controls">
    <fieldset>
      <legend>Animation speed</legend>
      <div className="playback-speed">
        {speeds.map((value) => <button
          aria-pressed={speed === value}
          className={speed === value ? "active" : ""}
          key={value}
          type="button"
          onClick={() => onSpeedChange(value)}
        >{value}×</button>)}
      </div>
    </fieldset>
    <div className="playback-actions">
      <button type="button" onClick={onPauseToggle}>{paused ? "Play" : "Pause"}</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  </div>;
}

function CopyButton({ value, label = "Copy", className = "", ariaLabel, iconOnly = false, analyticsEvent, analyticsValue }: { value: string; label?: string; className?: string; ariaLabel?: string; iconOnly?: boolean; analyticsEvent?: AnalyticsEvent; analyticsValue?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try { await navigator.clipboard.writeText(value); } catch { return; }
    if (analyticsEvent) track(analyticsEvent, analyticsValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  return <motion.button aria-label={copied ? "Copied" : ariaLabel} className={`copy-button ${className}`.trim()} type="button" onClick={copy} whileTap={{ scale: .95 }}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={copied ? "copied" : "copy"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .13 }}>
        {iconOnly
          ? copied
            ? <svg aria-hidden="true" className="copy-icon" viewBox="0 0 16 16"><path d="m3.5 8.3 2.7 2.7 6.3-6.3" /></svg>
            : <svg aria-hidden="true" className="copy-icon" viewBox="0 0 16 16"><rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M3 10.5H2.5A1.5 1.5 0 0 1 1 9V2.5A1.5 1.5 0 0 1 2.5 1H9a1.5 1.5 0 0 1 1.5 1.5V3" /></svg>
          : copied ? "Copied ✓" : label}
      </motion.span>
    </AnimatePresence>
  </motion.button>;
}

function loaderCode(collection: LoaderCollection, variant: string) {
  if (collection === "text") return `import { TextLoader } from "generative-loaders";
import "generative-loaders/styles.css";

<TextLoader text={text} variant="${variant}" />`;

  if (collection === "inline") return `import { InlineLoader } from "generative-loaders";
import "generative-loaders/styles.css";

<InlineLoader variant="${variant}" size={24} />`;

  return `import { ImageLoader } from "generative-loaders";
import "generative-loaders/styles.css";

<ImageLoader variant="${variant}" size={192} label="Generating image" />`;
}

function CardCopyButton({ collection, id, name }: { collection: LoaderCollection; id: string; name: string }) {
  return <CopyButton ariaLabel={`Copy ${name} code`} className="card-code-button" iconOnly analyticsEvent="code_copy" analyticsValue={`${collection}:${id}`} value={loaderCode(collection, id)} />;
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "dark"
    ? <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.2 15.7A8.5 8.5 0 0 1 8.3 3.8 8.5 8.5 0 1 0 20.2 15.7Z" /></svg>
    : <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

function StreamingDemo({ text, variant, color, speed, paused, phase = 0, immediate = false }: {
  text: string;
  variant: TextLoaderVariant;
  color: string;
  speed: number;
  paused: boolean;
  phase?: number;
  immediate?: boolean;
}) {
  const chunks = useMemo(() => text.match(/\S+\s*/g) ?? [], [text]);
  const [received, setReceived] = useState(immediate ? Math.min(1, chunks.length) : 0);
  const [fading, setFading] = useState(false);
  const [started, setStarted] = useState(immediate);

  useEffect(() => {
    if (paused) return;
    const complete = received >= chunks.length;
    const timer = window.setTimeout(() => {
      if (fading) {
        setReceived(0);
        setFading(false);
      } else if (complete) {
        setFading(true);
      } else {
        setStarted(true);
        setReceived(received + 1);
      }
    }, fading ? 240 : complete ? 1000 : 320 / speed + (started ? 0 : phase));
    return () => window.clearTimeout(timer);
  }, [chunks.length, fading, paused, phase, received, speed, started]);

  const receivedText = variant === "skeleton" && received < chunks.length ? "" : chunks.slice(0, received).join("");
  return <motion.span className="stream-demo-frame" animate={{ opacity: fading ? 0 : 1 }} transition={{ duration: .24, ease: [0.22, 0.65, 0.3, 1] }}>
    <TextLoader text={receivedText} variant={variant} color={color} speed={speed} paused={paused} />
  </motion.span>;
}

function ImageResolveVisual({ variant }: { variant: ImageLoaderVariant }) {
  if (variant === "skeleton") return <span className="image-resolve-preview" />;
  if (variant === "bands") return <span className="image-resolve-bands">{Array.from({ length: 3 }, (_, index) => <i key={index} style={{ "--resolve-i": index, "--resolve-position": `${index * 50}%`, "--resolve-offset": index % 2 === 0 ? "-12%" : "12%" } as React.CSSProperties} />)}</span>;
  if (variant === "tiles") return <span className="image-resolve-tiles">{resolveCells.map(({ index, x, y }) => {
    const ring = Math.abs(x - 1.5) + Math.abs(y - 1.5) - 1;
    return <i key={index} style={{ "--resolve-position-x": `${x * 33.333}%`, "--resolve-position-y": `${y * 33.333}%`, "--resolve-ring": ring } as React.CSSProperties} />;
  })}</span>;
  if (variant === "pixel-grid") return <span className="image-resolve-pixel-grid">{resolveCells.map(({ index, x, y }) => <i key={index} style={{ "--resolve-x": x, "--resolve-y": y, "--resolve-position-x": `${x * 33.333}%`, "--resolve-position-y": `${y * 33.333}%`, "--resolve-delay": `${(x + y) * .045}s` } as React.CSSProperties} />)}</span>;
  if (variant === "scan") return <span className="image-resolve-scan"><i /><b /></span>;
  if (variant === "resolution") return <span className="image-resolve-resolution">{resolutionResolveCells.map(({ index, x, y }) => {
    const ring = Math.abs(x - 2.5) + Math.abs(y - 2.5) - 1;
    return <i key={index} style={{ "--resolve-position-x": `${x * 20}%`, "--resolve-position-y": `${y * 20}%`, "--resolve-ring": ring } as React.CSSProperties} />;
  })}</span>;
  if (variant === "coalesce") return <span className="image-resolve-preview" />;
  if (variant === "diffusion") return <span className="image-resolve-diffusion">{diffusionResolveCells.map(({ index, x, y, delay }) => <i key={index} style={{ "--resolve-position-x": `${x * 25}%`, "--resolve-position-y": `${y * 25}%`, "--resolve-delay": `${delay}s` } as React.CSSProperties} />)}</span>;
  if (variant === "raster") return <span className="image-resolve-raster">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--resolve-i": index } as React.CSSProperties} />)}</span>;
  if (variant === "bloom") return <span className="image-resolve-bloom" />;
  if (variant === "focus") return <span className="image-resolve-focus" />;
  return <span className="image-resolve-shutter"><i /><i /></span>;
}

function ImageLoaderDemo({ variant, color, speed, paused }: {
  variant: ImageLoaderVariant;
  color: string;
  speed: number;
  paused: boolean;
}) {
  const [phase, setPhase] = useState<"loading" | "resolving" | "loaded">("loading");
  const reduceMotion = Boolean(useReducedMotion());
  const visiblePhase = reduceMotion ? "loaded" : phase;
  const isDirectionalResolve = variant === "shutter";
  const resolveDuration = 1.05;

  useEffect(() => {
    if (paused || reduceMotion) return;
    const nextPhase = phase === "loading" ? "resolving" : phase === "resolving" ? "loaded" : "loading";
    const phaseDuration = phase === "loading" ? (isDirectionalResolve ? 2350 : 2300) : phase === "resolving" ? resolveDuration * 1000 : 1800;
    const timer = window.setTimeout(() => setPhase(nextPhase), phaseDuration / speed);
    return () => window.clearTimeout(timer);
  }, [isDirectionalResolve, paused, phase, reduceMotion, resolveDuration, speed]);

  return <span className="image-demo-stage" data-phase={visiblePhase} data-paused={paused ? "true" : "false"} data-variant={variant}>
    <AnimatePresence initial={false} mode="sync">
      {visiblePhase === "loading" && <motion.span className="image-loader-layer" key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: isDirectionalResolve ? 1 : .99 }} transition={{ duration: (isDirectionalResolve ? .22 : .3) / speed, ease: [0.65, 0, 0.35, 1] }}>
        <ImageLoader variant={variant} size="100%" radius={13} speed={speed} color={color} paused={paused} label={`${variant} image generation`} />
      </motion.span>}
      {visiblePhase === "resolving" && <motion.span className={`image-resolve-layer image-resolve-layer-${variant}`} key="resolving" role="status" aria-label="Resolving image" initial={{ opacity: isDirectionalResolve ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: (isDirectionalResolve ? .1 : .16) / speed }} style={{ "--resolve-duration": `${resolveDuration / speed}s` } as React.CSSProperties}>
        <ImageResolveVisual variant={variant} />
      </motion.span>}
    </AnimatePresence>
    <motion.img className="image-demo-result" src="/image-loader-sample.png" alt="Generated abstract artwork" style={{ opacity: visiblePhase === "loaded" ? 1 : 0 }} />
  </span>;
}

function InUsePanel({ loaderColor, imageLoaderColor, speed, paused, restartKey, onPauseToggle, onRestart, onSpeedChange }: {
  loaderColor: string;
  imageLoaderColor: string;
  speed: number;
  paused: boolean;
  restartKey: number;
  onPauseToggle: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
}) {
  const [format, setFormat] = useState<ContextFormat>("button");
  const [textVariant, setTextVariant] = useState<TextLoaderVariant>("decode");
  const [inlineVariant, setInlineVariant] = useState<InlineLoaderVariant>("glyph");
  const [imageVariant, setImageVariant] = useState<ImageLoaderVariant>("skeleton");

  function selectFormat(next: ContextFormat) {
    if (format !== next) track("format_select", next);
    setFormat(next);
    onRestart();
  }

  return <section className="context-panel in-use-panel" aria-label="Loaders in use">
    <div className="context-sidebar">
      <div className="segmented-control context-tabs" role="tablist" aria-label="Example format">
        {(["button", "chat", "page", "image"] as const).map((item, index) => <button
          id={`context-tab-${item}`}
          aria-controls={`context-panel-${item}`}
          aria-selected={format === item}
          className={format === item ? "active" : ""}
          key={item}
          onClick={() => selectFormat(item)}
          role="tab"
          type="button"
        ><span>{String(index + 1).padStart(2, "0")}</span>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      <PlaybackControls paused={paused} speed={speed} onPauseToggle={onPauseToggle} onRestart={onRestart} onSpeedChange={onSpeedChange} />
    </div>

    <div className="context-stage">
      <AnimatePresence initial={false} mode="wait">
        {format === "button" ? <motion.div
          aria-labelledby="context-tab-button"
          className="context-demo context-button-demo"
          id="context-panel-button"
          key="button"
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: .2 }}
        >
          <div className="context-window-bar"><span /><span /><span /></div>
          <div className="context-button-content">
            <small>Ready to create</small>
            <h3>Turn your latest metrics into a clear narrative.</h3>
            <p>Generate a concise report from the activity already in your workspace.</p>
            <button className="context-action" disabled type="button"><InlineLoader key={`${inlineVariant}-${restartKey}`} variant={inlineVariant} size={15} speed={speed} color="currentColor" paused={paused} /><span>Generating report</span></button>
          </div>
        </motion.div> : format === "chat" ? <motion.div
          aria-labelledby="context-tab-chat"
          className="context-demo context-chat-demo"
          id="context-panel-chat"
          key="chat"
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: .2 }}
        >
          <div className="context-chat-thread">
            <header><strong>Launch planning</strong><small>Active</small></header>
            <div className="context-message context-message-user">Can you turn the research into a launch plan?</div>
            <div className="context-message context-message-assistant"><i>G</i><div className="context-chat-copy"><StreamingDemo key={`${textVariant}-${restartKey}-context`} text="I’ll organize the strongest signals into positioning, rollout, and measurement." variant={textVariant} color={loaderColor} speed={speed} paused={paused} /></div></div>
          </div>
        </motion.div> : format === "page" ? <motion.div
          aria-labelledby="context-tab-page"
          className="context-demo context-page-demo"
          id="context-panel-page"
          key="page"
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: .2 }}
        >
          <header><b>Acme</b><nav><span>Overview</span><span>Projects</span><span>Reports</span></nav><i /></header>
          <div className="context-page-body">
            <div className="context-page-title"><div><small>Workspace</small><h3>Performance overview</h3></div><span /></div>
            <div className="context-page-metrics"><span /><span /><span /></div>
            <div className="context-page-chart"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <div className="context-page-loading" role="status"><InlineLoader key={`${inlineVariant}-${restartKey}`} variant={inlineVariant} size={22} speed={speed} color={loaderColor} paused={paused} /><span>Preparing your workspace…</span></div>
        </motion.div> : <motion.div
          aria-labelledby="context-tab-image"
          className="context-demo context-image-demo"
          id="context-panel-image"
          key="image"
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: .2 }}
        >
          <header><b>Canvas</b><i /></header>
          <div className="context-image-workspace">
            <div className="context-image-output">
              <ImageLoaderDemo key={`${imageVariant}-${restartKey}`} variant={imageVariant} speed={speed} color={imageLoaderColor} paused={paused} />
              <p><strong>Generating artwork</strong><span>1024 × 1024</span></p>
            </div>
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>

    <div className="context-pickers">
      {(format === "button" || format === "page") && <div className="context-picker-group">
        <div className="context-picker-heading"><div><span>Activity loader</span></div></div>
        <div className="context-loader-options" role="listbox" aria-label="Activity loader style">
          {inlineLoaders.map((loader) => <button aria-selected={inlineVariant === loader.id} className={inlineVariant === loader.id ? "selected" : ""} key={loader.id} onClick={() => { if (inlineVariant !== loader.id) track("variant_select", `inline:${loader.id}`); setInlineVariant(loader.id); onRestart(); }} role="option" type="button"><span aria-hidden="true" className="context-loader-swatch"><InlineLoader key={`${loader.id}-${restartKey}`} variant={loader.id} size={19} speed={speed} color={loaderColor} paused={paused} /></span><span>{loader.name}</span></button>)}
        </div>
      </div>}
      {format === "chat" && <div className="context-picker-group context-text-picker">
        <div className="context-picker-heading"><div><span>Streaming effect</span><p>Preview how streamed words enter the conversation.</p></div></div>
        <div className="context-text-options" role="listbox" aria-label="Text animation style">
          {loaders.map((loader) => <button aria-label={loader.name} aria-selected={textVariant === loader.id} className={textVariant === loader.id ? "selected" : ""} key={loader.id} onClick={() => { if (textVariant !== loader.id) track("variant_select", `text:${loader.id}`); setTextVariant(loader.id); onRestart(); }} role="option" type="button"><span aria-hidden="true" className="context-text-swatch"><TextLoader key={`${loader.id}-${restartKey}`} text={loader.name} variant={loader.id} color={loaderColor} speed={speed} paused={paused} /></span></button>)}
        </div>
      </div>}
      {format === "image" && <div className="context-picker-group context-image-picker">
        <div className="context-picker-heading"><div><span>Image loader</span><p>Choose the loading state used while the image is generated.</p></div></div>
        <div className="context-image-options" role="listbox" aria-label="Image loader style">
          {imageLoaders.map((loader) => <button aria-selected={imageVariant === loader.id} className={imageVariant === loader.id ? "selected" : ""} key={loader.id} onClick={() => { if (imageVariant !== loader.id) track("variant_select", `image:${loader.id}`); setImageVariant(loader.id); onRestart(); }} role="option" type="button"><span aria-hidden="true" className="context-image-swatch"><ImageLoader variant={loader.id} size={42} radius={7} speed={speed} color={imageLoaderColor} paused={paused} /></span><span>{loader.name}</span></button>)}
        </div>
      </div>}
    </div>
  </section>;
}

function SiteFooter() {
  return <footer className="footer-editorial">
    <div className="footer-editorial-inner shell">
      <motion.div
        className="footer-wordmark"
        aria-label="Generative Loaders"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: .25 }}
        transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="footer-wordmark-word">Generative</span>
        <span className="footer-wordmark-word">Loaders</span>
      </motion.div>

      <div className="footer-editorial-meta">
        <p>Created by Kasturi Khanke</p>
        <nav aria-label="Footer links"><a href="https://github.com/sponsors/kasturibuilds">Sponsor ↗</a><a href="https://github.com/kasturikhanke/generative-loaders">GitHub ↗</a><a href="#top">Back to top ↑</a></nav>
      </div>
    </div>
  </footer>;
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<HomepageView>("loaders");
  const [collection, setCollection] = useState<LoaderCollection>("text");
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [cardCycles, setCardCycles] = useState<Record<string, number>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const loaderColor = theme === "dark" ? "#f4f4f5" : "#111111";
  const imageLoaderColor = theme === "dark" ? "#f4f4f5" : "#c9cdd3";

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const activeTheme: Theme = storedTheme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => {
      setTheme(activeTheme);
      document.documentElement.dataset.theme = activeTheme;
      document.documentElement.style.colorScheme = activeTheme;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    track("theme_select", nextTheme);
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("theme", nextTheme);
  }

  function restart() {
    setRestartKey((value) => value + 1);
    setPaused(false);
  }

  function restartCard(cardCollection: LoaderCollection, id: string) {
    const cardKey = `${cardCollection}-${id}`;
    setHoveredCard(cardKey);
    setCardCycles((cycles) => ({ ...cycles, [cardKey]: (cycles[cardKey] ?? 0) + 1 }));
  }

  function selectCollection(next: LoaderCollection) {
    if (next === collection) return;
    track("collection_select", next);
    setCollection(next);
    restart();
  }

  function setPlaybackSpeed(nextSpeed: number) {
    setSpeed(nextSpeed);
    restart();
  }

  return <main className="gallery-home" id="top">
    <nav className="nav shell">
      <a className="brand" href="#top"><BrandMark />Generative Loaders</a>
      <div className="nav-links"><a href="#loaders">Loaders</a><a href="/docs">Docs</a><a href="https://github.com/sponsors/kasturibuilds">Sponsor ↗</a></div>
      <div className="nav-actions">
        <GitHubButton compact />
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><ThemeIcon theme={theme} /></button>
        <a className="nav-install nav-docs-mobile" href="/docs">Docs <span>↗</span></a>
      </div>
    </nav>

    <div className="gallery-home-content">
      <header className="homepage-intro">
        <h1>React loaders for generative UI.</h1>
      </header>

      <div className="install-command homepage-install" aria-label="Install Generative Loaders from npm">
        <code>{installCommand}</code>
        <CopyButton value={installCommand} analyticsEvent="install_copy" />
      </div>

      <div className="homepage-view-toggle" role="tablist" aria-label="Homepage view">
        <button type="button" role="tab" aria-selected={view === "loaders"} className={view === "loaders" ? "active" : ""} onClick={() => { if (view !== "loaders") track("view_select", "loaders"); setView("loaders"); }}>Loaders</button>
        <button type="button" role="tab" aria-selected={view === "in-use"} className={view === "in-use" ? "active" : ""} onClick={() => { if (view !== "in-use") track("view_select", "in-use"); setView("in-use"); restart(); }}>In Use</button>
      </div>

      <div id="loaders">
      {view === "loaders" ? <section className="gallery" aria-labelledby="gallery-title">
      <div className="gallery-toolbar">
        <div className="segmented-control collection-tabs" role="tablist" aria-label="Loader collection">
          <button type="button" role="tab" aria-selected={collection === "text"} className={collection === "text" ? "active" : ""} onClick={() => selectCollection("text")}><span className="collection-label"><span className="collection-label-full">Text loaders</span><span className="collection-label-short">Text</span></span><span className="collection-count">{String(loaders.length).padStart(2, "0")}</span></button>
          <button type="button" role="tab" aria-selected={collection === "inline"} className={collection === "inline" ? "active" : ""} onClick={() => selectCollection("inline")}><span className="collection-label"><span className="collection-label-full">Inline loaders</span><span className="collection-label-short">Inline</span></span><span className="collection-count">{String(inlineLoaders.length).padStart(2, "0")}</span></button>
          <button type="button" role="tab" aria-selected={collection === "image"} className={collection === "image" ? "active" : ""} onClick={() => selectCollection("image")}><span className="collection-label"><span className="collection-label-full">Image loaders</span><span className="collection-label-short">Image</span></span><span className="collection-count">{String(imageLoaders.length).padStart(2, "0")}</span></button>
        </div>
        <h2 id="gallery-title" className="sr-only">{collection === "text" ? "Text loaders" : collection === "inline" ? "Inline loaders" : "Image loaders"}</h2>
        <PlaybackControls paused={paused} speed={speed} onPauseToggle={() => setPaused((value) => !value)} onRestart={restart} onSpeedChange={setPlaybackSpeed} />
      </div>

      {collection === "text" ? <div className="loader-grid" role="tabpanel" aria-label="Text loaders">
        {loaders.map((loader, index) => <motion.article
          className="loader-card"
          style={{ "--card-color": loaderColor } as React.CSSProperties}
          key={loader.id}
          onPointerEnter={() => restartCard("text", loader.id)}
          onPointerLeave={() => setHoveredCard(null)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (index % 4) * .04, ...spring }}
          whileHover={{ y: -3, transition: { ...spring, delay: 0 } }}
        >
          <span className="card-top"><span>{String(index + 1).padStart(2, "0")}</span></span>
          <span className="card-demo"><StreamingDemo key={`${loader.id}-${restartKey}-${cardCycles[`text-${loader.id}`] ?? 0}-${theme}`} text={sampleText} variant={loader.id} color={loaderColor} speed={speed} paused={paused} phase={index * 12} immediate={hoveredCard === `text-${loader.id}`} /></span>
          <span className="card-copy"><strong>{loader.name}</strong></span>
          <CardCopyButton collection="text" id={loader.id} name={loader.name} />
        </motion.article>)}
      </div> : collection === "inline" ? <div className="inline-gallery" role="tabpanel" aria-label="Inline loaders" key={`inline-${restartKey}`}>
        {inlineLoaders.map((loader, index) => <motion.article
          className="inline-card"
          key={loader.id}
          onPointerEnter={() => restartCard("inline", loader.id)}
          onPointerLeave={() => setHoveredCard(null)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (index % 3) * .05, ...spring }}
          whileHover={{ y: -3, transition: { ...spring, delay: 0 } }}
        >
          <span className="inline-number">{String(index + 1).padStart(2, "0")}</span>
          <div className="inline-demo"><InlineLoader key={`${loader.id}-${cardCycles[`inline-${loader.id}`] ?? 0}`} variant={loader.id} size={28} speed={speed} color={loaderColor} paused={paused} /><span>{loader.copy}</span></div>
          <div className="inline-copy"><strong>{loader.name}</strong></div>
          <CardCopyButton collection="inline" id={loader.id} name={loader.name} />
        </motion.article>)}
      </div> : <div className="image-gallery" role="tabpanel" aria-label="Image loaders" key={`image-${restartKey}`}>
        {imageLoaders.map((loader, index) => <motion.article
          className="image-card"
          key={loader.id}
          onPointerEnter={() => restartCard("image", loader.id)}
          onPointerLeave={() => setHoveredCard(null)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (index % 4) * .05, ...spring }}
          whileHover={{ y: -3, transition: { ...spring, delay: 0 } }}
        >
          <span className="image-number">{String(index + 1).padStart(2, "0")}</span>
          <div className="image-demo"><ImageLoaderDemo key={`${loader.id}-${cardCycles[`image-${loader.id}`] ?? 0}`} variant={loader.id} speed={speed} color={imageLoaderColor} paused={paused} /></div>
          <div className="image-copy"><strong>{loader.name}</strong></div>
          <CardCopyButton collection="image" id={loader.id} name={loader.name} />
        </motion.article>)}
      </div>}
      </section> : <InUsePanel
        loaderColor={loaderColor}
        imageLoaderColor={imageLoaderColor}
        speed={speed}
        paused={paused}
        restartKey={restartKey}
        onPauseToggle={() => setPaused((value) => !value)}
        onRestart={restart}
        onSpeedChange={setPlaybackSpeed}
      />}
      </div>
    </div>
    <SiteFooter />
  </main>;
}
