export const variants = {
  text: ["decode", "typewriter", "skeleton", "cascade", "focus", "wipe", "flip", "redact", "line", "terminal", "wave", "dissolve", "slice", "tracking", "coalesce", "fragments"],
  inline: ["glyph", "matrix", "orbit", "ripple", "signal", "spark", "rotor", "pixel-drift", "chomp", "snake", "fold", "gravity", "domino", "aperture", "dot-pulse", "vortex", "halo", "count-up"],
  image: ["skeleton", "bands", "tiles", "scan", "pixel-grid", "resolution", "coalesce", "diffusion", "raster", "bloom", "focus", "shutter"],
} as const;
export type Collection = keyof typeof variants;
const variantNames = Object.entries(variants).flatMap(([collection, values]) => values.map((value) => `${collection}:${value}`));
export const allowedEvents = new Set([
  "page_view", "install_copy", "npm_outbound", "github_click",
  ...["text", "inline", "image"].map((value) => `collection_select:${value}`),
  ...["light", "dark"].map((value) => `theme_select:${value}`),
  ...["loaders", "in-use"].map((value) => `view_select:${value}`),
  ...["button", "chat", "page", "image"].map((value) => `format_select:${value}`),
  ...variantNames.flatMap((value) => [`code_copy:${value}`, `variant_select:${value}`]),
]);
export type AnalyticsEvent = "page_view" | "install_copy" | "npm_outbound" | "github_click" | "collection_select" | "theme_select" | "view_select" | "format_select" | "code_copy" | "variant_select";
