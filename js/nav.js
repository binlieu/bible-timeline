(function () {
  var nav = document.getElementById("primary-nav");
  var navToggle = document.querySelector(".nav-toggle");

  if (!nav) {
    return;
  }

  var desktopQuery = window.matchMedia
    ? window.matchMedia("(min-width: 880px)")
    : { matches: true };
  var groups = Array.prototype.slice.call(nav.querySelectorAll(".nav-group"));

  function getToggle(group) {
    return group ? group.querySelector(".nav-group-toggle") : null;
  }

  function setGroupOpen(group, open) {
    var toggle = getToggle(group);
    if (!toggle) {
      return;
    }

    group.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeGroups(exceptGroup) {
    groups.forEach(function (group) {
      if (group !== exceptGroup) {
        setGroupOpen(group, false);
      }
    });
  }

  function toggleGroup(group) {
    var isOpen = group.classList.contains("open");
    closeGroups(group);
    setGroupOpen(group, !isOpen);
  }

  function closePanel() {
    if (!navToggle) {
      return;
    }

    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  function openPanel() {
    if (!navToggle) {
      return;
    }

    nav.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
  }

  function togglePanel() {
    if (nav.classList.contains("open")) {
      closePanel();
    } else {
      openPanel();
    }
  }

  groups.forEach(function (group) {
    var toggle = getToggle(group);
    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", function () {
      toggleGroup(group);
    });

    toggle.addEventListener("keydown", function (event) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggleGroup(group);
      } else if (event.key === "Escape") {
        setGroupOpen(group, false);
        toggle.focus();
      }
    });

    group.addEventListener("mouseenter", function () {
      if (desktopQuery.matches) {
        closeGroups(group);
        setGroupOpen(group, true);
      }
    });

    group.addEventListener("mouseleave", function () {
      if (desktopQuery.matches) {
        setGroupOpen(group, false);
      }
    });

    group.addEventListener("focusin", function () {
      if (desktopQuery.matches) {
        closeGroups(group);
        setGroupOpen(group, true);
      }
    });

    group.addEventListener("focusout", function (event) {
      if (desktopQuery.matches && !group.contains(event.relatedTarget)) {
        setGroupOpen(group, false);
      }
    });
  });

  if (navToggle) {
    navToggle.addEventListener("click", togglePanel);

    navToggle.addEventListener("keydown", function (event) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        togglePanel();
      } else if (event.key === "Escape") {
        closePanel();
        navToggle.focus();
      }
    });
  }

  nav.addEventListener("click", function (event) {
    var link = event.target.closest ? event.target.closest("a") : null;
    if (!link) {
      return;
    }

    closeGroups();
    if (!desktopQuery.matches) {
      closePanel();
    }
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (nav.contains(target) || (navToggle && navToggle.contains(target))) {
      return;
    }

    closeGroups();
    closePanel();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }

    var activeToggle = null;
    groups.forEach(function (group) {
      if (group.classList.contains("open")) {
        activeToggle = activeToggle || getToggle(group);
      }
    });

    closeGroups();
    closePanel();

    if (activeToggle) {
      activeToggle.focus();
    } else if (navToggle && document.activeElement && nav.contains(document.activeElement)) {
      navToggle.focus();
    }
  });

  function handleViewportChange() {
    if (desktopQuery.matches) {
      closePanel();
    } else {
      closeGroups();
    }
  }

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", handleViewportChange);
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(handleViewportChange);
  }
})();
