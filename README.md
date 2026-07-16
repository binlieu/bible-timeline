# Bible Timeline

Self-contained Bible Timeline website built with HTML5, CSS3, vanilla JavaScript, and JSON seed data. It has no runtime dependencies and works when opened directly from `file://`.

## Build

```sh
node tools/build.js
```

The build script reads `data/*.json`, validates references, generates entity pages under `events/`, `people/`, `locations/`, and `books/`, regenerates `timeline.html`, injects the homepage timeline preview, and emits `js/data.js` for offline search.

## Project Layout

- `data/*.json` - source of truth for events, people, places, books, and era groups.
- `tools/build.js` - zero-dependency Node build script.
- `index.html` and `timeline.html` - generated/updated site entry pages.
- `events/`, `people/`, `locations/`, `books/` - generated entity pages committed to the repo.
- `css/style.css` - responsive theme, dark mode, print styles, and timeline visuals.
- `js/search.js`, `js/timeline.js`, `js/data.js` - client-side search, timeline filtering, and generated compact data.
