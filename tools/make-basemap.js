// Build data/geo/basemap.json from Natural Earth 50m GeoJSON (public domain).
// One-time data prep; the generated basemap.json is committed so normal builds
// never need these inputs or network access.
//
// Usage: node tools/make-basemap.js <dir-with-ne_50m_*.geojson>
//   needs: ne_50m_land.geojson, ne_50m_lakes.geojson, ne_50m_rivers_lake_centerlines.geojson
//   from https://github.com/nvkelso/natural-earth-vector (public domain)

const fs = require("fs");
const path = require("path");

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("usage: node tools/make-basemap.js <dir-with-ne_50m_*.geojson>");
  process.exit(1);
}

// Region: Rome/Malta west, Susa east, Upper Egypt south, Black Sea coast north.
const BBOX = { W: 9, E: 50, S: 25, N: 43.5 };

function readGeo(name) {
  return JSON.parse(fs.readFileSync(path.join(srcDir, name), "utf8"));
}

// Sutherland–Hodgman polygon clip against the bbox.
function clipRing(ring) {
  const edges = [
    { inside: (p) => p[0] >= BBOX.W, cross: (a, b) => [BBOX.W, a[1] + ((BBOX.W - a[0]) * (b[1] - a[1])) / (b[0] - a[0])] },
    { inside: (p) => p[0] <= BBOX.E, cross: (a, b) => [BBOX.E, a[1] + ((BBOX.E - a[0]) * (b[1] - a[1])) / (b[0] - a[0])] },
    { inside: (p) => p[1] >= BBOX.S, cross: (a, b) => [a[0] + ((BBOX.S - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), BBOX.S] },
    { inside: (p) => p[1] <= BBOX.N, cross: (a, b) => [a[0] + ((BBOX.N - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), BBOX.N] }
  ];
  let out = ring;
  for (const e of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (e.inside(cur)) {
        if (!e.inside(prev)) out.push(e.cross(prev, cur));
        out.push(cur);
      } else if (e.inside(prev)) {
        out.push(e.cross(prev, cur));
      }
    }
    if (out.length === 0) return [];
  }
  return out;
}

// Split a polyline into the segments that lie inside the bbox.
function clipLine(coords) {
  const inside = (p) => p[0] >= BBOX.W && p[0] <= BBOX.E && p[1] >= BBOX.S && p[1] <= BBOX.N;
  const parts = [];
  let cur = [];
  for (const p of coords) {
    if (inside(p)) {
      cur.push(p);
    } else if (cur.length) {
      parts.push(cur);
      cur = [];
    }
  }
  if (cur.length) parts.push(cur);
  return parts.filter((part) => part.length >= 2);
}

// Douglas–Peucker simplification (tolerance in degrees).
function simplify(points, tol) {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      // Degenerate anchor (closed ring: first == last): fall back to point distance.
      const d = len < 1e-9
        ? Math.hypot(points[i][0] - ax, points[i][1] - ay)
        : Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function round(points) {
  return points.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
}

// Rings are stored unclosed (renderer closes with Z); drop a duplicate last point.
function unclose(ring) {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 1 && first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function polygons(feature) {
  const g = feature.geometry;
  if (g.type === "Polygon") return [g.coordinates[0]];
  if (g.type === "MultiPolygon") return g.coordinates.map((poly) => poly[0]);
  return [];
}

function lines(feature) {
  const g = feature.geometry;
  if (g.type === "LineString") return [g.coordinates];
  if (g.type === "MultiLineString") return g.coordinates;
  return [];
}

const land = [];
for (const f of readGeo("ne_50m_land.geojson").features) {
  for (const ring of polygons(f)) {
    const clipped = unclose(clipRing(ring));
    if (clipped.length < 4) continue;
    const simple = round(simplify(clipped, 0.03));
    if (simple.length >= 4) land.push(simple);
  }
}

const lakes = [];
for (const f of readGeo("ne_50m_lakes.geojson").features) {
  for (const ring of polygons(f)) {
    const clipped = unclose(clipRing(ring));
    if (clipped.length < 4) continue;
    const simple = round(simplify(clipped, 0.008));
    if (simple.length >= 4) lakes.push(simple);
  }
}

const rivers = [];
for (const f of readGeo("ne_50m_rivers_lake_centerlines.geojson").features) {
  for (const line of lines(f)) {
    for (const part of clipLine(line)) {
      const simple = round(simplify(part, 0.02));
      if (simple.length >= 2) rivers.push(simple);
    }
  }
}

const out = {
  source: "Natural Earth 50m (public domain), clipped and simplified by tools/make-basemap.js",
  bbox: BBOX,
  land: land,
  lakes: lakes,
  rivers: rivers
};

const outPath = path.join(__dirname, "..", "data", "geo", "basemap.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(
  "wrote data/geo/basemap.json (" + kb + " KB): " +
  land.length + " land rings, " + lakes.length + " lakes, " + rivers.length + " river segments"
);
