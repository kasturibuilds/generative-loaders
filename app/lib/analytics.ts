import { allowedEvents, type AnalyticsEvent } from "./analytics-events";

const HOSTS = new Set(["generativeloaders.com", "www.generativeloaders.com", "progress-narrative.kkasturi2502.chatgpt.site"]);
const VISITOR_KEY = "gl-daily-visitor";
const ATTRIBUTION_KEY = "gl-attribution";

function clean(value: string | null, fallback: string) {
  return value?.toLowerCase().replace(/[^a-z0-9_.-]/g, "-").slice(0, 60) || fallback;
}
function visitor() {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const stored = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? "null");
    if (stored?.day === day && typeof stored.id === "string") return stored.id;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ day, id }));
    return id;
  } catch { return ""; }
}
function attribution() {
  const params = new URLSearchParams(location.search);
  let referrer = "direct";
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      referrer = HOSTS.has(host) ? "internal" : host;
    }
  } catch { /* Missing or malformed referrer. */ }
  const tagged = params.has("utm_source") || params.has("utm_campaign");
  let source = clean(params.get("utm_source"), referrer);
  let campaign = clean(params.get("utm_campaign"), "untagged");
  try {
    if (tagged) sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ source, campaign }));
    else {
      const stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) ?? "null");
      if (typeof stored?.source === "string" && typeof stored?.campaign === "string") ({ source, campaign } = stored);
    }
  } catch { /* Attribution works without browser storage. */ }
  return { source, campaign, referrer };
}

// Telemetry must never prevent navigation, copying, or chart interactions.
export function track(event: AnalyticsEvent, value = "") {
  try {
    if (typeof window === "undefined" || !HOSTS.has(location.hostname)) return;
    if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" && path !== "/docs") return;
    const name = value ? `${event}:${value}` : event;
    if (!allowedEvents.has(name)) return;
    const body = JSON.stringify({ event: name, path, ...attribution(), visitorId: visitor() });
    if (navigator.sendBeacon?.("/api/analytics/events", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* Analytics is best effort, including when storage is blocked. */ }
}
