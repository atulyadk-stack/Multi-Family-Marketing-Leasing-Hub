# MF Hub — Marketing & Leasing Intelligence

A private, interactive multifamily marketing and leasing prototype. The application uses HTML, CSS and ES modules, with a dependency-free Worker for property website content.

## Run and test

Run `npm run dev` and open http://localhost:4173. This builds and serves the Worker, including property website content. In the Sites environment, run `sites-preview start <checkout>`.

```sh
npm run check
npm test
```

The deployment configuration is `.openai/hosting.json`. Keep the existing project identity when updating the Site.

## Working repository

Source: https://github.com/atulyadk-stack/Multi-Family-Marketing-Leasing-Hub

Private demo: https://mf-hub-summit-v1.richalpaca1.chatgpt.site

GitHub is the working source for ongoing edits. Site publishing is a separate step; a GitHub push alone does not update the live demo.

## Included

- Executive portfolio overview and property drill-downs.
- Seven reputation views: overview, review inbox, performance, sentiment, listings, competitors, surveys.
- Seven Marketing Intelligence views: overview, sources and spend, conversion, website and paid, organic content, lead journeys, recommendations.
- Marketing filters for channel, source/platform, acquisition type, and inclusive custom date ranges, alongside property/company/city. The filters apply to the marketing reports and their CSV exports; reset restores the October portfolio view. Existing attribution URLs still work.
- Working property/company/city/month filters, search and CSV exports.
- Review assignment, editable sample reply and completed-response metrics.
- Clickable enquiry, scheduled-tour, completed-tour, application and lease counts in the portfolio and property views.
- Searchable, filterable prospect lists and CSV exports that reconcile with the cohort totals.
- Prospect 360: contact/enquiry details, repeated-contact counts, tours, application checklist and lease metadata.
- Unified inbound/outbound history across email, SMS, phone, web chat, WhatsApp and property visits, plus internal notes.
- Demo message composition, incoming-message simulation and call logging with duration/outcome. No actual messages or calls are sent.
- Tour booking with date/time/type and an automatic demo confirmation in the contact history.
- Responsive record cards, scrollable detail tabs, touch-sized controls and mobile navigation.
- Shared action centre with assignment and status changes.
- Customer name and accent-colour settings; one-click demo reset with a confirmation dialog.
- Connection planning cards. These do not connect to vendor services.

## Five-minute CEO walkthrough

1. Open Portfolio overview. Explain the four-property, 1,000-home fictional portfolio.
2. Select Northpoint Apartments. Its occupancy is 93%, lead-to-lease conversion is 4.4%, and 12 reviews await responses.
3. Open the review inbox. Open a review, assign an owner, use or edit the sample response, then complete it. The open count falls by one.
4. Open Marketing Intelligence and reset the filters. Compare ILS paid cost per lease ($900) with Google Ads ($1,286) and Meta ($3,600). Select a channel, source, acquisition type or custom date range to inspect a cohort, then click a funnel stage to open the matching journeys.
5. Open a source and a prospect record to inspect the milestone journey. Open the portfolio Enquiries card and a prospect without a scheduled tour. Use the Tour tab to book an appointment and see both the count and communication history update.
6. Create a follow-up task and change its owner/status in the Action Centre.
7. Change the customer name/accent in Brand settings. Reset the demo before the next presentation if desired.

## Data definitions

`dist/model.mjs` is the deterministic synthetic data and calculation layer. October has 240 unique enquiries, 100 scheduled tours, 72 completed tours, 32 applications and 18 leases. Paid sources account for 180 enquiries and 14 leases, against CAD 18,000 media spend. September is a distinct 228-enquiry sample cohort.

Original-source attribution gives each lease one source credit, assigned on first enquiry. Acquisition stages use creation cohorts with outcomes through November 13, 2026. Conversion is cohort leases divided by cohort enquiries. Velocity is the nearest-rank P75 of elapsed days among converted leads. It excludes unconverted prospects.

Paid cost per lease uses 14 paid-source leases; blended ad spend per lease uses all 18 leases. Organic/referral costs are unallocated, not zero. These are advertising metrics, not full acquisition costs.

October reviews total 240 with 1,000 stars: average 4.1667. 216 are answered, 24 open, and 9 marked overdue. A completed demo response updates the relevant month/property. Sentiment uses transparent sample rating buckets and topic assignments; no AI sentiment service is called.

Marketing dates filter enquiry creation (inclusive), retaining later milestone outcomes. Available sample records cover September and October 2026; dates outside that coverage produce no records. Source and channel filters also narrow allocated advertising spend. Custom-date spend is a labelled estimate, prorated by calendar days from each month's sample totals. Unknown acquisition is separate from organic/direct/referral. Website/social aggregates do not have source/channel breakdowns, so those views explicitly identify the property/date scope of their illustrative traffic/content totals. Funnel drill-downs and journey exports retain the marketing cohort, milestone, source and search filters.

Occupancy, listing health, competitors and survey results are fixed fictional snapshots. NPS uses a separate 240-response sample survey: 156 promoters, 60 passives, 24 detractors, for +55 NPS. It is not derived from review stars. Website/social metrics are illustrative period data; selected social examples do not sum to all period activity.

## Source and design context

The information architecture follows the user's supplied Birdeye reputation report and Halo/Hyly sample attribution report, interpreted into an original MF Hub interface. The app includes no confidential recordings, vendor screenshots, real resident records or original report files.

## Persistence and limits

This is a frontend prototype. Demo communications, prospect owners, tour details, responses, assignments, bookings, tasks and branding are stored in the current browser's localStorage. They are not synced across people or devices. Filters reset on reload. The reset control clears this app's own demo state only.

No messages are sent, reviews published, listings changed, campaign budgets modified or real calendar appointments booked. Draft replies and recommendations are templates/rules, not live AI calls. Connection cards are planning notes; API availability and white-label rights still require vendor confirmation.

The Site is owner-private. It is intended for the owner to present in a meeting. Customer access should be configured deliberately before sharing outside that account.

## Next implementation phase

Add an authenticated server, tenant-scoped records, durable storage, audit trails and vendor connectors behind the same data contracts. Confirm source mapping and commercial access with each provider, then pilot a small property set and reconcile results. Do not place credentials in client-side files.

## Verification

Fifteen automated tests cover portfolio/source reconciliation, cumulative cohort milestones and as-of dates, filter scopes, response updates, booking idempotency, task deduplication, CSV escaping and state defaults, every stage/property/cohort drill-down, repeated-contact counts, interaction validation, notes/draft exclusion, confirmation logging and communication persistence, and Worker asset/property API routing.

Desktop browser checks cover all 14 report views, property filtering, editable sample response completion, reassignment, saved-state reload, prospect-source drill-down, sample booking, task creation/status, branding persistence and reset. Responsive browser checks cover 320px and 390px widths, mobile navigation, prospect details, message composition and tour booking. These are browser viewport tests, not physical-device certification.

## Communication architecture

See [the production connection plan](docs/communications-production-plan.md) for the remaining backend, provider, identity, delivery-receipt and data-persistence work required for live operations.

## Local preview

Use `npm run dev` to preview both the dashboard and the property website service. A recent Node.js runtime is required for the checks and tests; the application has no runtime package dependencies.

## Property website content

The property dialog shows contact details from the portfolio record. For a live property, set `website` to its final official HTTPS listing URL in `dist/model.mjs`, set `demoWebsite` to false, and provide the verified address and direct leasing phone. The Worker fetches the configured listing HTML when needed and caches successful results for up to an hour per running instance. It reads structured property data, image tags and labeled feature lists. Pages that render their gallery only with client-side JavaScript may return partial results. Fictional demo records use sample listings and city-level directions.

## Prospect dashboard preview

![Prospect 360](docs/mf-hub-prospect-360.jpg)

## Call Center

The sidebar Call Center dashboard and portfolio KPI section share six metrics: incoming calls, answer rate, abandonment rate, average speed to answer, average handle time and call-to-tour conversion. They use the same phone events as Prospect 360 and follow property, company, city and enquiry-cohort filters. The activity list supports outcome filters, pagination, scoped CSV export and prospect-history links.

These are fictional call records and browser-saved manual logs. The reporting cohort selects enquiries and their full call history; it is not a call-received date range. Missing queue or wrap-up fields are excluded from averages, and only explicitly attributed inbound bookings count toward tour conversion. Metric definitions and timing coverage appear in the dashboard. No live telephony is connected.

## Onsite Activity and resident events

The **Onsite Activity** navigation section adds an event calendar, planned and past event lists, and event pictures. Filter by property, management company, city, event type and date range; export the current view to CSV. Calendar navigation uses event dates in Eastern Time, independently of marketing enquiry cohorts. On narrow layouts, the calendar is presented as an agenda.

Property directory cards and the property detail dialog show planned/past event counts, the next event, photo counts and links to the relevant event workspace. Portfolio-wide events retain one ID and appear under every participating property without being duplicated in portfolio totals.

Create and edit events, select participating properties, set venue/organizer/capacity, manage resident RSVPs and guests, use a waitlist, and record or undo attendance on or after an event's date. Event photos support a carousel and local JPEG/PNG/WebP uploads (1 MB per image, up to 8 per event). Sample venue photos are clearly marked illustrative. Cancellation preserves the record and attendance history.

This remains a prototype: fictional data, no invitation delivery, no resident self-service registration, and no shared or cross-device event storage. Event data and uploaded pictures use a separate browser-local store (`mf-hub-onsite-events-v1`); Reset demo clears it along with other demo state. Storage failures leave the previous saved event state intact.

Validation for this addition: syntax checks, Worker build, event/filter/RSVP/capacity/attendance/restore tests, and application-rendering integration checks. Browser and mobile visual QA could not run because no connected browser was available. Site publication requires synchronizing the committed source with the existing Sites source repository; the Sites Git hostname was unavailable in this session.
