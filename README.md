# Bible Timeline

![CI](https://github.com/binlieu/bible-timeline/actions/workflows/ci.yml/badge.svg)

A self-contained, offline-capable Bible study website: a chronological timeline of Scripture from Creation to Revelation, cross-linked into an explorable graph of people, places, nations, books, prophecies, and themes — with historical maps and journey routes. Built with only HTML5, CSS3, and vanilla JavaScript. No frameworks, no build-time dependencies beyond Node's standard library, no runtime dependencies, and no network calls — every page works opened directly from `file://`.

## Features

- **146 events** in an unbroken chronological chain (Creation → Revelation), grouped into 13 biblical eras, each with dates, location, people, references, summary, and historical background.
- **Entities, cross-linked:** 136 people, 63 places, all 66 Bible books, 16 nations, 32 prophecies (with typed fulfillments), and 13 themes.
- **Cross-reference graph:** every entity page has a typed "Connections" panel, and `graph.html` is an interactive ego-network explorer (479 nodes, 2,224 edges). A machine-readable `data/graph.json` is exported for reuse.
- **Maps:** an offline SVG basemap of the biblical world with a full location map and per-page locator maps — plus **7 journey maps** (Abraham, the Exodus, the Conquest, David's kingdom, Jesus' ministry, Paul's missionary journeys, the Seven Churches).
- **Bible references** link out to the corresponding passage on bible.com (KJV).
- Client-side search, dark mode, print styles, responsive layout, and accessible semantic markup throughout.

## Accuracy

Content is grounded in Scripture. Estimated dates are labeled "approx."/"traditional"; disputed identifications and interpretations are marked as such (e.g. the Red Sea crossing site, Mount Sinai, prophecy fulfillments), and archaeological/historical notes are attributed. The project follows a traditional (early-date) chronology while noting major scholarly alternatives.

## Build

```sh
node tools/build.js
```

`data/*.json` is the single source of truth. The build validates all cross-references, then regenerates every entity page, the timeline, browse/index pages, journey and map pages, the graph explorer data, and the offline data globals (`js/data.js`, `js/map-data.js`, `js/graph-data.js`). Generated HTML is committed so the site is browsable without a build step. The build is idempotent.

Regenerating the map basemap (rarely needed) requires the public-domain [Natural Earth](https://www.naturalearthdata.com/) 50m GeoJSON inputs; see `tools/make-basemap.js`.

## Development

Build generated pages and data:

```sh
node tools/build.js
```

Run integrity checks:

```sh
node tools/test.js
```

`data/*.json` is the source of truth. After editing data, run the build and commit the regenerated files. CI enforces that generated output stays in sync.

## Project layout

- `data/*.json` — source of truth (events, people, places, books, nations, prophecies, themes, journeys, connections, timeline eras, geo basemap).
- `tools/build.js` — zero-dependency Node generator. `tools/make-basemap.js` — one-time basemap prep.
- `index.html`, `timeline.html`, and the browse/index pages.
- `events/`, `people/`, `locations/`, `books/`, `nations/`, `prophecies/`, `themes/`, `journeys/` — generated entity pages.
- `css/style.css` — responsive theme, dark mode, print styles.
- `js/` — client-side search, timeline filter, maps, graph explorer, nav, and generated data globals.

## Attribution

Map basemap derived from [Natural Earth](https://www.naturalearthdata.com/) (public domain). Bible reference links point to [bible.com](https://www.bible.com/) (YouVersion).

## License

See [LICENSE](LICENSE).
