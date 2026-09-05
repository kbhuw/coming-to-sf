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
python3 -m pip install -r scripts/requirements.txt
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
- Rec & Park, Public Works and SFPUC directories are connected as documented below. Port, schools and broader neighborhood reporting still need additional adapters/review.
- Raw permit descriptions may concern minor alterations. Keyword selection is a discovery mechanism.
- Dates change; elapsed ranges become stale estimates automatically, not 'opened'.
- The old city source feeds may retain completed records. Only reviewed evidence can override that status.

## SFMTA directory adapter

`collect_sfmta.py` follows every actual next-page link in the unfiltered directory, then traverses every one of the nine agency status filters and retains the URL union. It extracts only project-card elements, excluding navigation and news links. A missing card title, unexpected empty page, pagination cycle or failed HTTP request fails the refresh. Requests have a 35-second timeout and three attempts. Raw HTML is retained in ignored `data/sfmta-pages/`; normalized rows are atomically written to `data/sfmta.json` only after all traversals pass.

The final assembly attaches the official link to an existing record only when its normalized title has exactly one match. Other entries get a stable URL-derived ID. Completed membership removes the record from the default upcoming view, including matched existing records. Stages come from filter membership; an entry with no membership is explicitly unresolved. Programs and studies remain included because the scope is the complete agency project directory. Unverified locations stay unmapped and searchable; directory dates are not converted into opening dates. Counts are not a claim of unique physical construction sites.

Install the pinned parser dependency using `python3 -m pip install -r scripts/requirements.txt`. Run this adapter alone with `python3 scripts/collect_sfmta.py`, then `npm run data:build`. Parser regression checks: `python3 -m unittest discover -s tests -p 'test_*.py'`.

The first traversal exposed six completed URLs missing from the unfiltered pages. Consequently all status partitions are collected, and the discrepancy is retained in metadata. A single traversal is not a transactional guarantee: listing order can change. `--reuse-cache` is a recovery option that reuses raw pages younger than one hour; normal refresh always fetches live pages.

Verified 2026-09-05 UTC: 49 unfiltered pages plus all nine status partitions produced 379 unique URLs; 105 completed. Six completed URLs were absent from the unfiltered traversal. The normalized directory is published as `public/sfmta-directory.json` for independent count/link checks. Raw HTML is not published.

## Park projects and reviewed identity merges

`collect_parks.py` collects every card from Rec & Park's Active Park Projects directory and follows cards explicitly describing grouped "Active projects in" a park. This currently includes the Golden Gate Park and McLaren Park subdirectories. It imports 39 unique URLs across three directory pages. Completed descriptions take precedence over the misleading active-directory membership (Gene Friend and South Sunset were completed in August 2026). Raw HTML stays in `data/parks-pages`; normalized directory data is published in `public/parks-directory.json`. This adapter covers that directory tree, not all acquisitions, historical projects or every update article.

`geocode_parks.py` is an optional one-time enrichment step: `python3 scripts/geocode_parks.py`, then `npm run data:build`. It accepts only SF park/POI candidates scoring at least 90, inside the SF bounds, with substantial name overlap. Public park locations are approximate, not construction footprints. Failed matches stay searchable without a pin. `catalog/park-geocodes.json` preserves the query, match, source URL and review timestamp. A Lake Merced Boulevard street match was rejected rather than used as the Lake Merced West project location. Eight locations were accepted in the first review. New parks do not require a successful geocode to remain in the catalog.

Parks have their own visible type filter and tree icon, supported by WebMCP. Unknown timelines stay unknown. Directory membership does not establish a reopening date; explicit phase/date evidence remains an enrichment task.

`catalog/merges.json` holds reviewed identity decisions. Assembly requires the canonical and member IDs to exist, attaches source links and original member records to the canonical record, and preserves old member IDs as aliases. WebMCP open_project resolves those aliases. The Potrero Yard SFMTA directory record merges into the mapped SFCTA transport project. The Planning housing component remains separate. Broad automatic fuzzy merging is intentionally absent because adjacent sites and separate phases can share a name.

## Public Works and SFPUC

`collect_infrastructure.py` collects all Public Works project cards and all marker blocks from its published project map. It parses marker text as data; no remote JavaScript is executed. Each marker block is parsed independently so missing status values cannot shift one project's coordinates onto another. Published node IDs join the map and directory; directory status takes precedence when present. Coordinates outside SF bounds remain unmapped. Source sort timestamps are never interpreted as completion dates. This run collected 268 records and 133 map markers; 165 records were marked completed. This is the published directory/map scope, not every internal Public Works capital project.

The same adapter collects all 34 links under SFPUC's San Francisco construction accordion and reads each page's structured overview milestones, using at most three concurrent requests. Other regional sections are excluded. SFPUC's regional grouping includes some cross-boundary infrastructure; membership does not prove every worksite is inside city limits. Two records were marked completed. A failed detail fetch fails the collector rather than silently omitting a project. `data/infrastructure.json` is written atomically after both sources succeed; the normalized source directory is published at `public/infrastructure-directory.json`.

Construction Start is preserved as source context and is never used for arrival coloring. `arrival_ranges.py` converts only an explicit Construction End label into a month, spring/summer/fall, or year interval. Spring means March-May, summer June-August, fall September-November. "End of 2026" remains the whole-year interval. Ambiguous winter, mixed phase labels, relative durations and early/late ranges remain unresolved text. Completed status overrides a future target: Noe Valley Water Main Replacement is excluded from the upcoming view even though its source also retains a November 2026 target.

The Works filter and wrench icons include both source groups. `npm run data:refresh` runs this adapter; to refresh it alone, run `python3 scripts/collect_infrastructure.py` then `npm run data:build`. Parser regression checks and the public-record coverage test verify missing map statuses, regional scoping, date ambiguity, source retention and completed-status handling.

## Clean-checkout verification, September 5, 2026

Cloned commit `90563d7` into a fresh temporary checkout with no `data/` directory, then ran `python3 scripts/sync.py`. All nine structured source groups completed and assembly produced 3,051 base/agency/announcement records plus 10,930 business/permit leads. The rolling one-year scope now begins September 5, 2025: 9,906 registrations and 23,650 permits, of which 1,024 became business leads. These differ from September 4 counts because the lower bound advanced; historical counts above are dated evidence, not invariants. The rebuilt public outputs were copied into the publication checkout and tested again.

The basemap archive occasionally resets HTTP connections. The tile route now allows two attempts, each with a 12-second timeout, then returns an uncached 503. Permanent 4xx responses are not retried. Tests cover a successful retry, a permanent missing tile, and exhausted retries. This does not guarantee archive uptime.

## News discovery and evidence review

`collect_news.py` reads every item currently exposed by Eater SF's Atom feed and Mission Local's RSS feed. It retains publisher titles, canonical URLs and publication dates only—no article bodies or images. Stable URL hashes identify items; tracking query parameters are removed. The committed `public/news-review.json` retains previously collected URLs across clean-clone refreshes. This first fetch contained 10 Eater entries and 31 Mission Local entries. A feed is a recent window, not a full historical archive; missed stories between infrequent refreshes remain a coverage limitation.

The public `/updates` page exposes the queue with headline search and a broad possible-change filter. Keywords prioritize review; they do not verify an opening. For example, OpenGov headlines can match "open" and are not automatically added to the map. SFist and Hoodline feed attempts returned 403 and are not counted as connected sources. `source-health.json` records connected discovery feeds separately from map datasets.

Run `python3 scripts/collect_news.py` to refresh only this queue, or `npm run data:refresh` to run it with the structured-source pipeline. A failed feed prevents replacement of the queue. Previously collected items remain; source timestamps and first/last-seen dates are preserved. `catalog/news-reviews.json` stores reviewed article URLs, status, checked date and resulting canonical project IDs. To promote evidence: read the full report, confirm SF address and whether this is a new opening/reopening versus an existing venue, corroborate with the operator when available, add the announcement using the procedure above, geocode the public address, then rebuild. Article publication dates are never used as opening dates.

Initial review added Bruno's September 12 soft reopening at 2389 Mission, Sin Miedo's September 19 opening at 2831 Mission, and The Portal Cinema's October target at 3293 Mission. Portal's own website corroborated the October target. Exact announced days use a one-day interval; soft opening and grand opening remain distinct. The generic target explanation now supports day-level dates as well as seasons. All three addresses passed geocoding.

## Port and school discovery records

`python3 scripts/collect_civic.py` fetches the Port development directory and both active SFUSD bond-program navigations, then retrieves every unique detail page with three concurrent requests. It extracts names, URLs, a maximum 20-word description excerpt, page-update text and explicitly labeled milestone paragraphs. Contacts are excluded. Unknown HTML structures fail rather than silently producing empty lists. Port onclick attributes are parsed as link text, never executed.

The collector writes `data/civic.json` atomically only after every request succeeds. `npm run data:build` publishes it as `public/civic-directory.json`, and registers its scope/count/timestamp under `discoverySources`. `npm run data:refresh` includes this collector before the final assembly. The committed public snapshot keeps clean-checkout builds independent of live agency availability.

`catalog/civic-reviews.json` is the editable evidence ledger keyed by exact project URL. Each review records `status`, `checkedAt`, `evidenceUrl` and a factual `note`. The collector gives entries URL-hash IDs and retains all matching SFUSD program URLs. A reviewed `opened` status overrides directory membership. After editing reviews, rerun the collector and catalog assembly.

The `/agency-projects` page supports text search and agency filtering. These discovery records intentionally do not enter the default map: lifecycle, distinct phases, location and potential overlap with existing city records need review. To promote an opening, verify those facts and add evidence to `catalog/announcements.json`, using an explicit `mergeInto` when it matches an existing project. Do not infer dates from an agency page update, budget allocation or stale schedule chart. Tests in `tests/test_civic.py` cover parent-navigation exclusion, directory structure failure and unknown completion handling.
