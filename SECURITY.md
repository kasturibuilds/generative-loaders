# Security policy

## Supported versions

Security updates are provided for the latest published version of `generative-loaders`.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub’s private security advisory form:

https://github.com/kasturikhanke/generative-loaders/security/advisories/new

Include the affected version, a minimal reproduction or proof of concept, the expected impact, and any suggested remediation. You can expect an initial acknowledgment within seven days. We will coordinate disclosure and credit with you after a fix is available.

## Website safeguards

The analytics dashboard requires platform-authenticated identity and the server-side email allowlist. Deploy only through the Sites dispatcher; do not expose the Worker on an alternate origin that accepts caller-supplied identity headers. Private responses and nonce-bearing HTML are marked `private, no-store` at the browser and CDN layers.

Anonymous analytics submissions are intentionally untrusted. Requests are limited to 2 KiB of JSON, known events, and the public `/` and `/docs` paths. Source/referrer categories are bounded; campaign labels are restricted to 80 characters. A single database row atomically limits accepted events across all Worker instances to 120 per UTC minute and 10,000 per UTC day. Excess submissions return 429; this can discard legitimate events during spikes. These budgets bound stored data and writes, not incoming requests or database reads; edge-level rate limiting remains useful against volumetric attacks.

Each accepted submission removes up to 500 expired rows from each analytics table, keeping the current UTC day and previous 29 days. Cleanup resumes with traffic after idle periods, so this is not a guaranteed wall-clock deletion deadline. No raw IP addresses are stored. Visitor IDs are daily browser-generated UUIDs and do not authenticate a visitor.

The script CSP uses a fresh server-generated nonce. Inline styles remain allowed for React animations; inline scripts require the nonce. Keep the production-render nonce test and browser interaction checks when changing the rendering framework.

## Dependency maintenance

CI audits the full dependency tree, including build/server tooling, on pull requests and weekly. The `@esbuild-kit/core-utils` esbuild override and Satori fflate override replace vulnerable transitive versions without downgrading Drizzle Kit or vinext. Remove an override only when its parent dependency resolves a patched version naturally. Generate migrations and run the complete test/build suite after dependency changes.
