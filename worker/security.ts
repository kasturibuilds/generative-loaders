export function prepareSecureRequest(request: Request) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Motion and React use inline style attributes for animations.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  // Never accept a client-selected script nonce or CSP.
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  headers.delete("Content-Security-Policy-Report-Only");
  return { request: new Request(request, { headers }), csp };
}

export function secureResponse(response: Response, request: Request, csp: string) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000");
  // Preserve the image optimizer's more restrictive SVG policy.
  if (headers.get("content-type")?.includes("text/html")) headers.set("Content-Security-Policy", csp);
  const path = new URL(request.url).pathname;
  if (headers.get("content-type")?.includes("text/html") || path.startsWith("/analytics") || path.startsWith("/api/analytics") || request.headers.has("RSC") || request.headers.has("oai-authenticated-user-id")) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
