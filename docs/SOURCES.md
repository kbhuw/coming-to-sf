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
| Rec & Park | Candidate, not imported | https://sfrecpark.org/468/Park-Improvements |
| SFMTA | Candidate beyond SFCTA, not imported | https://www.sfmta.com/sfmta-projects |

Never report the number of connected sources as a completeness percentage. Each source covers a different universe. An empty query establishes only that nothing matched this catalog.
