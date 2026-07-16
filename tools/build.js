const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const strict = process.argv.includes("--strict");

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8"));
}

const data = {
  events: readJson("events.json"),
  people: readJson("people.json"),
  places: readJson("places.json"),
  journeys: readJson("journeys.json"),
  books: readJson("books.json"),
  nations: readJson("nations.json"),
  prophecies: readJson("prophecies.json"),
  themes: readJson("themes.json"),
  connections: readJson("connections.json"),
  timeline: readJson("timeline.json"),
  categories: readJson("categories.json"),
  reigns: readJson("reigns.json"),
  basemap: readJson("geo/basemap.json")
};

const maps = {
  events: new Map(data.events.map((item) => [item.id, item])),
  people: new Map(data.people.map((item) => [item.id, item])),
  places: new Map(data.places.map((item) => [item.id, item])),
  journeys: new Map(data.journeys.map((item) => [item.id, item])),
  books: new Map(data.books.map((item) => [item.id, item])),
  nations: new Map(data.nations.map((item) => [item.id, item])),
  prophecies: new Map(data.prophecies.map((item) => [item.id, item])),
  themes: new Map(data.themes.map((item) => [item.id, item]))
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

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// --- Bible reference -> bible.com (KJV) linker -------------------------------
const BIBLE_VERSION_ID = 1;
const BIBLE_VERSION = "KJV";
const USFM = {
  "Genesis":"GEN","Exodus":"EXO","Leviticus":"LEV","Numbers":"NUM","Deuteronomy":"DEU",
  "Joshua":"JOS","Judges":"JDG","Ruth":"RUT","1 Samuel":"1SA","2 Samuel":"2SA","1 Kings":"1KI","2 Kings":"2KI",
  "1 Chronicles":"1CH","2 Chronicles":"2CH","Ezra":"EZR","Nehemiah":"NEH","Esther":"EST","Job":"JOB",
  "Psalms":"PSA","Psalm":"PSA","Proverbs":"PRO","Ecclesiastes":"ECC","Song of Solomon":"SNG","Song of Songs":"SNG",
  "Isaiah":"ISA","Jeremiah":"JER","Lamentations":"LAM","Ezekiel":"EZK","Daniel":"DAN","Hosea":"HOS","Joel":"JOL",
  "Amos":"AMO","Obadiah":"OBA","Jonah":"JON","Micah":"MIC","Nahum":"NAM","Habakkuk":"HAB","Zephaniah":"ZEP",
  "Haggai":"HAG","Zechariah":"ZEC","Malachi":"MAL","Matthew":"MAT","Mark":"MRK","Luke":"LUK","John":"JHN",
  "Acts":"ACT","Romans":"ROM","1 Corinthians":"1CO","2 Corinthians":"2CO","Galatians":"GAL","Ephesians":"EPH",
  "Philippians":"PHP","Colossians":"COL","1 Thessalonians":"1TH","2 Thessalonians":"2TH","1 Timothy":"1TI",
  "2 Timothy":"2TI","Titus":"TIT","Philemon":"PHM","Hebrews":"HEB","James":"JAS","1 Peter":"1PE","2 Peter":"2PE",
  "1 John":"1JN","2 John":"2JN","3 John":"3JN","Jude":"JUD","Revelation":"REV","Revelations":"REV"
};
const CANON_BOOK_NAMES = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel",
  "Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
  "Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];
const CANON_USFM = CANON_BOOK_NAMES.map((bookName) => USFM[bookName]);
const USFM_ORDER = new Map(CANON_USFM.map((usfm, index) => [usfm, index]));
const BOOK_NAMES = Object.keys(USFM).sort((a, b) => b.length - a.length);
function refEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const BOOK_RE = new RegExp("\\b(" + BOOK_NAMES.map(refEsc).join("|") + ")\\b");
const SPEC_RE = /\d+(?::\d+)?(?:\s*[-–]\s*\d+(?::\d+)?)?(?:\s*,\s*\d+(?::\d+)?(?:\s*[-–]\s*\d+(?::\d+)?)?)*/;
let availableKjvBooks = new Set();

function refUrl(usfm, spec) {
  const m = /^(\d+)(?::(\d+))?/.exec(spec.replace(/\s+/g, ""));
  if (!m) return null;
  return "https://www.bible.com/bible/" + BIBLE_VERSION_ID + "/" + usfm + "." + m[1] + (m[2] ? "." + m[2] : "") + "." + BIBLE_VERSION;
}

function normalizeRefSpec(spec) {
  return String(spec || "").replace(/[–—]/g, "-").replace(/\s+/g, "");
}

function parseRefPoint(raw, context) {
  const point = String(raw || "").trim();
  if (!/^\d+(?::\d+)?$/.test(point)) return null;
  if (point.indexOf(":") !== -1) {
    const parts = point.split(":");
    return { chapter: Number(parts[0]), verse: Number(parts[1]), verseMode: true };
  }
  const value = Number(point);
  if (context && context.verseMode && context.chapter) {
    return { chapter: context.chapter, verse: value, verseMode: true };
  }
  return { chapter: value, verse: null, verseMode: false };
}

function parseRefRange(raw, context) {
  const parts = String(raw || "").split("-");
  const start = parseRefPoint(parts[0], context);
  if (!start) return null;
  let end = null;
  if (parts.length > 1) {
    end = parseRefPoint(parts[1], { chapter: start.chapter, verseMode: start.verse != null });
  }
  if (!end) {
    end = { chapter: start.chapter, verse: start.verse, verseMode: start.verse != null };
  }
  if (start.verse != null && end.verse == null) {
    end = { chapter: start.chapter, verse: end.chapter, verseMode: true };
  }
  return {
    startCh: start.chapter,
    startV: start.verse == null ? 1 : start.verse,
    endCh: end.chapter,
    endV: end.verse == null ? "" : end.verse,
    verseMode: start.verse != null || end.verse != null
  };
}

function parseRefSpan(spec) {
  const normalized = normalizeRefSpec(spec);
  if (!normalized) return null;
  const parts = normalized.split(",");
  const ranges = [];
  let context = null;
  parts.forEach((part) => {
    const range = parseRefRange(part, context);
    if (!range) return;
    ranges.push(range);
    context = {
      chapter: range.endCh,
      verseMode: range.verseMode
    };
  });
  if (!ranges.length) return null;
  return {
    startCh: ranges[0].startCh,
    startV: ranges[0].startV,
    endCh: ranges[ranges.length - 1].endCh,
    endV: ranges[ranges.length - 1].endV,
    ranges
  };
}

function scriptureControl(usfm, spec, url) {
  if (!availableKjvBooks.has(usfm)) return "";
  const span = parseRefSpan(spec);
  if (!span || !url) return "";
  const id = "scripture-" + (++scriptureId);
  const attrs = [
    'id="' + id + '"',
    'class="scripture-body"',
    "hidden",
    'data-book="' + escapeHtml(usfm) + '"',
    'data-start-ch="' + escapeHtml(span.startCh) + '"',
    'data-start-v="' + escapeHtml(span.startV) + '"',
    'data-end-ch="' + escapeHtml(span.endCh) + '"',
    'data-end-v="' + escapeHtml(span.endV) + '"',
    'data-bible-url="' + escapeHtml(url) + '"',
    'data-ranges="' + escapeHtml(JSON.stringify(span.ranges)) + '"'
  ].join(" ");
  return ' <button class="scripture-toggle" type="button" aria-expanded="false" aria-controls="' + id + '">show text</button>' +
    '<div ' + attrs + '></div>';
}

let scriptureId = 0;

function refAnchor(url, text) {
  return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="ref-link">' + escapeHtml(text) + "</a>";
}
function linkifySegment(segment, currentBook) {
  const bookMatch = BOOK_RE.exec(segment);
  let usfm = currentBook;
  if (bookMatch) usfm = USFM[bookMatch[1]];
  if (!usfm) return { html: escapeHtml(segment), book: currentBook };
  const region = segment.slice(bookMatch ? bookMatch.index + bookMatch[1].length : 0);
  const specMatch = SPEC_RE.exec(region);
  let linkStart, linkEnd, display, url, spec = "";
  if (bookMatch && specMatch && region.slice(0, specMatch.index).trim() === "") {
    linkStart = bookMatch.index;
    linkEnd = bookMatch.index + bookMatch[1].length + specMatch.index + specMatch[0].length;
    display = segment.slice(linkStart, linkEnd);
    spec = specMatch[0];
    url = refUrl(usfm, spec);
  } else if (bookMatch) {
    linkStart = bookMatch.index;
    linkEnd = bookMatch.index + bookMatch[1].length;
    display = segment.slice(linkStart, linkEnd);
    url = "https://www.bible.com/bible/" + BIBLE_VERSION_ID + "/" + usfm + ".1." + BIBLE_VERSION;
  } else {
    const m = SPEC_RE.exec(segment);
    if (!m) return { html: escapeHtml(segment), book: currentBook };
    linkStart = m.index; linkEnd = m.index + m[0].length;
    display = segment.slice(linkStart, linkEnd);
    spec = m[0];
    url = refUrl(usfm, spec);
  }
  if (!url) return { html: escapeHtml(segment), book: usfm };
  return { html: escapeHtml(segment.slice(0, linkStart)) + refAnchor(url, display) + scriptureControl(usfm, spec, url) + escapeHtml(segment.slice(linkEnd)), book: usfm };
}
// Returns SAFE HTML (escapes internally). Inject RAW -- never wrap in escapeHtml().
function linkifyReference(refString) {
  if (!refString || typeof refString !== "string") return escapeHtml(refString || "");
  const parts = refString.split(";");
  let currentBook = null; const out = [];
  for (let i = 0; i < parts.length; i++) { const r = linkifySegment(parts[i], currentBook); currentBook = r.book; out.push(r.html); }
  return out.join(";");
}

function slugPath(type, id) {
  if (type === "event") return "events/" + id + ".html";
  if (type === "person") return "people/" + id + ".html";
  if (type === "place") return "locations/" + id + ".html";
  if (type === "journey") return "journeys/" + id + ".html";
  if (type === "book") return "books/" + id + ".html";
  if (type === "nation") return "nations/" + id + ".html";
  if (type === "prophecy") return "prophecies/" + id + ".html";
  if (type === "theme") return "themes/" + id + ".html";
  return "#";
}

function relativeUrl(rootPrefix, type, id) {
  return rootPrefix + slugPath(type, id);
}

const typeToCollection = {
  event: "events",
  person: "people",
  place: "places",
  journey: "journeys",
  book: "books",
  nation: "nations",
  prophecy: "prophecies",
  theme: "themes"
};

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

function graphKey(type, id) {
  return type + ":" + canonicalId(type, id);
}

function keyType(key) {
  return String(key).split(":")[0];
}

function keyId(key) {
  return String(key).slice(String(key).indexOf(":") + 1);
}

function graphNode(type, id) {
  return graphModel.nodeMap.get(graphKey(type, id));
}

function linkToKey(rootPrefix, key) {
  const node = graphModel.nodeMap.get(key);
  if (!node) return escapeHtml(key);
  return '<a href="' + escapeHtml(rootPrefix + node.url) + '">' + escapeHtml(node.name) + "</a>";
}

const journeysByEvent = new Map();
data.journeys.forEach((journey) => {
  (journey.relatedEvents || []).forEach((eventId) => {
    const canonical = canonicalId("event", eventId);
    if (!journeysByEvent.has(canonical)) journeysByEvent.set(canonical, []);
    journeysByEvent.get(canonical).push(journey);
  });
});

function journeyUrl(rootPrefix, journeyId) {
  return rootPrefix + "journeys/" + journeyId + ".html";
}

function linkToJourney(rootPrefix, journey) {
  return '<a href="' + escapeHtml(journeyUrl(rootPrefix, journey.id)) + '">' + escapeHtml(journey.name) + "</a>";
}

function listLinks(rootPrefix, type, ids) {
  if (!ids || !ids.length) return "<p>None listed.</p>";
  return '<ul class="link-list">' + ids.map((id) => "<li>" + linkTo(rootPrefix, type, id) + "</li>").join("") + "</ul>";
}

function listTypedLinks(rootPrefix, items, type, idField, noteField, refField) {
  if (!items || !items.length) return "<p>None listed.</p>";
  return '<ul class="link-list">' + items.map((item) => {
    const id = typeof item === "string" ? item : item[idField];
    const note = typeof item === "string" ? "" : item[noteField];
    const ref = typeof item === "string" ? "" : item[refField];
    return "<li>" + linkTo(rootPrefix, type, id) +
      (note ? ' <small class="muted">' + escapeHtml(note) + '</small>' : "") +
      (ref ? ' <small class="muted">' + linkifyReference(ref) + '</small>' : "") +
      "</li>";
  }).join("") + "</ul>";
}

function textList(items) {
  if (!items || !items.length) return "<p>None listed.</p>";
  return "<ul>" + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function referenceList(items) {
  if (!items || !items.length) return "<p>None listed.</p>";
  return "<ul>" + items.map((item) => "<li>" + linkifyReference(item) + "</li>").join("") + "</ul>";
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

const relationLabels = {
  "participated-in": ["Participated in events", "People involved"],
  "occurred-at": ["Occurred at", "Events here"],
  "associated-with": ["Associated with places", "People associated"],
  "parent-of": ["Children", "Parents"],
  "spouse-of": ["Spouses", "Spouses"],
  records: ["Records events", "Recorded in books"],
  "appears-in": ["Appears in books", "People appearing"],
  maps: ["Maps events", "Mapped in journeys"],
  features: ["Features people", "Featured in journeys"],
  "ruled-by": ["Ruled by", "King of"],
  "warned-by": ["Warned by prophets", "Prophet to nations"],
  "territory-included": ["Territory included", "Nations whose territory included this place"],
  "involved-in": ["Involved in events", "Nations involved"],
  "related-to": ["Related", "Related"],
  "spoken-by": ["Spoken by", "Prophecies spoken"],
  "given-during": ["Given during event", "Prophecy given during this event"],
  "recorded-in": ["Recorded in book", "Prophecies recorded"],
  concerns: ["Concerns", "Prophecies concerning this"],
  "fulfilled-in": ["Fulfilled in events", "Prophecies fulfilled here"],
  "expressed-in": ["Expressed in events", "Themes"],
  "embodied-by": ["Embodied by people", "Themes"],
  develops: ["Develops themes", "Prophecies that develop this theme"],
  "prophet-to-king": ["Prophet to king", "Confronted by prophet / Prophet to king"],
  "prophet-to-nation": ["Prophet to nation", "Warned by prophet"],
  "nation-of-person": ["Nation of person", "People of this nation"]
};

function relationLabel(rel, forward) {
  const labels = relationLabels[rel];
  if (!labels) return rel.replace(/-/g, " ");
  return forward ? labels[0] : labels[1];
}

function addEdgeToBuckets(buckets, label, edge, otherKey) {
  if (!buckets.has(label)) buckets.set(label, []);
  buckets.get(label).push({ edge, otherKey });
}

function renderConnectionsPanel(rootPrefix, type, id) {
  const key = graphKey(type, id);
  const node = graphModel.nodeMap.get(key);
  const edges = graphModel.edgesByKey.get(key) || [];
  const explore = node
    ? '<a class="panel-action" href="' + escapeHtml(rootPrefix + "graph.html#" + key) + '">Explore in graph &rarr;</a>'
    : "";
  if (!edges.length) {
    return '<section class="content-panel connections-panel"><div class="panel-heading"><h2>Connections</h2>' + explore + '</div><p>None listed.</p></section>\n';
  }

  const buckets = new Map();
  edges.forEach((edge) => {
    const forward = edge.s === key;
    const otherKey = forward ? edge.t : edge.s;
    addEdgeToBuckets(buckets, relationLabel(edge.r, forward), edge, otherKey);
  });

  const sections = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, items]) => {
    // Symmetric relations (spouse-of, related-to) produce an edge in each
    // direction; collapse them so the other endpoint is listed once, keeping
    // whichever edge carries a note/reference.
    const byOther = new Map();
    items.forEach((item) => {
      const existing = byOther.get(item.otherKey);
      if (!existing || (!(existing.edge.note || existing.edge.ref) && (item.edge.note || item.edge.ref))) {
        byOther.set(item.otherKey, item);
      }
    });
    const sorted = Array.from(byOther.values()).sort((a, b) => {
      const aNode = graphModel.nodeMap.get(a.otherKey);
      const bNode = graphModel.nodeMap.get(b.otherKey);
      const aName = aNode ? aNode.name : a.otherKey;
      const bName = bNode ? bNode.name : b.otherKey;
      return aName.localeCompare(bName);
    });
    const shown = sorted.slice(0, 12);
    const more = sorted.length - shown.length;
    return '<div class="connection-group"><h3>' + escapeHtml(label) + '</h3><ul class="connection-list">' +
      shown.map(({ edge, otherKey }) => '<li>' + linkToKey(rootPrefix, otherKey) +
        (edge.note ? ' <small>' + escapeHtml(edge.note) + '</small>' : "") +
        (edge.ref ? ' <small>' + linkifyReference(edge.ref) + '</small>' : "") +
        '</li>').join("") +
      (more > 0 ? '<li class="muted">+' + escapeHtml(more) + ' more</li>' : "") +
      '</ul></div>';
  }).join("");

  return '<section class="content-panel connections-panel"><div class="panel-heading"><h2>Connections</h2>' + explore + '</div>' + sections + '</section>\n';
}

function kjvDataDir() {
  return path.join(dataDir, "kjv");
}

function kjvFiles() {
  const dir = kjvDataDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => {
      const aCode = a.slice(0, -".json".length);
      const bCode = b.slice(0, -".json".length);
      return (USFM_ORDER.get(aCode) ?? 999) - (USFM_ORDER.get(bCode) ?? 999) || a.localeCompare(b);
    });
}

function readKjvBook(fileName) {
  return readJsonFile(path.join(kjvDataDir(), fileName));
}

function countKjvVerses(book) {
  if (!book || !book.chapters || typeof book.chapters !== "object") return 0;
  return Object.keys(book.chapters).reduce((bookTotal, chapter) => {
    const verses = book.chapters[chapter];
    if (!verses || typeof verses !== "object") return bookTotal;
    return bookTotal + Object.keys(verses).length;
  }, 0);
}

function validateKjvData() {
  const files = kjvFiles();
  if (!files.length) return new Set();
  const seen = new Set();
  let totalVerses = 0;
  const booksByCode = new Map();

  files.forEach((fileName) => {
    const expectedCode = fileName.slice(0, -".json".length);
    const book = readKjvBook(fileName);
    if (!USFM_ORDER.has(expectedCode)) throw new Error("KJV validation failed: unknown USFM file " + fileName + ".");
    if (!book || book.book !== expectedCode) throw new Error("KJV validation failed: " + fileName + " has book code " + (book && book.book) + ".");
    if (seen.has(expectedCode)) throw new Error("KJV validation failed: duplicate book " + expectedCode + ".");
    seen.add(expectedCode);
    totalVerses += countKjvVerses(book);
    booksByCode.set(expectedCode, book);
  });

  if (files.length !== 66) throw new Error("KJV validation failed: expected 66 books, found " + files.length + ".");
  CANON_USFM.forEach((code) => {
    if (!seen.has(code)) throw new Error("KJV validation failed: missing book " + code + ".");
  });
  if (totalVerses < 31000) throw new Error("KJV validation failed: expected 31102 verses, found " + totalVerses + ".");

  const genesis = booksByCode.get("GEN");
  const john = booksByCode.get("JHN");
  const genesisOneOne = genesis && genesis.chapters && genesis.chapters["1"] && genesis.chapters["1"]["1"];
  const johnThreeSixteen = john && john.chapters && john.chapters["3"] && john.chapters["3"]["16"];
  if (genesisOneOne !== "In the beginning God created the heaven and the earth.") {
    throw new Error("KJV validation failed: Genesis 1:1 spot-check mismatch.");
  }
  if (!String(johnThreeSixteen || "").startsWith("For God so loved the world")) {
    throw new Error("KJV validation failed: John 3:16 spot-check mismatch.");
  }

  return seen;
}

function emitKjvJs() {
  ensureDir("js/kjv");
  kjvFiles().forEach((fileName) => {
    const book = readKjvBook(fileName);
    writeFile("js/kjv/" + book.book + ".js", "window.KJV=window.KJV||{};window.KJV[\"" + book.book + "\"]=" + jsonForScript(book) + ";\n");
  });
}

function scriptureBooksInHtml(html) {
  const books = new Set();
  const re = /class="scripture-body"[^>]*\bdata-book="([A-Z0-9]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    if (availableKjvBooks.has(match[1])) books.add(match[1]);
  }
  return Array.from(books).sort((a, b) => (USFM_ORDER.get(a) ?? 999) - (USFM_ORDER.get(b) ?? 999) || a.localeCompare(b));
}

// Cache-busting asset version: a short hash of the files that determine the
// generated CSS/JS. It changes only when those inputs change, so the build
// stays idempotent, and every deploy that alters assets gets a fresh URL
// (so CDNs / browsers can't serve a stale stylesheet or script).
const ASSET_VERSION = (function computeAssetVersion() {
  const hash = require("crypto").createHash("md5");
  const inputs = [path.join(rootDir, "tools", "build.js"), path.join(rootDir, "css", "style.css")];
  ["search.js", "timeline.js", "nav.js", "map.js", "graph.js", "timeline-visual.js", "genealogy.js", "scripture.js"]
    .forEach((name) => inputs.push(path.join(rootDir, "js", name)));
  (function walk(dir) {
    fs.readdirSync(dir).forEach((name) => {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".json") && full !== path.join(dataDir, "graph.json")) inputs.push(full);
    });
  })(dataDir);
  inputs.sort().forEach((file) => {
    try { hash.update(fs.readFileSync(file)); } catch (err) { /* ignore missing optional inputs */ }
  });
  return hash.digest("hex").slice(0, 8);
})();

function pageLayout(options) {
  const rootPrefix = options.rootPrefix || "";
  let scripts = options.timelineScript
    ? '<script src="' + rootPrefix + 'js/data.js"></script>\n<script src="' + rootPrefix + 'js/search.js"></script>\n<script src="' + rootPrefix + 'js/nav.js"></script>\n<script src="' + rootPrefix + 'js/timeline.js"></script>'
    : '<script src="' + rootPrefix + 'js/data.js"></script>\n<script src="' + rootPrefix + 'js/search.js"></script>\n<script src="' + rootPrefix + 'js/nav.js"></script>';
  if (options.mapScript) {
    scripts += '\n<script src="' + rootPrefix + 'js/map-data.js"></script>\n<script src="' + rootPrefix + 'js/map.js"></script>';
  }
  if (options.graphScript) {
    scripts += '\n<script src="' + rootPrefix + 'js/graph-data.js"></script>\n<script src="' + rootPrefix + 'js/graph.js"></script>';
  }
  if (options.timelineVisualScript) {
    scripts += '\n<script src="' + rootPrefix + 'js/timeline-visual.js"></script>';
  }
  if (options.genealogyScript) {
    scripts += '\n<script src="' + rootPrefix + 'js/genealogy.js"></script>';
  }
  const scriptureBooks = scriptureBooksInHtml(options.body || "");
  if (scriptureBooks.length) {
    scripts += "\n" + scriptureBooks.map((book) => '<script src="' + rootPrefix + 'js/kjv/' + book + '.js"></script>').join("\n") +
      '\n<script src="' + rootPrefix + 'js/scripture.js"></script>';
  }

  const doc = '<!doctype html>\n' +
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
  // Append the cache-busting version to every local CSS/JS reference.
  return doc.replace(/((?:href|src)=")((?:\.\.\/)*(?:css|js)\/[^"?]*\.(?:css|js))"/g,
    '$1$2?v=' + ASSET_VERSION + '"');
}

function renderHeader(rootPrefix) {
  return '<header class="site-header">\n' +
    '  <div class="nav-wrap">\n' +
    '    <a class="brand" href="' + rootPrefix + 'index.html">Bible Timeline</a>\n' +
    '    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Menu"><span></span><span></span><span></span></button>\n' +
    '    <nav id="primary-nav" class="primary-nav" aria-label="Main navigation">\n' +
    '      <ul class="nav-links">\n' +
    '        <li><a href="' + rootPrefix + 'timeline.html">Timeline</a></li>\n' +
    '        <li class="nav-group">\n' +
    '          <button type="button" class="nav-group-toggle" aria-expanded="false" aria-controls="menu-people">People <span class="caret" aria-hidden="true"></span></button>\n' +
    '          <ul class="nav-menu" id="menu-people" role="menu">\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'people.html">All People</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'kings.html">Kings</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'prophets.html">Prophets</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'judges.html">Judges</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'apostles.html">Apostles</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'genealogy.html">Genealogy</a></li>\n' +
    '          </ul>\n' +
    '        </li>\n' +
    '        <li class="nav-group">\n' +
    '          <button type="button" class="nav-group-toggle" aria-expanded="false" aria-controls="menu-places">Places <span class="caret" aria-hidden="true"></span></button>\n' +
    '          <ul class="nav-menu" id="menu-places" role="menu">\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'locations.html">All Places</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'maps.html">Maps</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'journeys.html">Journeys</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'nations.html">Nations</a></li>\n' +
    '          </ul>\n' +
    '        </li>\n' +
    '        <li class="nav-group">\n' +
    '          <button type="button" class="nav-group-toggle" aria-expanded="false" aria-controls="menu-study">Study <span class="caret" aria-hidden="true"></span></button>\n' +
    '          <ul class="nav-menu" id="menu-study" role="menu">\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'books.html">Books</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'prophecies.html">Prophecies</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'themes.html">Themes</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'miracles.html">Miracles</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'parables.html">Parables</a></li>\n' +
    '            <li role="none"><a role="menuitem" href="' + rootPrefix + 'graph.html">Graph</a></li>\n' +
    '          </ul>\n' +
    '        </li>\n' +
    '      </ul>\n' +
    '      <div class="header-actions">\n' +
    '      <form class="search-form" data-search-form role="search">\n' +
    '        <label class="visually-hidden" for="site-search">Search</label>\n' +
    '        <input id="site-search" data-search-input type="search" autocomplete="off" placeholder="Search timeline">\n' +
    '        <div class="search-results" data-search-results hidden></div>\n' +
    '      </form>\n' +
    '      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle dark mode">🌙</button>\n' +
    '      </div>\n' +
    '    </nav>\n' +
    '    </div>\n' +
    '</header>\n';
}

function renderFooter() {
  return '<footer class="site-footer">\n' +
    '  <div class="container">\n' +
    '    <p>Bible Timeline is a static, offline-capable study site generated from local JSON data.</p>\n' +
    '    <p class="footer-credit">Developed by <a href="https://www.simonlieu.com/" target="_blank" rel="noopener noreferrer">Simon Lieu</a></p>\n' +
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
  validateUnique("journeys", data.journeys);
  validateUnique("books", data.books);
  validateUnique("nations", data.nations);
  validateUnique("prophecies", data.prophecies);
  validateUnique("themes", data.themes);

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

  validateUnique("reigns", data.reigns);
  data.reigns.forEach((reign) => {
    const label = "reign " + reign.id;
    checkRefs(label, [reign.id], "person", maps.people);
    if (reign.type !== "king" && reign.type !== "prophet") {
      warn(label + " has unsupported type: " + reign.type);
    }
    if (typeof reign.start !== "number" || typeof reign.end !== "number" || reign.end < reign.start) {
      warn(label + " has invalid start/end years.");
    }
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

  data.journeys.forEach((journey) => {
    const label = "journey " + journey.id;
    checkRefs(label, journey.relatedEvents, "event", maps.events);
    checkRefs(label, journey.relatedPeople, "person", maps.people);
    (journey.routes || []).forEach((route) => {
      (route.stops || []).forEach((stop) => {
        if (stop.placeId && !maps.places.has(stop.placeId)) {
          warn(label + " references missing place id: " + stop.placeId);
        }
      });
    });
  });

  data.nations.forEach((nation) => {
    const label = "nation " + nation.id;
    checkRefs(label, nation.capital ? [nation.capital] : [], "place", maps.places);
    checkRefs(label, nation.territoryPlaces, "place", maps.places);
    checkRefs(label, nation.kings, "person", maps.people);
    checkRefs(label, (nation.prophets || []).map((prophet) => prophet.personId), "person", maps.people);
    checkRefs(label, nation.events, "event", maps.events);
    checkRefs(label, nation.relatedNations, "nation", maps.nations);
    checkRefs(label, nation.notablePeople, "person", maps.people);
  });

  data.prophecies.forEach((prophecy) => {
    const label = "prophecy " + prophecy.id;
    checkRefs(label, prophecy.prophetId ? [prophecy.prophetId] : [], "person", maps.people);
    checkRefs(label, prophecy.givenEvent ? [prophecy.givenEvent] : [], "event", maps.events);
    checkRefs(label, prophecy.recordedBook ? [prophecy.recordedBook] : [], "book", maps.books);
    if (prophecy.subject && prophecy.subject.type && prophecy.subject.id) {
      const targetCollection = typeToCollection[prophecy.subject.type];
      if (!targetCollection || !maps[targetCollection].has(canonicalId(prophecy.subject.type, prophecy.subject.id))) {
        warn(label + " references missing " + prophecy.subject.type + " id: " + prophecy.subject.id);
      }
    }
    checkRefs(label, (prophecy.fulfillments || []).map((fulfillment) => fulfillment.eventId).filter(Boolean), "event", maps.events);
    checkRefs(label, prophecy.themes, "theme", maps.themes);
  });

  data.themes.forEach((theme) => {
    const label = "theme " + theme.id;
    checkRefs(label, theme.events, "event", maps.events);
    checkRefs(label, theme.people, "person", maps.people);
    checkRefs(label, theme.relatedThemes, "theme", maps.themes);
  });

  (data.connections.edges || []).forEach((edge) => {
    const fromCollection = typeToCollection[edge.from.type];
    const toCollection = typeToCollection[edge.to.type];
    if (!fromCollection || !maps[fromCollection].has(canonicalId(edge.from.type, edge.from.id))) {
      warn("connection references missing " + edge.from.type + " id: " + edge.from.id);
    }
    if (!toCollection || !maps[toCollection].has(canonicalId(edge.to.type, edge.to.id))) {
      warn("connection references missing " + edge.to.type + " id: " + edge.to.id);
    }
  });
}

function buildGraphModel() {
  const nodes = [];
  const nodeMap = new Map();
  const edges = [];
  const edgeKeys = new Set();

  function addNode(type, item, options) {
    const id = canonicalId(type, item.id);
    const node = {
      key: graphKey(type, id),
      type,
      id,
      name: item.name,
      url: slugPath(type, id)
    };
    if (options && options.era) node.era = options.era;
    nodes.push(node);
    nodeMap.set(node.key, node);
  }

  function addEdge(fromType, fromId, rel, toType, toId, meta) {
    if (!fromId || !toId) return;
    const s = graphKey(fromType, fromId);
    const t = graphKey(toType, toId);
    if (!nodeMap.has(s) || !nodeMap.has(t)) return;
    const edge = { s, r: rel, t };
    if (meta && meta.note) edge.note = meta.note;
    if (meta && meta.ref) edge.ref = meta.ref;
    const dedupeKey = [edge.s, edge.r, edge.t, edge.note || "", edge.ref || ""].join("|");
    if (edgeKeys.has(dedupeKey)) return;
    edgeKeys.add(dedupeKey);
    edges.push(edge);
  }

  sortedEvents().forEach((event) => addNode("event", event, { era: event.era }));
  data.people.forEach((person) => addNode("person", person));
  data.places.forEach((place) => addNode("place", place, { era: place.ancientRegion || "" }));
  data.books.forEach((book) => addNode("book", book, { era: book.period || "" }));
  data.journeys.forEach((journey) => addNode("journey", journey, { era: journey.era || "" }));
  data.nations.forEach((nation) => addNode("nation", nation, { era: nation.dateRange || "" }));
  data.prophecies.forEach((prophecy) => addNode("prophecy", prophecy));
  data.themes.forEach((theme) => addNode("theme", theme));

  data.events.forEach((event) => {
    Array.from(new Set((event.mainPeople || []).concat(event.relatedPeople || []))).forEach((personId) => {
      addEdge("person", personId, "participated-in", "event", event.id);
    });
    if (event.location && event.location.placeId) {
      addEdge("event", event.id, "occurred-at", "place", event.location.placeId);
    }
    if (event.book) addEdge("book", event.book, "records", "event", event.id);
  });

  data.people.forEach((person) => {
    (person.events || []).forEach((eventId) => addEdge("person", person.id, "participated-in", "event", eventId));
    (person.parents || []).forEach((parentId) => addEdge("person", parentId, "parent-of", "person", person.id));
    (person.children || []).forEach((childId) => addEdge("person", person.id, "parent-of", "person", childId));
    (person.spouses || []).forEach((spouseId) => addEdge("person", person.id, "spouse-of", "person", spouseId));
    (person.books || []).forEach((bookId) => addEdge("person", person.id, "appears-in", "book", bookId));
  });

  data.places.forEach((place) => {
    (place.people || []).forEach((personId) => addEdge("person", personId, "associated-with", "place", place.id));
  });

  data.books.forEach((book) => {
    (book.majorEvents || []).forEach((eventId) => addEdge("book", book.id, "records", "event", eventId));
  });

  data.journeys.forEach((journey) => {
    (journey.relatedEvents || []).forEach((eventId) => addEdge("journey", journey.id, "maps", "event", eventId));
    (journey.relatedPeople || []).forEach((personId) => addEdge("journey", journey.id, "features", "person", personId));
  });

  data.nations.forEach((nation) => {
    (nation.kings || []).forEach((personId) => addEdge("nation", nation.id, "ruled-by", "person", personId));
    (nation.prophets || []).forEach((prophet) => addEdge("nation", nation.id, "warned-by", "person", prophet.personId, { note: prophet.note, ref: prophet.reference }));
    Array.from(new Set((nation.territoryPlaces || []).concat(nation.capital ? [nation.capital] : []))).forEach((placeId) => {
      addEdge("nation", nation.id, "territory-included", "place", placeId);
    });
    (nation.events || []).forEach((eventId) => addEdge("nation", nation.id, "involved-in", "event", eventId));
    (nation.relatedNations || []).forEach((nationId) => addEdge("nation", nation.id, "related-to", "nation", nationId));
  });

  data.prophecies.forEach((prophecy) => {
    if (prophecy.prophetId) addEdge("prophecy", prophecy.id, "spoken-by", "person", prophecy.prophetId);
    if (prophecy.givenEvent) addEdge("prophecy", prophecy.id, "given-during", "event", prophecy.givenEvent, { ref: prophecy.givenReference });
    if (prophecy.recordedBook) addEdge("prophecy", prophecy.id, "recorded-in", "book", prophecy.recordedBook, { ref: prophecy.givenReference });
    if (prophecy.subject && prophecy.subject.type && prophecy.subject.id) {
      addEdge("prophecy", prophecy.id, "concerns", prophecy.subject.type, prophecy.subject.id);
    }
    (prophecy.fulfillments || []).forEach((fulfillment) => {
      if (fulfillment.eventId) addEdge("prophecy", prophecy.id, "fulfilled-in", "event", fulfillment.eventId, { note: fulfillment.note, ref: fulfillment.reference });
    });
    (prophecy.themes || []).forEach((themeId) => addEdge("prophecy", prophecy.id, "develops", "theme", themeId));
  });

  data.themes.forEach((theme) => {
    (theme.events || []).forEach((eventId) => addEdge("theme", theme.id, "expressed-in", "event", eventId));
    (theme.people || []).forEach((personId) => addEdge("theme", theme.id, "embodied-by", "person", personId));
    (theme.relatedThemes || []).forEach((themeId) => addEdge("theme", theme.id, "related-to", "theme", themeId));
  });

  (data.connections.edges || []).forEach((edge) => {
    addEdge(edge.from.type, edge.from.id, edge.rel, edge.to.type, edge.to.id, { note: edge.note, ref: edge.reference });
  });

  const edgesByKey = new Map();
  edges.forEach((edge) => {
    if (!edgesByKey.has(edge.s)) edgesByKey.set(edge.s, []);
    if (!edgesByKey.has(edge.t)) edgesByKey.set(edge.t, []);
    edgesByKey.get(edge.s).push(edge);
    edgesByKey.get(edge.t).push(edge);
  });

  return { nodes, edges, nodeMap, edgesByKey };
}

let graphModel = { nodes: [], edges: [], nodeMap: new Map(), edgesByKey: new Map() };

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
    '  <p><strong>Bible References:</strong> ' + linkifyReference(event.reference) + '</p>\n' +
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
    '  <p>' + linkifyReference(event.reference) + '</p>\n' +
    '  <p>' + escapeHtml(event.summary) + '</p>\n' +
    '</article>'
  )).join("\n") + '\n</div>';
}

function heroFriezeSvg() {
  return '<svg class="hero-frieze" viewBox="0 0 1440 340" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    // Creation: sunrise on the far-left horizon (start of the timeline)
    '<g transform="translate(70,250)"><circle class="glow" r="34"/><g class="glow-soft">' +
    '<rect x="-2.5" y="-58" width="5" height="16" rx="2"/><rect x="-58" y="-2.5" width="16" height="5" rx="2"/><rect x="42" y="-2.5" width="16" height="5" rx="2"/>' +
    '<rect x="-2.5" y="-58" width="5" height="16" rx="2" transform="rotate(45)"/><rect x="-2.5" y="-58" width="5" height="16" rx="2" transform="rotate(-45)"/>' +
    '<rect x="-2.5" y="-58" width="5" height="16" rx="2" transform="rotate(23)"/><rect x="-2.5" y="-58" width="5" height="16" rx="2" transform="rotate(-23)"/></g></g>' +
    // Star of Bethlehem (upper right)
    '<g transform="translate(1210,80)"><path class="glow" d="M0 -26 L6.5 -6.5 L26 0 L6.5 6.5 L0 26 L-6.5 6.5 L-26 0 L-6.5 -6.5 Z"/><path class="glow-soft" d="M-3 14 L0 96 L3 14 Z"/></g>' +
    // Distant hill + three crosses (Golgotha)
    '<path class="sil-far" d="M0 244 Q 240 208 480 236 T 960 230 T 1440 236 L1440 340 L0 340 Z"/>' +
    '<g class="sil" transform="translate(1255,236)"><path class="sil-near" d="M-46 6 Q 0 -18 62 6 Z"/>' +
    '<rect x="6" y="-52" width="6" height="58"/><rect x="-3" y="-38" width="24" height="6"/>' +
    '<rect x="-26" y="-38" width="4.5" height="44"/><rect x="-33" y="-28" width="18" height="4.5"/>' +
    '<rect x="36" y="-38" width="4.5" height="44"/><rect x="29" y="-28" width="18" height="4.5"/></g>' +
    // Noah's Ark on the distant hill
    '<g class="sil" transform="translate(300,196)"><path d="M0 42 Q 6 74 44 74 L 116 74 Q 154 74 160 42 L 160 36 L 0 36 Z"/>' +
    '<rect x="24" y="8" width="112" height="28" rx="5"/><path d="M20 8 L80 -16 L140 8 Z"/></g>' +
    // Near hill
    '<path class="sil-near" d="M0 288 Q 300 258 600 286 T 1200 284 T 1440 288 L1440 340 L0 340 Z"/>' +
    // Palm trees
    '<g class="sil" transform="translate(96,286)"><path class="stroke-sil" stroke-width="6" stroke-linecap="round" d="M0 0 Q -6 -40 -2 -66"/>' +
    '<path d="M-2 -66 Q -34 -78 -52 -60 Q -30 -70 -2 -64 Z"/><path d="M-2 -66 Q 30 -80 50 -62 Q 26 -72 -2 -64 Z"/>' +
    '<path d="M-2 -66 Q -18 -92 -40 -92 Q -14 -84 -2 -64 Z"/><path d="M-2 -66 Q 16 -94 40 -92 Q 12 -84 -2 -64 Z"/>' +
    '<path d="M-2 -66 Q 0 -98 0 -98 Q 4 -84 2 -64 Z"/></g>' +
    // Ziggurat (Tower of Babel)
    '<g class="sil" transform="translate(430,252)"><path d="M0 36 L128 36 L114 24 L14 24 Z"/><path d="M20 24 L108 24 L96 13 L32 13 Z"/>' +
    '<path d="M38 13 L90 13 L80 3 L48 3 Z"/><rect x="60" y="-6" width="8" height="9"/></g>' +
    // Robed patriarchs with staffs (biblical figures)
    '<g class="sil" transform="translate(600,286)"><circle cx="0" cy="-54" r="8.5"/><path d="M-14 0 Q -11 -46 0 -46 Q 11 -46 14 0 Z"/>' +
    '<path class="stroke-sil" stroke-width="3.5" stroke-linecap="round" d="M16 2 L16 -58 Q 16 -66 9 -64"/></g>' +
    '<g class="sil" transform="translate(648,288)"><circle cx="0" cy="-48" r="7.5"/><path d="M-12 0 Q -9 -40 0 -40 Q 9 -40 12 0 Z"/>' +
    '<path class="stroke-sil" stroke-width="3" stroke-linecap="round" d="M-15 2 L-14 -52 Q -14 -60 -8 -58"/></g>' +
    // Camel
    '<g class="sil" transform="translate(800,288)"><path d="M0 2 L0 -18 Q 3 -30 14 -24 Q 22 -40 34 -26 Q 44 -34 52 -20 L 60 -18 Q 70 -16 70 -4 L 70 2 L 62 2 L 60 -8 Q 56 -14 50 -8 L 50 2 L 42 2 L 40 -14 L 20 -14 L 18 2 L 10 2 L 8 -10 Q 4 -14 0 -8 Z"/></g>' +
    // Temple with columns
    '<g class="sil" transform="translate(940,288)"><path d="M-6 -30 L70 -30 L32 -50 Z"/><rect x="-6" y="-30" width="76" height="7"/>' +
    '<rect x="2" y="-23" width="7" height="23"/><rect x="18" y="-23" width="7" height="23"/><rect x="39" y="-23" width="7" height="23"/><rect x="55" y="-23" width="7" height="23"/>' +
    '<rect x="-8" y="0" width="80" height="6"/></g>' +
    // Prophet with scroll
    '<g class="sil" transform="translate(1080,288)"><circle cx="0" cy="-52" r="8"/><path d="M-13 0 Q -10 -44 0 -44 Q 10 -44 13 0 Z"/>' +
    '<rect x="-20" y="-30" width="16" height="7" rx="3"/></g>' +
    '</svg>\n';
}

function renderIndex() {
  const body = '<section class="hero">\n' +
    '  ' + heroFriezeSvg() +
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
    ['Timeline', 'People', 'Places', 'Books', 'Prophecies', 'Nations', 'Themes', 'Graph', 'Maps', 'Journeys', 'Kings', 'Prophets', 'Miracles', 'Parables', 'Genealogy'].map((label) => {
      const hrefs = {
        Timeline: 'timeline.html',
        People: 'people.html',
        Places: 'locations.html',
        Books: 'books.html',
        Prophecies: 'prophecies.html',
        Nations: 'nations.html',
        Themes: 'themes.html',
        Graph: 'graph.html',
        Maps: 'maps.html',
        Journeys: 'journeys.html',
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
    ["Prophecies", "Nations", "Themes", "Graph", "Maps", "Kings", "Prophets", "Miracles", "Parables", "Genealogy"].map((label) => '<article class="card"><h3>' + escapeHtml(label) + '</h3><p><a href="' + label.toLowerCase() + '.html">Browse ' + escapeHtml(label) + '</a></p></article>').join("") +
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
  const hasGenealogyTree = bodyContent.indexOf('data-genealogy-tree') !== -1;
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Browse</span><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p></div>\n' +
    bodyContent +
    '</div></section>';

  writeFile(fileName, pageLayout({
    title: title + " - Bible Timeline",
    description,
    rootPrefix: "",
    mapScript: hasFullMap,
    genealogyScript: hasGenealogyTree,
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
    return '<tr><td>' + linkTo("", "event", miracle.eventId) + '</td><td>' + linkifyReference(event ? event.reference : "") + '</td><td>' + escapeHtml(miracle.note || "") + '</td></tr>';
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
    const target = parable.eventId ? linkToWithLabel("", "event", parable.eventId, parable.name) : linkToWithLabel("", "book", gospelBookFromReference(parable.reference), parable.name);
    return '<tr><td>' + target + '</td><td>' + linkifyReference(parable.reference) + '</td></tr>';
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

// Recursively render a person as a family-tree <li>. Each child is rendered
// under exactly one parent (its parents[0]) so no one appears twice; spouses
// are shown inline.
function renderGenealogyPerson(personId, seen) {
  const person = maps.people.get(personId);
  if (!person || seen.has(personId)) return "";
  seen.add(personId);
  const nameLink = linkTo("", "person", person.id);
  const spouses = (person.spouses || [])
    .map((sid) => maps.people.get(sid) ? linkTo("", "person", sid) : null)
    .filter(Boolean);
  const spouseHtml = spouses.length
    ? ' <span class="tree-spouse">&amp; ' + spouses.join(', ') + '</span>'
    : "";
  const meaning = person.nameMeaning ? '<span class="tree-meaning">' + escapeHtml(String(person.nameMeaning).split("(")[0].trim()) + '</span>' : "";
  // children rendered here = those whose primary parent (parents[0]) is this person
  const children = (person.children || []).filter((cid) => {
    const child = maps.people.get(cid);
    return child && (child.parents || [])[0] === person.id;
  });
  const childHtml = children.length
    ? '<ul>' + children.map((cid) => renderGenealogyPerson(cid, seen)).join("") + '</ul>'
    : "";
  const cls = children.length ? ' class="has-children"' : "";
  return '<li' + cls + '><span class="tree-node">' + nameLink + spouseHtml +
    (meaning ? ' ' + meaning : '') + '</span>' + childHtml + '</li>';
}

function renderGenealogyForest() {
  const roots = data.people
    .filter((p) => (p.children || []).length && !(p.parents || []).length &&
      (p.children || []).some((cid) => {
        const child = maps.people.get(cid);
        return child && (child.parents || [])[0] === p.id;
      }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const seen = new Set();
  return roots.map((root) => '<ul class="genealogy-tree">' + renderGenealogyPerson(root.id, seen) + '</ul>').join("\n");
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

  const forest = renderGenealogyForest();
  renderBrowsePage("genealogy.html", "Genealogy", "Interactive family trees built from the recorded parent/child relationships, plus the messianic line from Adam to Jesus.",
    '<section class="content-panel"><h2>Family Trees</h2>' +
    '<p>Collapsible family trees built directly from the parent, child, and spouse records in the dataset. Click a name to open that person; use the triangles to expand or collapse a branch. These are the relationships Scripture records explicitly, so the trees are focused rather than exhaustive.</p>' +
    '<div class="tree-controls"><button type="button" class="button" data-tree-expand>Expand all</button> <button type="button" class="button" data-tree-collapse>Collapse all</button></div>' +
    '<div class="genealogy-forest" data-genealogy-tree>' + forest + '</div>' +
    '</section>\n' +
    '<section class="content-panel"><h2>Messianic Line</h2><p>The line from Adam to Jesus with Matthew 1 and Luke 3 in view, bridging the generations Scripture lists but this dataset does not name individually. Differences between Matthew and Luke are a matter of scholarly discussion.</p><ul class="genealogy-list">' + nested + '</ul></section>\n'
  );
}

function journeyFallbackText(journey) {
  const names = [];
  (journey.routes || []).forEach((route) => {
    (route.stops || []).forEach((stop) => names.push(stop.name));
  });
  return names.length ? names.join(" -> ") : "No stops listed.";
}

function renderJourneyLegend(journey) {
  const routeItems = (journey.routes || []).map((route, index) => {
    const colorKey = route.colorKey || ("route" + ((index % 4) + 1));
    return '<li><span class="journey-swatch journey-swatch-' + escapeHtml(colorKey) + '"></span>' + escapeHtml(route.name) + '</li>';
  }).join("");
  const hasSea = (journey.routes || []).some((route) => (route.stops || []).some((stop) => stop.travel === "sea"));
  const hasDisputed = (journey.routes || []).some((route) => (route.stops || []).some((stop) => stop.precision === "disputed"));
  const hasDashed = (journey.routes || []).some((route) => route.lineStyle === "dashed");
  const notes = [];
  if (journey.type === "region" || (journey.regions || []).length) notes.push("Shaded areas mark approximate regional extent.");
  if (hasSea || hasDashed) notes.push("Dashed segments mark sea travel or a dashed route circuit.");
  if (hasDisputed) notes.push("Dotted segments mark disputed locations or uncertain segments.");
  if (!notes.length) notes.push("Solid segments mark land travel.");

  return '<section class="journey-legend" aria-label="Map legend"><ul>' + routeItems + '</ul><p>' + notes.map(escapeHtml).join(" ") + '</p></section>';
}

function precisionLabel(stop) {
  return stop.precision ? ' <sup class="precision-label">' + escapeHtml(stop.precision) + '</sup>' : '';
}

function renderStopsTable(rootPrefix, route) {
  const rows = (route.stops || []).map((stop, index) => {
    const name = stop.placeId ? linkTo(rootPrefix, "place", stop.placeId, stop.name) : escapeHtml(stop.name);
    return '<tr><td>' + escapeHtml(index + 1) + '</td><td>' + name + precisionLabel(stop) + '</td><td>' + escapeHtml(stop.note || "") + '</td><td>' + linkifyReference(stop.reference || "") + '</td></tr>';
  }).join("");
  return '<div class="table-wrap"><table class="browse-table stops-table"><thead><tr><th>No.</th><th>Stop</th><th>Note</th><th>Reference</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderJourneyPage(journey, index) {
  const rootPrefix = "../";
  const previous = data.journeys[index - 1];
  const next = data.journeys[index + 1];
  const routeSections = (journey.routes || []).map((route) => (
    '<section class="content-panel"><h2>' + escapeHtml(route.name) + '</h2>' + renderStopsTable(rootPrefix, route) + '</section>'
  )).join("\n");
  const nav = '<nav class="journey-pager" aria-label="Journey navigation">' +
    (previous ? '<a href="' + escapeHtml(previous.id + ".html") + '">&larr; ' + escapeHtml(previous.name) + '</a>' : '<span></span>') +
    (next ? '<a href="' + escapeHtml(next.id + ".html") + '">' + escapeHtml(next.name) + ' &rarr;</a>' : '<span></span>') +
    '</nav>';
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">' + escapeHtml(journey.era) + '</span><h1>' + escapeHtml(journey.name) + '</h1><p>' + linkifyReference(journey.reference) + '</p><p>' + escapeHtml(journey.summary) + '</p></div>\n' +
    '<div class="map map-journey" data-journey="' + escapeHtml(journey.id) + '"><p class="map-fallback">' + escapeHtml(journeyFallbackText(journey)) + '</p></div>\n' +
    renderJourneyLegend(journey) + '\n' +
    '<aside class="accuracy-note"><h2>About this map</h2>' + paragraphs(journey.accuracyNote) + '</aside>\n' +
    '<section class="content-panel"><h2>Description</h2>' + paragraphs(journey.description) + '</section>\n' +
    routeSections + '\n' +
    '<section class="content-panel"><h2>Related Events</h2>' + listLinks(rootPrefix, "event", journey.relatedEvents) + '</section>\n' +
    '<section class="content-panel"><h2>Related People</h2>' + listLinks(rootPrefix, "person", journey.relatedPeople) + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "journey", journey.id) +
    nav + '\n' +
    '</div></section>';

  writeFile("journeys/" + journey.id + ".html", pageLayout({
    title: journey.name + " - Bible Timeline",
    description: journey.summary,
    rootPrefix,
    mapScript: true,
    body
  }));
}

function renderJourneysBrowse() {
  const cards = data.journeys.map((journey) => (
    '<article class="card journey-card"><span class="badge">' + escapeHtml(journey.era) + '</span><h2><a href="' + escapeHtml(journeyUrl("", journey.id)) + '">' + escapeHtml(journey.name) + '</a></h2><p>' + escapeHtml(journey.summary) + '</p><p><a href="' + escapeHtml(journeyUrl("", journey.id)) + '">Open map &rarr;</a></p></article>'
  )).join("");
  renderBrowsePage("journeys.html", "Journeys", "Route and region maps for seven major biblical journeys and ministry circuits.",
    '<section class="content-panel"><h2>Journey Maps</h2><p>Explore fitted maps with route lines, numbered stops, and notes about historical certainty.</p><div class="grid journey-grid">' + cards + '</div></section>\n'
  );
}

function renderMapsBrowse() {
  const withCoordinates = sortByName(data.places.filter((place) => place.lat != null && place.lng != null));
  const uncertain = sortByName(data.places.filter((place) => place.lat == null || place.lng == null));
  const rows = withCoordinates.map((place) => (
    '<tr><td>' + linkTo("", "place", place.id) + '</td><td>' + escapeHtml(place.modernCountry || "None listed") + '</td><td>' + escapeHtml(place.lat) + '</td><td>' + escapeHtml(place.lng) + '</td></tr>'
  )).join("");
  const journeyLinks = '<ul class="link-list">' + data.journeys.map((journey) => '<li>' + linkToJourney("", journey) + '</li>').join("") + '</ul>';
  renderBrowsePage("maps.html", "Maps", "Coordinate index for places in the Bible timeline dataset.",
    '<section class="content-panel"><h2>Mapped Places</h2><div id="full-map"><p class="map-fallback">Map requires JavaScript. The coordinate table is listed below.</p></div><p class="map-caption">Basemap: Natural Earth (public domain). Locations with uncertain identification are listed below without markers.</p><div class="table-wrap"><table class="browse-table"><thead><tr><th>Name</th><th>Modern Country</th><th>Lat</th><th>Lng</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>\n' +
    '<section class="content-panel"><h2>Journey Maps</h2>' + journeyLinks + '</section>\n' +
    '<section class="content-panel"><h2>Location Uncertain</h2>' + listLinks("", "place", uncertain.map((place) => place.id)) + '</section>\n'
  );
}

const VT = {
  primevalPx: 150,
  histStart: -2100,
  histEnd: 100,
  pxPerYear: 0.62,
  histPx: (100 - -2100) * 0.62,
  topPad: 30,
  botPad: 40,
  minX: -680,
  width: 1900,
  axisX: 70,
  eventDotX: 92,
  barTopX: 120,
  barBottomX: 930,
  labelGap: 15
};
VT.totalHeight = VT.topPad + VT.primevalPx + VT.histPx + VT.botPad;
VT.histY = VT.topPad + VT.primevalPx;

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function yForTimeline(year, isSymbolic, symbolicIndex) {
  if (isSymbolic) {
    return VT.topPad + 20 + (symbolicIndex / 6) * (VT.primevalPx - 40);
  }
  const clamped = Math.min(Math.max(year, VT.histStart), VT.histEnd);
  return VT.histY + (clamped - VT.histStart) * VT.pxPerYear;
}

function formatTimelineYear(year) {
  if (year < 0) return Math.abs(year) + " BC";
  if (year === 1) return "AD 1";
  if (year > 0) return "AD " + year;
  return "1 BC/AD 1";
}

function formatTimelineRange(start, end) {
  return formatTimelineYear(start) + "-" + formatTimelineYear(end);
}

function truncateSvgLabel(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? text.slice(0, Math.max(0, maxLength - 3)) + "..." : text;
}

function tooltipAttrs(parts) {
  const text = parts.filter(Boolean).join(" | ");
  return ' data-vt-title="' + escapeHtml(text) + '" aria-label="' + escapeHtml(text) + '"';
}

function assignVerticalLanes(items, laneXs, maxLeader) {
  const lanes = laneXs.map((x) => ({ x, lastY: -Infinity }));
  return items.map((item) => {
    const selected = lanes.reduce((best, lane) => lane.lastY < best.lastY ? lane : best, lanes[0]);
    const labelY = Math.max(item.rawY, selected.lastY + VT.labelGap);
    // In over-dense clusters, drop the label (keep dot + hover) instead of
    // pushing it far from its dot and spilling into a tangle of leader lines.
    if (maxLeader && labelY - item.rawY > maxLeader) {
      return Object.assign({}, item, { labelX: selected.x, labelY: item.rawY, labelSkip: true });
    }
    selected.lastY = labelY;
    return Object.assign({}, item, { labelX: selected.x, labelY });
  });
}

function assignIntervalLanes(records) {
  const lanes = [];
  return records.slice().sort((a, b) => a.start - b.start || a.end - b.end).map((record) => {
    let laneIndex = lanes.findIndex((lastEnd) => lastEnd <= record.start);
    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push(record.end);
    } else {
      lanes[laneIndex] = record.end;
    }
    return Object.assign({}, record, { lane: laneIndex });
  });
}

function renderTimelineVisualSvg() {
  const symbolicEvents = data.events
    .filter((event) => event.datePrecision === "symbolic")
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const symbolicIndex = new Map(symbolicEvents.map((event, index) => [event.id, index]));
  const eraIndex = new Map(data.timeline.map((group, index) => [group.era, index + 1]));
  const eraSlug = new Map(data.timeline.map((group) => [group.era, slugify(group.era)]));
  const eventPoints = sortedEvents().map((event) => {
    const isSymbolic = event.datePrecision === "symbolic";
    return {
      event,
      rawY: yForTimeline(event.dateSort, isSymbolic, symbolicIndex.get(event.id) || 0),
      eraNumber: eraIndex.get(event.era) || 1,
      eraSlug: eraSlug.get(event.era) || slugify(event.era)
    };
  }).sort((a, b) => a.rawY - b.rawY || (a.event.order || 0) - (b.event.order || 0));

  const eraBands = data.timeline.map((group) => {
    const points = group.eventIds.map((id) => eventPoints.find((point) => point.event.id === canonicalId("event", id))).filter(Boolean);
    const ys = points.map((point) => point.rawY);
    const minY = Math.max(VT.topPad, Math.min.apply(null, ys) - 12);
    const maxY = Math.min(VT.totalHeight - VT.botPad, Math.max.apply(null, ys) + 12);
    const index = eraIndex.get(group.era) || 1;
    const slug = eraSlug.get(group.era) || slugify(group.era);
    return '<g class="vt-era vt-era-' + escapeHtml(slug) + '">' +
      '<rect class="vt-era-band vt-era-fill-' + index + '" x="' + VT.minX + '" y="' + minY.toFixed(1) + '" width="' + VT.width + '" height="' + Math.max(18, maxY - minY).toFixed(1) + '"></rect>' +
      '<text class="vt-era-label" x="1050" y="' + (minY + 15).toFixed(1) + '">' + escapeHtml(group.era) + '</text>' +
      '</g>';
  }).join("\n");

  const ticks = [];
  for (let year = -2000; year <= 100; year += 100) {
    const y = yForTimeline(year, false, 0);
    const major = year % 500 === 0 || year === 1 || year === 0;
    ticks.push('<line class="' + (major ? "vt-axis-tick major" : "vt-axis-tick") + '" x1="' + (VT.axisX - (major ? 10 : 6)) + '" y1="' + y.toFixed(1) + '" x2="' + (VT.axisX + (major ? 10 : 6)) + '" y2="' + y.toFixed(1) + '"></line>');
    if (year % 500 === 0 || year === 0) {
      const label = year === 0 ? "AD 1" : formatTimelineYear(year);
      ticks.push('<text class="vt-axis-label" x="' + (VT.minX + 12) + '" y="' + (y + 3).toFixed(1) + '">' + escapeHtml(label) + '</text>');
    }
  }

  const labeledEvents = assignVerticalLanes(eventPoints, [62, -86, -234, -382, -530], 65);
  const eventsSvg = labeledEvents.map((point) => {
    const labelDelta = Math.abs(point.labelY - point.rawY);
    const label = truncateSvgLabel(point.event.name, 22);
    const leader = (!point.labelSkip && labelDelta > 2)
      ? '<line class="vt-event-leader" x1="' + (point.labelX + 4) + '" y1="' + point.labelY.toFixed(1) + '" x2="' + VT.eventDotX + '" y2="' + point.rawY.toFixed(1) + '"></line>'
      : "";
    const text = point.labelSkip
      ? ""
      : '<text class="vt-event-label" x="' + point.labelX + '" y="' + point.labelY.toFixed(1) + '">' + escapeHtml(label) + '</text>';
    return '<a class="vt-event vt-era-' + escapeHtml(point.eraSlug) + '" href="events/' + escapeHtml(point.event.id) + '.html"' + tooltipAttrs([point.event.name, point.event.date, point.event.reference]) + '>' +
      '<title>' + escapeHtml(point.event.name + " - " + point.event.date + " - " + point.event.reference) + '</title>' +
      leader +
      '<circle class="vt-event-dot vt-era-fill-' + point.eraNumber + '" cx="' + VT.eventDotX + '" cy="' + point.rawY.toFixed(1) + '" r="4"></circle>' +
      text +
      '</a>';
  }).join("\n");

  const groups = [
    { type: "king", className: "vt-kings", title: "Kings", x: 130, width: 360 },
    { type: "prophet", className: "vt-prophets", title: "Prophets", x: 535, width: 360 }
  ];
  const barGroups = groups.map((group) => {
    const records = assignIntervalLanes(data.reigns.filter((reign) => reign.type === group.type));
    const laneCount = Math.max(1, records.reduce((max, record) => Math.max(max, record.lane + 1), 0));
    const laneWidth = Math.min(44, Math.max(22, (group.width - 4) / laneCount));
    const bars = records.map((record) => {
      const y1 = yForTimeline(record.start, false, 0);
      const y2 = yForTimeline(record.end, false, 0);
      const barHeight = Math.max(10, y2 - y1);
      const x = group.x + record.lane * laneWidth;
      const barClass = record.type === "king" ? "vt-king-bar vt-kingdom-" + slugify(record.kingdom) : "vt-prophet-bar";
      const title = record.name + " (" + record.kingdom + "): " + formatTimelineRange(record.start, record.end) + " - " + record.note;
      return '<a class="vt-reign vt-' + escapeHtml(record.type) + '" href="people/' + escapeHtml(record.id) + '.html"' + tooltipAttrs([record.name, record.kingdom, formatTimelineRange(record.start, record.end), record.note, record.reference]) + '>' +
        '<title>' + escapeHtml(title) + '</title>' +
        '<rect class="' + escapeHtml(barClass) + '" x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + (laneWidth - 5).toFixed(1) + '" height="' + barHeight.toFixed(1) + '" rx="4"></rect>' +
        '<text class="vt-reign-label" x="' + (x + laneWidth + 1).toFixed(1) + '" y="' + (y1 + 9).toFixed(1) + '">' + escapeHtml(truncateSvgLabel(record.name, 20)) + '</text>' +
        '</a>';
    }).join("\n");
    return '<g class="' + group.className + '">' +
      '<text class="vt-group-heading" x="' + group.x + '" y="' + (VT.histY - 10) + '">' + escapeHtml(group.title) + '</text>' +
      bars +
      '</g>';
  }).join("\n");

  return '<svg class="vt" data-vtimeline-svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VT.minX + ' 0 ' + VT.width + ' ' + VT.totalHeight.toFixed(1) + '" role="img" aria-labelledby="vt-title vt-desc">\n' +
    '<title id="vt-title">To-scale Bible timeline</title>\n' +
    '<desc id="vt-desc">Events are positioned by date. Kings and prophets are shown as vertical reign and ministry bars so overlaps are visible.</desc>\n' +
    '<g class="vt-eras">\n' + eraBands + '\n</g>\n' +
    '<g class="vt-axis">\n' +
    '<rect class="vt-primeval-band" x="' + VT.minX + '" y="' + VT.topPad + '" width="' + VT.width + '" height="' + VT.primevalPx + '"></rect>\n' +
    '<line class="vt-primeval-divider" x1="' + VT.minX + '" y1="' + VT.histY + '" x2="' + (VT.minX + VT.width) + '" y2="' + VT.histY + '"></line>\n' +
    '<text class="vt-primeval-label" x="1050" y="' + (VT.topPad + 18) + '">Primeval (symbolic dates)</text>\n' +
    '<line class="vt-axis-line" x1="' + VT.axisX + '" y1="' + VT.histY + '" x2="' + VT.axisX + '" y2="' + (VT.totalHeight - VT.botPad) + '"></line>\n' +
    ticks.join("\n") +
    '\n</g>\n' +
    '<g class="vt-events">\n' + eventsSvg + '\n</g>\n' +
    barGroups +
    '\n</svg>';
}

function renderTimelineVisualSection() {
  const eraToggles = data.timeline.map((group) => {
    const slug = slugify(group.era);
    return '<label><input type="checkbox" data-vt-era="' + escapeHtml(slug) + '" checked> ' + escapeHtml(group.era) + '</label>';
  }).join("");
  const legendEras = data.timeline.map((group, index) => (
    '<span class="vt-legend-item"><span class="vt-swatch vt-era-fill-' + (index + 1) + '"></span>' + escapeHtml(group.era) + '</span>'
  )).join("");
  return '<section class="section vtimeline-section" aria-labelledby="visual-timeline-title"><div class="container">\n' +
    '<div class="page-title"><span class="eyebrow">Chronological Scale</span><h1 id="visual-timeline-title">Visual Timeline</h1><p>Events are placed by date, with kings and prophets shown as parallel bars so overlapping reigns and ministries are visible.</p></div>\n' +
    '<div class="vtimeline-legend" aria-label="Timeline legend">' +
    legendEras +
    '<span class="vt-legend-item"><span class="vt-swatch vt-king-swatch"></span>King bar</span>' +
    '<span class="vt-legend-item"><span class="vt-swatch vt-prophet-swatch"></span>Prophet bar</span>' +
    '<span class="vt-legend-note">Dates are approximate and follow a traditional chronology; the primeval period is shown with symbolic dates in a compressed band.</span>' +
    '</div>\n' +
    '<div class="vtimeline-controls" aria-label="Visual timeline filters">\n' +
    '<fieldset><legend>Layers</legend><label><input type="checkbox" data-vt-layer="events" checked> Events</label><label><input type="checkbox" data-vt-layer="kings" checked> Kings</label><label><input type="checkbox" data-vt-layer="prophets" checked> Prophets</label></fieldset>\n' +
    '<fieldset><legend>Eras</legend><label><input type="checkbox" data-vt-all-eras checked> All eras</label>' + eraToggles + '</fieldset>\n' +
    '</div>\n' +
    '<div class="vtimeline-scroll">' + renderTimelineVisualSvg() + '</div>\n' +
    '</div></section>';
}

function renderTimeline() {
  const eras = data.timeline.map((group) => group.era);
  const filters = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="eyebrow">Chronological Listing</span><h2>Browse events by era</h2><p>Filter events by era or text. All data is loaded from generated local JavaScript for file:// support.</p></div>\n' +
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

  const body = renderTimelineVisualSection() + filters + groups + '\n</div></div></section>';
  writeFile("timeline.html", pageLayout({
    title: "Timeline - Bible Timeline",
    description: "Full chronological Bible timeline with client-side filters.",
    rootPrefix: "",
    timelineScript: true,
    timelineVisualScript: true,
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
  const eventJourneys = journeysByEvent.get(event.id) || [];
  const journeySection = eventJourneys.length
    ? '<section class="content-panel"><h2>Journey Maps</h2><ul class="link-list">' + eventJourneys.map((journey) => '<li>' + linkToJourney(rootPrefix, journey) + '</li>').join("") + '</ul></section>\n'
    : "";
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">' + escapeHtml(event.era) + '</span><h1>' + escapeHtml(event.name) + '</h1><p>' + linkifyReference(event.reference) + '</p></div>\n' +
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
    '<section class="content-panel"><h2>Bible References</h2><p>' + linkifyReference(event.reference) + '</p>' + referenceList(event.crossReferences) + '</section>\n' +
    '<section class="content-panel"><h2>Summary</h2><p>' + escapeHtml(event.summary) + '</p>' + paragraphs(event.longDescription) + '</section>\n' +
    '<section class="content-panel"><h2>Historical Background</h2>' + paragraphs(event.historicalNotes) + '</section>\n' +
    '<section class="content-panel"><h2>Timeline Connections</h2><p>' +
      (event.prevEvent ? "&larr; " + linkTo(rootPrefix, "event", event.prevEvent) : "No previous event") +
      " | " +
      (event.nextEvent ? linkTo(rootPrefix, "event", event.nextEvent) + " &rarr;" : "No next event") +
      '</p><h3>Related Events</h3>' + listLinks(rootPrefix, "event", event.relatedEvents) + '</section>\n' +
    journeySection +
    '<section class="content-panel"><h2>Related People</h2>' + listLinks(rootPrefix, "person", event.relatedPeople) + '</section>\n' +
    '<section class="content-panel"><h2>Related Locations</h2>' + listLinks(rootPrefix, "place", event.relatedPlaces) + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "event", event.id) +
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
    '<section class="content-panel"><h2>References</h2>' + referenceList(person.references) + '</section>\n' +
    '<section class="content-panel"><h2>Related People</h2>' + listLinks(rootPrefix, "person", person.relatedPeople) + '</section>\n' +
    '<section class="content-panel"><h2>Related Places</h2>' + listLinks(rootPrefix, "place", person.relatedPlaces) + '</section>\n' +
    '<section class="content-panel"><h2>Books Appeared In</h2>' + listLinks(rootPrefix, "book", person.books) + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "person", person.id) +
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
    '<section class="content-panel"><h2>References</h2>' + referenceList(place.references) + '</section>\n' +
    '<section class="content-panel"><h2>Related Places</h2>' + listLinks(rootPrefix, "place", place.relatedPlaces) + '</section>\n' +
    '<section class="content-panel"><h2>Photo</h2><div class="photo-placeholder">Photo placeholder</div></section>\n' +
    renderConnectionsPanel(rootPrefix, "place", place.id) +
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
    '<section class="content-panel"><h2>Key Verses</h2>' + referenceList(book.keyVerses) + '</section>\n' +
    '<section class="content-panel"><h2>Related Books</h2>' + ((book.connections || []).length ? '<ul>' + book.connections.map((connection) => '<li>' + linkTo(rootPrefix, "book", connection.bookId) + ' - ' + escapeHtml(connection.note) + '</li>').join("") + '</ul>' : '<p>None listed.</p>') + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "book", book.id) +
    '</div></section>';

  writeFile("books/" + book.id + ".html", pageLayout({
    title: book.name + " - Bible Timeline",
    rootPrefix,
    body
  }));
}

function prophecyTypeLabel(type) {
  const labels = {
    narrative: "fulfilled within the narrative",
    "nt-cited": "cited in the NT",
    historical: "historical fulfillment",
    debated: "interpretation debated"
  };
  return labels[type] || type || "fulfillment";
}

function renderNationPage(nation) {
  const rootPrefix = "../";
  const territory = Array.from(new Set((nation.capital ? [nation.capital] : []).concat(nation.territoryPlaces || [])));
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">' + escapeHtml(nation.dateRange) + '</span><h1>' + escapeHtml(nation.name) + '</h1><p>' + escapeHtml(nation.description) + '</p></div>\n' +
    '<section class="content-panel"><h2>Historical Arc</h2><p>' + escapeHtml(nation.fate || "None listed.") + '</p></section>\n' +
    '<section class="content-panel"><h2>Capital and Territory</h2>' + metaRows([
      ["Capital", nation.capital ? linkTo(rootPrefix, "place", nation.capital) : "None listed."]
    ]) + '<h3>Territory</h3>' + listLinks(rootPrefix, "place", territory) + '</section>\n' +
    '<section class="content-panel"><h2>Kings</h2>' + listLinks(rootPrefix, "person", nation.kings) + '</section>\n' +
    '<section class="content-panel"><h2>Prophets Sent to Them</h2>' + listTypedLinks(rootPrefix, nation.prophets, "person", "personId", "note", "reference") + '</section>\n' +
    '<section class="content-panel"><h2>Key Events</h2>' + listLinks(rootPrefix, "event", nation.events) + '</section>\n' +
    '<section class="content-panel"><h2>Related Nations</h2>' + listLinks(rootPrefix, "nation", nation.relatedNations) + '</section>\n' +
    '<section class="content-panel"><h2>References</h2>' + referenceList(nation.references) + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "nation", nation.id) +
    '</div></section>';

  writeFile("nations/" + nation.id + ".html", pageLayout({
    title: nation.name + " - Bible Timeline",
    description: nation.description,
    rootPrefix,
    body
  }));
}

function renderProphecyPage(prophecy) {
  const rootPrefix = "../";
  const subject = prophecy.subject ? linkTo(rootPrefix, prophecy.subject.type, prophecy.subject.id) : "None listed.";
  const fulfillments = (prophecy.fulfillments || []).length
    ? '<ul>' + prophecy.fulfillments.map((fulfillment) => '<li><span class="badge">' + escapeHtml(prophecyTypeLabel(fulfillment.type)) + '</span> <strong>' + linkifyReference(fulfillment.reference) + '</strong>' +
      (fulfillment.eventId ? ' - ' + linkTo(rootPrefix, "event", fulfillment.eventId) : "") +
      (fulfillment.note ? '<br><span class="muted">' + escapeHtml(fulfillment.note) + '</span>' : "") + '</li>').join("") + '</ul>'
    : '<p>None listed.</p>';
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Prophecy</span><h1>' + escapeHtml(prophecy.name) + '</h1><p>' + escapeHtml(prophecy.summary) + '</p></div>\n' +
    '<section class="content-panel"><h2>Given</h2>' + metaRows([
      ["Reference", linkifyReference(prophecy.givenReference)],
      ["Spoken By", escapeHtml(prophecy.spokenBy || "None listed")],
      ["Prophet", prophecy.prophetId ? linkTo(rootPrefix, "person", prophecy.prophetId) : escapeHtml(prophecy.spokenBy || "None listed")],
      ["Given Event", prophecy.givenEvent ? linkTo(rootPrefix, "event", prophecy.givenEvent) : "None listed."],
      ["Recorded Book", prophecy.recordedBook ? linkTo(rootPrefix, "book", prophecy.recordedBook) : "None listed."]
    ]) + '</section>\n' +
    '<section class="content-panel"><h2>Subject</h2><p>' + subject + '</p></section>\n' +
    '<section class="content-panel"><h2>Fulfillments</h2>' + fulfillments + '</section>\n' +
    '<section class="content-panel"><h2>Status</h2><p>' + escapeHtml(prophecy.status || "None listed.") + '</p></section>\n' +
    '<section class="content-panel"><h2>Themes</h2>' + listLinks(rootPrefix, "theme", prophecy.themes) + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "prophecy", prophecy.id) +
    '</div></section>';

  writeFile("prophecies/" + prophecy.id + ".html", pageLayout({
    title: prophecy.name + " - Bible Timeline",
    description: prophecy.summary,
    rootPrefix,
    body
  }));
}

function renderThemePage(theme) {
  const rootPrefix = "../";
  const prophecies = data.prophecies.filter((prophecy) => (prophecy.themes || []).indexOf(theme.id) !== -1);
  const verses = (theme.keyVerses || []).length
    ? '<ul>' + theme.keyVerses.map((verse) => '<li><strong>' + linkifyReference(verse.reference) + '</strong> - ' + escapeHtml(verse.note || "") + '</li>').join("") + '</ul>'
    : '<p>None listed.</p>';
  const body = '<section class="section"><div class="container">\n' +
    '<div class="page-title"><span class="badge">Theme</span><h1>' + escapeHtml(theme.name) + '</h1><p>' + escapeHtml(theme.description) + '</p></div>\n' +
    '<section class="content-panel"><h2>Key Verses</h2>' + verses + '</section>\n' +
    '<section class="content-panel"><h2>Events</h2>' + listLinks(rootPrefix, "event", theme.events) + '</section>\n' +
    '<section class="content-panel"><h2>People</h2>' + listLinks(rootPrefix, "person", theme.people) + '</section>\n' +
    '<section class="content-panel"><h2>Related Themes</h2>' + listLinks(rootPrefix, "theme", theme.relatedThemes) + '</section>\n' +
    '<section class="content-panel"><h2>Prophecies That Develop This Theme</h2>' + listLinks(rootPrefix, "prophecy", prophecies.map((prophecy) => prophecy.id)) + '</section>\n' +
    renderConnectionsPanel(rootPrefix, "theme", theme.id) +
    '</div></section>';

  writeFile("themes/" + theme.id + ".html", pageLayout({
    title: theme.name + " - Bible Timeline",
    description: theme.description,
    rootPrefix,
    body
  }));
}

function renderNationsBrowse() {
  const cards = sortByName(data.nations).map((nation) => (
    '<article class="card"><span class="badge">' + escapeHtml(nation.dateRange) + '</span><h3>' + linkTo("", "nation", nation.id) + '</h3><p>' + escapeHtml(firstSentence(nation.description)) + '</p></article>'
  )).join("");
  renderBrowsePage("nations.html", "Nations", "Nations and kingdoms connected to the Bible timeline.", '<section class="content-panel"><h2>All Nations</h2><div class="grid">' + cards + '</div></section>\n');
}

function prophecyGroup(prophecy) {
  if (prophecy.prophetId === "jesus") return "Spoken by Jesus";
  if ((prophecy.subject && prophecy.subject.type === "person" && prophecy.subject.id === "jesus") || (prophecy.themes || []).indexOf("messiah") !== -1) return "Messianic";
  return "National & historical";
}

function renderPropheciesBrowse() {
  const groups = ["Messianic", "National & historical", "Spoken by Jesus"].map((label) => {
    const prophecies = data.prophecies.filter((prophecy) => prophecyGroup(prophecy) === label).sort((a, b) => a.name.localeCompare(b.name));
    return '<section class="content-panel"><h2>' + escapeHtml(label) + '</h2><div class="grid">' + prophecies.map((prophecy) => (
      '<article class="card"><h3>' + linkTo("", "prophecy", prophecy.id) + '</h3><p><strong>' + linkifyReference(prophecy.givenReference) + '</strong></p><p>' + escapeHtml(firstSentence(prophecy.summary)) + '</p></article>'
    )).join("") + '</div></section>\n';
  }).join("");
  renderBrowsePage("prophecies.html", "Prophecies", "Prophecies with subjects, fulfillments, and theme links.", groups);
}

function renderThemesBrowse() {
  const cards = sortByName(data.themes).map((theme) => (
    '<article class="card"><h3>' + linkTo("", "theme", theme.id) + '</h3><p>' + escapeHtml(firstSentence(theme.description)) + '</p></article>'
  )).join("");
  renderBrowsePage("themes.html", "Themes", "Biblical themes connected to events, people, and prophecies.", '<section class="content-panel"><h2>All Themes</h2><div class="grid">' + cards + '</div></section>\n');
}

function renderGraphPage() {
  const body = '<section class="section"><div class="container graph-page">\n' +
    '<div class="page-title"><span class="badge">Explorer</span><h1>Cross-Reference Graph</h1><p>Explore typed links between events, people, places, books, journeys, nations, prophecies, and themes.</p></div>\n' +
    '<section class="content-panel graph-controls" aria-label="Graph controls">\n' +
    '  <label>Center node <input data-node-search list="graph-node-list" type="search" placeholder="Person: Jesus"></label>\n' +
    '  <datalist id="graph-node-list"></datalist>\n' +
    '  <label>Depth <select data-depth><option value="1">1 step</option><option value="2">2 steps</option></select></label>\n' +
    '  <fieldset><legend>Types</legend><div data-type-filters></div></fieldset>\n' +
    '  <label>Relations <select data-relation-filter multiple size="6"></select></label>\n' +
    '</section>\n' +
    '<section class="content-panel graph-shell">\n' +
    '  <div class="panel-heading"><div><h2 data-current-title>Graph</h2><p class="muted" data-current-meta></p></div><a data-current-link href="#">Open page</a></div>\n' +
    '  <p class="muted" data-render-note></p>\n' +
    '  <div data-graph-legend class="graph-legend"></div>\n' +
    '  <svg data-graph-svg class="graph-svg" role="img" aria-label="Bible cross-reference graph"></svg>\n' +
    '</section>\n' +
    '</div></section>';
  writeFile("graph.html", pageLayout({
    title: "Graph Explorer - Bible Timeline",
    description: "Offline graph explorer for Bible Timeline data.",
    rootPrefix: "",
    body,
    graphScript: true
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
    })),
    journeys: data.journeys.map((journey) => ({
      id: journey.id,
      type: "journey",
      name: journey.name,
      date: "",
      era: journey.era,
      reference: journey.reference,
      keywords: [journey.era].filter(Boolean),
      summary: journey.summary,
      url: slugPath("journey", journey.id)
    })),
    nations: data.nations.map((nation) => ({
      id: nation.id,
      type: "nation",
      name: nation.name,
      date: nation.dateRange,
      era: nation.dateRange,
      reference: (nation.references || []).join("; "),
      keywords: [],
      summary: nation.description,
      url: slugPath("nation", nation.id)
    })),
    prophecies: data.prophecies.map((prophecy) => ({
      id: prophecy.id,
      type: "prophecy",
      name: prophecy.name,
      date: prophecy.givenReference,
      era: prophecy.status || "",
      reference: prophecy.givenReference,
      keywords: [prophecy.spokenBy].concat(prophecy.themes || []).filter(Boolean),
      summary: prophecy.summary,
      url: slugPath("prophecy", prophecy.id)
    })),
    themes: data.themes.map((theme) => ({
      id: theme.id,
      type: "theme",
      name: theme.name,
      date: "",
      era: "",
      reference: (theme.keyVerses || []).map((verse) => verse.reference).join("; "),
      keywords: [],
      summary: theme.description,
      url: slugPath("theme", theme.id)
    }))
  };

  writeFile("js/data.js", "window.BIBLE_DATA = " + JSON.stringify(compact) + ";\n");
}

function emitGraphData() {
  const graph = { nodes: graphModel.nodes, edges: graphModel.edges };
  writeFile("js/graph-data.js", "window.BIBLE_GRAPH = " + JSON.stringify(graph) + ";\n");
  writeFile("data/graph.json", JSON.stringify(graph, null, 2) + "\n");
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
    })),
    journeys: data.journeys
  };

  writeFile("js/map-data.js", "window.BIBLE_MAP = " + JSON.stringify(mapData) + ";\n");
}

function pruneOrphanPages() {
  const dirToIds = {
    events: new Set(data.events.map((item) => item.id)),
    people: new Set(data.people.map((item) => item.id)),
    locations: new Set(data.places.map((item) => item.id)),
    journeys: new Set(data.journeys.map((item) => item.id)),
    books: new Set(data.books.map((item) => item.id)),
    nations: new Set(data.nations.map((item) => item.id)),
    prophecies: new Set(data.prophecies.map((item) => item.id)),
    themes: new Set(data.themes.map((item) => item.id))
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
  ["events", "people", "locations", "journeys", "books", "nations", "prophecies", "themes", "js", "js/kjv"].forEach(ensureDir);
  validateData();
  availableKjvBooks = validateKjvData();
  emitKjvJs();
  graphModel = buildGraphModel();
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
  renderNationsBrowse();
  renderPropheciesBrowse();
  renderThemesBrowse();
  renderJourneysBrowse();
  renderMapsBrowse();
  renderGraphPage();
  data.events.forEach(renderEventPage);
  data.people.forEach(renderPersonPage);
  data.places.forEach(renderPlacePage);
  data.journeys.forEach(renderJourneyPage);
  data.books.forEach(renderBookPage);
  data.nations.forEach(renderNationPage);
  data.prophecies.forEach(renderProphecyPage);
  data.themes.forEach(renderThemePage);
  emitDataJs();
  emitMapDataJs();
  emitGraphData();

  console.log("Generated " + data.events.length + " event pages.");
  console.log("Generated " + data.people.length + " person pages.");
  console.log("Generated " + data.places.length + " location pages.");
  console.log("Generated " + data.journeys.length + " journey pages.");
  console.log("Generated " + data.books.length + " book pages.");
  console.log("Generated " + data.nations.length + " nation pages.");
  console.log("Generated " + data.prophecies.length + " prophecy pages.");
  console.log("Generated " + data.themes.length + " theme pages.");
  console.log("Generated timeline.html, index.html, browse pages, graph.html, js/data.js, js/map-data.js, and js/graph-data.js.");

  if (warnings > 0) {
    console.log("Completed with " + warnings + " warning(s).");
    if (strict) {
      process.exit(1);
    }
  } else {
    console.log("Completed with no warnings.");
  }
}

build();
