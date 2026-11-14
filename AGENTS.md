# MF Hub project guidance

This repository is the working source for the multifamily marketing and leasing hub. Preserve the user's requested changes and existing work.

## Application

- `dist/index.html`: app entry point.
- `dist/app.mjs`: views, routing and demo interactions.
- `dist/model.mjs`: deterministic fictional records, calculations and state operations.
- `dist/styles.css`: shared design system and responsive layouts.
- `tests/model.test.mjs`: data and workflow invariant tests.
- `README.md`: setup, demo walkthrough, metric definitions and known limits.

Keep the navy/teal MF Hub design consistent unless the user requests a redesign. Preserve working filters, drill-downs, exports and customer branding.

## Data and validation

Use fictional sample data for the prototype. Do not add confidential recordings, original vendor reports, real resident/prospect data or credentials to this repository. Keep demo actions clearly distinguished from live integrations.

Use the shared model for dashboard totals. Preserve creation-cohort attribution, paid versus blended cost denominators, review response arithmetic and the separate survey NPS definition.

Run `npm run check` and `npm test` when changing the implementation. For UI changes, inspect the rendered page and the affected workflow when browser tooling is available. Report any verification limitations.

## Source control and publication

GitHub is the working source. Preserve remote changes and use normal commits and pushes; do not force-push or replace existing history.

The private hosted demo uses the existing project identity in `.openai/hosting.json`. Keep that identity. GitHub pushes do not automatically deploy the demo. Use the supported Sites workflow to publish the tested source without changing the audience unless the user requests it. Never store access tokens in tracked files.
