"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { ImageLoaderProps, InlineLoaderProps, TextLoaderProps, TextLoaderVariant } from "./types.js";

const scrambleGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()[]{}:;?/";
const particleOffsets = [[-16, -9], [13, -13], [-9, 12], [17, 7], [1, -18]];
const dissolveParticles = [[30, -11], [21, -6], [36, -1], [16, 4], [28, 9], [12, 13]];
const fragmentOffsets = [[-8, -6], [8, -5], [-7, 7], [7, 6]];
// Keep the beginning of a reveal calm. A very steep ease-out makes the first
// frame of each received word feel like a pop, even when the total duration is
// fairly long.
const cushion = [0.22, 0.65, 0.3, 1] as const;

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function safeRate(speed: number) {
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

function duration(seconds: number, speed: number) {
  return seconds / speed;
}

function charNodes(text: string, render: (char: string, index: number) => ReactNode) {
  let offset = 0;
  return text.split(/(\s+)/).filter(Boolean).map((token) => {
    const start = offset;
    offset += Array.from(token).length;
    if (/^\s+$/.test(token)) return <span className="tl-space" key={`space-${start}`}>{token.split("\n").map((part, index, parts) => <span key={index}>{part}{index < parts.length - 1 && <br />}</span>)}</span>;
    return <span className="tl-word" key={`word-${start}`}>
      {Array.from(token).map((char, index) => render(char, start + index))}
    </span>;
  });
}

function stagger(index: number, start: number, speed: number, amount = .005) {
  return duration(Math.min(.035, Math.max(0, index - start) * amount), speed);
}

function splitAt(text: string, index: number) {
  const characters = Array.from(text);
  return [characters.slice(0, index).join(""), characters.slice(index).join("")] as const;
}

function useIncomingRange(text: string) {
  const [stream, setStream] = useState({ value: text, start: 0, revision: 0 });
  if (stream.value !== text) {
    const next = {
      value: text,
      start: text.startsWith(stream.value) ? Array.from(stream.value).length : 0,
      revision: stream.revision + 1,
    };
    setStream(next);
    return next;
  }
  return stream;
}

interface VisualProps {
  text: string;
  start: number;
  revision: number;
  active: boolean;
  speed: number;
}

function DecodeText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-decode">{charNodes(text, (char, index) => {
    const fresh = active && index >= start && char !== " ";
    const glyph = char === " " ? "\u00a0" : char;
    return <span className="tl-decode-char" key={index}>
      <motion.b initial={fresh ? { opacity: .22 } : false} animate={{ opacity: 1 }} transition={{ duration: duration(.26, speed), delay: stagger(index, start, speed), ease: cushion }}>{glyph}</motion.b>
      {fresh && <motion.i initial={{ opacity: .42 }} animate={{ opacity: 0 }} transition={{ duration: duration(.16, speed), delay: stagger(index, start, speed) }}>{scrambleGlyphs[index % scrambleGlyphs.length]}</motion.i>}
    </span>;
  })}</span>;
}

function TypewriterText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-typewriter">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0 } : false}
    animate={{ opacity: 1 }}
    transition={{ duration: duration(.2, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}<motion.i className="tl-cursor" animate={{ opacity: active ? [0, 1, 1, 0] : 1 }} transition={{ repeat: Infinity, duration: duration(.85, speed), times: [0, .1, .58, 1] }} /></span>;
}

function SkeletonText({ text, start, revision, active, speed }: VisualProps) {
  if (!text) return <span className="tl-copy tl-skeleton-wrap"><span className="tl-skeleton"><i /><i /></span></span>;

  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-skeleton-stream"><span>{stable}</span>{incoming && <motion.span
    className="tl-skeleton-token"
    key={revision}
    initial={active ? { opacity: 0, y: 2, filter: "blur(2px)" } : false}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: duration(.36, speed), ease: cushion }}
  >{incoming}</motion.span>}</span>;
}

function CascadeText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-cascade">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, y: 4 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function FocusText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-focus">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: .18, filter: "blur(2px)" } : false}
    animate={{ opacity: 1, filter: "blur(0px)" }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function WipeText({ text, start, revision, active, speed }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-wipe-stream"><span>{stable}</span><motion.span
    key={revision}
    initial={active ? { clipPath: "inset(0 100% 0 0)" } : false}
    animate={{ clipPath: "inset(0 0% 0 0)" }}
    transition={{ duration: duration(.28, speed), ease: cushion }}
  >{incoming}</motion.span></span>;
}

function FlipText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-flip">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, rotateX: -42, y: 1 } : false}
    animate={{ opacity: 1, rotateX: 0, y: 0 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function RedactText({ text, start, revision, active, speed }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-redact"><span>{stable}</span>{incoming && <span className="tl-redact-word" key={revision}><motion.span
    initial={active ? { opacity: .28, filter: "blur(.035em)" } : false}
    animate={{ opacity: 1, filter: "blur(0em)" }}
    transition={{ delay: duration(.08, speed), duration: duration(.42, speed), ease: cushion }}
  >{incoming}</motion.span><motion.i
    initial={active ? { scaleX: 1, opacity: .2 } : false}
    animate={{ scaleX: [1, 1, .18, 0], opacity: [.2, .2, .14, 0] }}
    transition={{ duration: duration(.48, speed), times: [0, .16, .78, 1], ease: cushion }}
  /></span>}</span>;
}

function LineText({ text, start, revision, active, speed }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-line-stream"><span>{stable}</span><motion.span
    key={revision}
    initial={active ? { opacity: 0, x: -3, clipPath: "inset(0 100% 0 0)" } : false}
    animate={{ opacity: 1, x: 0, clipPath: "inset(0 0 0 0)" }}
    transition={{ duration: duration(.3, speed), ease: cushion }}
  >{incoming}</motion.span></span>;
}

function TerminalText({ text, start, revision, active, speed }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-terminal"><b aria-hidden="true">›</b><span>{stable}<motion.span key={revision} initial={active ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: duration(.18, speed), ease: cushion }}>{incoming}</motion.span></span><motion.i className="tl-terminal-cursor" animate={{ opacity: active ? [1, 1, 0, 0] : 1 }} transition={{ repeat: Infinity, duration: duration(.8, speed) }} /></span>;
}

function WaveText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-wave">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, y: 4, scale: .94 } : false}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function DissolveText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-dissolve">{charNodes(text, (char, index) => {
    const fresh = active && index >= start && char !== " ";
    const delay = duration(Math.min(.2, Math.max(0, index - start) * .018), speed);
    return <span className="tl-dissolve-char" key={index}>
      <motion.b
        initial={fresh ? { opacity: .05, filter: "blur(3px)", clipPath: "inset(0 100% 0 0)" } : false}
        animate={{ opacity: 1, filter: "blur(0px)", clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: duration(.46, speed), delay, ease: cushion }}
      >{char === " " ? "\u00a0" : char}</motion.b>
      {fresh && dissolveParticles.map(([x, y], particle) => <motion.i
        aria-hidden="true"
        key={particle}
        initial={{ opacity: 0, x, y, scale: .35 }}
        animate={{ opacity: [0, .72, 0], x: [x, x * .28, 0], y: [y, y * .3, 0], scale: [.35, 1, .12] }}
        transition={{ duration: duration(.44, speed), delay: delay + duration(particle * .012, speed), ease: cushion, times: [0, .42, 1] }}
      />)}
    </span>;
  })}</span>;
}

function SliceText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-slice">{charNodes(text, (char, index) => {
    const fresh = active && index >= start;
    const glyph = char === " " ? "\u00a0" : char;
    return <span className="tl-slice-char" key={index}>{[0, 1, 2].map((part) => <motion.i
      key={part}
      className={`tl-slice-part tl-slice-part-${part + 1}`}
      initial={fresh ? { opacity: 0, x: part === 1 ? 3 : part === 0 ? -3 : 2 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: duration(.28, speed), ease: cushion, delay: stagger(index, start, speed) + duration(part * .01, speed) }}
    >{glyph}</motion.i>)}</span>;
  })}</span>;
}

function TrackingText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-tracking">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, x: 4, scaleX: 1.06 } : false}
    animate={{ opacity: 1, x: 0, scaleX: 1 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function CoalesceText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-coalesce">{charNodes(text, (char, index) => {
    const fresh = active && index >= start && char !== " ";
    return <span className="tl-coalesce-char" key={index}>
      <motion.b initial={fresh ? { opacity: 0, filter: "blur(2px)", scale: .9 } : false} animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }} transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}>{char === " " ? "\u00a0" : char}</motion.b>
      {fresh && particleOffsets.slice(0, 3).map(([x, y], particle) => <motion.i key={particle} initial={{ opacity: .45, x: x * .55, y: y * .55, scale: .5 }} animate={{ opacity: 0, x: 0, y: 0, scale: 0 }} transition={{ duration: duration(.24, speed), delay: stagger(index, start, speed) + duration(particle * .012, speed), ease: cushion }} />)}
    </span>;
  })}</span>;
}

function FragmentsText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-fragments">{charNodes(text, (char, index) => {
    const fresh = active && index >= start;
    const glyph = char === " " ? "\u00a0" : char;
    return <span className="tl-fragment-char" key={index}>{fragmentOffsets.map(([x, y], fragment) => <motion.i
      key={fragment}
      className={`tl-fragment tl-fragment-${fragment + 1}`}
      initial={fresh ? { opacity: 0, x, y } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed) + duration(fragment * .01, speed), ease: cushion }}
    >{glyph}</motion.i>)}</span>;
  })}</span>;
}

const visuals: Record<TextLoaderVariant, (props: VisualProps) => ReactNode> = {
  decode: DecodeText,
  typewriter: TypewriterText,
  skeleton: SkeletonText,
  cascade: CascadeText,
  focus: FocusText,
  wipe: WipeText,
  flip: FlipText,
  redact: RedactText,
  line: LineText,
  terminal: TerminalText,
  wave: WaveText,
  dissolve: DissolveText,
  slice: SliceText,
  tracking: TrackingText,
  coalesce: CoalesceText,
  fragments: FragmentsText,
};

export function TextLoader({
  text,
  variant,
  speed = 1,
  color = "#111111",
  paused = false,
  className,
  "aria-label": ariaLabel,
}: TextLoaderProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const stream = useIncomingRange(text);
  const safeSpeed = safeRate(speed);
  const Visual = useMemo(() => visuals[variant], [variant]);
  const active = !paused && !reduceMotion;

  return <span
    className={classes("tl-loader", className)}
    data-variant={variant}
    data-speed={safeSpeed}
    data-paused={!active ? "true" : "false"}
    data-received-length={Array.from(text).length}
    role="status"
    aria-live="polite"
    aria-label={ariaLabel ?? text.replace(/\s+/g, " ").trim()}
    style={{ "--tl-color": color } as CSSProperties}
  >
    <span className="tl-visual" aria-hidden="true">{Visual({ text, start: stream.start, revision: stream.revision, active, speed: safeSpeed })}</span>
  </span>;
}

const matrixDots = Array.from({ length: 25 }, (_, index) => {
  const x = index % 5;
  const y = Math.floor(index / 5);
  return { index, distance: Math.abs(x - 2) + Math.abs(y - 2) };
});

const vortexDots = [8, 12, 16].flatMap((count, ring) => Array.from({ length: count }, (_, index) => ({
  id: `${ring}-${index}`,
  x: 50 + Math.sin((index * (360 / count) + ring * 11) * Math.PI / 180) * (18 + ring * 14),
  y: 50 - Math.cos((index * (360 / count) + ring * 11) * Math.PI / 180) * (18 + ring * 14),
  delay: -(ring * .12 + index / count),
  scale: 1 - ring * .12,
})));

function CountUpVisual({ active, speed }: { active: boolean; speed: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const delay = value === 100 ? 800 : 45;
    const timer = window.setTimeout(() => {
      setValue((current) => current === 100 ? 0 : current + 1);
    }, delay / speed);
    return () => window.clearTimeout(timer);
  }, [active, speed, value]);

  return <span className="il-count-up" data-value={value}>{value}</span>;
}

function InlineVisual({ variant, active, speed }: Pick<InlineLoaderProps, "variant"> & { active: boolean; speed: number }) {
  if (variant === "glyph") return <span className="il-glyph">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ "--il-i": index, "--il-delay": `${index * -.11}s` } as CSSProperties} />)}</span>;
  if (variant === "matrix") return <span className="il-matrix">{matrixDots.map(({ index, distance }) => <i key={index} style={{ "--il-i": index, "--il-distance": distance, "--il-delay": `${distance * -.13 - index * .008}s` } as CSSProperties} />)}</span>;
  if (variant === "orbit") return <span className="il-orbit"><i /><i /><i /><b /></span>;
  if (variant === "ripple") return <span className="il-ripple"><i /><i /><i /><b /></span>;
  if (variant === "signal") return <span className="il-signal">{Array.from({ length: 5 }, (_, index) => <i key={index} style={{ "--il-i": index, "--il-delay": `${index * -.12}s` } as CSSProperties} />)}</span>;
  if (variant === "spark") return <span className="il-spark"><i /><i /><i /></span>;
  if (variant === "rotor") return <span className="il-rotor"><svg aria-hidden="true" viewBox="0 0 100 100">
    <path className="il-rotor-spokes" d="M50 56 L50 22 M50 56 L79.45 73 M50 56 L20.55 73" />
    <circle className="il-rotor-ring il-rotor-ring-top" cx="50" cy="18" r="13" />
    <circle className="il-rotor-ring il-rotor-ring-right" cx="82.91" cy="75" r="13" />
    <circle className="il-rotor-ring il-rotor-ring-left" cx="17.09" cy="75" r="13" />
    <circle className="il-rotor-hub-glow" cx="50" cy="56" r="12" />
    <circle className="il-rotor-hub" cx="50" cy="56" r="8.5" />
  </svg></span>;
  if (variant === "pixel-drift") return <span className="il-pixel-drift">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ "--il-i": index, "--il-delay": `${((index % 4) + Math.floor(index / 4)) * -.1}s` } as CSSProperties} />)}</span>;
  if (variant === "chomp") return <span className="il-chomp"><b />{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--il-delay": `${index * -.24}s` } as CSSProperties} />)}</span>;
  if (variant === "snake") return <span className="il-snake">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ "--il-i": index, "--il-scale": 1 - index * .075 } as CSSProperties} />)}<b /></span>;
  if (variant === "fold") return <span className="il-fold">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--il-delay": `${index * -.18}s` } as CSSProperties} />)}</span>;
  if (variant === "gravity") return <span className="il-gravity">{Array.from({ length: 5 }, (_, index) => <i key={index} style={{ "--il-angle": `${index * 72}deg`, "--il-delay": `${index * -.19}s` } as CSSProperties} />)}<b /></span>;
  if (variant === "domino") return <span className="il-domino">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--il-delay": `calc(var(--il-duration) * ${(3 - index) * -.115})` } as CSSProperties} />)}</span>;
  if (variant === "aperture") return <span className="il-aperture">{Array.from({ length: 6 }, (_, index) => <i key={index} style={{ "--il-angle": `${index * 60}deg`, "--il-delay": `${index * -.08}s` } as CSSProperties} />)}<b /></span>;
  if (variant === "dot-pulse") return <span className="il-dot-pulse">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--il-i": 3 - index } as CSSProperties} />)}</span>;
  if (variant === "vortex") return <span className="il-vortex">{vortexDots.map((dot) => <i key={dot.id} style={{ "--il-x": `${dot.x}%`, "--il-y": `${dot.y}%`, "--il-delay": `${dot.delay}s`, "--il-scale": dot.scale } as CSSProperties} />)}<b /></span>;
  if (variant === "halo") return <span className="il-halo">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--il-angle": `${index * 45}deg`, "--il-i": index } as CSSProperties} />)}</span>;
  return <CountUpVisual active={active} speed={speed} />;
}

export function InlineLoader({
  variant,
  size = "1.15em",
  speed = 1,
  color = "currentColor",
  paused = false,
  className,
  label,
}: InlineLoaderProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const active = !paused && !reduceMotion;
  const safeSpeed = safeRate(speed);

  return <span
    className={classes("il-loader", className)}
    data-variant={variant}
    data-speed={safeSpeed}
    data-paused={!active ? "true" : "false"}
    role={label ? "status" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : "true"}
    style={{
      "--il-color": color,
      "--il-size": typeof size === "number" ? `${size}px` : size,
      "--il-duration": `${1.2 / safeSpeed}s`,
    } as CSSProperties}
  ><InlineVisual variant={variant} active={active} speed={safeSpeed} /></span>;
}

const imageTiles = Array.from({ length: 16 }, (_, index) => ({
  index,
  x: index % 4,
  y: Math.floor(index / 4),
}));

const resolutionCells = Array.from({ length: 36 }, (_, index) => {
  const x = index % 6;
  const y = Math.floor(index / 6);
  return { index, distance: Math.abs(x - 2.5) + Math.abs(y - 2.5), tone: 28 + ((x * 13 + y * 9) % 34) };
});

const cssDecimal = (value: number) => {
  const formatted = value.toFixed(3);
  return formatted === "-0.000" ? "0.000" : formatted;
};

const coalesceParticles = Array.from({ length: 24 }, (_, index) => {
  const angle = index * 137.508 * Math.PI / 180;
  const radiusX = 42 + ((index * 7) % 8);
  const radiusY = 38 + ((index * 11) % 10);
  const startX = 50 + Math.cos(angle) * radiusX;
  const startY = 50 + Math.sin(angle) * radiusY;
  const bend = ((index % 5) - 2) * 1.8;
  return {
    index,
    startX: cssDecimal(startX),
    startY: cssDecimal(startY),
    midX: cssDecimal(startX * .46 + 50 * .54 - Math.sin(angle) * bend),
    midY: cssDecimal(startY * .46 + 50 * .54 + Math.cos(angle) * bend),
    endX: cssDecimal(50 + Math.cos(angle * 1.7) * (1.2 + index % 3 * .55)),
    endY: cssDecimal(50 + Math.sin(angle * 1.7) * (1.2 + index % 3 * .55)),
    size: cssDecimal(1.35 + ((index * 7) % 5) * .32),
    delay: cssDecimal(-((index * 11) % 24) / 24),
    opacity: cssDecimal(.42 + (index % 4) * .12),
  };
});

const diffusionParticles = Array.from({ length: 28 }, (_, index) => ({
  index,
  x: 8 + ((index * 37) % 84),
  y: 8 + ((index * 53) % 84),
  size: cssDecimal(1.8 + ((index * 7) % 5) * .7),
  delay: cssDecimal(-((index * 13) % 28) / 28),
}));

function ImageVisual({ variant }: Pick<ImageLoaderProps, "variant">) {
  if (variant === "skeleton") return <span className="iml-skeleton"><i /><b /></span>;
  if (variant === "bands") return <span className="iml-bands"><i /><i /><i /><b /></span>;
  if (variant === "tiles") return <span className="iml-tiles">{imageTiles.map(({ index, x, y }) => <i key={index} style={{ "--iml-i": index, "--iml-delay": `${cssDecimal((Math.abs(x - 1.5) + Math.abs(y - 1.5) - 4) * .12)}s` } as CSSProperties} />)}</span>;
  if (variant === "scan") return <span className="iml-scan"><i /><b /><em /></span>;
  if (variant === "pixel-grid") return <span className="iml-pixel-grid">{imageTiles.map(({ index, x, y }) => <i key={index} style={{ "--iml-x": x, "--iml-y": y, "--iml-delay": `${cssDecimal((x + y - 6) * .09)}s` } as CSSProperties} />)}</span>;
  if (variant === "resolution") return <span className="iml-resolution">{resolutionCells.map(({ index, distance, tone }) => <i key={index} style={{ "--iml-delay": `${cssDecimal((distance - 6) * .055)}s`, "--iml-tone": `${tone}%` } as CSSProperties} />)}</span>;
  if (variant === "coalesce") return <span className="iml-coalesce">{coalesceParticles.map(({ index, startX, startY, midX, midY, endX, endY, size, delay, opacity }) => <i key={index} style={{ "--iml-start-x": `${startX}%`, "--iml-start-y": `${startY}%`, "--iml-mid-x": `${midX}%`, "--iml-mid-y": `${midY}%`, "--iml-end-x": `${endX}%`, "--iml-end-y": `${endY}%`, "--iml-particle-size": `${size}%`, "--iml-delay": `calc(var(--iml-duration) * ${delay})`, "--iml-particle-opacity": `${opacity}` } as CSSProperties} />)}<b /></span>;
  if (variant === "diffusion") return <span className="iml-diffusion">{diffusionParticles.map(({ index, x, y, size, delay }) => <i key={index} style={{ "--iml-x": `${x}%`, "--iml-y": `${y}%`, "--iml-dot-size": `${size}%`, "--iml-delay": `calc(var(--iml-duration) * ${delay})` } as CSSProperties} />)}</span>;
  if (variant === "raster") return <span className="iml-raster">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--iml-i": index, "--iml-delay": `calc(var(--iml-duration) * ${cssDecimal(index * -.035)})` } as CSSProperties} />)}</span>;
  if (variant === "bloom") return <span className="iml-bloom"><i /><b /><em /></span>;
  if (variant === "focus") return <span className="iml-focus"><i /><i /><i /><b /></span>;
  return <span className="iml-shutter"><i /><i /><b /><em /></span>;
}

export function ImageLoader({
  variant,
  size = "10rem",
  speed = 1,
  color = "currentColor",
  radius = "10%",
  paused = false,
  className,
  label = "Generating image",
}: ImageLoaderProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const active = !paused && !reduceMotion;
  const safeSpeed = safeRate(speed);

  return <span
    className={classes("iml-loader", className)}
    data-variant={variant}
    data-speed={safeSpeed}
    data-paused={!active ? "true" : "false"}
    role="status"
    aria-label={label}
    style={{
      "--iml-color": color,
      "--iml-size": typeof size === "number" ? `${size}px` : size,
      "--iml-radius": typeof radius === "number" ? `${radius}px` : radius,
      "--iml-duration": `${2.35 / safeSpeed}s`,
    } as CSSProperties}
  ><span className="iml-visual" aria-hidden="true"><ImageVisual variant={variant} /></span></span>;
}
