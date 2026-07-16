(function () {
  "use strict";

  var MAX_VERSES = 25;

  function numberValue(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function lastVerseNumber(book, chapter) {
    var verses = book && book.chapters ? book.chapters[String(chapter)] : null;
    if (!verses) return 0;
    return Object.keys(verses).reduce(function (max, verse) {
      return Math.max(max, Number(verse) || 0);
    }, 0);
  }

  function fallbackRanges(body) {
    return [{
      startCh: numberValue(body.dataset.startCh, 1),
      startV: numberValue(body.dataset.startV, 1),
      endCh: numberValue(body.dataset.endCh, numberValue(body.dataset.startCh, 1)),
      endV: body.dataset.endV ? numberValue(body.dataset.endV, 0) : ""
    }];
  }

  function rangesForBody(body) {
    if (!body.dataset.ranges) return fallbackRanges(body);
    try {
      var ranges = JSON.parse(body.dataset.ranges);
      return Array.isArray(ranges) && ranges.length ? ranges : fallbackRanges(body);
    } catch (error) {
      return fallbackRanges(body);
    }
  }

  function collectVerses(book, ranges) {
    var verses = [];
    var hasMore = false;

    ranges.forEach(function (range) {
      if (hasMore) return;
      var startCh = numberValue(range.startCh, 1);
      var endCh = numberValue(range.endCh, startCh);
      for (var chapter = startCh; chapter <= endCh; chapter += 1) {
        var chapterVerses = book.chapters[String(chapter)];
        if (!chapterVerses) continue;
        var firstVerse = chapter === startCh ? numberValue(range.startV, 1) : 1;
        var finalVerse = chapter === endCh && range.endV ? numberValue(range.endV, 0) : lastVerseNumber(book, chapter);
        for (var verse = firstVerse; verse <= finalVerse; verse += 1) {
          var text = chapterVerses[String(verse)];
          if (text == null) continue;
          if (verses.length >= MAX_VERSES) {
            hasMore = true;
            return;
          }
          verses.push({
            label: startCh === endCh ? String(verse) : chapter + ":" + verse,
            text: text
          });
        }
      }
    });

    return { verses: verses, hasMore: hasMore };
  }

  function appendVerse(body, verse) {
    var paragraph = document.createElement("p");
    var marker = document.createElement("sup");
    marker.textContent = verse.label;
    paragraph.appendChild(marker);
    paragraph.appendChild(document.createTextNode(" " + verse.text));
    body.appendChild(paragraph);
  }

  function appendContinuation(body) {
    var url = body.dataset.bibleUrl;
    if (!url) return;
    var paragraph = document.createElement("p");
    paragraph.className = "scripture-note";
    var link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "continues on bible.com";
    paragraph.appendChild(link);
    body.appendChild(paragraph);
  }

  function renderBody(body) {
    if (body.dataset.rendered === "true") return true;
    var book = window.KJV && window.KJV[body.dataset.book];
    if (!book || !book.chapters) return false;

    var result = collectVerses(book, rangesForBody(body));
    body.textContent = "";
    result.verses.forEach(function (verse) {
      appendVerse(body, verse);
    });
    if (result.hasMore) appendContinuation(body);
    body.dataset.rendered = "true";
    return true;
  }

  function toggleBody(toggle, body) {
    var expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
    toggle.textContent = expanded ? "show text" : "hide text";
    body.hidden = expanded;
  }

  function setupScripture() {
    var bodies = Array.prototype.slice.call(document.querySelectorAll(".scripture-body[data-book]"));
    bodies.forEach(function (body) {
      var toggle = document.querySelector('.scripture-toggle[aria-controls="' + body.id + '"]');
      if (!toggle || !renderBody(body)) {
        if (toggle) toggle.hidden = true;
        body.hidden = true;
        return;
      }
      toggle.addEventListener("click", function () {
        toggleBody(toggle, body);
      });
    });

    window.addEventListener("beforeprint", function () {
      bodies.forEach(function (body) {
        if (!renderBody(body)) return;
        body.dataset.printWasHidden = body.hidden ? "true" : "false";
        body.hidden = false;
      });
    });

    window.addEventListener("afterprint", function () {
      bodies.forEach(function (body) {
        if (body.dataset.printWasHidden === "true") body.hidden = true;
        delete body.dataset.printWasHidden;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupScripture);
  } else {
    setupScripture();
  }
})();
