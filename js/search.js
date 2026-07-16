(function () {
  function getRoot() {
    return document.body && document.body.dataset.root ? document.body.dataset.root : "";
  }

  function normalize(value) {
    return String(value || "").toLowerCase();
  }

  function buildHaystack(item) {
    return [
      item.name,
      item.type,
      item.date,
      item.era,
      item.reference,
      item.summary,
      Array.isArray(item.keywords) ? item.keywords.join(" ") : ""
    ].map(normalize).join(" ");
  }

  function resultLabel(item) {
    var type = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Result";
    var detail = item.reference || item.date || item.era || "";
    return detail ? type + " - " + detail : type;
  }

  function performSearch(query) {
    var data = window.BIBLE_DATA || {};
    var all = []
      .concat(data.events || [])
      .concat(data.people || [])
      .concat(data.places || [])
      .concat(data.books || [])
      .concat(data.journeys || [])
      .concat(data.nations || [])
      .concat(data.prophecies || [])
      .concat(data.themes || []);
    var q = normalize(query).trim();

    if (!q) {
      return [];
    }

    return all.filter(function (item) {
      return buildHaystack(item).indexOf(q) !== -1;
    }).slice(0, 12);
  }

  function renderResults(container, results) {
    var root = getRoot();
    if (!results.length) {
      container.innerHTML = '<div class="search-empty">No results found.</div>';
      container.hidden = false;
      return;
    }

    container.innerHTML = results.map(function (item) {
      return '<a class="search-result" href="' + root + item.url + '">' +
        '<strong>' + escapeHtml(item.name) + '</strong>' +
        '<span>' + escapeHtml(resultLabel(item)) + '</span>' +
        '</a>';
    }).join("");
    container.hidden = false;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("theme", theme);
      } catch (error) {}
    } else {
      delete document.documentElement.dataset.theme;
      try {
        localStorage.removeItem("theme");
      } catch (error) {}
    }
  }

  function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem("theme");
    } catch (error) {}
    if (saved) {
      document.documentElement.dataset.theme = saved;
    }

    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var current = document.documentElement.dataset.theme;
        if (current === "dark") {
          setTheme("light");
        } else if (current === "light") {
          setTheme("");
        } else {
          setTheme("dark");
        }
      });
    });
  }

  function initSearch() {
    document.querySelectorAll("[data-search-form]").forEach(function (form) {
      var input = form.querySelector("[data-search-input]");
      var results = form.querySelector("[data-search-results]");
      if (!input || !results) {
        return;
      }

      input.addEventListener("input", function () {
        var matches = performSearch(input.value);
        if (!input.value.trim()) {
          results.hidden = true;
          results.innerHTML = "";
          return;
        }
        renderResults(results, matches);
      });

      input.addEventListener("focus", function () {
        if (input.value.trim()) {
          renderResults(results, performSearch(input.value));
        }
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var matches = performSearch(input.value);
        if (matches.length) {
          window.location.href = getRoot() + matches[0].url;
        }
      });

      document.addEventListener("click", function (event) {
        if (!form.contains(event.target)) {
          results.hidden = true;
        }
      });
    });

    var indexInput = document.querySelector("[data-index-search]");
    var indexResults = document.querySelector("[data-index-search-results]");
    if (indexInput && indexResults) {
      indexInput.addEventListener("input", function () {
        renderResults(indexResults, performSearch(indexInput.value));
        if (!indexInput.value.trim()) {
          indexResults.hidden = true;
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initSearch();
  });
})();
