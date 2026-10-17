(function (window, document, Utils, Lang, Theme, Icons) {
  "use strict";

  const Toast = {};
  Toast.show = function (message, type) {
    const region = Utils.qs("#toast-region");
    if (!region) return;
    const node = Utils.el("div", {
      class: "toast" + (type ? " toast--" + type : ""),
      role: "status"
    }, [document.createTextNode(message)]);
    region.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      node.style.transition = "opacity 200ms ease";
      setTimeout(() => node.remove(), 220);
    }, 3200);
  };
  window.Toast = Toast;

  const Modal = {};
  let activeOverlay = null;
  let lastFocused = null;
  let activeOnClose = null;
  let modalEntryPushed = false;
  let modalEntryId = 0;
  let currentEntryId = 0;
  let pendingBackTimer = null;
  let awaitingBack = 0;
  let backToken = 0;
  let afterBack = null;
  let entryStack = [];
  let pendingStackBack = false;

  function modalEntryIsCurrent() {
    return !!(history.state && history.state.nobiModal === currentEntryId);
  }

  Modal.open = function (contentNode, opts) {
    const stackNew = !!(opts && opts.stack) && !!activeOverlay && modalEntryPushed;
    Modal.isReplacing = true;
    try {
      if (stackNew) {
        entryStack.push(currentEntryId);
        activeOverlay.remove();
        activeOverlay = null;
        document.removeEventListener("keydown", onKeydown);
        const previousClose = activeOnClose;
        activeOnClose = null;
        if (previousClose) previousClose();
        currentEntryId = ++modalEntryId;
        history.pushState({ nobiModal: currentEntryId }, "", window.location.hash || "#/");
      } else {
        Modal.close();
      }
    } finally { Modal.isReplacing = false; }
    if (!stackNew) lastFocused = document.activeElement;
    const overlay = Utils.el("div", { class: "modal-overlay", role: "presentation" });
    const sheet = Utils.el("div", { class: "modal-sheet", role: "dialog", "aria-modal": "true" }, [contentNode]);
    overlay.appendChild(sheet);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay && !(opts && opts.persistent)) Modal.close();
    });
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    activeOnClose = (opts && opts.onClose) || null;
    if (pendingBackTimer && !pendingStackBack) { clearTimeout(pendingBackTimer); pendingBackTimer = null; }
    if (!modalEntryPushed) {
      currentEntryId = ++modalEntryId;
      history.pushState({ nobiModal: currentEntryId }, "", window.location.hash || "#/");
      modalEntryPushed = true;
    }
    const focusable = sheet.querySelector("button, [href], input, select, textarea, [tabindex]");
    if (focusable) focusable.focus();
    document.addEventListener("keydown", onKeydown);
    return overlay;
  };

  function onKeydown(e) {
    if (e.key === "Escape") Modal.close();
  }

  function closeInternal(fromPop, skipSchedule) {
    if (!activeOverlay) return false;
    activeOverlay.remove();
    activeOverlay = null;
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    const cb = activeOnClose;
    activeOnClose = null;
    if (fromPop) {
      if (entryStack.length) currentEntryId = entryStack.pop();
      else modalEntryPushed = false;
    } else if (modalEntryPushed && !skipSchedule) {
      const id = currentEntryId;
      const stacked = entryStack.length > 0;
      if (stacked) { currentEntryId = entryStack.pop(); pendingStackBack = true; }
      if (pendingBackTimer) clearTimeout(pendingBackTimer);
      pendingBackTimer = setTimeout(() => {
        pendingBackTimer = null;
        pendingStackBack = false;
        if (!modalEntryPushed) return;
        if (!stacked) modalEntryPushed = false;
        if (history.state && history.state.nobiModal === id) {
          const t = ++backToken;
          awaitingBack = t;
          setTimeout(() => { if (awaitingBack === t) awaitingBack = 0; }, 800);
          history.back();
        }
      }, 0);
    }
    if (cb) cb();
    return true;
  }

  Modal.close = function () { closeInternal(false, false); };

  Modal.closeThen = function (fn) {
    if (!activeOverlay) { fn(); return; }
    if (pendingBackTimer) { clearTimeout(pendingBackTimer); pendingBackTimer = null; }
    const needBack = modalEntryPushed && modalEntryIsCurrent();
    const levels = entryStack.length + 1;
    entryStack = [];
    pendingStackBack = false;
    Modal.isLeaving = true;
    try { closeInternal(false, true); } finally { Modal.isLeaving = false; }
    modalEntryPushed = false;
    if (!needBack) { fn(); return; }
    const t = ++backToken;
    awaitingBack = t;
    afterBack = fn;
    setTimeout(() => {
      if (awaitingBack === t) {
        awaitingBack = 0;
        const f = afterBack;
        afterBack = null;
        if (f) f();
      }
    }, 400);
    history.go(-levels);
  };

  window.addEventListener("popstate", () => {
    if (awaitingBack) {
      awaitingBack = 0;
      const f = afterBack;
      afterBack = null;
      if (f) f();
      return;
    }
    if (activeOverlay && !modalEntryIsCurrent()) closeInternal(true, false);
  });

  Modal.confirm = function ({ title, body, confirmLabel, cancelLabel, danger }) {
    return new Promise((resolve) => {
      const content = Utils.el("div", {}, [
        Utils.el("div", { class: "modal-head" }, [
          Utils.el("h3", { text: title }),
          Utils.el("button", {
            class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"),
            html: Icons.close, onClick: () => { Modal.close(); resolve(false); }
          })
        ]),
        Utils.el("p", { text: body }),
        Utils.el("div", { class: "confirm-actions" }, [
          Utils.el("button", {
            class: "btn btn--ghost", text: cancelLabel || Lang.t("action.cancel"),
            onClick: () => { Modal.close(); resolve(false); }
          }),
          Utils.el("button", {
            class: "btn " + (danger ? "btn--danger" : "btn--primary"),
            text: confirmLabel || Lang.t("action.confirm"),
            onClick: () => { Modal.close(); resolve(true); }
          })
        ])
      ]);
      Modal.open(content);
    });
  };
  window.Modal = Modal;

  const ViewHelpers = {};

  ViewHelpers.loadingBlock = function (message) {
    return Utils.el("div", { class: "state-block", role: "status" }, [
      Utils.el("div", { class: "skeleton-grid" }, [
        Utils.el("div", { class: "skeleton-card" }),
        Utils.el("div", { class: "skeleton-card" }),
        Utils.el("div", { class: "skeleton-card" })
      ]),
      Utils.el("p", { text: message || Lang.t("loading.generic"), class: "mt-5" })
    ]);
  };

  ViewHelpers.errorBlock = function (message, onRetry) {
    return Utils.el("div", { class: "state-block" }, [
      Utils.el("div", { class: "state-block__icon", html: Icons.alertCircle }),
      Utils.el("h3", { text: message || Lang.t("error.network") }),
      Utils.el("button", { class: "btn btn--primary", text: Lang.t("action.retry"), onClick: onRetry })
    ]);
  };

  ViewHelpers.emptyBlock = function ({ message, sub, actionLabel, onAction, icon }) {
    const children = [
      Utils.el("div", { class: "state-block__icon", html: icon || Icons.empty }),
      Utils.el("h3", { text: message })
    ];
    if (sub) children.push(Utils.el("p", { text: sub }));
    if (actionLabel && onAction) {
      children.push(Utils.el("button", { class: "btn btn--ghost", text: actionLabel, onClick: onAction }));
    }
    return Utils.el("div", { class: "state-block" }, children);
  };

  ViewHelpers.breadcrumb = function (items) {
    const ol = Utils.el("ol", { class: "breadcrumb__list" });
    items.forEach((item, idx) => {
      const isLast = idx === items.length - 1;
      const li = Utils.el("li", { class: "breadcrumb__item" });
      if (item.path && !isLast) {
        li.appendChild(Utils.el("a", { href: "#" + item.path, class: "breadcrumb__link", text: item.label }));
      } else {
        li.appendChild(Utils.el("span", {
          class: "breadcrumb__current", text: item.label,
          "aria-current": isLast ? "page" : null
        }));
      }
      ol.appendChild(li);
      if (!isLast) ol.appendChild(Utils.el("li", { class: "breadcrumb__sep", "aria-hidden": "true", text: "\u203A" }));
    });
    return Utils.el("nav", { class: "breadcrumb", "aria-label": "Breadcrumb" }, [ol]);
  };

  function siteBaseUrl() {
    return window.location.href.split("#")[0];
  }

  ViewHelpers.driverShareUrl = function (driverId) {
    return siteBaseUrl() + "#/driver/" + encodeURIComponent(driverId);
  };

  async function shareLink(url, title) {
    if (navigator.share) {
      try {
        await navigator.share({ title: title, url: url });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (err) {
      try {
        const box = document.createElement("textarea");
        box.value = url;
        box.setAttribute("readonly", "");
        box.style.position = "fixed";
        box.style.opacity = "0";
        document.body.appendChild(box);
        box.select();
        copied = document.execCommand("copy");
        box.remove();
      } catch (err2) { copied = false; }
    }
    Toast.show(copied ? Lang.t("share.copied") : url, copied ? "success" : undefined);
  }

  ViewHelpers.shareButton = function (getUrl, getTitle, extraClass) {
    return Utils.el("button", {
      type: "button",
      class: "share-btn" + (extraClass ? " " + extraClass : ""),
      "aria-label": Lang.t("share.label"),
      title: Lang.t("share.label"),
      html: Icons.link,
      onClick: (e) => {
        e.stopPropagation();
        shareLink(getUrl(), getTitle());
      }
    });
  };

  ViewHelpers.shareAnchor = function (button) {
    return Utils.el("span", { class: "share-anchor" }, [button]);
  };

  function attachPageShare(app, rawPath) {
    const shareable = rawPath === "/" || /^\/(markets|emergency|doctor|other)(\/|$)/.test(rawPath);
    if (!shareable) return;
    if (Utils.qs(".share-anchor", app)) return;
    const roomRight = document.documentElement.clientWidth - 8;
    const row = Utils.qsa(".section-head__title-row", app).find((r) => {
      const last = r.lastElementChild;
      if (!last || window.getComputedStyle(r).visibility === "hidden" || !r.getClientRects().length) return false;
      return last.getBoundingClientRect().right + 36 <= roomRight;
    });
    if (!row) return;
    row.appendChild(ViewHelpers.shareAnchor(ViewHelpers.shareButton(
      () => siteBaseUrl() + (window.location.hash || "#/"),
      () => document.title || Lang.t("site.name")
    )));
  }

  document.addEventListener("click", (e) => {
    const link = e.target && e.target.closest ? e.target.closest("a[data-internal]") : null;
    if (!link) return;
    const target = link.getAttribute("href");
    if (!target || /^#\/driver\//.test(target)) return;
    e.preventDefault();
    if (window.location.hash === target) return;
    Modal.closeThen(() => { window.location.hash = target; });
  });

  window.ViewHelpers = ViewHelpers;

  const Router = { routes: [] };
  let isFirstRouteRender = true;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const SCROLL_STORE_KEY = "nobi.scrollMap";
  let scrollMap = {};
  try { scrollMap = JSON.parse(sessionStorage.getItem(SCROLL_STORE_KEY) || "{}") || {}; } catch (e) { scrollMap = {}; }
  let activeScrollKey = null;
  let lastPageKey = null;
  let scrollSavePaused = false;
  let restoreTimers = [];
  let persistTimer = null;

  function persistScrollMap() {
    persistTimer = null;
    try {
      const keys = Object.keys(scrollMap);
      if (keys.length > 80) keys.slice(0, keys.length - 80).forEach((k) => { delete scrollMap[k]; });
      sessionStorage.setItem(SCROLL_STORE_KEY, JSON.stringify(scrollMap));
    } catch (e) {}
  }

  function clearRestoreTimers() {
    restoreTimers.forEach(clearTimeout);
    restoreTimers = [];
  }

  function cancelScrollRestore() {
    if (!restoreTimers.length && !scrollSavePaused) return;
    clearRestoreTimers();
    scrollSavePaused = false;
  }

  window.addEventListener("scroll", () => {
    if (scrollSavePaused || !activeScrollKey) return;
    delete scrollMap[activeScrollKey];
    scrollMap[activeScrollKey] = window.scrollY;
    if (!persistTimer) persistTimer = setTimeout(persistScrollMap, 300);
  }, { passive: true });
  ["wheel", "touchstart", "mousedown", "keydown"].forEach((ev) => window.addEventListener(ev, cancelScrollRestore, { passive: true }));
  window.addEventListener("pagehide", persistScrollMap);

  function ensureEntryKey() {
    const st = history.state;
    if (st && st.nobiModal && lastPageKey) return lastPageKey;
    if (st && st.navKey) return st.navKey;
    const key = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    try { history.replaceState(Object.assign({}, st || {}, { navKey: key }), ""); } catch (e) {}
    return key;
  }

  function applyScroll(y) {
    window.scrollTo({ top: y, behavior: "auto" });
    if (y <= 0) { scrollSavePaused = false; return; }
    const delays = [80, 250, 600, 1200];
    delays.forEach((ms, i) => {
      restoreTimers.push(setTimeout(() => {
        if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: "auto" });
        if (i === delays.length - 1) { restoreTimers = []; scrollSavePaused = false; }
      }, ms));
    });
  }

  Router.register = function (pattern, renderFn, ancestors) {
    const paramNames = [];
    const regex = new RegExp("^" + pattern.replace(/:[^/]+/g, (m) => {
      paramNames.push(m.slice(1));
      return "([^/]+)";
    }) + "$");
    Router.routes.push({ regex, paramNames, renderFn, ancestors: ancestors || [] });
  };

  Router.navigate = function (path) {
    window.location.hash = "#" + path;
  };

  function fillPattern(pattern, params) {
    return pattern.replace(/:([^/]+)/g, (m, name) => encodeURIComponent(params[name] != null ? params[name] : ""));
  }

  function synthesizeAncestorHistory(route, params, finalHash) {
    if (!route.ancestors.length) return;
    const chain = route.ancestors.map((p) => "#" + fillPattern(p, params));
    history.replaceState({ synthetic: true }, "", chain[0]);
    for (let i = 1; i < chain.length; i++) {
      history.pushState({ synthetic: true }, "", chain[i]);
    }
    history.pushState({ synthetic: true }, "", finalHash);
  }

  function currentPath() {
    const hash = window.location.hash || "#/";
    return hash.slice(1) || "/";
  }

  async function renderRoute() {
    const path = currentPath();
    const [rawPath, queryString] = path.split("?");
    const query = {};
    if (queryString) {
      queryString.split("&").forEach((pair) => {
        const [k, v] = pair.split("=");
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
      });
    }

    const app = Utils.qs("#app");
    if (!app) return;

    for (const route of Router.routes) {
      const match = rawPath.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        if (isFirstRouteRender) {
          synthesizeAncestorHistory(route, params, window.location.hash || "#/");
        }
        isFirstRouteRender = false;
        scrollSavePaused = true;
        clearRestoreTimers();
        const entryKey = ensureEntryKey();
        const savedY = Object.prototype.hasOwnProperty.call(scrollMap, entryKey) ? scrollMap[entryKey] : 0;
        activeScrollKey = entryKey;
        lastPageKey = entryKey;
        app.setAttribute("aria-busy", "true");
        try {
          await route.renderFn(app, params, query);
        } catch (err) {
          console.error(err);
          app.innerHTML = "";
          app.appendChild(ViewHelpers.errorBlock(Lang.t("error.generic"), () => renderRoute()));
        }
        app.setAttribute("aria-busy", "false");
        attachPageShare(app, rawPath);
        applyScroll(savedY);
        highlightNav(rawPath);
        closeMobileMenu();
        return;
      }
    }
    isFirstRouteRender = false;
    Router.navigate("/");
  }

  function highlightNav(rawPath) {
    Utils.qsa("[data-nav-link]").forEach((link) => {
      const target = link.getAttribute("data-nav-link");
      const isCurrent = target === "/" ? rawPath === "/" : rawPath.startsWith(target);
      link.classList.toggle("is-current", isCurrent);
    });
  }

  window.addEventListener("hashchange", renderRoute);
  window.Router = Router;

  let mobileNavScrollGuardActive = false;

  function closeMobileMenu() {
    const nav = Utils.qs("#mobile-nav");
    const toggle = Utils.qs("#menu-toggle");
    if (nav) nav.classList.remove("is-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = Icons.menu;
    }
    if (mobileNavScrollGuardActive) {
      window.removeEventListener("scroll", closeMobileMenu);
      mobileNavScrollGuardActive = false;
    }
    document.removeEventListener("mousedown", onOutsideMenuClick);
  }

  function openMobileMenu() {
    const nav = Utils.qs("#mobile-nav");
    const toggle = Utils.qs("#menu-toggle");
    if (nav) nav.classList.add("is-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
      toggle.innerHTML = Icons.close;
    }
    window.addEventListener("scroll", closeMobileMenu, { passive: true });
    mobileNavScrollGuardActive = true;
    setTimeout(() => document.addEventListener("mousedown", onOutsideMenuClick), 0);
  }

  function onOutsideMenuClick(e) {
    const nav = Utils.qs("#mobile-nav");
    const toggle = Utils.qs("#menu-toggle");
    if (nav && (nav.contains(e.target) || (toggle && toggle.contains(e.target)))) return;
    closeMobileMenu();
  }

  function wireHeader() {
    const menuToggle = Utils.qs("#menu-toggle");
    const mobileNav = Utils.qs("#mobile-nav");
    if (menuToggle && mobileNav) {
      menuToggle.addEventListener("click", () => {
        if (mobileNav.classList.contains("is-open")) closeMobileMenu();
        else openMobileMenu();
      });
    }

    Utils.qsa("[data-lang-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => Lang.setLanguage(btn.getAttribute("data-lang-toggle")));
    });

    Utils.qsa("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => Theme.toggle());
      btn.setAttribute("aria-pressed", Theme.current() === "dark" ? "true" : "false");
    });

    document.addEventListener("nobi:authchange", updateAuthNav);
    updateAuthNav();
  }

  function updateAuthNav() {
    const loggedIn = window.Auth && window.Auth.isLoggedIn();
    Utils.qsa("[data-auth-link]").forEach((link) => {
      const showWhen = link.getAttribute("data-auth-link");
      const shouldShow = showWhen === "loggedIn" ? loggedIn : !loggedIn;
      link.style.display = shouldShow ? "" : "none";
    });
    paintMobileNavProfile(loggedIn);
  }

  function paintMobileNavProfile(loggedIn) {
    const link = Utils.qs("#mobile-nav-profile");
    if (!link || !window.Auth) return;
    if (!loggedIn) return;
    const paint = (driver) => {
      if (!driver) return;
      link.innerHTML = "";
      const avatar = Utils.el("span", { class: "mobile-nav__icon mobile-nav__avatar", "aria-hidden": "true" }, [
        Utils.el("span", { class: "mobile-nav__avatar-fallback", html: Icons.user })
      ]);
      const url = Utils.resolveImageUrl(driver.imageUrl);
      const localUrl = Utils.localFixtureUrl("profile", driver.driverId);
      if (url || localUrl) {
        const img = Utils.el("img", { alt: "" });
        Utils.wireImageFallback(img, driver.imageUrl, () => {}, localUrl);
        avatar.appendChild(img);
      }
      link.appendChild(avatar);
      link.appendChild(Utils.el("span", { text: Utils.driverDisplayName(driver) }));
    };
    paint(window.Auth.peekProfile && window.Auth.peekProfile());
    window.Auth.getProfile().then(paint).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireHeader();
    Lang.apply();
    if (window.Api && window.Api.preload) window.Api.preload().catch(() => {});
    renderRoute();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        window.dispatchEvent(new CustomEvent("nobi:swregistered", { detail: { registration: reg } }));
      }).catch(() => {});
    }
  });

  document.addEventListener("nobi:languagechange", async () => {
    const scrollY = window.scrollY;
    await renderRoute();
    window.scrollTo(0, scrollY);
    updateAuthNav();
  });
})(window, document, window.Utils, window.Lang, window.Theme, window.Icons);
