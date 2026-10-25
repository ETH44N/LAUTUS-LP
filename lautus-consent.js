/*
 * Lautus cookie consent and tracking (2026-10-25). One file, no dependencies, the same bytes on
 * lautus.ai (LAUTUS-LP repo, `lautus-consent.js` at the root), app.lautus.ai
 * (`apps/app/public/`) and the studio (`apps/dashboard/public/`); keep the copies identical
 * (`apps/app/src/lib/tracking.test.ts` checks the two in this repo).
 *
 * The page sets `window.LAUTUS_TRACKING` before this file loads:
 *   { ga4: "G-…", clarity: "…", metaPixel: "…", tiktokPixel: "…", googleAds: "AW-…",
 *     googleAdsSignupLabel: "…", googleAdsPurchaseLabel: "…", firstPromoter: "…",
 *     privacyUrl: "https://…", locale: "en" | "fr" }
 * Every id is optional; an id that does not look like one is ignored. With none set, nothing
 * shows and nothing loads.
 *
 * Nothing that sets a cookie or reads the device loads before the visitor says yes (CNIL /
 * ePrivacy: "Reject all" as easy as "Accept all", no tracking on silence). Two choices:
 *   analytics  Google Analytics 4, Microsoft Clarity
 *   marketing  Meta Pixel, TikTok Pixel, Google Ads, FirstPromoter (affiliate referrals)
 * The answer lives in the `lautus_consent` cookie on `.lautus.ai`, so one answer covers the
 * landing page, the account app and the studio, and is asked again after 6 months.
 *
 * Page API:
 *   lautusTrack(name, params)   "sign_up" | "purchase" | "begin_checkout" | "lead"; sent to
 *                               every tool the visitor allowed, kept until they answer.
 *   lautusConsent.open()        reopens the choices (also any click on [data-cookie-settings]).
 *   lautusConsent.get()         { analytics, marketing } or null before an answer.
 */
(function () {
  "use strict";
  if (window.lautusConsent && window.lautusConsent.ready) return;

  var COOKIE = "lautus_consent";
  var VERSION = "1";
  var MAX_AGE_S = 182 * 24 * 3600;

  var raw = window.LAUTUS_TRACKING || {};
  var PATTERNS = {
    ga4: /^G-[A-Z0-9]{4,20}$/,
    clarity: /^[a-z0-9]{6,20}$/,
    metaPixel: /^[0-9]{6,20}$/,
    tiktokPixel: /^[A-Z0-9]{10,30}$/,
    googleAds: /^AW-[0-9]{6,15}$/,
    googleAdsSignupLabel: /^[A-Za-z0-9_-]{1,64}$/,
    googleAdsPurchaseLabel: /^[A-Za-z0-9_-]{1,64}$/,
    firstPromoter: /^[A-Za-z0-9_-]{1,64}$/,
  };
  var ids = {};
  Object.keys(PATTERNS).forEach(function (key) {
    var value = typeof raw[key] === "string" ? raw[key].trim() : "";
    ids[key] = PATTERNS[key].test(value) ? value : null;
  });
  var hasAnalytics = !!(ids.ga4 || ids.clarity);
  var hasMarketing = !!(ids.metaPixel || ids.tiktokPixel || ids.googleAds || ids.firstPromoter);

  var lang = String(raw.locale || document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var privacyUrl =
    typeof raw.privacyUrl === "string" && /^https?:\/\/|^\//.test(raw.privacyUrl)
      ? raw.privacyUrl
      : lang === "fr"
        ? "https://app.lautus.ai/confidentialite"
        : "https://app.lautus.ai/privacy";

  var COPY = {
    en: {
      title: "Cookies",
      body:
        "We'd like to measure how Lautus is used and see which ads bring you here. Nothing is " +
        "set until you choose.",
      accept: "Accept all",
      reject: "Reject all",
      customize: "Choose",
      save: "Save my choices",
      privacy: "Privacy policy",
      necessary: "Necessary",
      necessaryLede: "Sign-in, language, this choice. Always on.",
      analytics: "Analytics",
      analyticsLede: "Google Analytics, Microsoft Clarity: which pages work, where people get stuck.",
      marketing: "Marketing",
      marketingLede: "Meta, TikTok, Google Ads, affiliate referrals: which ads and partners bring sign-ups.",
    },
    fr: {
      title: "Cookies",
      body:
        "Nous aimerions mesurer l'usage de Lautus et savoir quelles publicités vous amènent ici. " +
        "Rien n'est déposé avant votre choix.",
      accept: "Tout accepter",
      reject: "Tout refuser",
      customize: "Choisir",
      save: "Enregistrer mes choix",
      privacy: "Politique de confidentialité",
      necessary: "Nécessaires",
      necessaryLede: "Connexion, langue, ce choix. Toujours actifs.",
      analytics: "Mesure d'audience",
      analyticsLede: "Google Analytics, Microsoft Clarity : ce qui marche, où l'on bloque.",
      marketing: "Marketing",
      marketingLede:
        "Meta, TikTok, Google Ads, affiliation : quelles publicités et quels partenaires amènent des inscriptions.",
    },
  };
  var t = COPY[lang] || COPY.en;

  // ---------------------------------------------------------------- the stored answer
  function cookieDomain() {
    var host = location.hostname;
    return host === "lautus.ai" || /\.lautus\.ai$/.test(host) ? "; domain=.lautus.ai" : "";
  }

  function readChoice() {
    var match = document.cookie.match(/(?:^|;\s*)lautus_consent=([^;]*)/);
    if (!match) return null;
    var parts = decodeURIComponent(match[1]).split(".");
    if (parts.length !== 4 || parts[0] !== VERSION) return null;
    var at = Number(parts[3]);
    if (!isFinite(at) || Date.now() / 1000 - at > MAX_AGE_S) return null;
    return { analytics: parts[1] === "1", marketing: parts[2] === "1" };
  }

  function writeChoice(choice) {
    var value = [VERSION, choice.analytics ? 1 : 0, choice.marketing ? 1 : 0, Math.floor(Date.now() / 1000)].join(".");
    document.cookie =
      COOKIE + "=" + value + "; path=/; max-age=" + MAX_AGE_S + "; samesite=lax" +
      cookieDomain() + (location.protocol === "https:" ? "; secure" : "");
  }

  // The tools' own cookies, removed when a yes becomes a no.
  var TOOL_COOKIES = /^(_ga|_ga_.*|_gid|_gat.*|_gcl_.*|_clck|_clsk|CLID|_fbp|_fbc|_ttp|_tt_.*|ttcsid.*|_fprom_.*)$/;
  function clearToolCookies() {
    var host = location.hostname;
    var domains = ["", "; domain=" + host, "; domain=." + host];
    var base = host.split(".").slice(-2).join(".");
    if (base !== host) domains.push("; domain=." + base);
    document.cookie.split(";").forEach(function (pair) {
      var name = pair.split("=")[0].trim();
      if (!TOOL_COOKIES.test(name)) return;
      domains.forEach(function (domain) {
        document.cookie = name + "=; path=/; max-age=0" + domain;
      });
    });
  }

  // ---------------------------------------------------------------- the tools
  var loaded = { analytics: false, marketing: false, gtag: false };

  function addScript(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function ensureGtag(choice) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
    if (!loaded.gtag) {
      loaded.gtag = true;
      // Consent Mode v2: denied by default, then exactly what the visitor allowed.
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      window.gtag("js", new Date());
      addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ids.ga4 && choice.analytics ? ids.ga4 : ids.googleAds));
    }
    var ads = choice.marketing ? "granted" : "denied";
    window.gtag("consent", "update", {
      analytics_storage: choice.analytics ? "granted" : "denied",
      ad_storage: ads,
      ad_user_data: ads,
      ad_personalization: ads,
    });
  }

  function loadAnalytics(choice) {
    if (loaded.analytics) return;
    loaded.analytics = true;
    if (ids.ga4) {
      ensureGtag(choice);
      window.gtag("config", ids.ga4);
    }
    if (ids.clarity) {
      (function (c, l, a, r, i) {
        c[a] = c[a] || function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
        var s = l.createElement(r);
        s.async = 1;
        s.src = "https://www.clarity.ms/tag/" + i;
        var y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(s, y);
      })(window, document, "clarity", "script", ids.clarity);
      window.clarity("consent");
    }
  }

  function loadMarketing(choice) {
    if (loaded.marketing) return;
    loaded.marketing = true;
    if (ids.googleAds) {
      ensureGtag(choice);
      window.gtag("config", ids.googleAds);
    }
    if (ids.metaPixel) {
      (function (f, b, e, v, n) {
        if (f.fbq) return;
        n = f.fbq = function () {
          if (n.callMethod) n.callMethod.apply(n, arguments);
          else n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        addScript(v);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", ids.metaPixel);
      window.fbq("track", "PageView");
    }
    if (ids.tiktokPixel) {
      (function (w, d, t) {
        w.TiktokAnalyticsObject = t;
        var ttq = (w[t] = w[t] || []);
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
        ttq.setAndDefer = function (o, m) {
          o[m] = function () {
            o.push([m].concat(Array.prototype.slice.call(arguments, 0)));
          };
        };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (id) {
          var e = ttq._i[id] || [];
          for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
          return e;
        };
        ttq.load = function (id, opts) {
          var url = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {};
          ttq._i[id] = [];
          ttq._i[id]._u = url;
          ttq._t = ttq._t || {};
          ttq._t[id] = +new Date();
          ttq._o = ttq._o || {};
          ttq._o[id] = opts || {};
          addScript(url + "?sdkid=" + encodeURIComponent(id) + "&lib=" + t);
        };
        ttq.load(ids.tiktokPixel);
        ttq.page();
      })(window, document, "ttq");
    }
    if (ids.firstPromoter) {
      // FirstPromoter counts the affiliate's click and keeps `_fprom_tid` for the account app,
      // which reports the sign-up server side (apps/app/src/lib/server/firstpromoter.ts).
      window.fpr = window.fpr || function () {
        window.fpr.q = window.fpr.q || [];
        window.fpr.q[arguments[0] === "set" ? "unshift" : "push"](arguments);
      };
      window.fpr("init", { cid: ids.firstPromoter });
      window.fpr("click");
      addScript("https://cdn.firstpromoter.com/fpr.js");
    }
  }

  function apply(choice) {
    if (choice.analytics && hasAnalytics) loadAnalytics(choice);
    if (choice.marketing && hasMarketing) loadMarketing(choice);
    if (loaded.gtag) ensureGtag(choice);
  }

  // ---------------------------------------------------------------- events
  var pending = [];

  function money(value) {
    var n = Number(value);
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
  }

  function send(name, p, choice) {
    var currency = typeof p.currency === "string" ? p.currency.toUpperCase() : undefined;
    var value = money(p.value);
    var plan = typeof p.plan === "string" ? p.plan : undefined;
    var id = typeof p.transaction_id === "string" ? p.transaction_id : undefined;
    var ga = choice.analytics && ids.ga4 && window.gtag;
    var mk = choice.marketing;

    if (name === "sign_up") {
      if (ga) window.gtag("event", "sign_up", { method: p.method || "lautus" });
      if (mk && ids.googleAds && ids.googleAdsSignupLabel && window.gtag)
        window.gtag("event", "conversion", { send_to: ids.googleAds + "/" + ids.googleAdsSignupLabel });
      if (mk && window.fbq) window.fbq("track", "CompleteRegistration");
      if (mk && window.ttq) window.ttq.track("CompleteRegistration");
    } else if (name === "purchase") {
      var item = plan ? [{ item_id: plan, item_name: plan, price: value, quantity: 1 }] : undefined;
      if (ga) window.gtag("event", "purchase", { transaction_id: id, value: value, currency: currency, items: item });
      if (mk && ids.googleAds && ids.googleAdsPurchaseLabel && window.gtag)
        window.gtag("event", "conversion", {
          send_to: ids.googleAds + "/" + ids.googleAdsPurchaseLabel,
          value: value,
          currency: currency,
          transaction_id: id,
        });
      // The event ids let a later server-side Conversions API send the same purchase without
      // counting it twice.
      if (mk && window.fbq)
        window.fbq("track", "Purchase", { value: value, currency: currency, content_ids: plan ? [plan] : undefined, content_type: "product" }, id ? { eventID: id } : undefined);
      if (mk && window.ttq)
        window.ttq.track("CompletePayment", { value: value, currency: currency, content_id: plan, content_type: "product" }, id ? { event_id: id } : undefined);
    } else if (name === "begin_checkout") {
      if (ga) window.gtag("event", "begin_checkout", { value: value, currency: currency, items: plan ? [{ item_id: plan }] : undefined });
      if (mk && window.fbq) window.fbq("track", "InitiateCheckout", { value: value, currency: currency, content_ids: plan ? [plan] : undefined });
      if (mk && window.ttq) window.ttq.track("InitiateCheckout", { value: value, currency: currency, content_id: plan });
    } else if (name === "lead") {
      if (ga) window.gtag("event", "generate_lead", {});
      if (mk && window.fbq) window.fbq("track", "Lead");
      if (mk && window.ttq) window.ttq.track("SubmitForm");
    }
  }

  function track(name, params) {
    var p = params && typeof params === "object" ? params : {};
    var choice = readChoice();
    if (choice === null) {
      // Not answered yet: kept for this page only, sent if the answer allows it.
      if (pending.length < 20) pending.push([name, p]);
      return;
    }
    send(name, p, choice);
  }

  // ---------------------------------------------------------------- the banner
  var root = null;

  function css() {
    if (document.getElementById("lc-style")) return;
    var style = document.createElement("style");
    style.id = "lc-style";
    style.textContent =
      ".lc{position:fixed;z-index:2147483000;left:16px;bottom:16px;max-width:400px;width:calc(100% - 32px);" +
      "box-sizing:border-box;padding:18px 18px 16px;border-radius:16px;background:#fff;color:#14161c;" +
      "border:1px solid rgba(20,22,28,.12);box-shadow:0 18px 48px -18px rgba(20,22,28,.35);" +
      "font:14px/1.45 'General Sans',system-ui,-apple-system,'Segoe UI',sans-serif;}" +
      ".lc *{box-sizing:border-box}" +
      ".lc h2{margin:0 0 6px;font-size:15px;font-weight:600;letter-spacing:0}" +
      ".lc p{margin:0;color:#4b4f5a}" +
      ".lc a{color:inherit;text-decoration:underline;text-underline-offset:2px}" +
      ".lc__row{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}" +
      ".lc__btn{flex:1 1 0;min-width:120px;appearance:none;border:1px solid #14161c;border-radius:10px;" +
      "padding:10px 14px;font:inherit;font-weight:600;cursor:pointer;background:#14161c;color:#fff}" +
      ".lc__btn:focus-visible,.lc__link:focus-visible,.lc input:focus-visible{outline:2px solid #3b6cff;outline-offset:2px}" +
      ".lc__link{appearance:none;border:0;background:none;padding:0;font:inherit;color:#4b4f5a;" +
      "text-decoration:underline;text-underline-offset:2px;cursor:pointer}" +
      ".lc__meta{display:flex;gap:14px;margin-top:12px;font-size:13px;color:#4b4f5a}" +
      ".lc__cats{margin:14px 0 0;padding:0;list-style:none;display:grid;gap:10px}" +
      ".lc__cat{display:grid;grid-template-columns:1fr auto;gap:2px 12px;align-items:center;padding:10px 12px;" +
      "border:1px solid rgba(20,22,28,.1);border-radius:12px}" +
      ".lc__cat b{font-weight:600}.lc__cat small{grid-column:1;color:#4b4f5a;font-size:12.5px}" +
      ".lc__cat input{grid-row:1/span 2;grid-column:2;width:18px;height:18px;accent-color:#14161c}" +
      "@media (max-width:480px){.lc{left:8px;bottom:8px;width:calc(100% - 16px)}}" +
      "@media print{.lc{display:none}}";
    document.head.appendChild(style);
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    if (text) node.textContent = text;
    return node;
  }

  function close() {
    if (root) root.remove();
    root = null;
  }

  function decide(choice) {
    var before = readChoice();
    writeChoice(choice);
    close();
    var revoked =
      before !== null &&
      ((before.analytics && !choice.analytics && loaded.analytics) ||
        (before.marketing && !choice.marketing && loaded.marketing));
    if (revoked) {
      // Scripts already running cannot be unloaded: clear their cookies and start clean.
      clearToolCookies();
      location.reload();
      return;
    }
    apply(choice);
    var queue = pending;
    pending = [];
    queue.forEach(function (e) {
      send(e[0], e[1], choice);
    });
  }

  function category(name, key, lede, checked, locked) {
    var li = el("li", { class: "lc__cat" });
    var id = "lc-" + key;
    var label = el("label", { for: id });
    label.appendChild(el("b", null, name));
    li.appendChild(label);
    var box = el("input", { type: "checkbox", id: id, name: key });
    box.checked = checked;
    if (locked) box.disabled = true;
    li.appendChild(box);
    li.appendChild(el("small", null, lede));
    return li;
  }

  function show(detailed) {
    css();
    close();
    var current = readChoice();
    root = el("section", { class: "lc", role: "dialog", "aria-modal": "false", "aria-labelledby": "lc-title", lang: lang });
    root.appendChild(el("h2", { id: "lc-title" }, t.title));
    root.appendChild(el("p", null, t.body));

    var row = el("div", { class: "lc__row" });
    if (detailed) {
      var cats = el("ul", { class: "lc__cats" });
      cats.appendChild(category(t.necessary, "necessary", t.necessaryLede, true, true));
      if (hasAnalytics) cats.appendChild(category(t.analytics, "analytics", t.analyticsLede, !!(current && current.analytics), false));
      if (hasMarketing) cats.appendChild(category(t.marketing, "marketing", t.marketingLede, !!(current && current.marketing), false));
      root.appendChild(cats);
      var save = el("button", { type: "button", class: "lc__btn" }, t.save);
      save.addEventListener("click", function () {
        var a = root.querySelector("#lc-analytics");
        var m = root.querySelector("#lc-marketing");
        decide({ analytics: !!(a && a.checked), marketing: !!(m && m.checked) });
      });
      row.appendChild(save);
    }
    // "Reject all" and "Accept all" look the same and sit side by side (CNIL).
    var reject = el("button", { type: "button", class: "lc__btn" }, t.reject);
    reject.addEventListener("click", function () {
      decide({ analytics: false, marketing: false });
    });
    var accept = el("button", { type: "button", class: "lc__btn" }, t.accept);
    accept.addEventListener("click", function () {
      decide({ analytics: true, marketing: true });
    });
    if (!detailed) {
      row.appendChild(reject);
      row.appendChild(accept);
    }
    root.appendChild(row);

    var meta = el("div", { class: "lc__meta" });
    if (!detailed) {
      var more = el("button", { type: "button", class: "lc__link" }, t.customize);
      more.addEventListener("click", function () {
        show(true);
      });
      meta.appendChild(more);
    } else {
      var back = el("button", { type: "button", class: "lc__link" }, t.reject);
      back.addEventListener("click", function () {
        decide({ analytics: false, marketing: false });
      });
      meta.appendChild(back);
    }
    meta.appendChild(el("a", { href: privacyUrl }, t.privacy));
    root.appendChild(meta);
    document.body.appendChild(root);
  }

  // ---------------------------------------------------------------- start
  var stub = window.lautusTrack;
  window.lautusTrack = track;
  window.lautusConsent = {
    ready: true,
    get: readChoice,
    open: function () {
      if (hasAnalytics || hasMarketing) show(true);
    },
  };

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest && event.target.closest("[data-cookie-settings]");
    if (!target) return;
    event.preventDefault();
    window.lautusConsent.open();
  });

  // Events the page sent before this file loaded (the inline stub queues them).
  var early = stub && stub.q ? stub.q : [];

  if (!hasAnalytics && !hasMarketing) return;
  var choice = readChoice();
  if (choice !== null) apply(choice);
  early.forEach(function (args) {
    track(args[0], args[1]);
  });
  if (choice === null) {
    if (document.body) show(false);
    else document.addEventListener("DOMContentLoaded", function () { show(false); });
  }
})();
