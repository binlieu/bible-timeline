(function () {
  function initVisualTimeline() {
    var svg = document.querySelector("[data-vtimeline-svg]");
    if (!svg) {
      return;
    }

    var tooltip = document.createElement("div");
    tooltip.className = "vtimeline-tooltip";
    tooltip.hidden = true;
    document.body.appendChild(tooltip);

    function setClass(name, hidden) {
      svg.classList.toggle(name, hidden);
    }

    function syncLayer(input) {
      setClass("hide-" + input.getAttribute("data-vt-layer"), !input.checked);
    }

    function syncEra(input) {
      setClass("hide-era-" + input.getAttribute("data-vt-era"), !input.checked);
    }

    function syncAllEras(allEras, eraInputs) {
      var checked = allEras.checked;
      eraInputs.forEach(function (input) {
        input.checked = checked;
        syncEra(input);
      });
    }

    document.querySelectorAll("[data-vt-layer]").forEach(function (input) {
      syncLayer(input);
      input.addEventListener("change", function () {
        syncLayer(input);
      });
    });

    var eraInputs = Array.prototype.slice.call(document.querySelectorAll("[data-vt-era]"));
    var allEras = document.querySelector("[data-vt-all-eras]");
    eraInputs.forEach(function (input) {
      syncEra(input);
      input.addEventListener("change", function () {
        syncEra(input);
        if (allEras) {
          allEras.checked = eraInputs.every(function (eraInput) {
            return eraInput.checked;
          });
        }
      });
    });
    if (allEras) {
      allEras.addEventListener("change", function () {
        syncAllEras(allEras, eraInputs);
      });
    }

    function showTooltip(target, x, y) {
      var text = target.getAttribute("data-vt-title");
      if (!text) {
        return;
      }
      tooltip.textContent = text;
      tooltip.hidden = false;
      moveTooltip(x, y);
    }

    function moveTooltip(x, y) {
      if (tooltip.hidden) {
        return;
      }
      var offset = 14;
      tooltip.style.left = Math.min(window.innerWidth - tooltip.offsetWidth - 8, x + offset) + "px";
      tooltip.style.top = Math.min(window.innerHeight - tooltip.offsetHeight - 8, y + offset) + "px";
    }

    function hideTooltip() {
      tooltip.hidden = true;
    }

    svg.querySelectorAll("[data-vt-title]").forEach(function (target) {
      target.addEventListener("mouseenter", function (event) {
        showTooltip(target, event.clientX, event.clientY);
      });
      target.addEventListener("mousemove", function (event) {
        moveTooltip(event.clientX, event.clientY);
      });
      target.addEventListener("mouseleave", hideTooltip);
      target.addEventListener("focus", function () {
        var rect = target.getBoundingClientRect();
        showTooltip(target, rect.left + rect.width / 2, rect.top + rect.height / 2);
      });
      target.addEventListener("blur", hideTooltip);
    });
  }

  document.addEventListener("DOMContentLoaded", initVisualTimeline);
})();
