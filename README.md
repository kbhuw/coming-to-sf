# Coming to SF

A map-first publication of upcoming San Francisco projects, colored by published timing.

## Data

`public/projects.json` contains the complete assembled snapshot from:
- SF Planning Development Pipeline (`6jgi-cpb4`)
- MOHCD Affordable Housing Pipeline (`aaxw-2cb8`)
- SFCTA MyStreetSF project-location feed

Run `python3 scripts/sync.py` to refresh all three sources. It checks Socrata pagination counts, downloads source metadata, and assembles the output. Run `npm run build` and publish a new version after refreshing. This publication does not run an automatic refresh schedule.

The snapshot is not comprehensive coverage of every future change in SF. Standalone business openings, parks, utility work and schools require additional sources. California ABC's CSV download returned HTTP 403 in both bounded retrieval attempts, so it is not included. Feed dates and these gaps are visible in the interface.

Housing construction completion and transportation open-for-use estimates are preserved as separate date kinds. No timing is inferred from permit stage. Elapsed dates are shown separately from future arrivals. Coordinates must lie in the SF map bounds; unlocated projects remain in search. Transportation lines and multiple sites retain their geometry. Completed/inactive transport records are excluded. Affordable housing merges into a planning project only when its planning case matches a unique entry. Additional cross-source duplicates can remain; raw feed identifiers are retained for audit.

Category labels use reported housing-unit fields and keyword rules, not a separately validated AI classifier. Project descriptions are published source text. Evidence extraction from supporting PDFs and broader entity resolution are future work, not claimed capabilities.

## Checks

- `node --experimental-strip-types --test tests/timing.test.mjs`
- `npx tsc --noEmit`
- `npm run build`

Timing checks cover missing dates, elapsed dates, inclusive window boundaries, month-end and leap-year behavior. Source pagination and unique project IDs were checked against the retrieved snapshots.

WebMCP tools: search_projects, open_project, focus_location, filter_projects, and read_map. Browser contract checks verified registration, valid state transitions and invalid-input rejection for all five tools. Location lookup was verified with Noe Valley and an SF civic street address, including ambiguous candidate selection.

The map displays individual category icons without clustering. Visible type buttons filter Homes, Shops, Transit, or Other; arrival timing has its own selector. Color shows timing. The list opens on demand, leaving the map full width. Hover/focus reveals names and clicking opens details. Co-located records open a chooser. Initial zoom is 12.8 for a closer view.


Address search calls Esri directly from the browser on submission. Results are transient and not saved. Neighborhood matches zoom to 14; address matches zoom to 16. Results outside the configured SF bounds or with low match scores are rejected. The Esri lookup is an external runtime dependency.

Basemap: Stamen Watercolor, served by Smithsonian / Cooper Hewitt. Tiles are a historical cartographic backdrop, not a current street survey; zooms above 16 overzoom the archived tiles. Attribution links are visible on the map. MapLibre renders data locally in the browser. Project-text search runs locally; address lookup sends the submitted location to Esri.

Rendering: project icons use one MapLibre symbol layer and a fixed shared icon atlas, not per-project HTML markers. No per-frame source scan. Two workers, a 32-tile cache limit, and device pixel ratio capped at 1.5 bound rendering overhead. Browser QA measured 25,749 elements before versus 785 after (not a RAM measurement), and verified type filtering and map-icon detail selection.

Business-kind filters and icons infer proposed uses from record descriptions, prefer change-of-use destinations, and retain an Other / mixed use fallback. These classifications are heuristic, not verified business openings. Timing markers use solid colored backgrounds for dated records and white/gray for unknown dates. The legend is clickable.

Restaurant records were reviewed on 2026-09-04. `lib/project-details.json` preserves curated names, summaries, record labels, classification corrections and supporting URLs separately from the refreshed city snapshot. All 21 former restaurant matches are covered. Three office conversions and two non-restaurant projects are reclassified. Existing businesses, alterations, related permits and already-open venues remain visible with explicit labels; they are not confirmed new openings. Original descriptions remain expandable. Seasonal operator targets are shown as text, not fabricated exact dates. Other business records still require enrichment; coverage is not an exhaustive opening directory.

## Run locally / deploy

Requires Node.js 22 or newer. Run `npm ci`, then `npm run dev`.
`npm run build` creates a standard Next.js production build. Import this repository into Vercel with the Next.js preset; no environment variables or API keys are required. Pushes to `main` deploy production when connected to Vercel.

City data, geocoding and basemap services retain their respective terms and attribution requirements. MapLibre's worker files are copied from the installed package before each build.
