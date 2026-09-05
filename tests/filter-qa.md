# Filter browser regression checks

Verified on 2026-09-05 using the actual select controls and buttons:

- Select Next 3 months, then Shops: switches to Any time and shows all 137 shops.
- All 12 business kinds match their displayed counts: 2, 16, 3, 7, 7, 4, 14, 7, 9, 19, 4, 45.
- All 23 enabled category/time combinations match their displayed counts; empty date buckets are disabled.
- A nonmatching project-text search stays visible above the map, shows an empty-result explanation, and Clear all filters restores results.
- After zooming to Dante's and selecting Storage, an outside-view notice appears. Show matches on map makes all four storage records visible.
- Category changes reset timing, subtype and project-text search. Kind changes reset timing. WebMCP filter calls clear previous project-text search.
