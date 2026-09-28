"use client";

import { useEffect } from "react";

type Attribution = { source: string; campaign: string };

const ATTRIBUTION_KEY = "gl-attribution";
const VISITOR_KEY = "gl-daily-visitor";

function clean(value: string | null, fallback: string) {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").slice(0, 80);
  return normalized || fallback;
}

function attribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const taggedSource = params.get("utm_source") ?? params.get("source");
  const taggedCampaign = params.get("utm_campaign") ?? params.get("campaign");
  if (taggedSource || taggedCampaign) {
    const value = { source: clean(taggedSource, "direct"), campaign: clean(taggedCampaign, "untagged") };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
    return value;
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) ?? "null") as Attribution | null;
    if (stored?.source && stored?.campaign) return stored;
  } catch {
    sessionStorage.removeItem(ATTRIBUTION_KEY);
  }
  if (!document.referrer) return { source: "direct", campaign: "untagged" };
  try {
    return { source: clean(new URL(document.referrer).hostname.replace(/^www\./, ""), "referral"), campaign: "untagged" };
  } catch {
    return { source: "referral", campaign: "untagged" };
  }
}

function dailyVisitorId() {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const stored = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? "null") as { day?: string; id?: string } | null;
    if (stored?.day === day && stored.id) return stored.id;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ day, id }));
    return id;
  } catch {
    return "";
  }
}

function referrerHost() {
  if (!document.referrer) return "direct";
  try {
    const hostname = new URL(document.referrer).hostname.replace(/^www\./, "");
    return hostname === window.location.hostname.replace(/^www\./, "") ? "internal" : clean(hostname, "referral");
  } catch {
    return "referral";
  }
}

function record(event: string) {
  if (!["/", "/docs"].includes(window.location.pathname)) return;
  const body = JSON.stringify({
    event,
    ...attribution(),
    path: window.location.pathname,
    referrer: referrerHost(),
    visitorId: dailyVisitorId(),
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
  } else {
    void fetch("/api/analytics/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  }
}

export function AnalyticsBeacon() {
  useEffect(() => {
    record("page_view");
    const customEventListener = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: string }>).detail;
      if (detail?.event) record(detail.event);
    };
    const clickListener = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (anchor?.href.includes("npmjs.com/package/generative-loaders")) record("npm_outbound");
    };
    window.addEventListener("gl-analytics", customEventListener);
    document.addEventListener("click", clickListener);
    return () => {
      window.removeEventListener("gl-analytics", customEventListener);
      document.removeEventListener("click", clickListener);
    };
  }, []);
  return null;
}
