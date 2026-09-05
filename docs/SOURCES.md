# Source register

This document separates working collectors from research candidates. Actual counts/scopes/timestamps are in `/source-health.json`.

| Source | Current access | Meaning / update method |
|---|---|---|
| SF Planning `6jgi-cpb4` | Automated full feed | Development proposals and stages; `sync.py` |
| MOHCD `aaxw-2cb8` | Automated full feed | Housing completion estimates; `sync.py` |
| SFCTA MyStreetSF | Automated active-project selection | Transportation phase and estimated completion; `sync.py` |
| SF businesses `g8m3-pdis` | Automated, rolling 365-day active-SF-location scope | DBA, industry, location registration; `collect_sources.py` |
| SF permits `i98e-djp9` | Automated, rolling 365-day filing scope | All scoped rows collected, nonterminal business-keyword leads published |
| Ritual Coffee | Reviewed operator announcement | https://ritualcoffee.com/news/our-new-cafe/ |
| Dante's | Reviewed operator announcement | https://dantesdontlookdown.com/about |
| Infatuation fall guide | Reviewed reporting, SF entries only | https://www.theinfatuation.com/san-francisco/guides/san-francisco-fall-restaurant-openings-2026 |
| Art + Water | Reviewed operator + reporting | https://artpluswater.org/work-with-us/ and linked Eater article in catalog |
| T&T | Reviewed operator newsroom + original press release | https://www.tntsupermarket.us/aboutus/newsroom/104 |
| ABC daily / bulk | Not automated: direct HTTP 403 | https://www.abc.ca.gov/licensing/licensing-reports/ |
| SF Public Health | Candidate, not imported | https://www.sf.gov/check-if-your-project-requires-health-plan-review |
| Rec & Park | Automated active directory and grouped park subdirectories | `collect_parks.py`; optional reviewed park geocoding; separate Parks type |
| SFMTA | Automated paginated directory + all nine status filters | `collect_sfmta.py`; unverified locations stay searchable without pins |

Never report the number of connected sources as a completeness percentage. Each source covers a different universe. An empty query establishes only that nothing matched this catalog.

| Additional source | Access | Scope |
|---|---|---|
| Public Works | Automated directory and published map | All cards/markers; directory status preserved |
| SFPUC | Automated construction directory and detail milestones | San Francisco section only; cross-boundary projects may be listed by agency |

Eater SF and Mission Local feeds are automated discovery sources, shown at `/updates`. They collect headlines for review, not verified map openings. SFist and Hoodline feed access returned 403.

Port and SFUSD are automated **discovery** sources at `/agency-projects`, with public records at `/civic-directory.json`. They are listed separately from verified map evidence in `source-health.json`:

- Port: every card under **Projects In Development** at https://www.sfport.com/projects-programs. Excludes broad waterfront policies and the completed archive. Directory membership alone does not prove current construction or an opening date.
- SFUSD: every leaf subpage under the active 2016 and 2024 bond program navigation. These include broad programs and potentially completed work. Union by exact URL; preserve all parent program URLs. This is not the entire SFUSD capital-project universe.
- Mission Bay School is explicitly reviewed as opened, based on SFUSD's August 6, 2026 opening announcement at https://www.sfusd.edu/bond. Separate work packages can remain ongoing.
- Page modification dates remain metadata, never opening dates. Unresolved completion is JSON `null`, not a claim that work remains unfinished.
