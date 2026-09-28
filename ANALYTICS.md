# Private analytics

Open `/analytics` and sign in with ChatGPT using an account listed in the Sites
runtime setting `ANALYTICS_ALLOWED_EMAILS`. The gallery and documentation remain
public. Missing configuration fails closed; a different signed-in account cannot
read the dashboard. Private HTML and React server-component responses are never
shared-cacheable.

The dashboard supports 7- and 30-day traffic views, categorized referrals,
campaigns, successful install and code copies, GitHub/npm clicks, collection
choices, variants selected in In Use examples, and light/dark choices. Existing
page-view, install-copy, and npm-click history stays in the same tables. New event
names are explicitly allowlisted; no schema or migration changes are required.

Visitor IDs rotate daily. Period visitor totals sum daily estimates rather than
counting unique people across the whole period. Tracking excludes local previews,
recognized bots, Do Not Track / Global Privacy Control, and signed-in dashboard
users. Hovers and default loader choices do not count as selections. The tracker
never sends copied text, raw IP addresses, account identity, or full referrer URLs.

npm totals cover the preceding 7 or 30 complete UTC days, separately from website
activity. They include automated and repeated downloads, not unique people or
attributed conversions. npm or database outages are shown as unavailable rather
than zero. `utm_source` and `utm_campaign` links can be created in the dashboard.

Reports query at most 30 days. Older rows are cleaned in bounded batches as new
traffic arrives; data on an inactive site may remain until traffic resumes.
Ingestion keeps the existing 2 KiB payload cap and site-wide limits of 120 events
per minute / 10,000 per day. Counts are best effort, subject to blocking and these
limits, and cannot reconstruct visits that happened before tracking existed.

Validation:

- `npm run typecheck`
- `npm run test:unit` (includes SQLite aggregation, access, privacy, and tracker tests)
- `npm run build`
- `node --test tests/rendered-html.test.mjs` (built Worker access and report checks)

Use Node 22.13+ as specified by the project. No new dependencies or external
analytics account are required. The published React loader package contains no
website analytics code. Runtime settings remain in Sites; no credentials are
committed to the source repository.
