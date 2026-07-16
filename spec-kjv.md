# Codex task — inline KJV verse text, expandable under each reference (offline)

## Goal
Under each Bible reference on the site, add an expandable panel showing the actual KJV
verse text. Must work fully offline from file:// (no fetch). Keep the existing bible.com link.

## Step 1 — source & VALIDATE the KJV data (do not skip the gate)
- Download a public-domain KJV JSON, e.g. https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json
  (array of 66 books: {abbrev, chapters:[[verseText,...],...]}), or aruljohn/Bible-kjv (per-book).
- VALIDATE before using: total verse count MUST equal 31102; Genesis 1:1 MUST equal
  "In the beginning God created the heaven and the earth."; John 3:16 must start "For God so loved the world".
  If any check fails, STOP and report — do not proceed with bad data.
- Transform into data/kjv/<USFM>.json, one file per book, keyed by chapter then verse:
  {"book":"GEN","chapters":{"1":{"1":"In the beginning...","2":"..."}}}. USFM codes must match
  the map already in tools/build.js (GEN, EXO ... EZK, JOL, NAM, PHP, MRK, JHN, REV). Commit these.

## Step 2 — emit per-book browser globals
- build.js writes js/kjv/<USFM>.js = window.KJV=window.KJV||{}; window.KJV.GEN={...}; from each data/kjv file.
- CRITICAL (offline): file:// cannot fetch(). Verse data must load via <script>. Do NOT ship the whole
  KJV on every page. build.js computes which books are cited on each page (reuse the existing reference
  parser used for the bible.com links) and includes ONLY those js/kjv/<USFM>.js scripts on that page,
  before js/scripture.js.

## Step 3 — display (js/scripture.js + build.js + CSS)
- After each linkified reference add a toggle button
  <button class="scripture-toggle" aria-expanded="false">show text</button> plus an empty
  <div class="scripture-body" hidden> carrying data attributes for the parsed span (book USFM,
  startCh, startV, endCh, endV — extend the existing linkifyReference parser to output the span).
- js/scripture.js: on toggle, read window.KJV[book] and render verses in the span as
  <p><sup>v</sup> text</p>. CAP long spans at 25 verses; if longer, render the first 25 and append
  "continues on bible.com" linking the existing URL. If window.KJV[book] is absent, hide the toggle.
- CSS .scripture-toggle/.scripture-body: subtle, indented, readable, light/dark via existing theme vars,
  @media print shows expanded text.

## Constraints
- Vanilla JS/CSS, no fetch, offline file:// safe. build.js node-stdlib only, idempotent, ZERO warnings.
- node --check passes. Escape all verse text; no double-escaping. Don't break bible.com links, internal
  links, or maps/graph/journeys. Keep per-page payload small (only cited books).

## Done when
- [ ] data/kjv/*.json validated (31102 verses, spot-checks pass); js/kjv/*.js generated.
- [ ] John 1:1-3 expands to real KJV text offline; Genesis 6-8 caps at 25 verses + note.
- [ ] Pages include only their cited book scripts. Build idempotent, zero warnings, all links resolve.
