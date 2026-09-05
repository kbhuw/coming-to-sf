# Data pipeline and update runbook

## What changed on 2026-09-05

The original app used SF Planning, MOHCD and SFCTA snapshots. Shop types were keyword guesses, no shop record had an exact date, and the browser applied 21 restaurant corrections from `lib/project-details.json`. The first filter fix addressed sticky UI state but did not solve missing source coverage.

This revision:

1. Adds a reviewed announcement catalog with 16 SF openings/projects: 12 SF entries from the September 1 Infatuation fall guide (Oakland's Egg Palace excluded), Ritual's October café, Dante's fall target, Art + Water, and T&T Geary. Summaries are short original factual abstracts; articles/images are not republished.
2. Moves enrichment into the data build, so downloaded JSON and the UI agree. The explicitly linked Dante announcement updates `pl-8f07ec958c7c`; it does not create a second Dante opening. The additional building permit remains separately labeled.
3. Imports **all** active SF registrations with location start in the rolling last 365 days: 9,936 rows on this run, including missing industry codes. Names are DBA fields, not inferred from LLC/owner names. Registration start is NOT an opening date. Existing businesses and ownership changes may be present.
4. Imports all 23,747 building-permit rows filed in that same window, then exposes 1,025 nonterminal business-keyword records as leads. This is a documented selection, NOT all future businesses. 10,920 terminal rows and 11,802 non-business-keyword rows are excluded from the lead map. Raw scoped snapshots stay in ignored `data/` for investigation.
5. Preserves proposed date ranges instead of manufacturing days. A year-wide target may overlap two timing filters. A range's earliest remaining bucket determines its single map color; filter memberships need not sum to total projects.
6. Adds evidence scope selection, lazy loading of the larger lead dataset, public source-health/download files, and address-match suggestions. Address matches are NOT automatically merged.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `scripts/sync.py` | Original three source collectors, then extended collectors and final assembly |
| `scripts/assemble.py` | Original source-specific mapping into `data/base-projects.json`; no longer publishes directly |
| `scripts/collect_sources.py` | Scoped Socrata registrations and permits; pagination, counts, unique IDs, retries, source metadata, hashes |
| `scripts/build_catalog.py` | Offline assembly, explicit enrichment and announcement merges, lead generation, match suggestions, public outputs |
| `catalog/announcements.json` | Human-reviewed announcement facts and evidence; canonical editable content |
| `catalog/geocodes.json` | Public-address geocoding results, matched address, score and provenance |
| `scripts/geocode_catalog.py` | Geocode only uncached announcement addresses; leave unsuccessful matches unmapped |
| `lib/project-details.json` | Reviewed corrections to original city records; preserved across source refreshes |
| `lib/timing.ts` | Exact-date and range timing logic |
| `lib/webmcp.ts` | Browser agent tools, including evidence scope |
| `app/page.tsx` | Filtering, lazy lead loading, GPU map, evidence cards and coverage UI |
| `public/projects.json` | Generated base projects plus reviewed announcements |
| `public/business-leads.json` | Generated registration and selected permit leads; loaded only on demand |
| `public/source-health.json` | Source scope, import timestamps/status, counts, exclusions and known gaps |
| `public/possible-matches.json` | Normalized-address candidates for human entity review |

Do not edit generated public JSON. Edit catalogs or collectors, then rebuild.

## Refresh from a clean clone

Requires Python 3.9+, Node.js 22.13+ and network access. No API keys required.

```sh
npm ci
npm run data:refresh
npm test
npm run build
```

The refresh fetches Planning/MOHCD with pagination counts, reads the SFCTA public application's current read token in memory, assembles the base, collects business/permit sources and builds the public catalog. The token is not stored in committed files. A failed collector exits nonzero; do not deploy a failed refresh. Existing published artifacts remain available. No scheduled refresh has been enabled.

For a different lookback, after base collection:

```sh
python3 scripts/collect_sources.py --since 2025-01-01
npm run data:build
```

The exact server-side query is published in the source ledger. Counts are checked before/after pagination and stable IDs must be unique. These checks catch count drift but are not a transaction: same-count source changes can still occur. Source `updated` timestamps describe source metadata, not our review date. `generatedAt` is compilation time; it must not be presented as evidence that all source facts were freshly checked.

To rebuild offline, retain the ignored `data/` snapshots from a successful refresh. Run `npm run data:build`; this does not refresh evidence from the web. Repeated offline runs change only generated timestamps when inputs are unchanged.

## Add or update an announcement

1. Find the actual SF location; exclude Oakland, South San Francisco and other cities.
2. Prefer the operator's current announcement; use local reporting where needed. Check whether the venue has already opened, moved, changed name or slipped its target.
3. Add a stable slug in `catalog/announcements.json`, name, address, category, supported `kindOverride`, short factual summary, `lifecycle`, and evidence URLs with `publishedAt` when known and actual `checkedAt`.
4. If merging with a city project, use its exact ID as `mergeInto`. Missing targets fail the build. An address alone is insufficient, especially multi-tenant premises.
5. Store the source's wording in `arrivalLabel` and an honest interval in `arrival`. October is October 1–31. Here fall means September 1–November 30, an explicit display convention, not a promised day. 'By end of 2026' spans the year. Ambiguous 'winter 2026' should stay unresolved unless a newer source clarifies it.
6. Preserve older/conflicting claims in `evidence` with `claim`; do not silently erase them. Never derive an opening from an expiration, approval, registration or inspection date.
7. Run `npm run data:geocode` for new addresses, inspect matched addresses/scores, then `npm run data:build`, tests and build. Low-confidence/no matches remain searchable without a pin.
8. Open the local site and test the new card, source link, category and time filters. Check both month/season and exact-date examples.

Geocodes are approximate public-address matches from Esri, accepted only for SF candidates scoring at least 90 inside the app's bounds. The cache is authoritative for repeat builds. To retry a failed/changed address, remove its cache entry intentionally and rerun geocoding. New cache entries are stamped with the actual UTC retrieval date.

## Matching and lifecycle

- `announced`: reviewed announcement, not a guarantee of completion.
- `project`: city project record with its recorded status.
- `lead`: registration, business permit, or unverified business-project change. May be existing activity.
- `opened`: known already open; retained under All records.

Default view excludes `lead` and `opened`. Users can inspect all records or just leads. The complete 365-day business registration scope remains available, including non-retail industries and missing NAICS codes. Industry mapping is heuristic. Source-only addresses and names are not promoted to confirmed venues.

## Validation and deployment

`npm test` covers date boundaries/range overlap, missing dates, explicit merges, unique IDs, SF bounds, lead timestamps and absence of owner/mailing fields. `tests/filter-qa.md` records the previous UI regression cases; rerun them with the new scopes and data.

Push reviewed changes to `main` on `kbhuw/coming-to-sf`. Vercel automatically builds production in Kush's personal workspace. Check the deployment and then **https://coming-to-sf.vercel.app/**, not only a build status. Verify map tiles, named announcements, near-term shops, leads loading, clear filters, evidence links and no-login access. Avoid running additional map tabs or retaining development servers after verification.

## Known remaining coverage gaps

- Announcements are manually reviewed, not automatically discovered or verified daily. No exhaustive claim for all SF openings.
- ABC: official browser-readable September 3 daily report exists, but Python/direct bulk imports return HTTP 403. A durable permitted collection route is still needed. Do not count this as a connected automated feed.
- Public Health review is a source candidate; no usable bulk feed connected yet.
- Rec & Park, SFMTA's own project pages, Public Works, SFPUC, Port, schools and neighborhood reporting need additional adapters/review beyond SFCTA.
- Raw permit descriptions may concern minor alterations. Keyword selection is a discovery mechanism.
- Dates change; elapsed ranges become stale estimates automatically, not 'opened'.
- The old city source feeds may retain completed records. Only reviewed evidence can override that status.
