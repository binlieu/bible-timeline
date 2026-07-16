(function () {
  var forest = document.querySelector("[data-genealogy-tree]");
  if (!forest) {
    return;
  }

  // Progressive enhancement: the full nested tree is already in the HTML.
  // Add a toggle button to every node that has children, and collapse deeper
  // levels by default so each tree opens tidy but explorable.
  // Trees are small, so open everything by default; the toggles and the
  // Collapse all / Expand all controls let the reader focus a branch.
  var INITIAL_OPEN_DEPTH = 99;

  function childList(li) {
    return li.querySelector(":scope > ul");
  }

  function setOpen(li, open) {
    var ul = childList(li);
    if (!ul) {
      return;
    }
    li.classList.toggle("collapsed", !open);
    var toggle = li.querySelector(":scope > .tree-node > .tree-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", (open ? "Collapse " : "Expand ") + toggle.getAttribute("data-name"));
    }
  }

  function enhance(li, depth) {
    var ul = childList(li);
    if (!ul) {
      return;
    }
    var node = li.querySelector(":scope > .tree-node");
    var nameEl = node && node.querySelector("a");
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-toggle";
    toggle.setAttribute("data-name", nameEl ? nameEl.textContent : "branch");
    toggle.addEventListener("click", function () {
      setOpen(li, li.classList.contains("collapsed"));
    });
    node.insertBefore(toggle, node.firstChild);
    setOpen(li, depth < INITIAL_OPEN_DEPTH);

    var kids = ul.children;
    for (var i = 0; i < kids.length; i++) {
      enhance(kids[i], depth + 1);
    }
  }

  var trees = forest.querySelectorAll(":scope > ul.genealogy-tree");
  for (var t = 0; t < trees.length; t++) {
    var top = trees[t].children;
    for (var i = 0; i < top.length; i++) {
      enhance(top[i], 0);
    }
  }

  function setAll(open) {
    var nodes = forest.querySelectorAll("li.has-children");
    for (var i = 0; i < nodes.length; i++) {
      setOpen(nodes[i], open);
    }
  }

  var expandBtn = document.querySelector("[data-tree-expand]");
  var collapseBtn = document.querySelector("[data-tree-collapse]");
  if (expandBtn) {
    expandBtn.addEventListener("click", function () { setAll(true); });
  }
  if (collapseBtn) {
    collapseBtn.addEventListener("click", function () { setAll(false); });
  }
})();
