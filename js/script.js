/* =========================================================
   Web Development · Powered by Nexum — interactions
   ========================================================= */
(function () {
  "use strict";

  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduceMotionGlobal = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Buttons: wrap label + set fill origin from cursor ---------- */
  document.querySelectorAll(".btn").forEach(function (btn) {
    if (!btn.querySelector(".btn__t")) {
      var span = document.createElement("span");
      span.className = "btn__t";
      var moved = false, i = 0, n;
      while (i < btn.childNodes.length) {
        n = btn.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.trim()) { span.appendChild(n); moved = true; }
        else { i++; }
      }
      if (moved) btn.insertBefore(span, btn.firstChild);
    }
    function origin(e) {
      var r = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", (e.clientX - r.left) + "px");
      btn.style.setProperty("--my", (e.clientY - r.top) + "px");
    }
    btn.addEventListener("mouseenter", origin);
    btn.addEventListener("mouseleave", origin);
  });

  /* ---------- Custom round cursor (fine pointer, motion allowed) ---------- */
  if (finePointer && !reduceMotionGlobal) {
    var dot = document.createElement("div");
    dot.className = "cursor cursor--hidden";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.documentElement.classList.add("has-cursor");

    var hoverSel = 'a, button, label, [role="button"], .filter, .acc-trigger, .nav-toggle';
    var textSel = "input, textarea, select, [contenteditable]";
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cxp = tx, cyp = ty, started = false;

    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { started = true; cxp = tx; cyp = ty; }
      dot.classList.remove("cursor--hidden");
      var t = e.target;
      if (t.closest && t.closest(textSel)) {
        dot.classList.add("cursor--hidden");
        dot.classList.remove("cursor--hover");
      } else {
        dot.classList.toggle("cursor--hover", !!(t.closest && t.closest(hoverSel)));
      }
    }, { passive: true });

    document.addEventListener("mousedown", function () { dot.classList.add("cursor--down"); });
    document.addEventListener("mouseup", function () { dot.classList.remove("cursor--down"); });
    document.addEventListener("mouseleave", function () { dot.classList.add("cursor--hidden"); });
    window.addEventListener("blur", function () { dot.classList.add("cursor--hidden"); });

    (function loop() {
      cxp += (tx - cxp) * 0.2;
      cyp += (ty - cyp) * 0.2;
      dot.style.setProperty("--x", cxp + "px");
      dot.style.setProperty("--y", cyp + "px");
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Text scramble on hover (buttons + links) ---------- */
  if (finePointer && !reduceMotionGlobal) {
    var SC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var scrambleSel = ".btn, .nav-links a, .textlink, .filter, .footer-col a, .footer-bottom a";

    function firstTextNode(el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.trim()) return n;
      }
      return null;
    }
    function scramble(el) {
      var host = (el.querySelector && el.querySelector(".btn__t")) || el;
      var node = firstTextNode(host);
      if (!node) return;
      if (node._orig == null) node._orig = node.nodeValue;
      var original = node._orig;
      var chars = original.split("");
      /* lock the box so letter swaps never shift surrounding layout */
      if (!el._wLocked) {
        var w = el.getBoundingClientRect().width;
        el._prevDisplay = getComputedStyle(el).display;
        if (el._prevDisplay === "inline") el.style.display = "inline-block";
        el.style.width = w + "px";
        el.style.whiteSpace = "nowrap";
        el.style.overflow = "hidden";
        el._wLocked = true;
      }
      cancelAnimationFrame(el._raf);
      /* time-based so letters change at a calm, elegant cadence */
      var start = performance.now();
      var DUR = Math.min(420 + chars.length * 20, 760); /* total resolve time (ms) */
      var SWAP = 58;      /* ms between random-glyph changes */
      var lastSwap = -1e9;
      var disp = chars.slice();
      function step(now) {
        var t = Math.min((now - start) / DUR, 1);
        var reveal = Math.floor(t * chars.length);
        if (now - lastSwap >= SWAP) {
          lastSwap = now;
          for (var j = reveal; j < chars.length; j++) {
            disp[j] = chars[j] === " " ? " " : SC.charAt(Math.floor(Math.random() * SC.length));
          }
        }
        for (var k = 0; k < reveal; k++) disp[k] = chars[k];
        node.nodeValue = disp.join("");
        if (t < 1) { el._raf = requestAnimationFrame(step); }
        else { node.nodeValue = original; }
      }
      el._raf = requestAnimationFrame(step);
    }
    function restore(el) {
      cancelAnimationFrame(el._raf);
      var host = (el.querySelector && el.querySelector(".btn__t")) || el;
      var node = firstTextNode(host);
      if (node && node._orig != null) node.nodeValue = node._orig;
      if (el._wLocked) {
        el.style.width = "";
        el.style.whiteSpace = "";
        el.style.overflow = "";
        if (el._prevDisplay === "inline") el.style.display = "";
        el._wLocked = false;
      }
    }
    document.querySelectorAll(scrambleSel).forEach(function (el) {
      el.addEventListener("mouseenter", function () { scramble(el); });
      el.addEventListener("mouseleave", function () { restore(el); });
    });
  }

  /* ---------- Hero headline: word-by-word rise ---------- */
  var heroTitle = document.querySelector(".hero .hero__title[data-words]");
  if (heroTitle) {
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var words = heroTitle.textContent.trim().split(/\s+/);
    var html = words.map(function (w) {
      var safe = w.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return '<span class="word"><i>' + safe + "</i></span>";
    }).join(" ");
    heroTitle.innerHTML = html;
    /* word animation now owns the reveal — drop the block fade classes */
    heroTitle.classList.remove("reveal", "d1", "in");
    var inners = heroTitle.querySelectorAll(".word > i");
    inners.forEach(function (el, i) { el.style.transitionDelay = (i * 0.09).toFixed(2) + "s"; });
    if (reduceMotion) {
      heroTitle.classList.add("words-in");
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { heroTitle.classList.add("words-in"); });
      });
    }
  }

  /* ---------- Hero background: drifting, twinkling particle field ---------- */
  (function heroParticles() {
    var canvas = document.querySelector(".hero__particles");
    if (!canvas) return;
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
    var hero = canvas.parentElement;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var R = 35, G = 77, B = 232; /* theme accent #234de8 */
    var W = 0, H = 0, parts = [], raf = null, running = false, last = 0;
    var sp = 0, ticking = false; /* scroll progress 0..1 */

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function build() {
      var count = Math.round((W * H) / 13000);
      count = Math.max(22, Math.min(count, 110));
      parts = [];
      for (var i = 0; i < count; i++) {
        var big = Math.random() < 0.12;
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          r: big ? rnd(1.8, 3) : rnd(0.6, 1.6),
          vx: rnd(-0.12, 0.12), vy: rnd(-0.26, -0.05),
          base: big ? rnd(0.32, 0.55) : rnd(0.12, 0.38),
          tw: Math.random() * Math.PI * 2, tws: rnd(0.6, 1.5)
        });
      }
    }
    function dot(x, y, r, a) {
      var rad = r * 5;
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(" + R + "," + G + "," + B + "," + a + ")");
      g.addColorStop(1, "rgba(" + R + "," + G + "," + B + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "rgba(" + R + "," + G + "," + B + "," + Math.min(a * 1.7, 0.85) + ")";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    function resize() {
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) staticDraw();
    }
    function staticDraw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) dot(parts[i].x, parts[i].y, parts[i].r, parts[i].base * 0.8);
    }
    function frame(now) {
      var dt = Math.min((now - last) / 16.67, 3); last = now;
      /* scroll "fly-through": particles grow, brighten and spread from centre */
      var br = 1 + sp * 3.2;
      var grow = 1 + sp * 5;
      var spread = 1 + sp * 1.4;
      var cx = W / 2, cy = H * 0.42;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.tw += 0.02 * p.tws * dt;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
        var tw = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(p.tw));
        var dx = cx + (p.x - cx) * spread;
        var dy = cy + (p.y - cy) * spread - sp * 70;
        dot(dx, dy, p.r * grow, p.base * tw * br);
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

    resize();
    window.addEventListener("resize", resize);
    if (reduce) { staticDraw(); return; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0 }).observe(hero);
    } else { start(); }

    /* scroll-linked motion: content fades/parallaxes up, particles zoom + brighten */
    function applyScroll() {
      ticking = false;
      var h = hero.offsetHeight || 1;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      sp = Math.max(0, Math.min(y / h, 1));
      hero.style.setProperty("--hp", sp.toFixed(4));
      if (!running && sp > 0 && sp < 1) { start(); } /* keep drawing while scrolling the hero */
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(applyScroll); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", applyScroll);
    applyScroll();
  })();

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
