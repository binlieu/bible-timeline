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

  function allJourneyPoints(journey) {
    var points = [];
    (journey.routes || []).forEach(function (route) {
      (route.stops || []).forEach(function (stop) {
        if (isFinite(Number(stop.lat)) && isFinite(Number(stop.lng))) {
          points.push([Number(stop.lng), Number(stop.lat)]);
        }
      });
    });
    (journey.regions || []).forEach(function (region) {
      (region.ring || []).forEach(function (point) {
        if (isFinite(Number(point[0])) && isFinite(Number(point[1]))) {
          points.push([Number(point[0]), Number(point[1])]);
        }
      });
    });
    return points;
  }

  function fittedBbox(journey, world) {
    var points = allJourneyPoints(journey);
    if (!points.length) {
      return world;
    }

    var west = points[0][0];
    var east = points[0][0];
    var south = points[0][1];
    var north = points[0][1];
    points.forEach(function (point) {
      west = Math.min(west, point[0]);
      east = Math.max(east, point[0]);
      south = Math.min(south, point[1]);
      north = Math.max(north, point[1]);
    });

    var lonPad = Math.max((east - west) * 0.16, 0.35);
    var latPad = Math.max((north - south) * 0.16, 0.25);
    west = Math.max(world.W, west - lonPad);
    east = Math.min(world.E, east + lonPad);
    south = Math.max(world.S, south - latPad);
    north = Math.min(world.N, north + latPad);

    if (east <= west) east = west + 1;
    if (north <= south) north = south + 1;
    return { W: west, E: east, S: south, N: north };
  }

  function routeColor(route, index) {
    return route.colorKey || "route" + ((index % 4) + 1);
  }

  function stopPoint(stop) {
    return [Number(stop.lng), Number(stop.lat)];
  }

  function dashForLeg(route, stop) {
    if (stop && stop.precision === "disputed") {
      return "2 3";
    }
    if (route.lineStyle === "dashed" || (stop && stop.travel === "sea")) {
      return "6 4";
    }
    if (route.lineStyle === "dotted") {
      return "2 3";
    }
    return "";
  }

  function pointKey(point) {
    return point[0].toFixed(4) + "," + point[1].toFixed(4);
  }

  function legKey(a, b) {
    var first = pointKey(a);
    var second = pointKey(b);
    return first < second ? first + "|" + second : second + "|" + first;
  }

  function offsetSegment(a, b, amount) {
    if (!amount) {
      return [a, b];
    }
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var length = Math.sqrt(dx * dx + dy * dy);
    if (!length) {
      return [a, b];
    }
    var ox = -dy / length * amount;
    var oy = dx / length * amount;
    return [
      { x: a.x + ox, y: a.y + oy },
      { x: b.x + ox, y: b.y + oy }
    ];
  }

  function appendJourneyRegion(svg, region, bbox, width, height) {
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "map-region");
    path.setAttribute("d", ringPath(region.ring, bbox, width, height));
    path.setAttribute("style", "fill: var(--map-region); fill-opacity: 0.35; stroke: var(--map-region-line); stroke-dasharray: 8 5");
    var title = document.createElementNS(SVG_NS, "title");
    title.textContent = region.name || "Region";
    path.appendChild(title);
    svg.appendChild(path);
  }

  function appendJourneyLeg(svg, route, routeIndex, fromStop, toStop, bbox, width, height, amount) {
    var from = project(stopPoint(fromStop), bbox, width, height);
    var to = project(stopPoint(toStop), bbox, width, height);
    var segment = offsetSegment(from, to, amount);
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "map-journey-route");
    path.setAttribute("d", "M" + segment[0].x.toFixed(2) + " " + segment[0].y.toFixed(2) + " L" + segment[1].x.toFixed(2) + " " + segment[1].y.toFixed(2));
    var style = "fill: none; stroke: var(--map-" + routeColor(route, routeIndex) + "); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round";
    var dash = dashForLeg(route, toStop);
    if (dash) {
      style += "; stroke-dasharray: " + dash;
    }
    path.setAttribute("style", style);
    svg.appendChild(path);
  }

  function appendJourneyMarker(svg, route, routeIndex, stop, index, bbox, width, height, labelStops) {
    var p = project(stopPoint(stop), bbox, width, height);
    var marker = document.createElementNS(SVG_NS, stop.placeId ? "a" : "g");
    marker.setAttribute("class", stop.placeId ? "map-marker-link map-journey-marker-link" : "map-journey-marker-link");
    if (stop.placeId) {
      setHref(marker, rootPrefix() + "locations/" + stop.placeId + ".html");
    }

    var title = document.createElementNS(SVG_NS, "title");
    title.textContent = (index + 1) + ". " + stop.name + (stop.note ? " - " + stop.note : "");
    marker.appendChild(title);

    var circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "map-journey-stop");
    circle.setAttribute("cx", p.x.toFixed(2));
    circle.setAttribute("cy", p.y.toFixed(2));
    circle.setAttribute("r", (width * 0.009).toFixed(2));
    circle.setAttribute("style", "fill: var(--map-" + routeColor(route, routeIndex) + ")");
    marker.appendChild(circle);

    var number = document.createElementNS(SVG_NS, "text");
    number.setAttribute("class", "map-journey-stop-number");
    number.setAttribute("x", p.x.toFixed(2));
    number.setAttribute("y", (p.y + width * 0.0038).toFixed(2));
    number.setAttribute("text-anchor", "middle");
    number.setAttribute("style", "fill: #fff; font-size: " + (width * 0.011).toFixed(2) + "px");
    number.textContent = String(index + 1);
    marker.appendChild(number);
    svg.appendChild(marker);

    if (!labelStops) {
      return;
    }
    var left = index % 2 === 1;
    var label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "map-journey-label");
    label.setAttribute("x", (p.x + (left ? -14 : 14)).toFixed(2));
    label.setAttribute("y", (p.y - 12).toFixed(2));
    label.setAttribute("text-anchor", left ? "end" : "start");
    label.setAttribute("style", "fill: var(--map-label)");
    label.textContent = stop.name;
    svg.appendChild(label);
  }

  function renderJourneyMap(container) {
    var data = mapData();
    var journeyId = container.dataset.journey;
    var journeys = data && data.journeys ? data.journeys : [];
    var journey = journeys.find(function (item) {
      return item.id === journeyId;
    });
    if (!journey) {
      return;
    }

    var bbox = fittedBbox(journey, data.bbox);
    var height = mapHeight(FULL_WIDTH, bbox);
    var svg = createSvg(FULL_WIDTH, height, "map-svg map-svg-journey", "Journey map for " + journey.name);
    appendBasemap(svg, bbox, FULL_WIDTH, height);

    (journey.regions || []).forEach(function (region) {
      appendJourneyRegion(svg, region, bbox, FULL_WIDTH, height);
    });

    // Anchors of labels already placed on this map (across ALL routes), so
    // revisited cities (Antioch, Corinth, ...) and tight clusters label once.
    var labeledAnchors = [];
    var minLabelGap = FULL_WIDTH * 0.035;

    function farFromLabeled(p) {
      return labeledAnchors.every(function (a) {
        return Math.hypot(a.x - p.x, a.y - p.y) >= minLabelGap;
      });
    }

    (journey.routes || []).forEach(function (route, routeIndex) {
      var pairCounts = {};
      if (route.drawLine !== false) {
        (route.stops || []).forEach(function (stop, index) {
          if (index === 0) return;
          var previous = route.stops[index - 1];
          var key = legKey(stopPoint(previous), stopPoint(stop));
          var count = pairCounts[key] || 0;
          pairCounts[key] = count + 1;
          appendJourneyLeg(svg, route, routeIndex, previous, stop, bbox, FULL_WIDTH, height, count ? FULL_WIDTH * 0.004 * count : 0);
        });
      }

      var seenStops = {};
      var stopCount = (route.stops || []).length;
      (route.stops || []).forEach(function (stop, index) {
        var key = pointKey(stopPoint(stop));
        if (seenStops[key]) {
          return;
        }
        seenStops[key] = true;
        var wantLabel = stopCount <= 12 || stop.placeId || index % 2 === 0;
        var p = project(stopPoint(stop), bbox, FULL_WIDTH, height);
        var labelIt = wantLabel && farFromLabeled(p);
        if (labelIt) {
          labeledAnchors.push(p);
        }
        appendJourneyMarker(svg, route, routeIndex, stop, index, bbox, FULL_WIDTH, height, labelIt);
      });
    });

    container.innerHTML = "";
    container.appendChild(svg);
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
    document.querySelectorAll("[data-journey]").forEach(renderJourneyMap);
  });
})();
