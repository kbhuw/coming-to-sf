# Expanded catalog verification — 2026-09-05 UTC

Local full refresh completed successfully using the public feeds, not fixtures:
- Planning 1,917; affordable housing 190; transport 861 source records.
- Registrations 9,936; building permits 23,747, pagination/count checks passed.
- Assembled base + announcements 2,335; additional leads 10,961.

Browser at localhost:3010, actual WebMCP calls:
- Default scope: 2,199 records (excludes leads and known opened venues).
- Shops + next 3 months: 15 named announced records, including Ritual October target.
- Cafés + next 3 months: 5 records, all café names and evidence returned.
- Leads + all types: 11,096 records (10,961 additional leads + 135 original city leads). On-demand loading reaches loaded state.
- Switching back from leads to default scope removes leads from results.
- Screenshot verifies individual green café icons, visible type/time controls, unchanged watercolor map and no clustering.

15 automated tests pass, including range overlap, invalid/elapsed dates, stable IDs, SF bounds, evidence, lead date semantics and published-field exclusions.

This is a dated verification record, not a permanent expected count. Source updates change counts. Production verification is recorded separately after deploy.
