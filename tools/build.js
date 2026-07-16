const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8"));
}

const data = {
  events: readJson("events.json"),
  people: readJson("people.json"),
  places: readJson("places.json"),
  books: readJson("books.json"),
  timeline: readJson("timeline.json")
};

const maps = {
  events: new Map(data.events.map((item) => [item.id, item])),
  people: new Map(data.people.map((item) => [item.id, item])),
  places: new Map(data.places.map((item) => [item.id, item])),
  books: new Map(data.books.map((item) => [item.id, item]))
};

let warnings = 0;

function warn(message) {
  warnings += 1;
  console.warn("Warning: " + message);
}

function ensureDir(relativePath) {
  fs.mkdirSync(path.join(rootDir, relativePath), { recursive: true });
}

function writeFile(relativePath, content) {
  fs.writeFileSync(path.join(rootDir, relativePath), content, "utf8");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugPath(type, id) {
  if (type === "event") return "events/" + id + ".html";
  if (type === "person") return "people/" + id + ".html";
  if (type === "place") return "locations/" + id + ".html";
  if (type === "book") return "books/" + id + ".html";
  return "#";
}

function relativeUrl(rootPrefix, type, id) {
  return rootPrefix + slugPath(type, id);
}

const typeToCollection = { event: "events", person: "people", place: "places", book: "books" };

function lookup(type, id) {
  const key = typeToCollection[type];
  return maps[key] ? maps[key].get(id) : null;
}

function linkTo(rootPrefix, type, id, fallback) {
  const item = lookup(type, id);
  const label = item ? item.name : fallback || id;
  return '<a href="' + escapeHtml(relativeUrl(rootPrefix, type, id)) + '">' + escapeHtml(label) + "</a>";
}

function listLinks(rootPrefix, type, ids) {
  if (!ids || !ids.length) return "<p>None listed.</p>";
  return '<ul class="link-list">' + ids.map((id) => "<li>" + linkTo(rootPrefix, type, id) + "</li>").join("") + "</ul>";
}

function textList(items) {
  if (!items || !items.length) return "<p>None listed.</p>";
  return "<ul>" + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function paragraphs(text) {
  if (!text) return "<p>None listed.</p>";
  return String(text).split(/\n\s*\n/).map((part) => "<p>" + escapeHtml(part) + "</p>").join("");
}

function metaRows(rows) {
  return '<dl class="meta-list">' + rows.map(([label, value]) => (
    "<dt>" + escapeHtml(label) + "</dt><dd>" + (value || "None listed.") + "</dd>"
  )).join("") + "</dl>";
}

function pageLayout(options) {
  const rootPrefix = options.rootPrefix || "";
  const scripts = options.timelineScript
    ? '<script src="' + rootPrefix + 'js/data.js"></script>\n<script src="' + rootPrefix + 'js/search.js"></script>\n<script src="' + rootPrefix + 'js/timeline.js"></script>'
    : '<script src="' + rootPrefix + 'js/data.js"></script>\n<script src="' + rootPrefix + 'js/search.js"></script>';

  return '<!doctype html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>' + escapeHtml(options.title) + '</title>\n' +
    '  <meta name="description" content="' + escapeHtml(options.description || "Offline Bible timeline study website.") + '">\n' +
    '  <link rel="stylesheet" href="' + rootPrefix + 'css/style.css">\n' +
    '</head>\n' +
    '<body data-root="' + rootPrefix + '">\n' +
    '<a class="skip-link" href="#main">Skip to content</a>\n' +
    renderHeader(rootPrefix) +
    '<main id="main">\n' + options.body + '\n</main>\n' +
    renderFooter() + '\n' +
    scripts + '\n' +
    '</body>\n' +
    '</html>\n';
}

function renderHeader(rootPrefix) {
  return '<header class="site-header">\n' +
    '  <div class="nav-wrap">\n' +
    '    <a class="brand" href="' + rootPrefix + 'index.html">Bible Timeline</a>\n' +
    '    <nav aria-label="Main navigation">\n' +
    '      <ul class="nav-links">\n' +
    '        <li><a href="' + rootPrefix + 'index.html">Home</a></li>\n' +
    '        <li><a href="' + rootPrefix + 'timeline.html">Timeline</a></li>\n' +
    '        <li><a href="' + rootPrefix + 'index.html#people">People</a></li>\n' +
    '        <li><a href="' + rootPrefix + 'index.html#places">Places</a></li>\n' +
    '        <li><a href="' + rootPrefix + 'index.html#books">Books</a></li>\n' +
    '      </ul>\n' +
    '    </nav>\n' +
    '    <div class="header-actions">\n' +
    '      <form class="search-form" data-search-form role="search">\n' +
    '        <label class="visually-hidden" for="site-search">Search</label>\n' +
    '        <input id="site-search" data-search-input type="search" autocomplete="off" placeholder="Search timeline">\n' +
    '        <div class="search-results" data-search-results hidden></div>\n' +
    '      </form>\n' +
    '      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle dark mode">Theme</button>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</header>\n';
}

function renderFooter() {
  return '<footer class="site-footer">\n' +
    '  <div class="container">\n' +
    '    <p>Bible Timeline is a static, offline-capable study site generated from local JSON data.</p>\n' +
    '  </div>\n' +
    '</footer>';
}

function validateUnique(collectionName, records) {
  const seen = new Set();
  records.forEach((record) => {
    if (!record.id) {
      warn(collectionName + " record is missing an id.");
      return;
    }
    if (seen.has(record.id)) {
      warn(collectionName + " contains duplicate id: " + record.id);
    }
    seen.add(record.id);
  });
}

function checkRefs(sourceLabel, ids, targetName, targetMap) {
  (ids || []).forEach((id) => {
    if (!targetMap.has(id)) {
      warn(sourceLabel + " references missing " + targetName + " id: " + id);
    }
  });
}

function validateData() {
  validateUnique("events", data.events);
  validateUnique("people", data.people);
  validateUnique("places", data.places);
  validateUnique("books", data.books);

  data.events.forEach((event) => {
    const label = "event " + event.id;
    if (event.book && !maps.books.has(event.book)) warn(label + " references missing book id: " + event.book);
    if (event.location && event.location.placeId && !maps.places.has(event.location.placeId)) warn(label + " references missing place id: " + event.location.placeId);
    checkRefs(label, event.mainPeople, "person", maps.people);
    checkRefs(label, event.relatedPeople, "person", maps.people);
    checkRefs(label, event.relatedPlaces, "place", maps.places);
    checkRefs(label, event.relatedEvents, "event", maps.events);
    checkRefs(label, [event.prevEvent, event.nextEvent].filter(Boolean), "event", maps.events);
  });

  data.people.forEach((person) => {
    const label = "person " + person.id;
    checkRefs(label, person.parents, "person", maps.people);
    checkRefs(label, person.children, "person", maps.people);
    checkRefs(label, person.spouses, "person", maps.people);
    checkRefs(label, person.events, "event", maps.events);
    checkRefs(label, person.relatedPeople, "person", maps.people);
    checkRefs(label, person.relatedPlaces, "place", maps.places);
    checkRefs(label, person.books, "book", maps.books);
  });

  data.places.forEach((place) => {
    const label = "place " + place.id;
    checkRefs(label, place.events, "event", maps.events);
    checkRefs(label, place.people, "person", maps.people);
    checkRefs(label, place.relatedPlaces, "place", maps.places);
  });

  data.books.forEach((book) => {
    const label = "book " + book.id;
    checkRefs(label, book.majorEvents, "event", maps.events);
    checkRefs(label, book.majorPeople, "person", maps.people);
    checkRefs(label, book.majorPlaces, "place", maps.places);
    checkRefs(label, (book.connections || []).map((connection) => connection.bookId), "book", maps.books);
  });

  data.timeline.forEach((group) => {
    checkRefs("timeline group " + group.era, group.eventIds, "event", maps.events);
  });
}

function sortedEvents(ids) {
  const events = ids ? ids.map((id) => maps.events.get(id)).filter(Boolean) : data.events.slice();
  return events.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

function renderEventCard(event, rootPrefix) {
  const place = event.location && event.location.placeId ? maps.places.get(event.location.placeId) : null;
  return '<article class="timeline-card" data-timeline-entry data-era="' + escapeHtml(event.era) + '">\n' +
    '  <h3><a href="' + escapeHtml(relativeUrl(rootPrefix, "event", event.id)) + '">' + escapeHtml(event.name) + '</a></h3>\n' +
    '  <div class="detail-grid">\n' +
    '    <p><strong>Estimated Date:</strong> ' + escapeHtml(event.date) + '</p>\n' +
    '    <p><strong>Bible Period:</strong> ' + escapeHtml(event.era) + '</p>\n' +
    '    <p><strong>Location:</strong> ' + escapeHtml(event.location ? event.location.name : "None listed") + '</p>\n' +
    '    <p><strong>Key People:</strong> ' + (event.mainPeople || []).map((id) => linkTo(rootPrefix, "person", id)).join(", ") + '</p>\n' +
    '  </div>\n' +
    '  <p><strong>Bible References:</strong> ' + escapeHtml(event.reference) + '</p>\n' +
    '  <p>' + escapeHtml(event.summary) + '</p>\n' +
    '  <p><a href="' + escapeHtml(relativeUrl(rootPrefix, "event", event.id)) + '">Read More &rarr;</a></p>\n' +
    '</article>';
}

function renderTimelinePreview() {
  return '<div class="grid">\n' + sortedEvents().slice(0, 8).map((event) => (
    '<article class="card">\n' +
    '  <span class="eyebrow">' + escapeHtml(event.era) + '</span>\n' +
    '  <h3><a href="events/' + escapeHtml(event.id) + '.html">' + escapeHtml(event.name) + '</a></h3>\n' +
    '  <p><strong>' + escapeHtml(event.date) + '</strong></p>\n' +
    '  <p>' + escapeHtml(event.summary) + '</p>\n' +
    '</article>'
  )).join("\n") + '\n</div>';
}

function renderIndex() {
  const body = '<section class="hero">\n' +
    '  <div class="container">\n' +
    '    <div>\n' +
    '      <span class="eyebrow">Offline Bible Study</span>\n' +
    '      <h1>Bible Timeline</h1>\n' +
    '      <p>Explore biblical events, people, places, and books through a local static website generated from JSON data.</p>\n' +
    '      <p><a class="button primary" href="timeline.html">Open Timeline</a></p>\n' +
    '    </div>\n' +
    '    <div class="hero-search">\n' +
    '      <label for="home-search">Search the seed dataset</label>\n' +
    '      <input id="home-search" data-index-search type="search" autocomplete="off" placeholder="Try Moses, Eden, Genesis">\n' +
    '      <div class="search-results" data-index-search-results hidden></div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</section>\n' +
    '<section class="section" aria-label="Homepage navigation">\n' +
    '  <div class="container">\n' +
    '    <nav class="content-panel" aria-label="Study navigation">\n' +
    '      <ul class="link-list">' +
    ['Timeline', 'People', 'Places', 'Books', 'Maps', 'Kings', 'Prophets', 'Miracles', 'Parables', 'Genealogy'].map((label) => {
      const hrefs = {
        Timeline: 'timeline.html',
        People: '#people',
        Places: '#places',
        Books: '#books',
        Maps: 'timeline.html#maps',
        Kings: 'timeline.html#kings',
        Prophets: 'timeline.html#prophets',
        Miracles: 'timeline.html#miracles',
        Parables: 'timeline.html#parables',
        Genealogy: 'timeline.html#genealogy'
      };
      return '<li><a href="' + hrefs[label] + '">' + escapeHtml(label) + '</a></li>';
    }).join('') +
    '</ul>\n' +
    '    </nav>\n' +
    '  </div>\n' +
    '</section>\n' +
    '<section class="section" id="timeline-preview">\n' +
    '  <div class="container">\n' +
    '    <div class="section-header">\n' +
    '      <h2>Timeline Preview</h2>\n' +
    '      <a href="timeline.html">View full timeline</a>\n' +
    '    </div>\n' +
    '    <!-- BUILD:TIMELINE_PREVIEW -->\n' +
    renderTimelinePreview() + '\n' +
    '    <!-- /BUILD:TIMELINE_PREVIEW -->\n' +
    '  </div>\n' +
    '</section>\n' +
    '<section class="section" id="people">\n' +
    '  <div class="container"><div class="section-header"><h2>People</h2></div>' +
    '<div class="grid">' + data.people.map((person) => '<article class="card"><h3>' + linkTo("", "person", person.id) + '</h3><p>' + escapeHtml(person.summary) + '</p></article>').join("") + '</div></div>\n' +
    '</section>\n' +
    '<section class="section" id="places">\n' +
    '  <div class="container"><div class="section-header"><h2>Places</h2></div>' +
    '<div class="grid">' + data.places.map((place) => '<article class="card"><h3>' + linkTo("", "place", place.id) + '</h3><p>' + escapeHtml(place.significance) + '</p></article>').join("") + '</div></div>\n' +
    '</section>\n' +
    '<section class="section" id="books">\n' +
    '  <div class="container"><div class="section-header"><h2>Books</h2></div>' +
    '<div class="grid">' + data.books.map((book) => '<article class="card"><h3>' + linkTo("", "book", book.id) + '</h3><p>' + escapeHtml(book.timelinePlacement) + '</p></article>').join("") + '</div></div>\n' +
    '</section>\n' +
    '<section class="section" id="maps"><div class="container"><h2>Study Index</h2><div class="grid">' +
    ["Maps", "Kings", "Prophets", "Miracles", "Parables", "Genealogy"].map((label) => '<article class="card"><h3>' + escapeHtml(label) + '</h3><p><a href="timeline.html#' + label.toLowerCase() + '">' + escapeHtml(label) + ' timeline anchor</a></p></article>').join("") +
    '</div></div></section>';

  writeFile("index.html", pageLayout({
    title: "Bible Timeline",
    description: "Offline Bible timeline website generated from local JSON data.",
    rootPrefix: "",
    body
  }));
}

function renderTimeline() {
  const eras = data.timeline.map((group) => group.era);
  const filters = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="eyebrow">Chronological Listing</span><h1>Bible Timeline</h1><p>Filter events by era or text. All data is loaded from generated local JavaScript for file:// support.</p></div>\n' +
    '<div class="filter-panel">\n' +
    '  <label>Era <select data-era-filter><option value="">All eras</option>' + eras.map((era) => '<option value="' + escapeHtml(era) + '">' + escapeHtml(era) + '</option>').join("") + '</select></label>\n' +
    '  <label>Text <input data-timeline-filter type="search" placeholder="Filter by event, person, place, reference"></label>\n' +
    '</div>\n' +
    '<div class="timeline-shell">\n';

  const groups = data.timeline.map((group) => {
    return '<section class="era-group" data-era-group id="' + escapeHtml(group.era.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + '">\n' +
      '<div class="era-marker"><span class="badge">' + escapeHtml(group.dateRange) + '</span><h2>' + escapeHtml(group.era) + '</h2></div>\n' +
      sortedEvents(group.eventIds).map((event) => renderEventCard(event, "")).join("\n") +
      '\n</section>';
  }).join("\n");

  const body = filters + groups + '\n</div></div></section>';
  writeFile("timeline.html", pageLayout({
    title: "Timeline - Bible Timeline",
    description: "Full chronological Bible timeline with client-side filters.",
    rootPrefix: "",
    timelineScript: true,
    body
  }));
}

function renderEventPage(event) {
  const rootPrefix = "../";
  const location = event.location || {};
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">' + escapeHtml(event.era) + '</span><h1>' + escapeHtml(event.name) + '</h1><p>' + escapeHtml(event.reference) + '</p></div>\n' +
    '<section class="content-panel"><h2>Timeline Information</h2>' + metaRows([
      ["Date", escapeHtml(event.date)],
      ["Date Precision", escapeHtml(event.datePrecision)],
      ["Era", escapeHtml(event.era)],
      ["Chronological Order", escapeHtml(event.order)]
    ]) + '</section>\n' +
    '<section class="content-panel"><h2>Location</h2>' + metaRows([
      ["Name", location.placeId ? linkTo(rootPrefix, "place", location.placeId, location.name) : escapeHtml(location.name)],
      ["Modern Country", escapeHtml(location.modernCountry || "uncertain")],
      ["Latitude", escapeHtml(location.lat == null ? "unknown" : location.lat)],
      ["Longitude", escapeHtml(location.lng == null ? "unknown" : location.lng)]
    ]) + '<div class="map-placeholder">Map placeholder</div></section>\n' +
    '<section class="content-panel"><h2>People Involved</h2>' + listLinks(rootPrefix, "person", (event.mainPeople || []).concat(event.relatedPeople || [])) + '</section>\n' +
    '<section class="content-panel"><h2>Bible References</h2><p>' + escapeHtml(event.reference) + '</p>' + textList(event.crossReferences) + '</section>\n' +
    '<section class="content-panel"><h2>Summary</h2><p>' + escapeHtml(event.summary) + '</p>' + paragraphs(event.longDescription) + '</section>\n' +
    '<section class="content-panel"><h2>Historical Background</h2>' + paragraphs(event.historicalNotes) + '</section>\n' +
    '<section class="content-panel"><h2>Timeline Connections</h2><p>' +
      (event.prevEvent ? "&larr; " + linkTo(rootPrefix, "event", event.prevEvent) : "No previous event") +
      " | " +
      (event.nextEvent ? linkTo(rootPrefix, "event", event.nextEvent) + " &rarr;" : "No next event") +
      '</p><h3>Related Events</h3>' + listLinks(rootPrefix, "event", event.relatedEvents) + '</section>\n' +
    '<section class="content-panel"><h2>Related People</h2>' + listLinks(rootPrefix, "person", event.relatedPeople) + '</section>\n' +
    '<section class="content-panel"><h2>Related Locations</h2>' + listLinks(rootPrefix, "place", event.relatedPlaces) + '</section>\n' +
    '</div></section>';

  writeFile("events/" + event.id + ".html", pageLayout({
    title: event.name + " - Bible Timeline",
    rootPrefix,
    body
  }));
}

function renderPersonPage(person) {
  const rootPrefix = "../";
  const events = sortedEvents(person.events);
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Person</span><h1>' + escapeHtml(person.name) + '</h1><p>' + escapeHtml(person.summary) + '</p></div>\n' +
    '<section class="content-panel"><h2>Profile</h2>' + metaRows([
      ["Name Meaning", escapeHtml(person.nameMeaning)],
      ["Birth", escapeHtml(person.birth || "None listed")],
      ["Death", escapeHtml(person.death || "None listed")],
      ["Occupation", escapeHtml(person.occupation || "None listed")],
      ["Roles", escapeHtml((person.roles || []).join(", ") || "None listed")],
      ["Nationality", escapeHtml(person.nationality || "None listed")],
      ["Tribe", escapeHtml(person.tribe || "None listed")],
      ["Kingdom", escapeHtml(person.kingdom || "None listed")]
    ]) + '</section>\n' +
    '<section class="content-panel"><h2>Family</h2><h3>Parents</h3>' + listLinks(rootPrefix, "person", person.parents) + '<h3>Spouses</h3>' + listLinks(rootPrefix, "person", person.spouses) + '<h3>Children</h3>' + listLinks(rootPrefix, "person", person.children) + '</section>\n' +
    '<section class="content-panel"><h2>Life Events</h2>' + (events.length ? '<ul>' + events.map((event) => '<li>' + linkTo(rootPrefix, "event", event.id) + ' - ' + escapeHtml(event.date) + '</li>').join("") + '</ul>' : '<p>None listed.</p>') + '</section>\n' +
    '<section class="content-panel"><h2>References</h2>' + textList(person.references) + '</section>\n' +
    '<section class="content-panel"><h2>Related People</h2>' + listLinks(rootPrefix, "person", person.relatedPeople) + '</section>\n' +
    '<section class="content-panel"><h2>Related Places</h2>' + listLinks(rootPrefix, "place", person.relatedPlaces) + '</section>\n' +
    '<section class="content-panel"><h2>Books Appeared In</h2>' + listLinks(rootPrefix, "book", person.books) + '</section>\n' +
    '</div></section>';

  writeFile("people/" + person.id + ".html", pageLayout({
    title: person.name + " - Bible Timeline",
    rootPrefix,
    body
  }));
}

function renderPlacePage(place) {
  const rootPrefix = "../";
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Place</span><h1>' + escapeHtml(place.name) + '</h1><p>' + escapeHtml(place.significance) + '</p></div>\n' +
    '<section class="content-panel"><h2>Location Details</h2>' + metaRows([
      ["Modern Country", escapeHtml(place.modernCountry || "None listed")],
      ["Ancient Region", escapeHtml(place.ancientRegion || "None listed")],
      ["Latitude", escapeHtml(place.lat == null ? "unknown" : place.lat)],
      ["Longitude", escapeHtml(place.lng == null ? "unknown" : place.lng)]
    ]) + '<div class="map-placeholder">Map placeholder</div></section>\n' +
    '<section class="content-panel"><h2>Significance</h2><p>' + escapeHtml(place.significance) + '</p></section>\n' +
    '<section class="content-panel"><h2>Events Here</h2>' + listLinks(rootPrefix, "event", place.events) + '</section>\n' +
    '<section class="content-panel"><h2>People Associated</h2>' + listLinks(rootPrefix, "person", place.people) + '</section>\n' +
    '<section class="content-panel"><h2>References</h2>' + textList(place.references) + '</section>\n' +
    '<section class="content-panel"><h2>Related Places</h2>' + listLinks(rootPrefix, "place", place.relatedPlaces) + '</section>\n' +
    '<section class="content-panel"><h2>Photo</h2><div class="photo-placeholder">Photo placeholder</div></section>\n' +
    '</div></section>';

  writeFile("locations/" + place.id + ".html", pageLayout({
    title: place.name + " - Bible Timeline",
    rootPrefix,
    body
  }));
}

function renderBookPage(book) {
  const rootPrefix = "../";
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">' + escapeHtml(book.testament) + '</span><h1>' + escapeHtml(book.name) + '</h1><p>' + escapeHtml(book.timelinePlacement) + '</p></div>\n' +
    '<section class="content-panel"><h2>Book Details</h2>' + metaRows([
      ["Author", escapeHtml(book.author)],
      ["Date", escapeHtml(book.date)],
      ["Canon Order", escapeHtml(book.orderInCanon)],
      ["Period", escapeHtml(book.period)],
      ["Timeline Placement", escapeHtml(book.timelinePlacement)]
    ]) + '</section>\n' +
    '<section class="content-panel"><h2>Major Events</h2>' + listLinks(rootPrefix, "event", book.majorEvents) + '</section>\n' +
    '<section class="content-panel"><h2>Major People</h2>' + listLinks(rootPrefix, "person", book.majorPeople) + '</section>\n' +
    '<section class="content-panel"><h2>Major Places</h2>' + listLinks(rootPrefix, "place", book.majorPlaces) + '</section>\n' +
    '<section class="content-panel"><h2>Outline</h2>' + textList(book.outline) + '</section>\n' +
    '<section class="content-panel"><h2>Key Verses</h2>' + textList(book.keyVerses) + '</section>\n' +
    '<section class="content-panel"><h2>Connections</h2>' + ((book.connections || []).length ? '<ul>' + book.connections.map((connection) => '<li>' + linkTo(rootPrefix, "book", connection.bookId) + ' - ' + escapeHtml(connection.note) + '</li>').join("") + '</ul>' : '<p>None listed.</p>') + '</section>\n' +
    '</div></section>';

  writeFile("books/" + book.id + ".html", pageLayout({
    title: book.name + " - Bible Timeline",
    rootPrefix,
    body
  }));
}

function emitDataJs() {
  const compact = {
    events: sortedEvents().map((event) => ({
      id: event.id,
      type: "event",
      name: event.name,
      date: event.date,
      era: event.era,
      reference: event.reference,
      keywords: event.keywords || [],
      summary: event.summary,
      url: slugPath("event", event.id)
    })),
    people: data.people.map((person) => ({
      id: person.id,
      type: "person",
      name: person.name,
      date: person.birth || person.death || "",
      era: "",
      reference: (person.references || []).join("; "),
      keywords: (person.roles || []).concat(person.nationality || []).filter(Boolean),
      summary: person.summary,
      url: slugPath("person", person.id)
    })),
    places: data.places.map((place) => ({
      id: place.id,
      type: "place",
      name: place.name,
      date: "",
      era: place.ancientRegion || "",
      reference: (place.references || []).join("; "),
      keywords: [place.modernCountry, place.ancientRegion].filter(Boolean),
      summary: place.significance,
      url: slugPath("place", place.id)
    })),
    books: data.books.map((book) => ({
      id: book.id,
      type: "book",
      name: book.name,
      date: book.date,
      era: book.period,
      reference: (book.keyVerses || []).join("; "),
      keywords: [book.testament, book.author, book.timelinePlacement].filter(Boolean),
      summary: book.timelinePlacement,
      url: slugPath("book", book.id)
    }))
  };

  writeFile("js/data.js", "window.BIBLE_DATA = " + JSON.stringify(compact) + ";\n");
}

function build() {
  ["events", "people", "locations", "books", "js"].forEach(ensureDir);
  validateData();
  renderIndex();
  renderTimeline();
  data.events.forEach(renderEventPage);
  data.people.forEach(renderPersonPage);
  data.places.forEach(renderPlacePage);
  data.books.forEach(renderBookPage);
  emitDataJs();

  console.log("Generated " + data.events.length + " event pages.");
  console.log("Generated " + data.people.length + " person pages.");
  console.log("Generated " + data.places.length + " location pages.");
  console.log("Generated " + data.books.length + " book pages.");
  console.log("Generated timeline.html, index.html, and js/data.js.");

  if (warnings > 0) {
    console.log("Completed with " + warnings + " warning(s).");
  } else {
    console.log("Completed with no warnings.");
  }
}

build();
