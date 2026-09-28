"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "../lib/analytics";

export function AnalyticsBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    // Cleanup cancels React's development effect replay before counting a view.
    const timer = window.setTimeout(() => track("page_view"), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    function click(event: MouseEvent) {
      if (event.button > 1 || !(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!link) return;
      const url = new URL(link.href);
      if (url.hostname === "github.com" && /^\/(kasturikhanke|kasturibuilds)\/generative-loaders\/?$/.test(url.pathname)) track("github_click");
      if (url.hostname === "www.npmjs.com" && url.pathname === "/package/generative-loaders") track("npm_outbound");
    }
    document.addEventListener("click", click);
    document.addEventListener("auxclick", click);
    return () => { document.removeEventListener("click", click); document.removeEventListener("auxclick", click); };
  }, []);
  return null;
}
