const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readJsonOrFallback(relativePath, fallback) {
  try {
    return readJson(relativePath);
  } catch (error) {
    return fallback;
  }
}

const data = {
  events: readJsonOrFallback("data/events.json", []),
  people: readJsonOrFallback("data/people.json", []),
  places: readJsonOrFallback("data/places.json", []),
  books: readJsonOrFallback("data/books.json", []),
  nations: readJsonOrFallback("data/nations.json", []),
  prophecies: readJsonOrFallback("data/prophecies.json", []),
  themes: readJsonOrFallback("data/themes.json", []),
  journeys: readJsonOrFallback("data/journeys.json", []),
  reigns: readJsonOrFallback("data/reigns.json", []),
  connections: readJsonOrFallback("data/connections.json", { edges: [] }),
  categories: readJsonOrFallback("data/categories.json", { miracles: [], parables: [] }),
  timeline: readJsonOrFallback("data/timeline.json", []),
  graph: readJsonOrFallback("data/graph.json", { nodes: [], edges: [] })
};

const maps = {
  event: new Map(data.events.map((item) => [item.id, item])),
  person: new Map(data.people.map((item) => [item.id, item])),
  place: new Map(data.places.map((item) => [item.id, item])),
  book: new Map(data.books.map((item) => [item.id, item])),
  nation: new Map(data.nations.map((item) => [item.id, item])),
  prophecy: new Map(data.prophecies.map((item) => [item.id, item])),
  theme: new Map(data.themes.map((item) => [item.id, item]))
};

function walkFiles(dir, shouldSkipDir) {
  const files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir || !shouldSkipDir(fullPath, entry.name)) {
        files.push(...walkFiles(fullPath, shouldSkipDir));
      }
      return;
    }
    if (entry.isFile()) files.push(fullPath);
  });
  return files;
}

function rel(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function nullable(value) {
  return value == null || value === "";
}

function requireRef(errors, context, type, id, nullableAllowed) {
  if (nullableAllowed && nullable(id)) return;
  if (nullable(id)) {
    errors.push(context + " references empty " + type + " id");
    return;
  }
  if (!maps[type] || !maps[type].has(id)) {
    errors.push(context + " references missing " + type + " id '" + id + "'");
  }
}

function requireRefs(errors, context, type, ids) {
  list(ids).forEach((id) => requireRef(errors, context, type, id, false));
}

function uniqueIds(errors, label, items) {
  const seen = new Map();
  items.forEach((item, index) => {
    if (nullable(item.id)) {
      errors.push(label + "[" + index + "] has empty id");
      return;
    }
    if (seen.has(item.id)) {
      errors.push(label + " duplicate id '" + item.id + "' at indexes " + seen.get(item.id) + " and " + index);
      return;
    }
    seen.set(item.id, index);
  });
}

function checkJsonValidity() {
  const errors = [];
  walkFiles(dataDir).filter((file) => file.endsWith(".json")).forEach((file) => {
    try {
      JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      errors.push(rel(file) + ": " + error.message);
    }
  });
  return errors;
}

function checkUniqueIds() {
  const errors = [];
  ["events", "people", "places", "books", "nations", "prophecies", "themes"].forEach((collection) => {
    uniqueIds(errors, collection, data[collection]);
  });
  uniqueIds(errors, "reigns", data.reigns);
  uniqueIds(errors, "journeys", data.journeys);
  return errors;
}

function checkCrossReferences() {
  const errors = [];

  data.events.forEach((event) => {
    const context = "event '" + event.id + "'";
    requireRef(errors, context + ".book", "book", event.book, false);
    if (event.location) requireRef(errors, context + ".location.placeId", "place", event.location.placeId, false);
    requireRefs(errors, context + ".mainPeople", "person", event.mainPeople);
    requireRefs(errors, context + ".relatedPeople", "person", event.relatedPeople);
    requireRefs(errors, context + ".relatedPlaces", "place", event.relatedPlaces);
    requireRefs(errors, context + ".relatedEvents", "event", event.relatedEvents);
    requireRef(errors, context + ".prevEvent", "event", event.prevEvent, true);
    requireRef(errors, context + ".nextEvent", "event", event.nextEvent, true);
  });

  data.people.forEach((person) => {
    const context = "person '" + person.id + "'";
    requireRefs(errors, context + ".parents", "person", person.parents);
    requireRefs(errors, context + ".children", "person", person.children);
    requireRefs(errors, context + ".spouses", "person", person.spouses);
    requireRefs(errors, context + ".relatedPeople", "person", person.relatedPeople);
    requireRefs(errors, context + ".events", "event", person.events);
    requireRefs(errors, context + ".relatedPlaces", "place", person.relatedPlaces);
    requireRefs(errors, context + ".books", "book", person.books);
  });

  data.places.forEach((place) => {
    const context = "place '" + place.id + "'";
    requireRefs(errors, context + ".events", "event", place.events);
    requireRefs(errors, context + ".people", "person", place.people);
    requireRefs(errors, context + ".relatedPlaces", "place", place.relatedPlaces);
  });

  data.books.forEach((book) => {
    const context = "book '" + book.id + "'";
    requireRefs(errors, context + ".majorEvents", "event", book.majorEvents);
    requireRefs(errors, context + ".majorPeople", "person", book.majorPeople);
    requireRefs(errors, context + ".majorPlaces", "place", book.majorPlaces);
    list(book.connections).forEach((connection, index) => {
      requireRef(errors, context + ".connections[" + index + "].bookId", "book", connection.bookId, false);
    });
  });

  data.nations.forEach((nation) => {
    const context = "nation '" + nation.id + "'";
    requireRef(errors, context + ".capital", "place", nation.capital, true);
    requireRefs(errors, context + ".territoryPlaces", "place", nation.territoryPlaces);
    requireRefs(errors, context + ".kings", "person", nation.kings);
    list(nation.prophets).forEach((prophet, index) => {
      requireRef(errors, context + ".prophets[" + index + "].personId", "person", prophet.personId, false);
    });
    requireRefs(errors, context + ".events", "event", nation.events);
    requireRefs(errors, context + ".relatedNations", "nation", nation.relatedNations);
    requireRefs(errors, context + ".notablePeople", "person", nation.notablePeople);
  });

  data.prophecies.forEach((prophecy) => {
    const context = "prophecy '" + prophecy.id + "'";
    requireRef(errors, context + ".prophetId", "person", prophecy.prophetId, true);
    requireRef(errors, context + ".givenEvent", "event", prophecy.givenEvent, true);
    requireRef(errors, context + ".recordedBook", "book", prophecy.recordedBook, false);
    if (!prophecy.subject || !maps[prophecy.subject.type]) {
      errors.push(context + ".subject has unknown type '" + (prophecy.subject && prophecy.subject.type) + "'");
    } else {
      requireRef(errors, context + ".subject", prophecy.subject.type, prophecy.subject.id, false);
    }
    list(prophecy.fulfillments).forEach((fulfillment, index) => {
      requireRef(errors, context + ".fulfillments[" + index + "].eventId", "event", fulfillment.eventId, true);
    });
    requireRefs(errors, context + ".themes", "theme", prophecy.themes);
  });

  data.themes.forEach((theme) => {
    const context = "theme '" + theme.id + "'";
    requireRefs(errors, context + ".events", "event", theme.events);
    requireRefs(errors, context + ".people", "person", theme.people);
    requireRefs(errors, context + ".relatedThemes", "theme", theme.relatedThemes);
  });

  data.journeys.forEach((journey) => {
    const context = "journey '" + journey.id + "'";
    list(journey.routes).forEach((route, routeIndex) => {
      list(route.stops).forEach((stop, stopIndex) => {
        requireRef(errors, context + ".routes[" + routeIndex + "].stops[" + stopIndex + "].placeId", "place", stop.placeId, true);
      });
    });
    requireRefs(errors, context + ".relatedEvents", "event", journey.relatedEvents);
    requireRefs(errors, context + ".relatedPeople", "person", journey.relatedPeople);
  });

  data.reigns.forEach((reign) => {
    requireRef(errors, "reign '" + reign.id + "'.id", "person", reign.id, false);
  });

  list(data.connections.edges).forEach((edge, index) => {
    ["from", "to"].forEach((side) => {
      const endpoint = edge[side];
      const context = "connections.edges[" + index + "]." + side;
      if (!endpoint || !maps[endpoint.type]) {
        errors.push(context + " has unknown type '" + (endpoint && endpoint.type) + "'");
        return;
      }
      requireRef(errors, context, endpoint.type, endpoint.id, false);
    });
  });

  list(data.categories.miracles).forEach((miracle, index) => {
    requireRef(errors, "categories.miracles[" + index + "].eventId", "event", miracle.eventId, false);
  });
  list(data.categories.parables).forEach((parable, index) => {
    requireRef(errors, "categories.parables[" + index + "].eventId", "event", parable.eventId, true);
  });

  data.timeline.forEach((era, index) => {
    requireRefs(errors, "timeline[" + index + "].eventIds", "event", era.eventIds);
  });

  return errors;
}

function checkEventChronology() {
  const errors = [];
  const byOrder = new Map();
  data.events.forEach((event) => {
    if (!Number.isInteger(event.order)) {
      errors.push("event '" + event.id + "' has non-integer order '" + event.order + "'");
      return;
    }
    if (byOrder.has(event.order)) {
      errors.push("order " + event.order + " used by '" + byOrder.get(event.order).id + "' and '" + event.id + "'");
      return;
    }
    byOrder.set(event.order, event);
  });

  for (let order = 1; order <= data.events.length; order += 1) {
    if (!byOrder.has(order)) errors.push("missing event order " + order);
  }

  const ordered = data.events.slice().sort((a, b) => a.order - b.order);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (!(current.dateSort > previous.dateSort)) {
      errors.push("dateSort not strictly increasing between order " + previous.order + " '" + previous.id + "' (" + previous.dateSort + ") and order " + current.order + " '" + current.id + "' (" + current.dateSort + ")");
    }
  }

  ordered.forEach((event, index) => {
    const expectedPrev = index === 0 ? null : ordered[index - 1].id;
    const expectedNext = index === ordered.length - 1 ? null : ordered[index + 1].id;
    if (event.prevEvent !== expectedPrev) {
      errors.push("event '" + event.id + "' order " + event.order + " prevEvent is '" + event.prevEvent + "', expected '" + expectedPrev + "'");
    }
    if (event.nextEvent !== expectedNext) {
      errors.push("event '" + event.id + "' order " + event.order + " nextEvent is '" + event.nextEvent + "', expected '" + expectedNext + "'");
    }
    if (event.nextEvent) {
      const next = maps.event.get(event.nextEvent);
      if (next && next.order !== event.order + 1) {
        errors.push("event '" + event.id + "' nextEvent '" + event.nextEvent + "' has order " + next.order + ", expected " + (event.order + 1));
      }
    }
  });

  return errors;
}

function checkFamilySymmetry() {
  const errors = [];
  data.people.forEach((person) => {
    list(person.children).forEach((childId) => {
      const child = maps.person.get(childId);
      if (child && !list(child.parents).includes(person.id)) {
        errors.push("person '" + person.id + "' lists child '" + childId + "', but child does not list this parent");
      }
    });
    list(person.parents).forEach((parentId) => {
      const parent = maps.person.get(parentId);
      if (parent && !list(parent.children).includes(person.id)) {
        errors.push("person '" + person.id + "' lists parent '" + parentId + "', but parent does not list this child");
      }
    });
    list(person.spouses).forEach((spouseId) => {
      const spouse = maps.person.get(spouseId);
      if (spouse && !list(spouse.spouses).includes(person.id)) {
        errors.push("person '" + person.id + "' lists spouse '" + spouseId + "', but spouse does not list this spouse");
      }
    });
  });
  return errors;
}

function checkReignSanity() {
  const errors = [];
  const validTypes = new Set(["king", "prophet"]);
  data.reigns.forEach((reign) => {
    if (typeof reign.start !== "number" || typeof reign.end !== "number") {
      errors.push("reign '" + reign.id + "' start/end must be numeric; got start='" + reign.start + "' end='" + reign.end + "'");
    } else if (!(reign.start < reign.end)) {
      errors.push("reign '" + reign.id + "' start " + reign.start + " must be less than end " + reign.end);
    }
    if (!validTypes.has(reign.type)) {
      errors.push("reign '" + reign.id + "' has invalid type '" + reign.type + "'");
    }
  });
  return errors;
}

function checkProphecySanity() {
  const errors = [];
  const validFulfillmentTypes = new Set(["narrative", "nt-cited", "historical", "debated"]);
  const validSubjectTypes = new Set(["person", "nation", "place", "event"]);
  data.prophecies.forEach((prophecy) => {
    if (!prophecy.subject || !validSubjectTypes.has(prophecy.subject.type)) {
      errors.push("prophecy '" + prophecy.id + "' has invalid subject.type '" + (prophecy.subject && prophecy.subject.type) + "'");
    }
    list(prophecy.fulfillments).forEach((fulfillment, index) => {
      if (!validFulfillmentTypes.has(fulfillment.type)) {
        errors.push("prophecy '" + prophecy.id + "' fulfillment[" + index + "] has invalid type '" + fulfillment.type + "'");
      }
    });
  });
  return errors;
}

function checkGeneratedGraphIntegrity() {
  const errors = [];
  const nodeKeys = new Set(list(data.graph.nodes).map((node) => node.key || (node.type + ":" + node.id)));
  let dangling = 0;
  list(data.graph.edges).forEach((edge, index) => {
    const source = edge.s || edge.from;
    const target = edge.t || edge.to;
    [["source", source], ["target", target]].forEach(([label, endpoint]) => {
      const key = typeof endpoint === "string" ? endpoint : endpoint && endpoint.type && endpoint.id ? endpoint.type + ":" + endpoint.id : null;
      if (!key || !nodeKeys.has(key)) {
        dangling += 1;
        errors.push("graph edge[" + index + "] " + label + " endpoint '" + JSON.stringify(endpoint) + "' is not a node key");
      }
    });
  });
  if (dangling > 0) {
    errors.unshift("data/graph.json has " + dangling + " dangling endpoint(s)");
  }
  return errors;
}

function stripLinkSuffix(target) {
  return target.split("#")[0].split("?")[0];
}

function isExternalTarget(target) {
  return /^(https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(target);
}

function checkInternalLinkResolution() {
  const errors = [];
  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  const htmlFiles = walkFiles(rootDir, (dirPath, name) => name === ".git" || name === "node_modules")
    .filter((file) => file.endsWith(".html"));

  htmlFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = attrPattern.exec(content)) !== null) {
      const rawTarget = match[1].trim();
      if (!rawTarget || isExternalTarget(rawTarget)) continue;
      const withoutFragment = stripLinkSuffix(rawTarget);
      const resolved = withoutFragment
        ? path.resolve(path.dirname(file), withoutFragment)
        : file;
      if (!fs.existsSync(resolved)) {
        errors.push(rel(file) + " -> " + rawTarget + " resolves to missing " + rel(resolved));
      }
    }
  });
  return errors;
}

function isTextFile(file) {
  return /\.(css|html|js|json|md|svg|txt|ya?ml)$/i.test(file);
}

function checkNoStrayConflictMarkers() {
  const errors = [];
  const files = walkFiles(rootDir, (dirPath, name) => name === ".git" || name === "node_modules")
    .filter(isTextFile);
  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^(<<<<<<< |=======|>>>>>>> )/.test(line)) {
        errors.push(rel(file) + ":" + (index + 1) + " contains merge conflict marker");
      }
    });
    if (file.endsWith(".html") && content.includes("&lt;a ")) {
      errors.push(rel(file) + " contains double-escaped anchor '&lt;a '");
    }
  });
  return errors;
}

const checks = [
  ["JSON validity", checkJsonValidity],
  ["Unique ids", checkUniqueIds],
  ["Cross-reference resolution", checkCrossReferences],
  ["Event chronology", checkEventChronology],
  ["Family symmetry", checkFamilySymmetry],
  ["Reign sanity", checkReignSanity],
  ["Prophecy sanity", checkProphecySanity],
  ["Generated graph integrity", checkGeneratedGraphIntegrity],
  ["Internal link resolution", checkInternalLinkResolution],
  ["No stray conflict markers", checkNoStrayConflictMarkers]
];

let passed = 0;
let failures = 0;

checks.forEach(([name, check]) => {
  let errors = [];
  try {
    errors = check();
  } catch (error) {
    errors = [error.stack || error.message];
  }

  if (errors.length === 0) {
    passed += 1;
    console.log("✓ " + name);
    return;
  }

  failures += 1;
  console.log("✗ " + name + ": " + errors[0]);
  errors.slice(1).forEach((error) => console.log("  - " + error));
});

console.log("");
console.log(passed + " checks passed");
console.log(failures + " failures");

if (failures > 0) {
  process.exit(1);
}
