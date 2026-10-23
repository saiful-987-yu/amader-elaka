(function (window) {
  "use strict";

  const Utils = {};

  Utils.qs = (sel, root) => (root || document).querySelector(sel);
  Utils.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  Utils.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach((key) => {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key === "html") node.innerHTML = attrs[key];
      else if (key.startsWith("on") && typeof attrs[key] === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else if (attrs[key] !== null && attrs[key] !== undefined) {
        node.setAttribute(key, attrs[key]);
      }
    });
    (children || []).forEach((child) => {
      if (child) node.appendChild(child);
    });
    return node;
  };

  Utils.debounce = function (fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  Utils.normalizePhone = function (raw) {
    if (!raw) return "";
    let value = String(raw).trim().replace(/[^\d+]/g, "");
    if (value.startsWith("+880")) return value;
    if (value.startsWith("880")) return "+" + value;
    if (value.startsWith("0") && value.length === 11) return "+88" + value;
    if (/^\d{10}$/.test(value)) return "+880" + value;
    return value;
  };

  Utils.phoneKey = function (raw) {
    let d = String(raw == null ? "" : raw).replace(/\D/g, "");
    if (d.indexOf("00880") === 0) d = d.slice(2);
    if (d.length === 13 && d.indexOf("880") === 0) return "0" + d.slice(3);
    if (d.length === 10 && d.charAt(0) === "1") return "0" + d;
    return d;
  };

  Utils.isValidBdPhone = function (raw) {
    if (!raw) return false;
    const digits = String(raw).replace(/[^\d]/g, "");
    if (/^01[3-9]\d{8}$/.test(digits)) return true;
    if (/^8801[3-9]\d{8}$/.test(digits)) return true;
    return false;
  };

  Utils.resolveImageUrl = function (url) {
    if (!url) return "";
    const trimmed = String(url).trim();
    if (!trimmed) return "";
    const candidates = Utils.driveImageCandidates(trimmed);
    return candidates.length ? candidates[0] : trimmed;
  };

  Utils.driveFileId = function (url) {
    const trimmed = String(url || "").trim();
    if (!trimmed || !/drive\.google\.com|docs\.google\.com/.test(trimmed)) return "";
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    return match ? match[1] : "";
  };

  Utils.driveImageCandidates = function (url) {
    const id = Utils.driveFileId(url);
    if (!id) return [];
    return [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://drive.google.com/uc?export=view&id=${id}`
    ];
  };

  Utils.photoCache = (function () {
    const DB_NAME = "amader-photo-cache";
    const DB_VERSION = 1;
    const STORE = "photos";
    const MAX_BLOB_BYTES = 8 * 1024 * 1024;
    let dbPromise = null;

    function openDb() {
      if (!window.indexedDB) return Promise.resolve(null);
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve) => {
        let req;
        try {
          req = window.indexedDB.open(DB_NAME, DB_VERSION);
        } catch (e) { resolve(null); return; }
        req.onupgradeneeded = () => {
          try {
            if (!req.result.objectStoreNames.contains(STORE)) {
              req.result.createObjectStore(STORE, { keyPath: "url" });
            }
          } catch (e) { }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      return dbPromise;
    }

    function get(url) {
      return openDb().then((db) => {
        if (!db) return null;
        return new Promise((resolve) => {
          try {
            const req = db.transaction(STORE, "readonly").objectStore(STORE).get(url);
            req.onsuccess = () => resolve(req.result ? req.result.blob : null);
            req.onerror = () => resolve(null);
          } catch (e) { resolve(null); }
        });
      }).catch(() => null);
    }

    function put(url, blob) {
      if (!blob || !blob.size || blob.size > MAX_BLOB_BYTES) return Promise.resolve();
      return openDb().then((db) => {
        if (!db) return;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put({ url, blob, savedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch (e) { resolve(); }
        });
      }).catch(() => {});
    }

    return { get, put };
  })();

  const CORS_BACKFILL_BLOCKED_KEY = "nobi.photoCache.corsBlocked";

  Utils.wireImageFallback = function (img, originalUrl, onFallback, localUrl, onLoad) {
    const candidates = originalUrl ? Utils.driveImageCandidates(originalUrl) : [];
    const urls = candidates.length ? candidates : (originalUrl ? [originalUrl] : []);
    const laterDelaysMs = [2000, 5000, 10000, 20000, 30000];
    let attempt = 1;
    let servedFromCache = false;
    let servedFromLocalFixture = false;

    img.style.opacity = "0";
    img.style.transition = "opacity 0.25s ease";
    img.onload = function () {
      img.style.opacity = "1";
      if (!servedFromCache && !servedFromLocalFixture) {
        const loadedUrl = img.src;
        if (!Utils.storage.get(CORS_BACKFILL_BLOCKED_KEY, false)) {
          fetch(loadedUrl, { mode: "cors" })
            .then((res) => (res && res.ok ? res.blob() : null))
            .then((blob) => { if (blob) Utils.photoCache.put(originalUrl, blob); })
            .catch(() => { Utils.storage.set(CORS_BACKFILL_BLOCKED_KEY, true); });
        }
      }
      if (onLoad) onLoad();
    };

    function startNetworkRetryChain() {
      if (!urls.length) { onFallback(); return; }
      img.onerror = retry;
      img.src = urls[0];
    }

    function retry() {
      if (!img.isConnected) return;
      const totalAttempts = urls.length + laterDelaysMs.length;
      if (attempt >= totalAttempts) { onFallback(); return; }
      const isFirstRound = attempt < urls.length;
      const url = urls[attempt % urls.length];
      const delay = isFirstRound ? 0 : laterDelaysMs[attempt - urls.length];
      attempt++;
      if (delay === 0) {
        img.src = url;
      } else {
        setTimeout(() => { if (img.isConnected) img.src = url; }, delay);
      }
    }

    function startDriveChain() {
      if (!urls.length) { onFallback(); return; }
      Utils.photoCache.get(originalUrl).then((blob) => {
        if (!img.isConnected) return;
        if (blob) {
          servedFromCache = true;
          img.onerror = startNetworkRetryChain;
          img.src = URL.createObjectURL(blob);
        } else {
          startNetworkRetryChain();
        }
      });
    }

    if (localUrl) {
      img.onerror = () => {
        if (!img.isConnected) return;
        img.onerror = null;
        servedFromLocalFixture = false;
        startDriveChain();
      };
      img.src = localUrl;
      servedFromLocalFixture = true;
    } else {
      startDriveChain();
    }
  };

  Utils.localFixtureUrl = function (kind, slug) {
    if (!slug) return null;
    if (kind === "market") return "assets/local-photos/markets/" + slug + ".jpg";
    if (kind === "marketBg") return "assets/local-photos/markets/" + slug + "-bg.jpg";
    if (kind === "vehicle") return "assets/local-photos/vehicles/" + slug + ".jpg";
    if (kind === "category") return "assets/local-photos/categories/" + slug + ".jpg";
    if (kind === "homeCategory") return "assets/local-photos/categories/" + slug + ".jpg";
    if (kind === "homeNotice") return "assets/banner-images/home-notice-" + slug + ".jpg";
    if (kind === "profile") return "assets/local-photos/profilePhoto/" + encodeURIComponent(String(slug).trim()) + ".jpg";
    return null;
  };

  Utils.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  Utils.storage = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
      }
    }
  };

  Utils.driverDisplayName = function (driver) {
    if (!driver) return "";
    const isBn = window.Lang && window.Lang.current() === "bn";
    return isBn ? (driver.nameBn || driver.name) : (driver.name || driver.nameBn);
  };

  Utils.clean = function (value) {
    return (value == null ? "" : String(value)).trim().replace(/\s+/g, " ");
  };

  Utils.waLink = function (raw) {
    const normalized = Utils.normalizePhone(raw);
    return "https://wa.me/" + normalized.replace(/^\+/, "");
  };

  Utils.resolveWhatsApp = function (driver) {
    const raw = Utils.clean(driver && driver.whatsapp);
    if (!raw) return null;
    const upper = raw.toUpperCase();
    if (upper === "N" || raw === "নাই" || raw === "না") return null;
    if (upper === "F") return driver.phone ? driver.phone : null;
    if (upper === "A") return driver.altPhone ? driver.altPhone : null;
    return raw;
  };

  Utils.starCount = function (raw) {
    const num = parseFloat(raw);
    if (isNaN(num)) return 0;
    return Math.min(5, Math.max(0, Math.round(num)));
  };

  Utils.splitMulti = function (raw) {
    if (!raw) return [];
    return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
  };

  Utils.buildFooterClone = function () {
    const Lang = window.Lang;
    const Icons = window.Icons;
    const isLoggedIn = window.Auth && window.Auth.isLoggedIn();

    const nav = Utils.el("nav", { class: "footer-nav", "aria-label": "Footer" }, [
      Utils.el("a", { href: "#/markets", text: Lang.t("nav.drivers") }),
      Utils.el("a", { href: "#/doctor", text: Lang.t("nav.doctor") }),
      Utils.el("a", { href: "#/registration", text: Lang.t("nav.register") }),
      isLoggedIn
        ? Utils.el("a", { href: "#/profile", text: Lang.t("nav.profile") })
        : Utils.el("a", { href: "#/login", text: Lang.t("nav.login") })
    ]);

    const brandMark = Utils.el("span", { class: "brand__mark brand__mark--sm", "aria-hidden": "true" });
    const brandImg = Utils.el("img", { src: "assets/brand/logo-low.png", alt: "", style: "width:100%;height:100%;object-fit:contain;border-radius:inherit;" });
    brandImg.addEventListener("error", () => { brandMark.innerHTML = Icons.logo; });
    brandMark.appendChild(brandImg);
    const brand = Utils.el("a", { class: "footer-brand", href: "#/" }, [
      brandMark,
      Utils.el("span", { text: Lang.t("site.name") })
    ]);

    const socialNav = Utils.el("nav", { class: "footer-social", "aria-label": "Social media" });
    const socialCfg = (window.NOBI_CONFIG && window.NOBI_CONFIG.SOCIAL_LINKS) || {};
    [
      { key: "call", icon: Icons.phone, labelKey: "footer.call" },
      { key: "whatsapp", icon: Icons.whatsapp, labelKey: "footer.whatsapp" },
      { key: "facebook", icon: Icons.facebook, labelKey: "footer.facebook" },
      { key: "tiktok", icon: Icons.tiktok, labelKey: "footer.tiktok" },
      { key: "instagram", icon: Icons.instagram, labelKey: "footer.instagram" },
      { key: "website", icon: Icons.website, labelKey: "footer.website" }
    ].forEach((p) => {
      let href = socialCfg[p.key] || "#";
      if (p.key === "whatsapp" && href !== "#") href = Utils.waLink(href);
      if (p.key === "call" && href !== "#") href = "tel:" + Utils.normalizePhone(href);
      const attrs = { "aria-label": Lang.t(p.labelKey), html: p.icon };
      if (p.key === "website") {
        attrs.html = '<img src="assets/icons/sacarmart-logo.svg" alt="" width="20" height="20" decoding="async">';
        attrs.class = "footer-social__brand";
      }
      if (href !== "#") attrs.href = href;
      if (p.key !== "call" && href !== "#") { attrs.target = "_blank"; attrs.rel = "noopener"; }
      socialNav.appendChild(Utils.el("a", attrs));
    });

    const socialRow = Utils.el("div", { class: "footer-row footer-row--social" }, [socialNav]);

    const bottomRow = Utils.el("div", { class: "footer-row footer-row--bottom" }, [
      Utils.el("span", { text: "© " + new Date().getFullYear() + " " + Lang.t("site.name") + " · " + Lang.t("footer.rights") })
    ]);

    return Utils.el("footer", { class: "site-footer" }, [
      Utils.el("div", { class: "footer-compact" }, [
        Utils.el("div", { class: "footer-row footer-row--top" }, [brand, nav]),
        socialRow,
        bottomRow
      ])
    ]);
  };

  Utils.videoEmbedUrl = function (rawUrl) {
    const url = Utils.clean(rawUrl);
    if (!url) return null;

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    if (ytMatch && ytMatch[1]) return "https://www.youtube.com/embed/" + ytMatch[1];

    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
    if (url.indexOf("drive.google.com") !== -1 && driveMatch && driveMatch[1]) {
      return "https://drive.google.com/file/d/" + driveMatch[1] + "/preview";
    }

    return null;
  };

  Utils.buildVideoSection = function (rawUrl, titleText) {
    const embedUrl = Utils.videoEmbedUrl(rawUrl);
    if (!embedUrl) return null;

    const iframe = Utils.el("iframe", {
      src: embedUrl, title: titleText, frameborder: "0", allowfullscreen: "true",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    });
    const section = Utils.el("div", { class: "video-section is-loading" }, [
      Utils.el("h3", { class: "detail-section-title", text: titleText }),
      Utils.el("div", { class: "video-embed" }, [iframe])
    ]);

    iframe.addEventListener("load", () => { section.classList.remove("is-loading"); });

    return section;
  };

  const SOCIAL_PLATFORMS = [
    { key: "maps", label: "Google Maps", icon: "mapPin", hosts: ["maps.google.com", "maps.app.goo.gl", "g.page", "goo.gl/maps"] },
    { key: "facebook", label: "Facebook", icon: "facebook", hosts: ["facebook.com", "fb.com", "fb.me", "fb.watch"] },
    { key: "youtube", label: "YouTube", icon: "youtube", hosts: ["youtube.com", "youtu.be"] },
    { key: "whatsapp", label: "WhatsApp", icon: "whatsapp", hosts: ["wa.me", "whatsapp.com"] },
    { key: "tiktok", label: "TikTok", icon: "tiktok", hosts: ["tiktok.com"] },
    { key: "linkedin", label: "LinkedIn", icon: "linkedin", hosts: ["linkedin.com", "lnkd.in"] },
    { key: "instagram", label: "Instagram", icon: "instagram", hosts: ["instagram.com", "instagr.am"] },
    { key: "x", label: "X", icon: "xTwitter", hosts: ["twitter.com", "x.com", "t.co"] },
    { key: "telegram", label: "Telegram", icon: "telegram", hosts: ["t.me", "telegram.me", "telegram.org"] },
    { key: "messenger", label: "Messenger", icon: "messenger", hosts: ["m.me", "messenger.com"] },
    { key: "snapchat", label: "Snapchat", icon: "snapchat", hosts: ["snapchat.com"] },
    { key: "pinterest", label: "Pinterest", icon: "pinterest", hosts: ["pinterest.com", "pin.it"] },
    { key: "threads", label: "Threads", icon: "threads", hosts: ["threads.net", "threads.com"] }
  ];

  Utils.parseSocialLinks = function (raw) {
    if (!raw) return [];
    const parts = String(raw).split(/\s*\n\s*|,\s+|,(?=https?:\/\/)/i);
    const out = [];
    parts.forEach((part) => {
      let candidate = part.trim().replace(/^[,\s]+|[,\s]+$/g, "");
      if (!candidate) return;
      if (!/^[a-z][a-z0-9+.\-]*:/i.test(candidate)) {
        if (!/^[\w\-]+(\.[\w\-]+)+(\/|\?|#|$)/.test(candidate)) return;
        candidate = "https://" + candidate;
      }
      let u;
      try { u = new URL(candidate); } catch (e) { return; }
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
      const hostAndPath = host + u.pathname.toLowerCase();
      let platform = null;
      if (host.indexOf("google.") !== -1 && /^\/maps(\/|$)/.test(u.pathname.toLowerCase())) {
        platform = SOCIAL_PLATFORMS[0];
      } else {
        platform = SOCIAL_PLATFORMS.find((p) => p.hosts.some((h) =>
          h.indexOf("/") !== -1 ? hostAndPath.indexOf(h) === 0 : (host === h || host.endsWith("." + h))
        )) || null;
      }
      if (platform) out.push({ url: u.href, key: platform.key, label: platform.label, icon: Icons[platform.icon] });
      else out.push({ url: u.href, key: "website", label: host, icon: Icons.website });
    });
    return out;
  };

  Utils.buildSocialLinksSection = function (rawUrls) {
    const items = Utils.parseSocialLinks(rawUrls);
    if (!items.length) return null;
    return Utils.el("div", { class: "social-links-section" }, items.map((it) =>
      Utils.el("a", {
        href: it.url,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "social-links__btn social-links__btn--" + it.key,
        "aria-label": it.label,
        title: it.label,
        html: it.icon
      })
    ));
  };

  Utils.speak = function (text, lang) {
    const clean = Utils.clean(text);
    if (!clean || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = lang === "bn" ? "bn-BD" : "en-US";
      window.speechSynthesis.speak(utter);
    } catch (err) {
    }
  };

  const SAFE_TAGS = ["p", "br", "hr", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a", "span", "div", "blockquote"];
  const DROP_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta", "form", "input", "button", "textarea", "select", "svg", "math", "template", "noscript"];


  function normalizeSitePath(p) {
    return String(p || "/").replace(/index\.html$/i, "").replace(/\/+$/, "") || "/";
  }

  Utils.siteHashLink = function (rawHref) {
    const h = String(rawHref || "").trim();
    if (/^#\/[A-Za-z0-9_\-\/%.]*$/.test(h)) return h;
    try {
      const u = new URL(h, window.location.href);
      if (!/^https?:$/.test(u.protocol)) return "";
      if (u.origin !== window.location.origin) return "";
      if (normalizeSitePath(u.pathname) !== normalizeSitePath(window.location.pathname)) return "";
      return /^#\/[A-Za-z0-9_\-\/%.]*$/.test(u.hash) ? u.hash : "";
    } catch (err) {
      return "";
    }
  };

  Utils.safeHtml = function (rawHtml) {
    const source = rawHtml == null ? "" : String(rawHtml);
    if (!source) return "";
    try {
      const doc = new DOMParser().parseFromString("<body>" + source + "</body>", "text/html");
      const clean = function (parent) {
        Array.from(parent.childNodes).forEach((node) => {
          if (node.nodeType === 3) return;
          if (node.nodeType !== 1) { parent.removeChild(node); return; }
          const tag = node.tagName.toLowerCase();
          if (DROP_TAGS.indexOf(tag) !== -1) { parent.removeChild(node); return; }
          clean(node);
          if (SAFE_TAGS.indexOf(tag) === -1) {
            while (node.firstChild) parent.insertBefore(node.firstChild, node);
            parent.removeChild(node);
            return;
          }
          const href = tag === "a" ? node.getAttribute("href") : null;
          Array.from(node.attributes).forEach((a) => node.removeAttribute(a.name));
          const internalHash = tag === "a" && href ? Utils.siteHashLink(href) : "";
          if (internalHash) {
            node.setAttribute("href", internalHash);
            node.setAttribute("data-internal", "1");
          } else if (tag === "a" && href && /^(https?:|mailto:|tel:)/i.test(href.trim())) {
            node.setAttribute("href", href.trim());
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          }
        });
      };
      clean(doc.body);
      return doc.body.innerHTML;
    } catch (err) {
      return "";
    }
  };

  function categoryExtraConfig(categorySlugs) {
    const config = window.CATEGORY_EXTRA_FIELDS || {};
    const slug = (categorySlugs || []).find((s) => Array.isArray(config[s]) && config[s].length);
    return slug ? config[slug] : [];
  }

  Utils.extraFieldDefs = function (categorySlugs) {
    return categoryExtraConfig(categorySlugs).filter((d) => d.key !== "qualification").slice(0, 4);
  };

  Utils.qualificationDef = function (categorySlugs) {
    return categoryExtraConfig(categorySlugs).find((d) => d.key === "qualification") || null;
  };

  Utils.qualificationLabel = function () {
    const config = window.CATEGORY_EXTRA_FIELDS || {};
    let found = null;
    Object.keys(config).some((slug) => {
      found = (Array.isArray(config[slug]) ? config[slug] : []).find((d) => d.key === "qualification") || null;
      return !!found;
    });
    return found ? Utils.extraLabel(found) : Lang.t("detail.qualification");
  };

  Utils.formatExperience = function (raw) {
    const text = raw === null || raw === undefined ? "" : String(raw).trim();
    const m = text.match(/^from\s+(\d{4})$/i);
    if (!m) return text;
    return Lang.current() === "bn" ? m[1] + " থেকে" : "From " + m[1];
  };

  Utils.localizedField = function (driver, key) {
    const base = driver[key];
    const bn = Utils.clean(driver[key + "Bn"]);
    if (window.Lang && window.Lang.current() === "bn") return bn || base;
    return Utils.clean(base) ? base : (bn || base);
  };

  Utils.extraLabel = function (def) {
    return Lang.current() === "bn" ? (def.bn || def.en) : (def.en || def.bn);
  };


  const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
  const MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const DHAKA_PARTS = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });

  function pad2(n) { return String(n).padStart(2, "0"); }

  function dateInfoFromMs(ms) {
    const parts = {};
    DHAKA_PARTS.formatToParts(new Date(ms)).forEach((p) => { parts[p.type] = p.value; });
    return { d: Number(parts.day), m: Number(parts.month), y: Number(parts.year), hh: Number(parts.hour), mm: Number(parts.minute), hasTime: true };
  }

  function buildDateInfo(d, m, y, hh, mm, ampm) {
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
    const hasTime = hh !== undefined && hh !== null && hh !== "";
    let hour = hasTime ? Number(hh) : 0;
    const minute = hasTime ? Number(mm) : 0;
    if (hasTime) {
      if (ampm) {
        const pm = /^p/i.test(ampm);
        if (hour < 1 || hour > 12) return null;
        hour = (hour % 12) + (pm ? 12 : 0);
      }
      if (hour > 23 || minute > 59) return null;
    }
    return { d, m, y, hh: hour, mm: minute, hasTime };
  }

  Utils.isJsDateString = function (value) {
    return /^[A-Za-z]{3},?\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d{4}/.test(String(value == null ? "" : value).trim());
  };

  Utils.parseDateInfo = function (raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : dateInfoFromMs(raw.getTime());
    const t = String(raw).replace(/[০-৯]/g, (c) => BN_DIGITS.indexOf(c)).trim();
    if (!t) return null;
    if (Utils.isJsDateString(t)) {
      const ms = Date.parse(t.replace(/\s*\(.*\)\s*$/, ""));
      if (isNaN(ms)) return null;
      const info = dateInfoFromMs(ms);
      info.hasTime = !(info.hh === 0 && info.mm === 0);
      return info;
    }
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i);
    if (m) {
      if (m[6]) {
        const ms = Date.parse(t);
        return isNaN(ms) ? null : dateInfoFromMs(ms);
      }
      return buildDateInfo(Number(m[3]), Number(m[2]), Number(m[1]), m[4], m[5]);
    }
    m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?)?$/i);
    if (m) return buildDateInfo(Number(m[1]), Number(m[2]), Number(m[3]), m[4], m[5], m[6]);
    m = t.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*(am|pm)?)?$/i);
    if (m) {
      const month = MONTH_NAMES[m[2].slice(0, 3).toLowerCase()];
      return month ? buildDateInfo(Number(m[1]), month, Number(m[3]), m[4], m[5], m[6]) : null;
    }
    return null;
  };

  Utils.formatDateTime = function (raw) {
    const info = Utils.parseDateInfo(raw);
    if (!info) return raw === null || raw === undefined ? "" : String(raw).trim();
    const dateText = pad2(info.d) + "-" + pad2(info.m) + "-" + pad2(info.y % 100);
    return info.hasTime ? dateText + " " + pad2(info.hh) + ":" + pad2(info.mm) : dateText;
  };

  Utils.parseDateMs = function (raw) {
    const info = Utils.parseDateInfo(raw);
    if (!info) return 0;
    return Date.UTC(info.y, info.m - 1, info.d, info.hh, info.mm) - 6 * 3600000;
  };

  Utils.nowText = function () {
    return Utils.formatDateTime(new Date());
  };

  window.Utils = Utils;
})(window);
