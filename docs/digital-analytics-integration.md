# Website analytics and social media

Marketing Intelligence now contains Website Analytics, Social Media, Online Reputation and Events. Existing reputation and event hashes continue to work. All new analytics and social posts are fictional, independent of CRM lead cohorts. No OAuth flow or live collection is implemented.

Website views include overview, demographics, technology and acquisition. Property, company, city, session channel and date filters apply to charts and report exports. Users are deduplicated within each report; new/returning audiences, interests and cross-channel users can overlap. Website key events are distinct from signed leases. Unknown demographics and unavailable desktop models are retained. Sample activity is limited to September–October 2026.

Social views include overview, sample content feed, and account mapping. Instagram, Facebook and Marketplace have platform filters and charts. Mappings use stable IDs and save in browser storage. Individual property-manager handles map to a stable property ID. Management-company accounts cover their properties and count only once; company totals are not attributed to an individual building. Followers are the latest account snapshots, never summed across days; Marketplace followers are N/A. Newly mapped accounts have no invented metrics or posts. Marketplace examples are manual/demo tracking, not an implemented general feed API.

## Live implementation

1. Google: authorize a reporting account, select GA4 property IDs, map stream hostnames to MF Hub property IDs, and call the GA4 Data API through a server connector. Check dimension/metric compatibility and preserve reporting identity, timezone, data thresholds and unknowns. Cache aggregates and display last successful refresh and errors.
2. Meta: authorize eligible professional Instagram accounts and Facebook Pages with the permissions required by the selected API version. Store credentials only on the server; map account IDs to stable property/company IDs. Sync permitted media/Page posts and supported insights, retaining source IDs and links. Handle revoked/expired access explicitly.
3. Marketplace: confirm permitted access for the actual account and use case before promising a connector. Until then, implement a validated manual/approved import pipeline for listing metrics and links.
4. Reconcile a small property pilot against native dashboards before enabling portfolio aggregation. Do not sum unique reach across accounts or days as though it were unique portfolio reach. Do not infer granular demographic information from missing data.

Primary references checked November 14, 2026:

- https://developers.google.com/analytics/devguides/reporting/data/v1
- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- https://developers.google.com/analytics/devguides/reporting/data/v1/quotas
- https://support.google.com/analytics/answer/12948931
- https://developers.facebook.com/docs/graph-api/reference/insights/
- https://developers.facebook.com/docs/graph-api/reference/page/feed/
- https://developers.facebook.com/docs/instagram-platform/

## Report consistency and feed controls

The existing Website & paid and Social summary pages now read the same analytics records as the detailed workspaces. Their links carry property scope and the chosen dates. Advertising spend remains a separate prorated sample; marketing source filters apply to CRM attribution, while website session-channel and social-platform filters belong to their detailed reports.

Social reports support one account/handle across charts, feeds and exports. Feed search and content-format filters apply before pagination (nine posts per page). Feed CSV exports include every matching post across pages; the Accounts tab exports mappings, including disconnected accounts. Shared-company coverage is explicit in exports. A selected account resets when a property/platform change makes it ineligible.

Newly saved mappings are selected immediately and have no performance data. Unavailable metrics display a dash rather than a measured zero. Validated profile URLs are exposed as links. Demographic/technology bars show the share of distinct active users, with overlap caveats retained; first-user acquisition details and exports include new visits only.
