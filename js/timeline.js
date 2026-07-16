(function () {
  function normalize(value) {
    return String(value || "").toLowerCase();
  }

  function initTimelineFilters() {
    var eraFilter = document.querySelector("[data-era-filter]");
    var textFilter = document.querySelector("[data-timeline-filter]");
    var entries = Array.prototype.slice.call(document.querySelectorAll("[data-timeline-entry]"));

    if (!entries.length) {
      return;
    }

    function applyFilters() {
      var era = eraFilter ? eraFilter.value : "";
      var text = textFilter ? normalize(textFilter.value).trim() : "";

      entries.forEach(function (entry) {
        var eraMatches = !era || entry.dataset.era === era;
        var textMatches = !text || normalize(entry.textContent).indexOf(text) !== -1;
        entry.hidden = !(eraMatches && textMatches);
      });

      document.querySelectorAll("[data-era-group]").forEach(function (group) {
        var visible = group.querySelector("[data-timeline-entry]:not([hidden])");
        group.hidden = !visible;
      });
    }

    if (eraFilter) {
      eraFilter.addEventListener("change", applyFilters);
    }
    if (textFilter) {
      textFilter.addEventListener("input", applyFilters);
    }
  }

  document.addEventListener("DOMContentLoaded", initTimelineFilters);
})();
