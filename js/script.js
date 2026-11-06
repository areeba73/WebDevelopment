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
      /* turn white over blue surfaces; stay blue on white buttons sitting on blue */
      var overWhiteBtn = t.closest && t.closest(".btn--light");
      var overBlue = !overWhiteBtn && t.closest && t.closest(".cta-band, .btn--primary, .btn--ghost, .filter.active");
      dot.classList.toggle("cursor--light", !!overBlue);
    }, { passive: true });

    document.addEventListener("mousedown", function () { dot.classList.add("cursor--down"); });
    document.addEventListener("mouseup", function () { dot.classList.remove("cursor--down"); });
    document.addEventListener("mouseleave", function () { dot.classList.add("cursor--hidden"); });
    window.addEventListener("blur", function () { dot.classList.add("cursor--hidden"); });

    (function loop() {
      cxp += (tx - cxp) * 0.45;
      cyp += (ty - cyp) * 0.45;
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
      // Skip buttons inside a form card. The scramble effect changes
      // the text content on every frame; because the font is
      // proportional, each glyph has a different advance-width, which
      // causes the inline string to re-measure every frame. Inside a
      // card that effect reads as the whole form shaking during
      // submit-button hover.
      if (el.closest && el.closest(".form")) return;
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

    /* pre-rendered glow sprite so hundreds of particles stay cheap (drawImage) */
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = 24;
    var sctx = sprite.getContext("2d");
    var sg = sctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    sg.addColorStop(0, "rgba(" + R + "," + G + "," + B + ",1)");
    sg.addColorStop(0.45, "rgba(" + R + "," + G + "," + B + ",0.5)");
    sg.addColorStop(1, "rgba(" + R + "," + G + "," + B + ",0)");
    sctx.fillStyle = sg; sctx.fillRect(0, 0, 24, 24);

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function build() {
      var count = Math.round((W * H) / 4200);       /* dense field of tiny particles */
      count = Math.max(60, Math.min(count, 340));
      parts = [];
      for (var i = 0; i < count; i++) {
        var big = Math.random() < 0.08;
        var ang = Math.random() * 6.2832;           /* random heading */
        var spd = rnd(0.45, 1.15);                  /* rapid, varied speed */
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          r: big ? rnd(1.4, 2.2) : rnd(0.5, 1.2),   /* tiny */
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          wx: Math.random() * 6.2832, wy: Math.random() * 6.2832, /* wander phases */
          base: big ? rnd(0.4, 0.7) : rnd(0.2, 0.5),
          tw: Math.random() * Math.PI * 2, tws: rnd(0.8, 2)
        });
      }
    }
    function dot(x, y, r, a) {
      var d = r * 6;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(sprite, x - d / 2, y - d / 2, d, d);
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
      ctx.globalAlpha = 1;
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
        /* base heading + slow sinusoidal wander = continuous multi-directional drift */
        p.x += (p.vx + Math.sin(now * 0.0003 + p.wx) * 0.14) * dt;
        p.y += (p.vy + Math.cos(now * 0.00028 + p.wy) * 0.14) * dt;
        p.tw += 0.02 * p.tws * dt;
        if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
        if (p.y < -6) p.y = H + 6; else if (p.y > H + 6) p.y = -6;
        var tw = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(p.tw));
        var dx = cx + (p.x - cx) * spread;
        var dy = cy + (p.y - cy) * spread - sp * 70;
        dot(dx, dy, p.r * grow, p.base * tw * br);
      }
      ctx.globalAlpha = 1;
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

  /* ---------- Concept card: load scale-up, 3D tilt, phone parallax ---------- */
  (function conceptFX() {
    var concept = document.querySelector(".concept");
    if (!concept) return;
    var browser = concept.querySelector(".browser");
    var phone = concept.querySelector(".phone");
    if (!browser) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce) { browser.style.transform = "scale(1)"; if (phone) phone.style.transform = "none"; return; }

    var scale = 0.95, rx = 0, ry = 0, rxT = 0, ryT = 0, parY = 0, parYT = 0;
    var loadStart = null, cTick = false;

    /* load scale-up 0.95 -> 1 when the card enters view */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es, obs) {
        es.forEach(function (e) { if (e.isIntersecting) { loadStart = performance.now(); obs.disconnect(); } });
      }, { threshold: 0.25 }).observe(concept);
    } else { loadStart = performance.now(); }

    /* 3D tilt toward the cursor (fine pointer only) */
    if (fine) {
      browser.addEventListener("mousemove", function (e) {
        var r = browser.getBoundingClientRect();
        rxT = -((e.clientY - r.top) / r.height - 0.5) * 8;
        ryT = ((e.clientX - r.left) / r.width - 0.5) * 8;
      });
      browser.addEventListener("mouseenter", function () {
        browser.style.boxShadow = "0 44px 90px -42px rgba(20,27,23,0.55)";
      });
      browser.addEventListener("mouseleave", function () {
        rxT = 0; ryT = 0; browser.style.boxShadow = "";
      });
    }

    /* phone parallax from scroll (moves a bit faster than the background) */
    function computePar() {
      cTick = false;
      var r = concept.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var center = r.top + r.height / 2;
      var prog = (vh / 2 - center) / (vh / 2 + r.height / 2);
      parYT = -prog * 42;
    }
    window.addEventListener("scroll", function () { if (!cTick) { cTick = true; requestAnimationFrame(computePar); } }, { passive: true });
    window.addEventListener("resize", computePar);
    computePar();

    (function loop(now) {
      if (loadStart != null) {
        var p = Math.min((now - loadStart) / 650, 1);
        scale = 0.95 + 0.05 * (1 - Math.pow(1 - p, 3));
      }
      rx += (rxT - rx) * 0.12;
      ry += (ryT - ry) * 0.12;
      parY += (parYT - parY) * 0.1;
      var fy = Math.sin(now / 1400) * 4;        /* gentle card float */
      var pf = Math.sin(now / 1200 + 1) * 6;    /* gentle phone float */
      browser.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) +
        "deg) scale(" + scale.toFixed(3) + ") translateY(" + fy.toFixed(1) + "px)";
      if (phone) phone.style.transform = "translateY(" + (parY + pf).toFixed(1) + "px)";
      requestAnimationFrame(loop);
    })(performance.now());
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

  /* ---------- Contact form (fetch -> POST /api/contact) ---------- */
  var form = document.querySelector("#contact-form");
  if (form) {
    var fields = form.querySelectorAll("[required]");

    function validateField(field) {
      var wrap = field.closest(".field");
      var ok = field.checkValidity() && field.value.trim() !== "";
      wrap.classList.toggle("invalid", !ok);
      // Preserve the default error text if the field's own .error span
      // has been overwritten by a prior server response.
      var errorEl = wrap.querySelector(".error");
      if (ok && errorEl && errorEl.dataset.serverMessage) {
        errorEl.textContent = errorEl.dataset.defaultMessage || errorEl.textContent;
        delete errorEl.dataset.serverMessage;
      }
      return ok;
    }

    fields.forEach(function (field) {
      // Snapshot the original .error copy once so we can restore it later
      var wrap = field.closest(".field");
      var errorEl = wrap && wrap.querySelector(".error");
      if (errorEl && !errorEl.dataset.defaultMessage) {
        errorEl.dataset.defaultMessage = errorEl.textContent;
      }
      field.addEventListener("blur", function () { validateField(field); });
      field.addEventListener("input", function () {
        if (field.closest(".field").classList.contains("invalid")) validateField(field);
      });
    });

    function getVal(id) {
      var el = form.querySelector("#" + id);
      return el && el.value ? el.value.trim() : "";
    }

    // Map server-side validation field names back to HTML input ids.
    // ContactInput accepts both "details"/"message" and "website-type"/"service";
    // the server may surface either name in its `fields` payload.
    var SERVER_TO_INPUT_ID = {
      details:      "details",
      message:      "details",
      "website-type": "website-type",
      service:      "website-type",
      name:         "name",
      email:        "email",
      phone:        "phone",
      company:      "company"
    };

    function markServerError(key, text) {
      var inputId = SERVER_TO_INPUT_ID[key] || key;
      var el = form.querySelector("#" + inputId);
      if (!el) return;
      var wrap = el.closest(".field");
      if (!wrap) return;
      wrap.classList.add("invalid");
      var errorEl = wrap.querySelector(".error");
      if (errorEl) {
        errorEl.textContent = text;
        errorEl.dataset.serverMessage = "1";
      }
    }

    // Toast notifications — fixed top-right, auto-dismiss. Replaces the
    // older in-form status banner so that no element ever appears above
    // or inside the form on error.
    function ensureToastStack() {
      var stack = document.querySelector(".toast-stack");
      if (stack) return stack;
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "region");
      stack.setAttribute("aria-label", "Notifications");
      document.body.appendChild(stack);
      return stack;
    }
    // Inline SVG checkmark (matches the shape used by .form__success for
    // visual consistency with the rest of the site).
    var TOAST_CHECK_SVG =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    function toast(message, opts) {
      opts = opts || {};
      var kind    = opts.kind    || "error";
      var timeout = typeof opts.timeout === "number" ? opts.timeout : 5000;
      var stack   = ensureToastStack();

      var el = document.createElement("div");
      el.className = "toast toast--" + kind;
      el.setAttribute("role", kind === "error" ? "alert" : "status");
      el.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");

      // Success toasts carry a subtle green check; error toasts rely on
      // the red left-border alone for a quieter look.
      if (kind === "success") {
        var icon = document.createElement("span");
        icon.className = "toast__icon";
        icon.innerHTML = TOAST_CHECK_SVG;
        el.appendChild(icon);
      }

      var msg = document.createElement("div");
      msg.className = "toast__msg";
      msg.textContent = message;

      var close = document.createElement("button");
      close.type = "button";
      close.className = "toast__close";
      close.setAttribute("aria-label", "Dismiss notification");
      close.innerHTML = "&times;";

      el.appendChild(msg);
      el.appendChild(close);
      stack.appendChild(el);

      // Enter animation on next frame so the transition fires
      requestAnimationFrame(function () { el.classList.add("toast--show"); });

      var closed = false;
      function dismiss() {
        if (closed) return;
        closed = true;
        el.classList.remove("toast--show");
        el.classList.add("toast--leave");
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 320);
      }
      close.addEventListener("click", dismiss);
      if (timeout > 0) setTimeout(dismiss, timeout);
      return dismiss;
    }
    // Remove any stale status element left behind by an older page cache
    // or earlier build of this JS (defensive — new runs don't create one).
    var stale = form.querySelector(".form__status");
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

    function clearServerFieldErrors() {
      form.querySelectorAll(".field .error").forEach(function (errorEl) {
        if (errorEl.dataset.serverMessage) {
          errorEl.textContent = errorEl.dataset.defaultMessage || "";
          delete errorEl.dataset.serverMessage;
        }
      });
      form.querySelectorAll(".field.invalid").forEach(function (f) { f.classList.remove("invalid"); });
    }

    // Resolve the API URL from the form's data-api-base attribute.
    // Empty value = same-origin. Never hardcode a production domain here.
    function apiUrl() {
      var base = (form.getAttribute("data-api-base") || "").replace(/\/+$/, "");
      return base + "/api/contact";
    }

    var submitting   = false;
    var successShown = false;  // guards against duplicate success toasts

    // Submit-button loading state: swap only the inner .btn__t text so
    // the button keeps its stable dimensions, and add .is-loading so CSS
    // can suppress the hover-fill animation and cursor change.
    var submitBtn   = form.querySelector('button[type="submit"]');
    var submitLabel = submitBtn && submitBtn.querySelector(".btn__t");

    function setSubmitLoading(loading) {
      if (!submitBtn) return;
      if (loading) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
        submitBtn.classList.add("is-loading");
        if (submitLabel) {
          if (!submitLabel.dataset.restingText) {
            submitLabel.dataset.restingText = submitLabel.textContent;
          }
          submitLabel.textContent = "Sending…";
        }
      } else {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
        submitBtn.classList.remove("is-loading");
        if (submitLabel && submitLabel.dataset.restingText) {
          submitLabel.textContent = submitLabel.dataset.restingText;
        }
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return;

      clearServerFieldErrors();

      // Client-side gate
      var allOk = true;
      fields.forEach(function (field) { if (!validateField(field)) allOk = false; });
      if (!allOk) {
        var firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }

      // Build payload — matches ContactInput's accepted shape
      var payload = {
        name:            getVal("name"),
        email:           getVal("email"),
        phone:           getVal("phone"),
        company:         getVal("company"),
        "website-type":  getVal("website-type"),
        details:         getVal("details")
      };

      submitting = true;
      form.classList.add("submitting");
      setSubmitLoading(true);

      function restore() {
        submitting = false;
        form.classList.remove("submitting");
        setSubmitLoading(false);
      }

      // Older browsers without fetch should degrade gracefully rather than crash
      if (typeof fetch !== "function") {
        toast("Your browser does not support submitting this form. Please email us at info@nexumglobal.solutions.");
        restore();
        return;
      }

      fetch(apiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept":       "application/json"
        },
        body:        JSON.stringify(payload),
        credentials: "omit",
        cache:       "no-store"
      })
        .then(function (res) {
          return res.json()
            .catch(function () { return {}; })
            .then(function (data) { return { status: res.status, ok: res.ok, data: data || {} }; });
        })
        .then(function (resp) {
          var status = resp.status;
          var data   = resp.data || {};
          if (status === 201 || (resp.ok && data.ok === true)) {
            form.classList.add("sent");
            var success = form.querySelector(".form__success");
            if (success) success.classList.add("show");
            // Only show the success toast on a confirmed 201 — and only
            // once per form lifetime, so repeated resolver calls or
            // cached responses cannot stack duplicates.
            if (status === 201 && !successShown) {
              successShown = true;
              toast("Your inquiry has been submitted successfully!", { kind: "success" });
            }
            return;
          }
          if (status === 422 && data && data.fields) {
            Object.keys(data.fields).forEach(function (k) { markServerError(k, data.fields[k]); });
            var firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
            if (firstBad) firstBad.focus();
            toast((data && data.message) || "Please fix the highlighted fields and try again.");
            return;
          }
          if (status === 429) {
            toast((data && data.message) || "Too many submissions. Please try again later.");
            return;
          }
          if (status === 413) {
            toast("Your message is too long. Please shorten it and try again.");
            return;
          }
          // 415, 500, anything else
          toast((data && data.message) || "Something went wrong on our side. Please try again in a moment.");
        })
        .catch(function () {
          // Network error, DNS failure, CORS block, aborted request
          toast("Could not reach the server. Please check your connection and try again.");
        })
        .then(restore);  // finally-equivalent for broadest browser support
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
