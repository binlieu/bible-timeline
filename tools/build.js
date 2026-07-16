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
  timeline: readJson("timeline.json"),
  categories: readJson("categories.json"),
  basemap: readJson("geo/basemap.json")
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

const idAliases = {
  event: {
    babel: "tower-of-babel",
    "isaac-born": "birth-of-isaac",
    "jacob-esau": "jacob-and-esau-born",
    "joseph-egypt": "joseph-sold-into-slavery",
    "exodus-egypt": "first-passover"
  }
};

function canonicalId(type, id) {
  if (!id) return id;
  return idAliases[type] && idAliases[type][id] ? idAliases[type][id] : id;
}

function lookup(type, id) {
  const key = typeToCollection[type];
  return maps[key] ? maps[key].get(canonicalId(type, id)) : null;
}

function linkTo(rootPrefix, type, id, fallback) {
  const item = lookup(type, id);
  const label = item ? item.name : fallback || id;
  if (!item) return escapeHtml(label);
  return '<a href="' + escapeHtml(relativeUrl(rootPrefix, type, canonicalId(type, id))) + '">' + escapeHtml(label) + "</a>";
}

function linkToWithLabel(rootPrefix, type, id, label) {
  const item = lookup(type, id);
  if (!item) return escapeHtml(label || id);
  return '<a href="' + escapeHtml(relativeUrl(rootPrefix, type, canonicalId(type, id))) + '">' + escapeHtml(label || item.name) + "</a>";
}

function listLinks(rootPrefix, type, ids) {
  if (!ids || !ids.length) return "<p>None listed.</p>";
  return '<ul class="link-list">' + ids.map((id) => "<li>" + linkTo(rootPrefix, type, id) + "</li>").join("") + "</ul>";
}

function textList(items) {
  if (!items || !items.length) return "<p>None listed.</p>";
  return "<ul>" + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function firstSentence(text) {
  if (!text) return "None listed.";
  const match = String(text).match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : String(text).trim();
}

function hasRole(person, roles) {
  const wanted = new Set(roles.map((role) => role.toLowerCase()));
  return (person.roles || []).some((role) => wanted.has(String(role).toLowerCase()));
}

function sortByName(items) {
  return items.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function firstEventOrder(person) {
  const orders = (person.events || [])
    .map((id) => maps.events.get(canonicalId("event", id)))
    .filter(Boolean)
    .map((event) => event.order);
  return orders.length ? Math.min.apply(null, orders) : null;
}

function compareByTimelineThenName(a, b) {
  const aOrder = firstEventOrder(a);
  const bOrder = firstEventOrder(b);
  if (aOrder != null && bOrder != null && aOrder !== bOrder) return aOrder - bOrder;
  if (aOrder != null && bOrder == null) return -1;
  if (aOrder == null && bOrder != null) return 1;
  return a.name.localeCompare(b.name);
}

function paragraphs(text) {
  if (!text) return "<p>None listed.</p>";
  return String(text).split(/\n\s*\n/).map((part) => "<p>" + escapeHtml(part) + "</p>").join("");
}

function hasCoords(item) {
  return item && item.lat != null && item.lng != null;
}

function formatCoord(value) {
  return Number(value).toFixed(4).replace(/\.?0+$/, "");
}

function renderMiniMap(lat, lng, label, href) {
  if (lat == null || lng == null) {
    return '<p class="map-uncertain">Location uncertain; no coordinates available.</p>';
  }

  return '<div class="map" data-map data-lat="' + escapeHtml(lat) + '" data-lng="' + escapeHtml(lng) + '" data-label="' + escapeHtml(label) + '" data-href="' + escapeHtml(href || "") + '">' +
    '<p class="map-fallback">Coordinates: ' + escapeHtml(formatCoord(lat)) + ', ' + escapeHtml(formatCoord(lng)) + '</p>' +
    '</div>';
}

function metaRows(rows) {
  return '<dl class="meta-list">' + rows.map(([label, value]) => (
    "<dt>" + escapeHtml(label) + "</dt><dd>" + (value || "None listed.") + "</dd>"
  )).join("") + "</dl>";
}

function pageLayout(options) {
  const rootPrefix = options.rootPrefix || "";
  let scripts = options.timelineScript
    ? '<script src="' + rootPrefix + 'js/data.js"></script>\n<script src="' + rootPrefix + 'js/search.js"></script>\n<script src="' + rootPrefix + 'js/timeline.js"></script>'
    : '<script src="' + rootPrefix + 'js/data.js"></script>\n<script src="' + rootPrefix + 'js/search.js"></script>';
  if (options.mapScript) {
    scripts += '\n<script src="' + rootPrefix + 'js/map-data.js"></script>\n<script src="' + rootPrefix + 'js/map.js"></script>';
  }

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
    '        <li><a href="' + rootPrefix + 'people.html">People</a></li>\n' +
    '        <li><a href="' + rootPrefix + 'locations.html">Places</a></li>\n' +
    '        <li><a href="' + rootPrefix + 'books.html">Books</a></li>\n' +
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
    const canonical = canonicalId(targetName, id);
    if (!targetMap.has(canonical)) {
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

  (data.categories.miracles || []).forEach((miracle) => {
    if (!maps.events.has(canonicalId("event", miracle.eventId))) {
      warn("miracle category references missing event id: " + miracle.eventId);
    }
  });

  (data.categories.parables || []).forEach((parable) => {
    if (parable.eventId && !maps.events.has(canonicalId("event", parable.eventId))) {
      warn("parable category references missing event id: " + parable.eventId);
    }
  });
}

function sortedEvents(ids) {
  const events = ids ? ids.map((id) => maps.events.get(canonicalId("event", id))).filter(Boolean) : data.events.slice();
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
        People: 'people.html',
        Places: 'locations.html',
        Books: 'books.html',
        Maps: 'maps.html',
        Kings: 'kings.html',
        Prophets: 'prophets.html',
        Miracles: 'miracles.html',
        Parables: 'parables.html',
        Genealogy: 'genealogy.html'
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
    ["Maps", "Kings", "Prophets", "Miracles", "Parables", "Genealogy"].map((label) => '<article class="card"><h3>' + escapeHtml(label) + '</h3><p><a href="' + label.toLowerCase() + '.html">Browse ' + escapeHtml(label) + '</a></p></article>').join("") +
    '</div></div></section>';

  writeFile("index.html", pageLayout({
    title: "Bible Timeline",
    description: "Offline Bible timeline website generated from local JSON data.",
    rootPrefix: "",
    body
  }));
}

function renderBrowsePage(fileName, title, description, bodyContent) {
  const hasFullMap = bodyContent.indexOf('id="full-map"') !== -1;
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Browse</span><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p></div>\n' +
    bodyContent +
    '</div></section>';

  writeFile(fileName, pageLayout({
    title: title + " - Bible Timeline",
    description,
    rootPrefix: "",
    mapScript: hasFullMap,
    body
  }));
}

function renderPersonList(items) {
  if (!items.length) return "<p>None listed.</p>";
  return '<div class="grid">' + sortByName(items).map((person) => (
    '<article class="card"><h3>' + linkTo("", "person", person.id) + '</h3><p>' + escapeHtml(firstSentence(person.summary)) + '</p></article>'
  )).join("") + '</div>';
}

function renderPeopleBrowse() {
  const sections = [
    ["Patriarchs & Matriarchs", ["patriarch", "matriarch"]],
    ["Prophets", ["prophet", "prophetess"]],
    ["Judges", ["judge"]],
    ["Kings & Queens", ["king", "queen", "queen mother"]],
    ["Apostles", ["apostle"]],
    ["Priests & Scribes", ["priest", "high-priest", "scribe"]]
  ];
  const assigned = new Set();
  const parts = sections.map(([label, roles]) => {
    const people = data.people.filter((person) => !assigned.has(person.id) && hasRole(person, roles));
    people.forEach((person) => assigned.add(person.id));
    return '<section class="content-panel"><h2>' + escapeHtml(label) + '</h2>' + renderPersonList(people) + '</section>\n';
  });
  const others = data.people.filter((person) => !assigned.has(person.id));
  parts.push('<section class="content-panel"><h2>Others</h2>' + renderPersonList(others) + '</section>\n');
  renderBrowsePage("people.html", "People", "All people in the Bible timeline dataset, grouped by primary role.", parts.join(""));
}

function renderLocationsBrowse() {
  const rows = sortByName(data.places).map((place) => (
    '<tr><td>' + linkTo("", "place", place.id) + '</td><td>' + escapeHtml(place.modernCountry || "None listed") + '</td><td>' +
    escapeHtml(place.lat == null || place.lng == null ? "unknown" : place.lat + ", " + place.lng) + '</td></tr>'
  )).join("");
  renderBrowsePage("locations.html", "Places", "All places in the Bible timeline dataset, sorted alphabetically.",
    '<section class="content-panel"><h2>All Places</h2><div class="table-wrap"><table class="browse-table"><thead><tr><th>Name</th><th>Modern Country</th><th>Coordinates</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>\n'
  );
}

function renderBooksBrowse() {
  const section = (label, testament) => {
    const books = data.books.filter((book) => book.testament === testament).sort((a, b) => a.orderInCanon - b.orderInCanon);
    return '<section class="content-panel"><h2>' + escapeHtml(label) + '</h2><div class="table-wrap"><table class="browse-table"><thead><tr><th>Book</th><th>Author</th><th>Timeline Placement</th></tr></thead><tbody>' +
      books.map((book) => '<tr><td>' + linkTo("", "book", book.id) + '</td><td>' + escapeHtml(book.author) + '</td><td>' + escapeHtml(book.timelinePlacement) + '</td></tr>').join("") +
      '</tbody></table></div></section>\n';
  };
  renderBrowsePage("books.html", "Books", "Books grouped by testament in canon order.", section("Old Testament", "OT") + section("New Testament", "NT"));
}

function renderKingsBrowse() {
  const personRow = (person) => '<tr><td>' + linkTo("", "person", person.id) + '</td><td>' + escapeHtml(person.kingdom || person.nationality || "None listed") + '</td></tr>';
  const section = (label, people) => '<section class="content-panel"><h2>' + escapeHtml(label) + '</h2><div class="table-wrap"><table class="browse-table"><thead><tr><th>Name</th><th>Kingdom / Nationality</th></tr></thead><tbody>' + people.sort(compareByTimelineThenName).map(personRow).join("") + '</tbody></table></div></section>\n';
  renderBrowsePage("kings.html", "Kings & Queens", "Royal figures ordered by first timeline appearance when available.",
    section("Kings", data.people.filter((person) => hasRole(person, ["king"]))) +
    section("Queens", data.people.filter((person) => hasRole(person, ["queen", "queen mother"])))
  );
}

function eventEraSummary(person) {
  const events = sortedEvents(person.events);
  const eras = [];
  events.forEach((event) => {
    if (eras.indexOf(event.era) === -1) eras.push(event.era);
  });
  return eras.length ? eras.join(", ") : "None listed";
}

function renderRoleBrowse(fileName, title, roleNames, description) {
  const people = data.people.filter((person) => hasRole(person, roleNames)).sort(compareByTimelineThenName);
  const rows = people.map((person) => (
    '<tr><td>' + linkTo("", "person", person.id) + '</td><td>' + escapeHtml(eventEraSummary(person)) + '</td><td>' + escapeHtml((person.events || []).length) + '</td></tr>'
  )).join("");
  renderBrowsePage(fileName, title, description,
    '<section class="content-panel"><h2>' + escapeHtml(title) + '</h2><div class="table-wrap"><table class="browse-table"><thead><tr><th>Name</th><th>Era of Ministry</th><th>Linked Events</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>\n'
  );
}

function renderMiraclesBrowse() {
  const rows = (data.categories.miracles || []).map((miracle) => {
    const event = lookup("event", miracle.eventId);
    return '<tr><td>' + linkTo("", "event", miracle.eventId) + '</td><td>' + escapeHtml(event ? event.reference : "") + '</td><td>' + escapeHtml(miracle.note || "") + '</td></tr>';
  }).join("");
  renderBrowsePage("miracles.html", "Miracles", "Events whose core action is miraculous or directly supernatural.",
    '<section class="content-panel"><h2>Miraculous Events</h2><div class="table-wrap"><table class="browse-table"><thead><tr><th>Event</th><th>Reference</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>\n'
  );
}

function gospelBookFromReference(reference) {
  const firstWord = String(reference || "").split(/\s+/)[0].toLowerCase();
  if (["matthew", "mark", "luke", "john"].indexOf(firstWord) !== -1) return firstWord;
  return "matthew";
}

function renderParablesBrowse() {
  const rows = (data.categories.parables || []).map((parable) => {
    const target = parable.eventId ? linkToWithLabel("", "event", parable.eventId, parable.reference) : linkToWithLabel("", "book", gospelBookFromReference(parable.reference), parable.reference);
    return '<tr><td>' + escapeHtml(parable.name) + '</td><td>' + target + '</td></tr>';
  }).join("");
  renderBrowsePage("parables.html", "Parables", "Major parables with references and event links where the dataset has a matching event page.",
    '<section class="content-panel"><h2>Major Parables</h2><div class="table-wrap"><table class="browse-table"><thead><tr><th>Parable</th><th>Reference</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>\n'
  );
}

function genealogyNode(personId, note) {
  const person = maps.people.get(personId);
  const label = person ? linkTo("", "person", person.id) : escapeHtml(personId);
  return '<li>' + label + (note ? ' <span class="muted">(' + escapeHtml(note) + ')</span>' : '');
}

function renderGenealogyBrowse() {
  const line = [
    ["adam", ""],
    ["seth", ""],
    [null, "...generations per Genesis 5"],
    ["noah", ""],
    ["shem", ""],
    [null, "...generations per Genesis 11"],
    ["abraham", ""],
    ["isaac", ""],
    ["jacob", ""],
    ["judah", ""],
    [null, "...generations per Ruth 4:18-22"],
    ["boaz", ""],
    ["david", ""],
    ["solomon", ""],
    [null, "...generations per Matthew 1"],
    ["jesus", "Messiah"]
  ];
  let nested = "";
  line.forEach(([id, note]) => {
    if (id) {
      nested += genealogyNode(id, note) + "<ul>";
    } else {
      nested += '<li><span class="muted">' + escapeHtml(note) + '</span><ul>';
    }
  });
  nested += "</ul></li>".repeat(line.length);

  renderBrowsePage("genealogy.html", "Genealogy", "Messianic line summary using available person parent/child records, with gaps labeled from biblical genealogies.",
    '<section class="content-panel"><h2>Messianic Line</h2><p>Line summarized from Adam to Jesus with Matthew 1 and Luke 3 in view. Differences between Matthew and Luke are noted as a matter of scholarly discussion.</p><ul class="genealogy-list">' + nested + '</ul></section>\n'
  );
}

function renderMapsBrowse() {
  const withCoordinates = sortByName(data.places.filter((place) => place.lat != null && place.lng != null));
  const uncertain = sortByName(data.places.filter((place) => place.lat == null || place.lng == null));
  const rows = withCoordinates.map((place) => (
    '<tr><td>' + linkTo("", "place", place.id) + '</td><td>' + escapeHtml(place.modernCountry || "None listed") + '</td><td>' + escapeHtml(place.lat) + '</td><td>' + escapeHtml(place.lng) + '</td></tr>'
  )).join("");
  renderBrowsePage("maps.html", "Maps", "Coordinate index for places in the Bible timeline dataset.",
    '<section class="content-panel"><h2>Mapped Places</h2><div id="full-map"><p class="map-fallback">Map requires JavaScript. The coordinate table is listed below.</p></div><p class="map-caption">Basemap: Natural Earth (public domain). Locations with uncertain identification are listed below without markers.</p><div class="table-wrap"><table class="browse-table"><thead><tr><th>Name</th><th>Modern Country</th><th>Lat</th><th>Lng</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>\n' +
    '<section class="content-panel"><h2>Location Uncertain</h2>' + listLinks("", "place", uncertain.map((place) => place.id)) + '</section>\n'
  );
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
  const place = location.placeId ? maps.places.get(location.placeId) : null;
  const mapLat = location.lat != null ? location.lat : (hasCoords(place) ? place.lat : null);
  const mapLng = location.lng != null ? location.lng : (hasCoords(place) ? place.lng : null);
  const mapLabel = place ? place.name : (location.name || "Event location");
  const mapHref = place ? relativeUrl(rootPrefix, "place", place.id) : "";
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
    ]) + renderMiniMap(mapLat, mapLng, mapLabel, mapHref) + '</section>\n' +
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
    mapScript: mapLat != null && mapLng != null,
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
  const mapMarkup = renderMiniMap(place.lat, place.lng, place.name, relativeUrl(rootPrefix, "place", place.id));
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Place</span><h1>' + escapeHtml(place.name) + '</h1><p>' + escapeHtml(place.significance) + '</p></div>\n' +
    '<section class="content-panel"><h2>Location Details</h2>' + metaRows([
      ["Modern Country", escapeHtml(place.modernCountry || "None listed")],
      ["Ancient Region", escapeHtml(place.ancientRegion || "None listed")],
      ["Latitude", escapeHtml(place.lat == null ? "unknown" : place.lat)],
      ["Longitude", escapeHtml(place.lng == null ? "unknown" : place.lng)]
    ]) + mapMarkup + '</section>\n' +
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
    mapScript: hasCoords(place),
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

function emitMapDataJs() {
  const mapData = {
    bbox: data.basemap.bbox,
    land: data.basemap.land || [],
    lakes: data.basemap.lakes || [],
    rivers: data.basemap.rivers || [],
    places: sortByName(data.places).filter(hasCoords).map((place) => ({
      id: place.id,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      url: slugPath("place", place.id)
    }))
  };

  writeFile("js/map-data.js", "window.BIBLE_MAP = " + JSON.stringify(mapData) + ";\n");
}

function pruneOrphanPages() {
  const dirToIds = {
    events: new Set(data.events.map((item) => item.id)),
    people: new Set(data.people.map((item) => item.id)),
    locations: new Set(data.places.map((item) => item.id)),
    books: new Set(data.books.map((item) => item.id))
  };
  Object.keys(dirToIds).forEach((dir) => {
    const dirPath = path.join(rootDir, dir);
    fs.readdirSync(dirPath).forEach((file) => {
      if (!file.endsWith(".html")) return;
      const id = file.slice(0, -".html".length);
      if (!dirToIds[dir].has(id)) {
        fs.unlinkSync(path.join(dirPath, file));
        console.log("Pruned orphan page: " + dir + "/" + file);
      }
    });
  });
}

function build() {
  ["events", "people", "locations", "books", "js"].forEach(ensureDir);
  validateData();
  pruneOrphanPages();
  renderIndex();
  renderTimeline();
  renderPeopleBrowse();
  renderLocationsBrowse();
  renderBooksBrowse();
  renderKingsBrowse();
  renderRoleBrowse("prophets.html", "Prophets", ["prophet", "prophetess"], "Prophets and prophetesses with ministry eras derived from linked timeline events.");
  renderRoleBrowse("judges.html", "Judges", ["judge"], "Judges with eras derived from linked timeline events.");
  renderRoleBrowse("apostles.html", "Apostles", ["apostle"], "Apostles with eras derived from linked timeline events.");
  renderMiraclesBrowse();
  renderParablesBrowse();
  renderGenealogyBrowse();
  renderMapsBrowse();
  data.events.forEach(renderEventPage);
  data.people.forEach(renderPersonPage);
  data.places.forEach(renderPlacePage);
  data.books.forEach(renderBookPage);
  emitDataJs();
  emitMapDataJs();

  console.log("Generated " + data.events.length + " event pages.");
  console.log("Generated " + data.people.length + " person pages.");
  console.log("Generated " + data.places.length + " location pages.");
  console.log("Generated " + data.books.length + " book pages.");
  console.log("Generated timeline.html, index.html, browse pages, js/data.js, and js/map-data.js.");

  if (warnings > 0) {
    console.log("Completed with " + warnings + " warning(s).");
  } else {
    console.log("Completed with no warnings.");
  }
}

build();
