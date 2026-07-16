(function () {
  var graph = window.BIBLE_GRAPH || { nodes: [], edges: [] };
  var svg = document.querySelector("[data-graph-svg]");
  if (!svg) return;

  var nodeSearch = document.querySelector("[data-node-search]");
  var datalist = document.getElementById("graph-node-list");
  var depthSelect = document.querySelector("[data-depth]");
  var typeFilters = document.querySelector("[data-type-filters]");
  var relationFilter = document.querySelector("[data-relation-filter]");
  var title = document.querySelector("[data-current-title]");
  var meta = document.querySelector("[data-current-meta]");
  var pageLink = document.querySelector("[data-current-link]");
  var note = document.querySelector("[data-render-note]");
  var legend = document.querySelector("[data-graph-legend]");
  var root = document.body && document.body.dataset.root ? document.body.dataset.root : "";

  var colors = {
    event: "#a03030",
    person: "#255f85",
    place: "#2f7a4f",
    book: "#7042a3",
    journey: "#c06a1b",
    nation: "#5f6f1f",
    prophecy: "#9a3c7a",
    theme: "#27706d"
  };
  var typeOrder = ["event", "person", "place", "book", "journey", "nation", "prophecy", "theme"];
  var nodesByKey = new Map();
  var edgesByKey = new Map();
  var selectedKey = "person:jesus";

  graph.nodes.forEach(function (node) {
    nodesByKey.set(node.key, node);
    edgesByKey.set(node.key, []);
  });
  graph.edges.forEach(function (edge) {
    if (edgesByKey.has(edge.s)) edgesByKey.get(edge.s).push(edge);
    if (edgesByKey.has(edge.t)) edgesByKey.get(edge.t).push(edge);
  });

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function labelFor(node) {
    return node.type.charAt(0).toUpperCase() + node.type.slice(1) + ": " + node.name;
  }

  function otherKey(edge, key) {
    return edge.s === key ? edge.t : edge.s;
  }

  function sortNodes(a, b) {
    var ta = typeOrder.indexOf(a.type);
    var tb = typeOrder.indexOf(b.type);
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  }

  function selectedTypes() {
    var checked = {};
    typeFilters.querySelectorAll("input[type='checkbox']").forEach(function (input) {
      if (input.checked) checked[input.value] = true;
    });
    return checked;
  }

  function selectedRelations() {
    var values = [];
    relationFilter.querySelectorAll("option").forEach(function (option) {
      if (option.selected) values.push(option.value);
    });
    return values;
  }

  function edgeAllowed(edge, typeSet, relationSet) {
    var source = nodesByKey.get(edge.s);
    var target = nodesByKey.get(edge.t);
    if (!source || !target) return false;
    if (!typeSet[source.type] || !typeSet[target.type]) return false;
    if (relationSet.length && relationSet.indexOf(edge.r) === -1) return false;
    return true;
  }

  function neighborhood(centerKey, depth) {
    var typeSet = selectedTypes();
    var relationSet = selectedRelations();
    var levels = {};
    var parent = {};
    var includedEdges = [];
    levels[centerKey] = 0;

    var frontier = [centerKey];
    for (var level = 1; level <= depth; level += 1) {
      var next = [];
      frontier.forEach(function (key) {
        (edgesByKey.get(key) || []).forEach(function (edge) {
          if (!edgeAllowed(edge, typeSet, relationSet)) return;
          var other = otherKey(edge, key);
          if (levels[other] == null) {
            levels[other] = level;
            parent[other] = key;
            next.push(other);
          }
          includedEdges.push(edge);
        });
      });
      frontier = next;
    }

    return { levels: levels, parent: parent, edges: includedEdges };
  }

  function currentNeighborhoodRelations(centerKey, depth) {
    var rels = {};
    var seen = {};
    var frontier = [centerKey];
    seen[centerKey] = true;
    for (var level = 1; level <= depth; level += 1) {
      var next = [];
      frontier.forEach(function (key) {
        (edgesByKey.get(key) || []).forEach(function (edge) {
          rels[edge.r] = true;
          var other = otherKey(edge, key);
          if (!seen[other]) {
            seen[other] = true;
            next.push(other);
          }
        });
      });
      frontier = next;
    }
    return Object.keys(rels).sort();
  }

  function updateRelationOptions() {
    var selected = selectedRelations();
    var rels = currentNeighborhoodRelations(selectedKey, Number(depthSelect.value || 1));
    relationFilter.innerHTML = rels.map(function (rel) {
      return '<option value="' + esc(rel) + '"' + (selected.indexOf(rel) !== -1 ? " selected" : "") + ">" + esc(rel) + "</option>";
    }).join("");
  }

  function setCenter(key, updateHash) {
    if (!nodesByKey.has(key)) key = "person:jesus";
    selectedKey = key;
    var node = nodesByKey.get(key);
    nodeSearch.value = labelFor(node);
    if (updateHash) window.location.hash = key;
    updateRelationOptions();
    render();
  }

  function drawText(x, y, text, className) {
    return '<text class="' + className + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' + esc(text) + "</text>";
  }

  function render() {
    var center = nodesByKey.get(selectedKey);
    var depth = Number(depthSelect.value || 1);
    var hood = neighborhood(selectedKey, depth);
    var keys = Object.keys(hood.levels);
    var depthOne = keys.filter(function (key) { return hood.levels[key] === 1; }).map(function (key) { return nodesByKey.get(key); }).filter(Boolean).sort(sortNodes);
    var depthTwo = keys.filter(function (key) { return hood.levels[key] === 2; }).map(function (key) { return nodesByKey.get(key); }).filter(Boolean).sort(sortNodes);
    var allCandidates = [center].concat(depthOne, depthTwo);
    var maxNodes = 120;
    var shownKeys = {};
    var shown = allCandidates.slice(0, maxNodes);
    shown.forEach(function (node) { shownKeys[node.key] = true; });
    var hiddenCount = allCandidates.length - shown.length;

    var width = 1100;
    var height = 760;
    var cx = width / 2;
    var cy = height / 2;
    var positions = {};
    positions[selectedKey] = { x: cx, y: cy };

    depthOne.forEach(function (node, index) {
      if (!shownKeys[node.key]) return;
      var angle = (Math.PI * 2 * index / Math.max(depthOne.length, 1)) - Math.PI / 2;
      positions[node.key] = { x: cx + Math.cos(angle) * 210, y: cy + Math.sin(angle) * 210 };
    });

    depthTwo.forEach(function (node, index) {
      if (!shownKeys[node.key]) return;
      var parentKey = hood.parent[node.key];
      var parentPos = positions[parentKey];
      var baseAngle = parentPos ? Math.atan2(parentPos.y - cy, parentPos.x - cx) : (Math.PI * 2 * index / Math.max(depthTwo.length, 1));
      var spread = ((index % 5) - 2) * 0.18;
      positions[node.key] = { x: cx + Math.cos(baseAngle + spread) * 340, y: cy + Math.sin(baseAngle + spread) * 340 };
    });

    var edgeMarkup = hood.edges.filter(function (edge, index, arr) {
      return shownKeys[edge.s] && shownKeys[edge.t] && arr.indexOf(edge) === index;
    }).map(function (edge) {
      var a = positions[edge.s];
      var b = positions[edge.t];
      var source = nodesByKey.get(edge.s);
      var target = nodesByKey.get(edge.t);
      var tooltip = source.name + " -" + edge.r + "-> " + target.name + (edge.ref ? " (" + edge.ref + ")" : "");
      return '<line class="graph-edge" x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '"><title>' + esc(tooltip) + '</title></line>';
    }).join("");

    var nodeMarkup = shown.map(function (node) {
      var pos = positions[node.key];
      var radius = node.key === selectedKey ? 14 : 10;
      var href = root + node.url;
      return '<a class="graph-node-link" href="' + esc(href) + '" data-node-key="' + esc(node.key) + '" tabindex="0">' +
        '<circle class="graph-node graph-node-' + esc(node.type) + '" cx="' + pos.x.toFixed(1) + '" cy="' + pos.y.toFixed(1) + '" r="' + radius + '" fill="' + esc(colors[node.type] || "#555") + '"><title>' + esc(labelFor(node)) + '</title></circle>' +
        drawText(pos.x + 14, pos.y + 5, node.name, "graph-label") +
        '</a>';
    }).join("");

    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = edgeMarkup + nodeMarkup;
    title.textContent = center.name;
    meta.textContent = center.type.charAt(0).toUpperCase() + center.type.slice(1) + " | " + center.key;
    pageLink.href = root + center.url;
    note.textContent = hiddenCount > 0 ? "showing " + shown.length + " of " + allCandidates.length : "";

    svg.querySelectorAll("[data-node-key]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        setCenter(link.getAttribute("data-node-key"), true);
      });
      link.addEventListener("dblclick", function () {
        window.location.href = link.getAttribute("href");
      });
      link.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          setCenter(link.getAttribute("data-node-key"), true);
        }
      });
    });
  }

  function initControls() {
    datalist.innerHTML = graph.nodes.slice().sort(sortNodes).map(function (node) {
      return '<option value="' + esc(labelFor(node)) + '" data-key="' + esc(node.key) + '"></option>';
    }).join("");

    typeFilters.innerHTML = typeOrder.map(function (type) {
      return '<label><input type="checkbox" value="' + esc(type) + '" checked> ' + esc(type) + "</label>";
    }).join("");

    legend.innerHTML = typeOrder.map(function (type) {
      return '<span><i style="background:' + esc(colors[type]) + '"></i>' + esc(type) + '</span>';
    }).join("");

    nodeSearch.addEventListener("change", function () {
      var value = nodeSearch.value.trim();
      var match = graph.nodes.find(function (node) {
        return labelFor(node) === value || node.key === value || node.name.toLowerCase() === value.toLowerCase();
      });
      if (match) setCenter(match.key, true);
    });
    nodeSearch.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        var value = nodeSearch.value.trim().toLowerCase();
        var match = graph.nodes.find(function (node) {
          return labelFor(node).toLowerCase() === value || node.key.toLowerCase() === value || node.name.toLowerCase() === value;
        });
        if (match) setCenter(match.key, true);
      }
    });
    depthSelect.addEventListener("change", function () {
      updateRelationOptions();
      render();
    });
    typeFilters.addEventListener("change", render);
    relationFilter.addEventListener("change", render);
    window.addEventListener("hashchange", function () {
      setCenter(decodeURIComponent(window.location.hash.replace(/^#/, "")), false);
    });
  }

  initControls();
  setCenter(decodeURIComponent(window.location.hash.replace(/^#/, "")) || selectedKey, false);
})();
