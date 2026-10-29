/* =========================================================
   Web Development · Powered by Nexum — interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Sticky header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 10);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".mobile-menu");
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Work / concept filters ---------- */
  var filterWrap = document.querySelector("[data-filters]");
  if (filterWrap) {
    var buttons = filterWrap.querySelectorAll(".filter");
    var cards = document.querySelectorAll("[data-cat]");
    filterWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter");
      if (!btn) return;
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var cat = btn.getAttribute("data-filter");
      cards.forEach(function (card) {
        var show = cat === "all" || card.getAttribute("data-cat") === cat;
        card.classList.toggle("is-hidden", !show);
        if (show) {
          card.classList.add("in");
          card.style.animation = "none";
          /* force reflow to restart entrance animation */
          void card.offsetWidth;
          card.style.animation = "cardIn 0.45s cubic-bezier(0.22,1,0.36,1) both";
        }
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".accordion").forEach(function (acc) {
    var items = acc.querySelectorAll(".acc-item");
    items.forEach(function (item) {
      var trigger = item.querySelector(".acc-trigger");
      var panel = item.querySelector(".acc-panel");
      if (!trigger || !panel) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        /* close others in the same accordion */
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove("open");
            other.querySelector(".acc-panel").style.maxHeight = null;
            other.querySelector(".acc-trigger").setAttribute("aria-expanded", "false");
          }
        });
        if (isOpen) {
          item.classList.remove("open");
          panel.style.maxHeight = null;
          trigger.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("open");
          panel.style.maxHeight = panel.scrollHeight + "px";
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  });
  /* keep open panels sized correctly on resize */
  window.addEventListener("resize", function () {
    document.querySelectorAll(".acc-item.open .acc-panel").forEach(function (p) {
      p.style.maxHeight = p.scrollHeight + "px";
    });
  });

  /* ---------- Contact form (demo validation) ---------- */
  var form = document.querySelector("#contact-form");
  if (form) {
    var fields = form.querySelectorAll("[required]");
    function validateField(field) {
      var wrap = field.closest(".field");
      var ok = field.checkValidity() && field.value.trim() !== "";
      wrap.classList.toggle("invalid", !ok);
      return ok;
    }
    fields.forEach(function (field) {
      field.addEventListener("blur", function () { validateField(field); });
      field.addEventListener("input", function () {
        if (field.closest(".field").classList.contains("invalid")) validateField(field);
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var allOk = true;
      fields.forEach(function (field) {
        if (!validateField(field)) allOk = false;
      });
      if (!allOk) {
        var firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }
      form.classList.add("sent");
      var success = form.querySelector(".form__success");
      if (success) success.classList.add("show");
    });
  }

  /* ---------- Smooth page transitions (internal .html links) ---------- */
  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReduced) {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest("a");
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href || link.target === "_blank" || link.hasAttribute("download")) return;
      /* only same-tab local .html pages, not anchors or external */
      if (href.charAt(0) === "#" || /^(https?:|mailto:|tel:)/.test(href)) return;
      if (href.indexOf(".html") === -1) return;
      /* ignore same-page links */
      var path = href.split("#")[0];
      if (path === "" || path === location.pathname.split("/").pop()) return;
      e.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(function () { window.location.href = href; }, 300);
    });
  }
  /* restore visibility when returning via back/forward cache */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) document.body.classList.remove("is-leaving");
  });

  /* ---------- Footer year ---------- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
