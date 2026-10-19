(function (window, document, Utils, Lang, Icons, Auth, Api, Router, Toast, Modal) {
  "use strict";

  const Admin = {};
  const STORE_KEY = "nobi.admin.mode";
  const LOST_CODES = ["ADMIN_MODE_OFF", "NOT_ADMIN", "SESSION_EXPIRED"];

  const T = (en, bn) => (Lang.current() === "bn" ? bn : en);
  const slugify = (text) => Utils.clean(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  let state = Utils.storage.get(STORE_KEY, null);
  let ticker = null;

  function persist() {
    if (state) Utils.storage.set(STORE_KEY, state);
    else Utils.storage.remove(STORE_KEY);
  }

  function announce() {
    if (document.body) document.body.classList.toggle("admin-mode-on", Admin.isOn());
    document.dispatchEvent(new CustomEvent("nobi:adminchange"));
  }

  function stopTicker() {
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function startTicker() {
    if (ticker) return;
    ticker = setInterval(() => {
      if (!Admin.isOn()) { clearState(true); return; }
      document.dispatchEvent(new CustomEvent("nobi:admintick"));
    }, 1000);
  }

  function clearState(announceEnded) {
    const wasOn = !!state;
    state = null;
    persist();
    stopTicker();
    announce();
    if (announceEnded && wasOn) Toast.show(T("Admin Mode has ended.", "অ্যাডমিন মোড শেষ হয়েছে।"));
  }

  function localExpiry(res) {
    return Date.now() + (Number(res.expiresAt) - Number(res.serverNow || Date.now()));
  }

  Admin.isOn = () => !!(state && state.adminToken && state.expiresAt > Date.now());
  Admin.remainingMs = () => (state ? Math.max(0, state.expiresAt - Date.now()) : 0);

  function formatRemaining(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const two = (n) => (n < 10 ? "0" + n : String(n));
    return h > 0 ? h + ":" + two(m) + ":" + two(s) : two(m) + ":" + two(s);
  }

  async function guarded(fn) {
    try {
      return await fn();
    } catch (err) {
      if (err && LOST_CODES.indexOf(err.code) !== -1) {
        clearState(false);
        if (Modal.close) Modal.close();
        if (err.code === "SESSION_EXPIRED") {
          Toast.show(Lang.t("error.sessionExpired"), "error");
          Router.navigate("/login");
        } else {
          Toast.show(T("Admin Mode is off. Turn it on again from your Profile.", "অ্যাডমিন মোড বন্ধ। প্রোফাইল থেকে আবার চালু করুন।"), "error");
        }
      }
      throw err;
    }
  }

  const tokens = () => ({ token: Auth.getToken(), adminToken: state && state.adminToken });

  let counts = { pendingUsers: 0, pendingRatings: 0 };

  function setCount(key, value) {
    counts[key] = Math.max(0, Number(value) || 0);
    document.dispatchEvent(new CustomEvent("nobi:admincounts"));
  }

  Admin.refreshCounts = async function () {
    if (!Admin.isOn()) return;
    try {
      const t = tokens();
      const res = await guarded(() => Api.adminPendingCounts(t.token, t.adminToken));
      if (res) {
        counts = { pendingUsers: Math.max(0, Number(res.pendingUsers) || 0), pendingRatings: Math.max(0, Number(res.pendingRatings) || 0) };
        document.dispatchEvent(new CustomEvent("nobi:admincounts"));
      }
    } catch (err) { }
  };

  Admin.enable = async function (password) {
    const res = await Api.adminEnableMode(Auth.getToken(), password);
    state = { adminToken: res.adminToken, expiresAt: localExpiry(res) };
    persist();
    startTicker();
    announce();
  };

  Admin.adjust = async function (deltaMinutes) {
    if (!Admin.isOn()) return;
    const t = tokens();
    const res = await guarded(() => Api.adminAdjustMode(t.token, t.adminToken, deltaMinutes));
    if (res && res.expired) { clearState(true); return; }
    if (state) { state.expiresAt = localExpiry(res); persist(); }
    document.dispatchEvent(new CustomEvent("nobi:admintick"));
  };

  Admin.disable = function () {
    const t = tokens();
    clearState(false);
    if (t.adminToken && t.token) Api.adminDisableMode(t.token, t.adminToken).catch(() => {});
  };

  document.addEventListener("nobi:authchange", (e) => {
    if (e.detail && e.detail.loggedIn === false && state) clearState(false);
  });

  (function resume() {
    if (!state) return;
    if (!Admin.isOn()) { clearState(false); return; }
    announce();
    startTicker();
    const t = tokens();
    Api.adminModeStatus(t.token, t.adminToken).then((res) => {
      if (state) { state.expiresAt = localExpiry(res); persist(); }
    }).catch((err) => {
      if (err && LOST_CODES.indexOf(err.code) !== -1) clearState(false);
    });
  })();

  function closeHead(title, onClose) {
    return Utils.el("div", { class: "modal-head" }, [
      Utils.el("h3", { text: title }),
      Utils.el("button", {
        type: "button", class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"), html: Icons.close,
        onClick: onClose || (() => Modal.close())
      })
    ]);
  }

  function spinnerNode() { return Utils.el("span", { class: "admin-spinner", "aria-hidden": "true" }); }

  function errorText(err) {
    switch (err && err.code) {
      case "DUPLICATE_PHONE": return T("This phone number is already used by another driver or application.", "এই ফোন নম্বর অন্য একজন ড্রাইভার বা আবেদনে ব্যবহৃত হচ্ছে।");
      case "DUPLICATE_USERNAME": return T("This username is already taken.", "এই ইউজারনেম আগেই নেওয়া হয়েছে।");
      case "VALIDATION_FAILED": return T("Some values are not valid. Please check and try again.", "কিছু তথ্য সঠিক নয়। যাচাই করে আবার চেষ্টা করুন।");
      case "NOT_FOUND": return T("That record no longer exists.", "এই রেকর্ডটি আর নেই।");
      default: return Lang.t("error.generic");
    }
  }

  function openVerifyModal() {
    const input = Utils.el("input", {
      type: "password", id: "adminVerifyPassword", name: "adminVerifyPassword",
      autocomplete: "current-password", placeholder: T("Password", "পাসওয়ার্ড")
    });
    let shown = false;
    const eye = Utils.el("button", {
      type: "button", class: "admin-pw-eye", "aria-label": Lang.t("login.showPassword"), html: Icons.eye,
      onClick: () => {
        shown = !shown;
        input.type = shown ? "text" : "password";
        eye.innerHTML = shown ? Icons.eyeOff : Icons.eye;
      }
    });
    const err = Utils.el("div", { class: "admin-verify__error", role: "alert" });
    const submit = Utils.el("button", { type: "submit", class: "btn btn--primary btn--block", text: T("Verify & Enable", "যাচাই করে চালু করুন") });
    const form = Utils.el("form", { class: "admin-verify" }, [
      Utils.el("p", { class: "admin-verify__hint", text: T("Enter your login password to enable Admin Editing Mode.", "অ্যাডমিন এডিটিং মোড চালু করতে আপনার লগইন পাসওয়ার্ড দিন।") }),
      Utils.el("div", { class: "admin-pw-wrap" }, [input, eye]),
      err,
      submit
    ]);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      const pw = input.value;
      if (!pw) { err.textContent = Lang.t("validation.required"); return; }
      const label = submit.textContent;
      submit.disabled = true;
      submit.textContent = "";
      submit.appendChild(spinnerNode());
      try {
        await Admin.enable(pw);
        Modal.close();
        Toast.show(T("Admin Mode is ON.", "অ্যাডমিন মোড চালু হয়েছে।"), "success");
      } catch (e2) {
        if (e2 && e2.code === "INVALID_CREDENTIALS") err.textContent = T("Incorrect password.", "পাসওয়ার্ড ভুল।");
        else if (e2 && e2.code === "NOT_ADMIN") { Modal.close(); Toast.show(T("This account is not an admin.", "এই অ্যাকাউন্ট অ্যাডমিন নয়।"), "error"); }
        else if (e2 && e2.code === "SESSION_EXPIRED") { Modal.close(); Toast.show(Lang.t("error.sessionExpired"), "error"); Router.navigate("/login"); }
        else err.textContent = Lang.t("error.generic");
        submit.textContent = label;
        submit.disabled = false;
      }
    });
    Modal.open(Utils.el("div", {}, [closeHead(T("Verify Password", "পাসওয়ার্ড যাচাই"), () => Modal.close()), form]));
  }

  Admin.buildDashboardCard = function () {
    const card = Utils.el("div", { class: "profile-card admin-card" });
    let timeEl = null;
    let badges = {};

    function paintBadges() {
      Object.keys(badges).forEach((key) => {
        const n = counts[key] || 0;
        badges[key].textContent = n > 99 ? "99+" : String(n);
        badges[key].hidden = n <= 0;
      });
    }

    function paint() {
      card.innerHTML = "";
      badges = {};
      const on = Admin.isOn();

      card.appendChild(Utils.el("div", { class: "profile-card__head" }, [
        Utils.el("h2", { html: Icons.shield + "<span>" + T("Admin Dashboard", "অ্যাডমিন ড্যাশবোর্ড") + "</span>" })
      ]));

      const sw = Utils.el("button", {
        type: "button", class: "admin-switch" + (on ? " is-on" : ""), role: "switch",
        "aria-checked": on ? "true" : "false", "aria-label": T("Admin Mode", "অ্যাডমিন মোড"),
        onClick: async () => {
          if (!Admin.isOn()) { openVerifyModal(); return; }
          const confirmed = await Modal.confirm({
            title: T("Turn off Admin Mode?", "অ্যাডমিন মোড বন্ধ করবেন?"),
            body: T("You will need to verify again to turn it back on.", "আবার চালু করতে আপনাকে নতুন করে যাচাই করতে হবে।"),
            confirmLabel: T("Turn Off", "বন্ধ করুন"),
            danger: true
          });
          if (confirmed) Admin.disable();
        }
      }, [Utils.el("span", { class: "admin-switch__knob" })]);
      card.appendChild(Utils.el("div", { class: "admin-toggle-row" }, [
        Utils.el("span", { class: "admin-toggle-row__label", text: T("Admin Mode", "অ্যাডমিন মোড") }),
        sw
      ]));

      timeEl = null;
      if (!on) return;

      const chips = [];
      function chip(label, delta) {
        const b = Utils.el("button", {
          type: "button", class: "admin-chip", text: label,
          onClick: async () => {
            chips.forEach((c) => { c.disabled = true; });
            try { await Admin.adjust(delta); } catch (e) { }
            chips.forEach((c) => { c.disabled = false; });
          }
        });
        chips.push(b);
        return b;
      }
      timeEl = Utils.el("span", { class: "admin-time", text: formatRemaining(Admin.remainingMs()) });
      card.appendChild(Utils.el("div", { class: "admin-timer-row" }, [
        Utils.el("div", { class: "admin-timer-group" }, [chip("-10m", -10), chip("-30m", -30), chip("-1h", -60)]),
        timeEl,
        Utils.el("div", { class: "admin-timer-group" }, [chip("+10m", 10), chip("+30m", 30), chip("+1h", 60)])
      ]));

      function action(icon, label, onClick, badgeKey) {
        const kids = [
          Utils.el("span", { class: "admin-action__icon", html: icon }),
          Utils.el("span", { class: "admin-action__label", text: label })
        ];
        if (badgeKey) {
          const badge = Utils.el("span", { class: "admin-badge", "aria-hidden": "true" });
          badges[badgeKey] = badge;
          kids.push(badge);
        }
        return Utils.el("button", { type: "button", class: "admin-action", onClick }, kids);
      }
      card.appendChild(Utils.el("div", { class: "admin-actions" }, [
        action(Icons.formPlus, T("Add User", "ইউজার যোগ"), () => Router.navigate("/registration")),
        action(Icons.formPlus, T("Add Directly", "সরাসরি যোগ"), () => Admin.openCreator()),
        action(Icons.star, T("Public Rating", "পাবলিক রেটিং"), () => Admin.openRatings(), "pendingRatings"),
        action(Icons.checkCircle, T("Pending Users", "পেন্ডিং ইউজার"), () => Admin.openPending(), "pendingUsers")
      ]));
      paintBadges();
      Admin.refreshCounts();
    }

    function onChange() { if (!card.isConnected) { document.removeEventListener("nobi:adminchange", onChange); document.removeEventListener("nobi:admintick", onTick); return; } paint(); }
    function onTick() {
      if (!card.isConnected) { document.removeEventListener("nobi:adminchange", onChange); document.removeEventListener("nobi:admintick", onTick); return; }
      if (timeEl) timeEl.textContent = formatRemaining(Admin.remainingMs());
    }
    function onCounts() {
      if (!card.isConnected) { document.removeEventListener("nobi:admincounts", onCounts); return; }
      paintBadges();
    }
    function onVisible() {
      if (!card.isConnected) { document.removeEventListener("visibilitychange", onVisible); return; }
      if (!document.hidden) Admin.refreshCounts();
    }
    const countsPoll = setInterval(() => {
      if (!card.isConnected) { clearInterval(countsPoll); return; }
      if (!document.hidden) Admin.refreshCounts();
    }, 60000);
    document.addEventListener("nobi:adminchange", onChange);
    document.addEventListener("nobi:admintick", onTick);
    document.addEventListener("nobi:admincounts", onCounts);
    document.addEventListener("visibilitychange", onVisible);
    paint();
    return card;
  };

  Admin.penButton = function (kind, id) {
    return Utils.el("button", {
      type: "button", class: "admin-pen-btn", "aria-label": T("Edit", "এডিট"), html: Icons.pencil,
      onClick: (e) => { e.stopPropagation(); e.preventDefault(); if (Admin.isOn()) Admin.openEditor(kind, id); },
      onKeydown: (e) => e.stopPropagation()
    });
  };

  const F = (key, en, bn, type, extra) => Object.assign({ key, en, bn, type: type || "text" }, extra || {});
  const YES_NO_ACTIVE = ["Active", "Inactive"];

  const LINK_FIELDS = [
    F("imageUrl", "Profile Image URL", "প্রোফাইল ছবির লিংক", "url"),
    F("vehicleImageUrl", "Gallery Image URL(s)", "অন্যান্য ছবির লিংক", "textarea", { hint: ["Separate several links with commas", "একাধিক লিংক কমা দিয়ে আলাদা করুন"] }),
    F("socialUrl", "Social Media URL(s)", "সোশ্যাল মিডিয়া লিংক", "textarea", { hint: ["Separate several links with a comma and a space", "একাধিক লিংক কমা ও স্পেস দিয়ে আলাদা করুন"] })
  ];
  const VIDEO_FIELD = F("videoUrl", "Video URL", "ভিডিও লিংক", "url");

  const ACCOUNT_FIELDS = [
    F("username", "Username", "ইউজারনেম"),
    F("password", "New Password", "নতুন পাসওয়ার্ড", "password", { hint: ["Leave empty to keep the current password", "ফাঁকা রাখলে বর্তমান পাসওয়ার্ড অপরিবর্তিত থাকবে"] })
  ];

  const MANAGED_FIELDS = [
    F("status", "Account Status", "অ্যাকাউন্ট স্ট্যাটাস", "select", { options: YES_NO_ACTIVE }),
    F("availability", "Availability", "এভেইলেবিলিটি", "select", { options: YES_NO_ACTIVE })
  ];
  const DRIVER_ONLY_MANAGED = [
    F("emergency", "Emergency Contact", "ইমার্জেন্সি কন্টাক্ট", "select", { options: ["TRUE", "FALSE"], allowBlank: true }),
    F("sortStatus", "Sort Status", "সর্ট স্ট্যাটাস", "select", { options: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"], allowBlank: true })
  ];
  const RATING_FIELDS = [
    F("starRating", "Star Rating (0–5)", "স্টার রেটিং (০–৫)", "number"),
    F("manualRating", "Manual Rating (0–5)", "ম্যানুয়াল রেটিং (০–৫)", "number"),
    F("personalDetails", "Personal Details", "ব্যক্তিগত বিবরণ", "textarea", { hint: ["Simple HTML is allowed", "সাধারণ HTML ব্যবহার করা যাবে"] })
  ];

  function fieldsFor(kind) {
    if (kind === "pending") return { links: LINK_FIELDS, managed: [], account: ACCOUNT_FIELDS };
    return { links: LINK_FIELDS.concat([VIDEO_FIELD]), managed: MANAGED_FIELDS.concat(DRIVER_ONLY_MANAGED, RATING_FIELDS), account: ACCOUNT_FIELDS };
  }

  const PAIRS = [["status", "availability"], ["emergency", "sortStatus"], ["starRating", "manualRating"]];

  function layoutNodes(controls, kind) {
    const pairs = PAIRS;
    const nodes = [];
    for (let i = 0; i < controls.length; i++) {
      const a = controls[i];
      const b = controls[i + 1];
      if (b && pairs.some((p) => p[0] === a.key && p[1] === b.key)) {
        nodes.push(Utils.el("div", { class: "field-row-2col" }, [a.wrap, b.wrap]));
        i++;
      } else {
        nodes.push(a.wrap);
      }
    }
    return nodes;
  }

  const REQUIRED = { driver: ["name", "phone"], pending: ["name", "phone", "username"] };

  function titleFor(kind) {
    if (kind === "pending") return T("Edit Pending Driver", "পেন্ডিং ড্রাইভার এডিট");
    return T("Edit Driver", "ড্রাইভার এডিট");
  }

  function buildControl(def, original, lists, liveCheck) {
    const label = T(def.en, def.bn);
    const id = "adminEdit_" + def.key;
    const hint = def.hint ? Utils.el("div", { class: "hint", text: T(def.hint[0], def.hint[1]) }) : null;
    const errorMsg = Utils.el("div", { class: "error-msg" });
    let control, read, changed;

    if (def.type === "select") {
      control = Utils.el("select", { id, name: id });
      const cur = Utils.clean(original);
      const options = def.options.slice();
      if (def.allowBlank) options.unshift("");
      if (cur && !options.some((o) => o.toLowerCase() === cur.toLowerCase())) options.push(cur);
      options.forEach((o) => {
        const sel = o.toLowerCase() === cur.toLowerCase();
        control.appendChild(Utils.el("option", { value: o, text: o || "—", selected: sel ? "selected" : null }));
      });
      read = () => control.value;
      changed = () => control.value.toLowerCase() !== cur.toLowerCase();
    } else if (def.type === "multi") {
      const source = lists[def.source] || [];
      const parts = Utils.splitMulti(original);
      const partSlugs = parts.map(slugify);
      const opts = source.map((o) => ({ label: o.nameEn + (o.nameBn ? " · " + o.nameBn : ""), value: o.nameEn, slug: o.slug || slugify(o.nameEn) }));
      parts.forEach((p) => { if (!opts.some((o) => o.slug === slugify(p))) opts.push({ label: p, value: p, slug: slugify(p) }); });
      control = Utils.el("div", { class: "admin-multi", id });
      const boxes = opts.map((o) => {
        const cb = Utils.el("input", { type: "checkbox", value: o.value });
        cb.checked = partSlugs.indexOf(o.slug) !== -1;
        control.appendChild(Utils.el("label", { class: "admin-multi__item" }, [cb, Utils.el("span", { text: o.label })]));
        return { cb, o };
      });
      read = () => boxes.filter((b) => b.cb.checked).map((b) => b.o.value).join(", ");
      changed = () => {
        const now = boxes.filter((b) => b.cb.checked).map((b) => b.o.slug).sort().join("|");
        return now !== partSlugs.slice().sort().join("|");
      };
      if (!opts.length) control.appendChild(Utils.el("div", { class: "hint", text: T("List not available right now.", "তালিকা এই মুহূর্তে পাওয়া যাচ্ছে না।") }));
    } else if (def.type === "textarea") {
      control = Utils.el("textarea", { id, name: id, rows: def.key === "personalDetails" ? "5" : "3" });
      control.value = Utils.clean(original);
      read = () => control.value;
      changed = () => Utils.clean(control.value) !== Utils.clean(original);
    } else if (def.type === "password") {
      control = Utils.el("input", { id, name: id, type: "password", autocomplete: "new-password" });
      read = () => control.value;
      changed = () => control.value !== "";
    } else {
      control = Utils.el("input", {
        id, name: id, type: def.type === "number" ? "text" : def.type,
        inputmode: def.type === "number" ? "decimal" : null
      });
      control.value = Utils.clean(original);
      read = () => control.value;
      changed = () => Utils.clean(control.value) !== Utils.clean(original);
    }
    if (def.layoutOnly) changed = () => false;

    const wrap = Utils.el("div", { class: "field" }, [Utils.el("label", { for: id, text: label }), control, hint, errorMsg]);
    const api = {
      key: def.key, wrap, read, changed,
      setError(msg) { wrap.classList.toggle("has-error", !!msg); errorMsg.textContent = msg || ""; }
    };

    if (liveCheck && (def.key === "phone" || def.key === "username")) {
      const isPhone = def.key === "phone";
      const cls = isPhone ? "phone-field" : "username-field";
      const norm = (v) => (isPhone ? Utils.clean(v).replace(/\D/g, "") : Utils.clean(v).toLowerCase());
      const checkFn = isPhone ? Api.checkPhone : Api.checkUsername;
      const box = Utils.el("div", { class: cls });
      const statusIcon = Utils.el("span", { class: cls + "__status", "aria-hidden": "true" });
      wrap.replaceChild(box, control);
      box.appendChild(control);
      box.appendChild(statusIcon);
      let requestToken = 0;
      control.addEventListener("input", Utils.debounce(() => {
        const value = Utils.clean(control.value);
        const myToken = ++requestToken;
        statusIcon.classList.remove("is-checking", "is-available");
        statusIcon.innerHTML = "";
        api.setError("");
        if (!value || norm(value) === norm(original)) return;
        if (isPhone && !Utils.isValidBdPhone(value)) return;
        statusIcon.innerHTML = Icons.more;
        statusIcon.classList.add("is-checking");
        checkFn(value).then((res) => {
          if (myToken !== requestToken) return;
          statusIcon.classList.remove("is-checking");
          if (res && res.available) {
            statusIcon.classList.add("is-available");
            statusIcon.innerHTML = Icons.checkCircle;
          } else {
            statusIcon.innerHTML = "";
            api.setError(Lang.t(isPhone ? "field.phoneTaken" : "field.usernameTaken"));
          }
        }).catch(() => {
          if (myToken !== requestToken) return;
          statusIcon.classList.remove("is-checking");
          statusIcon.innerHTML = "";
        });
      }, 500));
    }
    return api;
  }

  function fieldErrorSetter(wrap) {
    const errorMsg = wrap.querySelector(".error-msg");
    return (msg) => { wrap.classList.toggle("has-error", !!msg); if (errorMsg) errorMsg.textContent = msg || ""; };
  }

  function inputAdapter(key, field, original) {
    const orig = Utils.clean(original);
    field.control.value = orig;
    return {
      key, wrap: field.wrap,
      read: () => field.control.value,
      changed: () => Utils.clean(field.control.value) !== orig,
      setError: fieldErrorSetter(field.wrap)
    };
  }

  function multiAdapter(key, field, original, options) {
    const partSlugs = Utils.splitMulti(original).map(slugify);
    const slugByValue = {};
    options.forEach((o) => { slugByValue[o.value] = o.slug; });
    const boxes = Array.from(field.wrap.querySelectorAll("input[type=checkbox]"));
    boxes.forEach((cb) => { cb.checked = partSlugs.indexOf(slugByValue[cb.value]) !== -1; });
    return {
      key, wrap: field.wrap,
      read: () => boxes.filter((cb) => cb.checked).map((cb) => cb.value).join(", "),
      changed: () => boxes.filter((cb) => cb.checked).map((cb) => slugByValue[cb.value]).sort().join("|") !== partSlugs.slice().sort().join("|"),
      setError: fieldErrorSetter(field.wrap)
    };
  }

  function experienceAdapter(field, original) {
    const orig = Utils.clean(original);
    const numberInput = field.wrap.querySelector("#experienceValue");
    const unitSelect = field.wrap.querySelector("#experienceUnit");
    let parsed = !orig;
    const fromMatch = orig.match(/^from\s+(\d{4})$/i);
    const spanMatch = orig.match(/^(\d+(?:\.\d+)?)\s*(years?|months?)$/i);
    if (fromMatch) { numberInput.value = fromMatch[1]; unitSelect.value = "from"; parsed = true; }
    else if (spanMatch) { numberInput.value = spanMatch[1]; unitSelect.value = /^month/i.test(spanMatch[2]) ? "months" : "years"; parsed = true; }
    unitSelect.dispatchEvent(new Event("change"));
    if (!parsed) field.wrap.appendChild(Utils.el("div", { class: "hint", text: T("Current value: ", "বর্তমান মান: ") + orig }));
    let touched = false;
    const mark = () => { touched = true; };
    numberInput.addEventListener("input", mark);
    unitSelect.addEventListener("change", mark);
    const compose = () => {
      const n = Utils.clean(numberInput.value);
      if (!n) return "";
      return unitSelect.value === "from" ? "From " + n : n + " " + (unitSelect.value === "months" ? "Months" : "Years");
    };
    const setError = fieldErrorSetter(field.wrap);
    return {
      key: "experience", wrap: field.wrap,
      read: () => (touched || !orig ? compose() : orig),
      changed: () => touched && compose().toLowerCase() !== orig.toLowerCase(),
      setError,
      validate: () => {
        const n = Utils.clean(numberInput.value);
        const year = Number(n);
        if (unitSelect.value === "from" && n && !(Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear())) {
          setError(Lang.t("validation.yearInvalid"));
          return false;
        }
        return true;
      }
    };
  }

  function extraAdapter(key, field, original) {
    const orig = Utils.clean(original);
    field.control.value = orig;
    const hidden = () => field.wrap.style.display === "none";
    return {
      key, wrap: field.wrap,
      read: () => (hidden() ? "" : field.control.value),
      changed: () => !hidden() && Utils.clean(field.control.value) !== orig,
      setError: fieldErrorSetter(field.wrap)
    };
  }

  function buildFormControls(kind, values, lists, formEl, liveCheck) {
    const RF = window.RegistrationForm;
    const controls = [];
    const nodes = [];
    const digits = (v) => Utils.clean(v).replace(/\D/g, "");
    const ownPhone = digits(values.phone);

    const personal = RF.createPersonalRows(formEl, null, ownPhone ? (v) => digits(v) === ownPhone : null);
    [["name", "fullName"], ["nameBn", "fullNameBn"], ["guardianName", "guardianName"], ["phone", "mobile"], ["altPhone", "altMobile"], ["whatsapp", "whatsapp"],
      ["village", "village"], ["postOffice", "postOffice"], ["union", "union"], ["upazila", "upazila"], ["district", "district"], ["fullAddress", "fullAddress"]
    ].forEach(([key, id]) => controls.push(inputAdapter(key, personal.fields[id], values[key])));
    personal.rows.forEach((row) => nodes.push(row.wrap || row));

    const optionList = (source, current) => {
      const opts = (source || []).map((o) => ({
        value: o.nameEn, slug: o.slug || slugify(o.nameEn),
        label: Lang.current() === "bn" ? (o.nameBn || o.nameEn) : o.nameEn,
        search: [o.nameEn, o.nameBn, o.slug].join(" ")
      }));
      Utils.splitMulti(current).forEach((p) => {
        if (!opts.some((o) => o.slug === slugify(p))) opts.push({ value: p, slug: slugify(p), label: p, search: p });
      });
      return opts;
    };
    const vehicleOptions = optionList(lists.vehicles, values.vehicleType);
    const marketOptions = optionList(lists.markets, values.bazar);
    const slugByVehicle = {};
    vehicleOptions.forEach((o) => { slugByVehicle[o.value] = o.slug; });

    const category = RF.createCategoryRows({
      vehicleOptions, marketOptions, clearHidden: false,
      slugOf: (value) => slugByVehicle[value] || slugify(value)
    });
    const cf = category.fields;
    controls.push(multiAdapter("vehicleType", cf.vehicleType, values.vehicleType, vehicleOptions));
    controls.push(inputAdapter("vehicleNumber", cf.vehicleNumber, values.vehicleNumber));
    controls.push(multiAdapter("bazar", cf.marketSlug, values.bazar, marketOptions));
    controls.push(inputAdapter("serviceArea", cf.serviceArea, values.serviceArea));
    controls.push(experienceAdapter(cf.experience, values.experience));
    controls.push(extraAdapter("qualification", cf.qualification, values.qualification));
    cf.extra.forEach((row, i) => controls.push(extraAdapter("extra" + (i + 1), row, values["extra" + (i + 1)])));
    category.rows.forEach((row) => nodes.push(row.wrap || row));
    category.updateExtraFields();

    const defs = fieldsFor(kind);
    const build = (list) => list.map((def) => buildControl(def, values[def.key] || "", lists, liveCheck));
    [defs.links, defs.managed, defs.account].forEach((list) => {
      const built = build(list);
      built.forEach((c) => controls.push(c));
      layoutNodes(built, kind).forEach((n) => nodes.push(n));
    });

    return { controls, nodes };
  }

  Admin.openEditor = async function (kind, id, opts) {
    opts = opts || {};
    const backToPending = kind === "pending";
    const onClose = backToPending ? () => Admin.openPending() : () => Modal.close();
    const body = Utils.el("div", { class: "admin-loading" }, [spinnerNode()]);
    Modal.open(Utils.el("div", {}, [closeHead(titleFor(kind), onClose), body]));

    let record;
    const lists = { markets: [], vehicles: [] };
    try {
      const t = tokens();
      const results = await guarded(() => Promise.all([
        Api.adminGetRecord(t.token, t.adminToken, kind, id),
        Api.getMarkets().catch(() => []),
        Api.getVehicleCategories().catch(() => [])
      ]));
      record = results[0];
      lists.markets = results[1] || [];
      lists.vehicles = results[2] || [];
    } catch (err) {
      if (err && LOST_CODES.indexOf(err.code) !== -1) return;
      body.innerHTML = "";
      body.appendChild(Utils.el("p", { class: "admin-verify__error", text: errorText(err) }));
      return;
    }

    const saveBtn = Utils.el("button", { type: "submit", class: "btn btn--primary btn--block mt-5", text: Lang.t("profile.save") });
    const form = Utils.el("form", { class: "admin-edit-form", novalidate: "novalidate" });
    const built = buildFormControls(kind, record.fields || {}, lists, form, true);
    const controls = built.controls;
    built.nodes.concat([saveBtn]).forEach((node) => form.appendChild(node));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      controls.forEach((c) => c.setError(""));
      let ok = true;
      const required = REQUIRED[kind] || [];
      controls.forEach((c) => {
        if (required.indexOf(c.key) !== -1 && !Utils.clean(c.read())) { c.setError(Lang.t("validation.required")); ok = false; }
        if ((c.key === "starRating" || c.key === "manualRating") && Utils.clean(c.read())) {
          const n = Number(c.read());
          if (isNaN(n) || n < 0 || n > 5) { c.setError(T("Enter a number from 0 to 5.", "০ থেকে ৫ এর মধ্যে একটি সংখ্যা দিন।")); ok = false; }
        }
        if (c.key === "password" && c.read() && c.read().length < 6) { c.setError(Lang.t("validation.passwordShort")); ok = false; }
        if (c.validate && !c.validate()) ok = false;
      });
      if (!ok) { const bad = form.querySelector(".has-error"); if (bad) bad.scrollIntoView({ block: "center" }); return; }

      const fields = {};
      controls.forEach((c) => { if (c.changed()) fields[c.key] = c.read(); });
      if (!Object.keys(fields).length) { Toast.show(Lang.t("profile.noChanges")); return; }

      const label = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = Lang.t("profile.saving");
      try {
        const t = tokens();
        await guarded(() => Api.adminSaveRecord(t.token, t.adminToken, kind, id, fields));
        Toast.show(T("Saved.", "সংরক্ষণ হয়েছে।"), "success");
        if (backToPending) { Admin.openPending(); }
        else { Modal.close(); Admin.reloadRoute(); }
        if (opts.onSaved) opts.onSaved();
      } catch (err) {
        if (err && LOST_CODES.indexOf(err.code) !== -1) return;
        if (err && err.code === "DUPLICATE_PHONE") { const c = controls.find((x) => x.key === "phone"); if (c) c.setError(errorText(err)); }
        else if (err && err.code === "DUPLICATE_USERNAME") { const c = controls.find((x) => x.key === "username"); if (c) c.setError(errorText(err)); }
        else Toast.show(errorText(err), "error");
        saveBtn.disabled = false;
        saveBtn.textContent = label;
      }
    });

    body.replaceWith(form);
  };

  Admin.openCreator = async function () {
    const body = Utils.el("div", { class: "admin-loading" }, [spinnerNode()]);
    Modal.open(Utils.el("div", {}, [closeHead(T("Add New Entry", "নতুন তথ্য যোগ"), () => Modal.close()), body]));

    const lists = { markets: [], vehicles: [] };
    try {
      const results = await Promise.all([
        Api.getMarkets().catch(() => []),
        Api.getVehicleCategories().catch(() => [])
      ]);
      lists.markets = results[0] || [];
      lists.vehicles = results[1] || [];
    } catch (err) {
      body.innerHTML = "";
      body.appendChild(Utils.el("p", { class: "admin-verify__error", text: errorText(err) }));
      return;
    }

    const saveBtn = Utils.el("button", { type: "submit", class: "btn btn--primary btn--block mt-5", text: Lang.t("profile.save") });
    const form = Utils.el("form", { class: "admin-edit-form", novalidate: "novalidate" });
    const built = buildFormControls("driver", {}, lists, form, false);
    const controls = built.controls;
    built.nodes.concat([saveBtn]).forEach((node) => form.appendChild(node));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      controls.forEach((c) => c.setError(""));
      let ok = true;
      controls.forEach((c) => {
        if (["name", "phone"].indexOf(c.key) !== -1 && !Utils.clean(c.read())) { c.setError(Lang.t("validation.required")); ok = false; }
        if ((c.key === "starRating" || c.key === "manualRating") && Utils.clean(c.read())) {
          const n = Number(c.read());
          if (isNaN(n) || n < 0 || n > 5) { c.setError(T("Enter a number from 0 to 5.", "০ থেকে ৫ এর মধ্যে একটি সংখ্যা দিন।")); ok = false; }
        }
        if (c.key === "password" && c.read() && c.read().length < 6) { c.setError(Lang.t("validation.passwordShort")); ok = false; }
        if (c.validate && !c.validate()) ok = false;
      });
      if (!ok) { const bad = form.querySelector(".has-error"); if (bad) bad.scrollIntoView({ block: "center" }); return; }

      const fields = {};
      controls.forEach((c) => { const v = c.read(); if (Utils.clean(v) !== "") fields[c.key] = v; });

      const label = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = Lang.t("profile.saving");
      try {
        const t = tokens();
        await guarded(() => Api.adminCreateRecord(t.token, t.adminToken, fields));
        Toast.show(T("Added.", "যোগ হয়েছে।"), "success");
        Modal.close();
        Admin.reloadRoute();
      } catch (err) {
        if (err && LOST_CODES.indexOf(err.code) !== -1) return;
        if (err && err.code === "DUPLICATE_PHONE") { const c = controls.find((x) => x.key === "phone"); if (c) c.setError(errorText(err)); }
        else if (err && err.code === "DUPLICATE_USERNAME") { const c = controls.find((x) => x.key === "username"); if (c) c.setError(errorText(err)); }
        else Toast.show(errorText(err), "error");
        saveBtn.disabled = false;
        saveBtn.textContent = label;
      }
    });

    body.replaceWith(form);
  };

  Admin.reloadRoute = function () {
    const y = window.scrollY;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    [350, 900, 1800].forEach((ms) => setTimeout(() => { if (document.documentElement.scrollHeight > y) window.scrollTo(0, y); }, ms));
  };

  Admin.openPending = async function () {
    const listBox = Utils.el("div", { class: "admin-pending-list" }, [Utils.el("div", { class: "admin-loading" }, [spinnerNode()])]);
    Modal.open(Utils.el("div", {}, [closeHead(T("Pending Users", "পেন্ডিং ইউজার"), () => Modal.close()), listBox]));

    let items;
    try {
      const t = tokens();
      items = await guarded(() => Api.adminListPending(t.token, t.adminToken));
    } catch (err) {
      if (err && LOST_CODES.indexOf(err.code) !== -1) return;
      listBox.innerHTML = "";
      listBox.appendChild(Utils.el("p", { class: "admin-verify__error", text: errorText(err) }));
      return;
    }
    setCount("pendingUsers", items.length);

    function paintList() {
      listBox.innerHTML = "";
      if (!items.length) {
        listBox.appendChild(Utils.el("p", { class: "admin-empty", text: T("No pending users.", "কোনো পেন্ডিং ইউজার নেই।") }));
        return;
      }
      items.forEach((item) => listBox.appendChild(pendingRow(item)));
    }

    function pendingPhotoNode(f) {
      const wrap = Utils.el("div", { class: "admin-rating-item__photo" });
      if (Utils.resolveImageUrl(f.imageUrl)) {
        const img = Utils.el("img", { alt: f.name || "", loading: "lazy", decoding: "async" });
        Utils.wireImageFallback(img, f.imageUrl, () => { wrap.innerHTML = Icons.user; }, null);
        wrap.appendChild(img);
      } else {
        wrap.innerHTML = Icons.user;
      }
      return wrap;
    }

    function pendingRow(item) {
      const f = item.fields || {};
      const meta = [f.phone, f.vehicleType, f.bazar].filter(Boolean).join(" · ");
      const okBtn = Utils.el("button", { type: "button", class: "btn btn--primary btn--sm", text: "OK" });
      const editBtn = Utils.el("button", { type: "button", class: "btn btn--ghost btn--sm", text: T("Edit", "এডিট"), onClick: () => Admin.openEditor("pending", item.applicationId) });
      okBtn.addEventListener("click", async () => {
        okBtn.disabled = true; editBtn.disabled = true;
        okBtn.textContent = "";
        okBtn.appendChild(spinnerNode());
        try {
          const t = tokens();
          const res = await guarded(() => Api.adminApprovePending(t.token, t.adminToken, item.applicationId));
          items = items.filter((x) => x.applicationId !== item.applicationId);
          setCount("pendingUsers", items.length);
          Toast.show(T("Approved. Driver ID: ", "অনুমোদিত। ড্রাইভার আইডি: ") + (res && res.driverId ? res.driverId : ""), "success");
          paintList();
        } catch (err) {
          if (err && LOST_CODES.indexOf(err.code) !== -1) return;
          Toast.show(errorText(err), "error");
          okBtn.textContent = "OK";
          okBtn.disabled = false; editBtn.disabled = false;
        }
      });
      return Utils.el("div", { class: "admin-pending-item" }, [
        pendingPhotoNode(f),
        Utils.el("div", { class: "admin-pending-item__info" }, [
          Utils.el("div", { class: "admin-pending-item__name", text: f.name || item.applicationId }),
          Utils.el("div", { class: "admin-pending-item__meta", text: meta }),
          item.submittedDate ? Utils.el("div", { class: "admin-pending-item__meta", text: Utils.formatDateTime(item.submittedDate) }) : null
        ]),
        Utils.el("div", { class: "admin-pending-item__actions" }, [editBtn, okBtn])
      ]);
    }

    paintList();
  };

  Admin.openRatings = async function () {
    const listBox = Utils.el("div", { class: "admin-pending-list" }, [Utils.el("div", { class: "admin-loading" }, [spinnerNode()])]);
    Modal.open(Utils.el("div", {}, [closeHead(T("Public Rating", "পাবলিক রেটিং"), () => Modal.close()), listBox]));

    let items;
    try {
      const t = tokens();
      items = await guarded(() => Api.adminListPendingRatings(t.token, t.adminToken));
    } catch (err) {
      if (err && LOST_CODES.indexOf(err.code) !== -1) return;
      listBox.innerHTML = "";
      listBox.appendChild(Utils.el("p", { class: "admin-verify__error", text: errorText(err) }));
      return;
    }
    setCount("pendingRatings", items.length);

    function paintList() {
      listBox.innerHTML = "";
      if (!items.length) {
        listBox.appendChild(Utils.el("p", { class: "admin-empty", text: T("No pending reviews.", "কোনো পেন্ডিং রিভিউ নেই।") }));
        return;
      }
      items.forEach((item) => listBox.appendChild(ratingRow(item)));
    }

    function displayName(item) {
      const bn = Lang.current() === "bn";
      return (bn ? item.nameBn || item.name : item.name || item.nameBn) || item.targetId;
    }

    function photoNode(item) {
      const wrap = Utils.el("div", { class: "admin-rating-item__photo" });
      const url = Utils.resolveImageUrl(item.imageUrl);
      const localUrl = Utils.localFixtureUrl("profile", item.targetId);
      if (url || localUrl) {
        const img = Utils.el("img", { alt: displayName(item), loading: "lazy", decoding: "async" });
        Utils.wireImageFallback(img, item.imageUrl, () => { wrap.innerHTML = Icons.user; }, localUrl);
        wrap.appendChild(img);
      } else {
        wrap.innerHTML = Icons.user;
      }
      return wrap;
    }

    function starsNode(value) {
      const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
      const box = Utils.el("span", { class: "stars", role: "img", "aria-label": n + "/5" });
      for (let i = 1; i <= 5; i++) {
        box.appendChild(Utils.el("span", { class: "star " + (i <= n ? "star--filled" : "star--empty"), "aria-hidden": "true", text: i <= n ? "★" : "☆" }));
      }
      return box;
    }

    function ratingRow(item) {
      const okBtn = Utils.el("button", { type: "button", class: "btn btn--primary btn--sm", text: T("True", "ট্রু") });
      okBtn.addEventListener("click", async () => {
        okBtn.disabled = true;
        okBtn.textContent = "";
        okBtn.appendChild(spinnerNode());
        try {
          const t = tokens();
          await guarded(() => Api.adminApproveRating(t.token, t.adminToken, item.id, item.targetId));
          items = items.filter((x) => x.id !== item.id);
          setCount("pendingRatings", items.length);
          Toast.show(T("Review marked True.", "রিভিউ ট্রু করা হয়েছে।"), "success");
          paintList();
        } catch (err) {
          if (err && LOST_CODES.indexOf(err.code) !== -1) return;
          if (err && err.code === "NOT_FOUND") {
            items = items.filter((x) => x.id !== item.id);
            setCount("pendingRatings", items.length);
            Toast.show(errorText(err), "error");
            paintList();
            return;
          }
          Toast.show(errorText(err), "error");
          okBtn.textContent = T("True", "ট্রু");
          okBtn.disabled = false;
        }
      });
      return Utils.el("div", { class: "admin-rating-item" }, [
        photoNode(item),
        Utils.el("div", { class: "admin-rating-item__body" }, [
          Utils.el("div", { class: "admin-pending-item__name", text: displayName(item) }),
          Utils.el("div", { class: "admin-pending-item__meta", text: "ID: " + item.targetId }),
          Utils.el("div", { class: "admin-rating-item__stars" }, [starsNode(item.stars), Utils.el("span", { class: "admin-pending-item__meta", text: " " + (Number(item.stars) || 0) + "/5" })]),
          item.comment
            ? Utils.el("div", { class: "admin-rating-item__comment", text: item.comment })
            : Utils.el("div", { class: "admin-pending-item__meta", text: T("No comment", "কোনো মন্তব্য নেই") })
        ]),
        Utils.el("div", { class: "admin-pending-item__actions" }, [okBtn])
      ]);
    }

    paintList();
  };

  window.Admin = Admin;
})(window, document, window.Utils, window.Lang, window.Icons, window.Auth, window.Api, window.Router, window.Toast, window.Modal);
