# Communications: prototype to connected service

The current app demonstrates portfolio-to-person drill-downs and a shared communication history. Records are fictional and saved in the current browser. Email, SMS, WhatsApp, chat and phone actions are simulations or manual logs. There is no real delivery, inbound capture, voice recording, provider authentication or cross-device synchronization.

## Data contracts

- Contact: stable contact ID, tenant, verified identifiers, preferences and consent state. Never automatically merge people by name.
- Enquiry: contact ID, property, creation timestamp, original source, campaign and leasing owner.
- Interaction: event ID, contact/enquiry/property/tenant IDs, direction, channel, timestamps, sender, recipient, content, delivery status, provider ID and correlation key.
- Tours, applications and leases: separate records linked to the contact and enquiry. Stage counts use cumulative milestones in the enquiry creation cohort.
- Notes and drafts remain visible in the history but are excluded from inbound/outbound contact counts. Repeat contacts never create another unique enquiry automatically.

## Required implementation for live operation

1. Add an authenticated backend and durable database with tenant/property authorization, audit history, encryption, retention controls and backups. Browser-local records are unsuitable for operational resident data.
2. Connect the customer's authorized email inbox, messaging provider, phone service and web chat. Keep all credentials server-side. Establish sending domains/numbers, routing and consent rules.
3. Route outbound messages through a server queue. Store pending, sent, delivered and failed states accurately. Do not mark a message delivered before a verified provider receipt.
4. Ingest inbound webhooks, verify signatures, deduplicate by provider event ID and preserve original timestamps. Record unanswered calls, voicemail, replies and delivery failures. Reconcile backfills against the provider.
5. Link interactions by verified identifiers and provider conversation IDs. Provide a review queue for ambiguous identities and an audited merge/split workflow.
6. Use explicit call controls, recording permission and retention settings for audio. The prototype stores summaries only, not recordings or transcripts.
7. Connect the property system for actual tours, applications, units and signed leases; reconcile counts before rollout. Do not make housing eligibility decisions from the demonstration records.
8. Pilot with one property, then verify delivery/reply loops, webhook replay, retries, opt-outs, access restrictions and phone/mobile workflows before expanding.

## Current repository boundaries

`dist/model.mjs` owns cohort data and metrics. `dist/prospects.mjs` owns prospect details and communication operations. `dist/leasing.mjs` renders the leasing workspace. The provider adapter and server persistence layers remain to be implemented; no placeholder endpoint claims to be a working integration.
