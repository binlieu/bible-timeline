(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";
  var XLINK_NS = "http://www.w3.org/1999/xlink";
  var FULL_WIDTH = 1000;
  var MINI_LNG_RADIUS = 3.5;

  function mapData() {
    return window.BIBLE_MAP && window.BIBLE_MAP.bbox ? window.BIBLE_MAP : null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function midLat(bbox) {
    return (bbox.S + bbox.N) / 2;
  }

  function mapHeight(width, bbox) {
    var cosMid = Math.cos(midLat(bbox) * Math.PI / 180);
    return width * (bbox.N - bbox.S) / ((bbox.E - bbox.W) * cosMid);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function project(point, bbox, width, height) {
    return {
      x: (point[0] - bbox.W) / (bbox.E - bbox.W) * width,
      y: (bbox.N - point[1]) / (bbox.N - bbox.S) * height
    };
  }

  function ringPath(ring, bbox, width, height) {
    if (!Array.isArray(ring) || !ring.length) {
      return "";
    }

    return ring.map(function (point, index) {
      var p = project(point, bbox, width, height);
      return (index === 0 ? "M" : "L") + p.x.toFixed(2) + " " + p.y.toFixed(2);
    }).join(" ") + " Z";
  }

  function linePath(line, bbox, width, height) {
    if (!Array.isArray(line) || !line.length) {
      return "";
    }

    return line.map(function (point, index) {
      var p = project(point, bbox, width, height);
      return (index === 0 ? "M" : "L") + p.x.toFixed(2) + " " + p.y.toFixed(2);
    }).join(" ");
  }

  function createSvg(width, height, className, label) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 " + width.toFixed(2) + " " + height.toFixed(2));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    return svg;
  }

  function appendPath(svg, d, className, style) {
    if (!d) {
      return;
    }
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", className);
    path.setAttribute("d", d);
    if (style) {
      path.setAttribute("style", style);
    }
    svg.appendChild(path);
  }

  function appendBasemap(svg, bbox, width, height) {
    var data = mapData();
    var sea = document.createElementNS(SVG_NS, "rect");
    sea.setAttribute("class", "map-sea");
    sea.setAttribute("width", width);
    sea.setAttribute("height", height);
    sea.setAttribute("style", "fill: var(--map-sea)");
    svg.appendChild(sea);

    (data.land || []).forEach(function (ring) {
      appendPath(svg, ringPath(ring, bbox, width, height), "map-land", "fill: var(--map-land)");
    });

    (data.lakes || []).forEach(function (ring) {
      appendPath(svg, ringPath(ring, bbox, width, height), "map-lake", "fill: var(--map-sea); stroke: var(--map-water-line)");
    });

    (data.rivers || []).forEach(function (line) {
      appendPath(svg, linePath(line, bbox, width, height), "map-river", "fill: none; stroke: var(--map-water-line)");
    });
  }

  function placePoint(place) {
    return [Number(place.lng), Number(place.lat)];
  }

  function rootPrefix() {
    return document.body && document.body.dataset.root ? document.body.dataset.root : "";
  }

  function setHref(anchor, href) {
    anchor.setAttribute("href", href);
    anchor.setAttributeNS(XLINK_NS, "xlink:href", href);
  }

  function appendFullMarker(svg, place, bbox, width, height) {
    var p = project(placePoint(place), bbox, width, height);
    var link = document.createElementNS(SVG_NS, "a");
    setHref(link, rootPrefix() + place.url);
    link.setAttribute("class", "map-marker-link");

    var title = document.createElementNS(SVG_NS, "title");
    title.textContent = place.name;
    link.appendChild(title);

    var circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "map-marker");
    circle.setAttribute("cx", p.x.toFixed(2));
    circle.setAttribute("cy", p.y.toFixed(2));
    circle.setAttribute("r", "4");
    circle.setAttribute("style", "fill: var(--map-marker)");
    link.appendChild(circle);
    svg.appendChild(link);
  }

  function appendLabel(svg, label, bbox, width, height) {
    var p = project([label.lng, label.lat], bbox, width, height);
    var text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("class", "map-orientation-label");
    text.setAttribute("x", p.x.toFixed(2));
    text.setAttribute("y", p.y.toFixed(2));
    text.setAttribute("style", "fill: var(--map-label)");
    text.textContent = label.name;
    svg.appendChild(text);
  }

  function renderFullMap() {
    var data = mapData();
    var container = document.getElementById("full-map");
    if (!data || !container) {
      return;
    }

    var bbox = data.bbox;
    var height = mapHeight(FULL_WIDTH, bbox);
    var svg = createSvg(FULL_WIDTH, height, "map-svg map-svg-full", "Map of biblical places");
    appendBasemap(svg, bbox, FULL_WIDTH, height);

    (data.places || []).forEach(function (place) {
      appendFullMarker(svg, place, bbox, FULL_WIDTH, height);
    });

    [
      { name: "Jerusalem", lat: 31.778, lng: 35.235 },
      { name: "Egypt", lat: 30.8, lng: 31.2 },
      { name: "Babylon", lat: 32.54, lng: 44.42 },
      { name: "Nineveh", lat: 36.36, lng: 43.15 },
      { name: "Rome", lat: 41.89, lng: 12.49 },
      { name: "Athens", lat: 37.98, lng: 23.73 },
      { name: "Ephesus", lat: 37.94, lng: 27.34 },
      { name: "Damascus", lat: 33.51, lng: 36.29 }
    ].forEach(function (label) {
      appendLabel(svg, label, bbox, FULL_WIDTH, height);
    });

    container.innerHTML = "";
    container.appendChild(svg);
  }

  function miniBbox(lat, lng, world) {
    var west = clamp(lng - MINI_LNG_RADIUS, world.W, world.E - (MINI_LNG_RADIUS * 2));
    var east = west + (MINI_LNG_RADIUS * 2);
    if (east > world.E) {
      east = world.E;
      west = Math.max(world.W, east - (MINI_LNG_RADIUS * 2));
    }

    var lonSpan = east - west;
    var latSpan = lonSpan * Math.cos(lat * Math.PI / 180);
    var south = clamp(lat - (latSpan / 2), world.S, world.N - latSpan);
    var north = south + latSpan;
    if (north > world.N) {
      north = world.N;
      south = Math.max(world.S, north - latSpan);
    }

    return { W: west, E: east, S: south, N: north };
  }

  function appendMiniMarker(svg, lat, lng, label, bbox, width, height) {
    var p = project([lng, lat], bbox, width, height);
    var ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "map-marker-ring");
    ring.setAttribute("cx", p.x.toFixed(2));
    ring.setAttribute("cy", p.y.toFixed(2));
    ring.setAttribute("r", "12");
    ring.setAttribute("style", "fill: none; stroke: var(--map-marker)");
    svg.appendChild(ring);

    var dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", "map-marker map-marker-mini");
    dot.setAttribute("cx", p.x.toFixed(2));
    dot.setAttribute("cy", p.y.toFixed(2));
    dot.setAttribute("r", "6");
    dot.setAttribute("style", "fill: var(--map-marker)");
    svg.appendChild(dot);

    var text = document.createElementNS(SVG_NS, "text");
    var textX = p.x + 12;
    var anchor = "start";
    if (textX > width - 90) {
      textX = p.x - 12;
      anchor = "end";
    }
    text.setAttribute("class", "map-place-label");
    text.setAttribute("x", textX.toFixed(2));
    text.setAttribute("y", (p.y - 10).toFixed(2));
    text.setAttribute("text-anchor", anchor);
    text.setAttribute("style", "fill: var(--map-label)");
    text.textContent = label;
    svg.appendChild(text);
  }

  function renderMiniMap(container) {
    var data = mapData();
    var lat = Number(container.dataset.lat);
    var lng = Number(container.dataset.lng);
    if (!data || !isFinite(lat) || !isFinite(lng)) {
      return;
    }

    var width = 700;
    var bbox = miniBbox(lat, lng, data.bbox);
    var height = mapHeight(width, bbox);
    var label = container.dataset.label || "Location";
    var svg = createSvg(width, height, "map-svg map-svg-mini", "Locator map for " + label);
    appendBasemap(svg, bbox, width, height);
    appendMiniMarker(svg, lat, lng, label, bbox, width, height);

    var href = container.dataset.href || "";
    container.innerHTML = "";
    if (href) {
      var link = document.createElement("a");
      link.className = "map-link";
      link.href = href;
      link.setAttribute("aria-label", "Open " + label + " location page");
      link.appendChild(svg);
      container.appendChild(link);
      return;
    }

    container.appendChild(svg);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!mapData()) {
      return;
    }
    renderFullMap();
    document.querySelectorAll("[data-map]").forEach(renderMiniMap);
  });
})();
