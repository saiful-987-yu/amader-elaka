(function (window, document, Utils, Lang, Icons, Api, Router, ViewHelpers, Toast) {
  "use strict";

  const STEP_COUNT = 5;
  const STEP_TITLE_KEYS = ["register.step1.title", "register.step2.title", "register.step3.title", "register.step4.title", "register.step5.title"];

  let activeRegistrationSession = null;

  let flushActiveSessionFields = null;

  function fieldRow({ id, labelKey, type, required, hint, options }) {
    const label = Utils.el("label", { for: id, text: Lang.t(labelKey) + (required ? " *" : "") });
    let control;
    if (type === "select") {
      control = Utils.el("select", { id, name: id });
      control.appendChild(Utils.el("option", { value: "", text: Lang.t("validation.selectOption") }));
      (options || []).forEach((opt) => control.appendChild(Utils.el("option", { value: opt.value, text: opt.label })));
    } else if (type === "textarea") {
      control = Utils.el("textarea", { id, name: id, rows: "3" });
    } else {
      control = Utils.el("input", { id, name: id, type: type || "text" });
    }
    const errorMsg = Utils.el("div", { class: "error-msg", "data-error-for": id });
    const wrap = Utils.el("div", { class: "field", "data-field": id }, [
      label, control,
      hint ? Utils.el("div", { class: "hint", text: hint }) : null,
      errorMsg
    ]);
    return { wrap, control };
  }

  function searchKey(text) {
    return String(text || "").toLowerCase().replace(/[\s\-_.]+/g, "");
  }

  function multiSelectField({ id, labelKey, options, required, searchable }) {
    const label = Utils.el("label", { text: Lang.t(labelKey) + (required ? " *" : "") });
    const group = Utils.el("div", { class: "checkbox-group" }, options.map((opt) =>
      Utils.el("label", { class: "checkbox-option", "data-search": searchKey((opt.search || "") + " " + opt.label) }, [
        Utils.el("input", { type: "checkbox", name: id, value: opt.value }),
        Utils.el("span", { text: opt.label })
      ])
    ));
    let head = label;
    if (searchable) {
      const search = Utils.el("input", {
        type: "text", class: "multi-search", autocomplete: "off", inputmode: "search",
        placeholder: Lang.t("register.search"), "aria-label": Lang.t("register.search"), "data-no-collect": "true"
      });
      const applyFilter = () => {
        const q = searchKey(search.value);
        Array.from(group.children).forEach((item) => {
          item.style.display = !q || item.getAttribute("data-search").indexOf(q) !== -1 ? "" : "none";
        });
        group.scrollLeft = 0;
      };
      search.addEventListener("input", applyFilter);
      group.addEventListener("change", () => {
        if (search.value) { search.value = ""; applyFilter(); }
      });
      head = Utils.el("div", { class: "multi-head" }, [label, search]);
    }
    const errorMsg = Utils.el("div", { class: "error-msg", "data-error-for": id });
    const wrap = Utils.el("div", { class: "field", "data-field": id }, [head, group, errorMsg]);
    return { wrap };
  }

  function experienceField() {
    const numberInput = Utils.el("input", { id: "experienceValue", name: "experienceValue", type: "number", min: "0", inputmode: "numeric" });
    const unitSelect = Utils.el("select", { id: "experienceUnit", name: "experienceUnit" });
    [["years", Lang.t("field.experienceYears")], ["months", Lang.t("field.experienceMonths")], ["from", Lang.t("field.experienceFrom")]].forEach(([value, text]) =>
      unitSelect.appendChild(Utils.el("option", { value, text }))
    );
    function syncExperienceUnit() {
      if (unitSelect.value === "from") {
        numberInput.min = "1900";
        numberInput.max = String(new Date().getFullYear());
        numberInput.placeholder = "2010";
      } else {
        numberInput.min = "0";
        numberInput.removeAttribute("max");
        numberInput.placeholder = "";
      }
    }
    unitSelect.addEventListener("change", syncExperienceUnit);
    setTimeout(syncExperienceUnit, 0);
    const row = Utils.el("div", { class: "experience-row" }, [numberInput, unitSelect]);
    const errorMsg = Utils.el("div", { class: "error-msg", "data-error-for": "experienceValue" });
    const wrap = Utils.el("div", { class: "field", "data-field": "experienceValue" }, [
      Utils.el("label", { for: "experienceValue", text: Lang.t("field.experience") }),
      row, errorMsg
    ]);
    return { wrap };
  }

  function twoColFieldRow(a, b) {
    return Utils.el("div", { class: "field-row-2col" }, [a.wrap, b.wrap]);
  }

  function setFieldError(app, id, message) {
    const field = app.querySelector(`[data-field="${id}"]`);
    if (!field) return;
    field.classList.toggle("has-error", !!message);
    const err = field.querySelector(".error-msg");
    if (err) err.textContent = message || "";
  }

  function passwordField(id, labelKey) {
    const { wrap, control } = fieldRow({ id, labelKey, type: "password" });
    wrap.classList.add("field--tint-d");
    const inputWrap = Utils.el("div", { class: "password-field" });
    wrap.replaceChild(inputWrap, control);
    inputWrap.appendChild(control);
    const toggleBtn = Utils.el("button", {
      type: "button", "aria-label": Lang.t("login.showPassword"), html: Icons.eye,
      onClick: () => {
        const showing = control.type === "text";
        control.type = showing ? "password" : "text";
        toggleBtn.innerHTML = showing ? Icons.eye : Icons.eyeOff;
        toggleBtn.setAttribute("aria-label", showing ? Lang.t("login.showPassword") : Lang.t("login.hidePassword"));
      }
    });
    inputWrap.appendChild(toggleBtn);
    return { wrap, control };
  }

  function availabilityField(app, { id, labelKey, type, wrapClass, checkFn, takenMessageKey, isValidFn, onStatus, tintClass }) {
    const { wrap, control } = fieldRow({ id, labelKey, type });
    if (tintClass) wrap.classList.add(tintClass);
    const inputWrap = Utils.el("div", { class: wrapClass });
    wrap.replaceChild(inputWrap, control);
    inputWrap.appendChild(control);
    const statusIcon = Utils.el("span", { class: wrapClass + "__status", "aria-hidden": "true" });
    inputWrap.appendChild(statusIcon);

    let requestToken = 0;
    const check = Utils.debounce(() => {
      const value = Utils.clean(control.value);
      const myToken = ++requestToken;
      statusIcon.classList.remove("is-checking", "is-available");
      statusIcon.innerHTML = "";
      setFieldError(app, id, "");
      if (onStatus) onStatus(value, null);
      if (!value) return;
      if (isValidFn && !isValidFn(value)) return;
      statusIcon.innerHTML = Icons.more;
      statusIcon.classList.add("is-checking");
      checkFn(value).then((res) => {
        if (myToken !== requestToken) return;
        statusIcon.classList.remove("is-checking");
        const available = !!(res && res.available);
        if (available) {
          statusIcon.classList.add("is-available");
          statusIcon.innerHTML = Icons.checkCircle;
          setFieldError(app, id, "");
        } else {
          statusIcon.innerHTML = "";
          setFieldError(app, id, Lang.t(takenMessageKey));
        }
        if (onStatus) onStatus(value, available);
      }).catch(() => {
        if (myToken !== requestToken) return;
        statusIcon.classList.remove("is-checking");
        statusIcon.innerHTML = "";
        if (onStatus) onStatus(value, null);
      });
    }, 500);
    control.addEventListener("input", check);

    return { wrap, control };
  }

  function usernameField(app, onStatus) {
    const field = availabilityField(app, {
      id: "username", labelKey: "field.username", wrapClass: "username-field",
      checkFn: Api.checkUsername, takenMessageKey: "field.usernameTaken", onStatus, tintClass: "field--tint-a"
    });
    field.control.placeholder = Lang.current() === "bn" ? "ইউজারনেম লিখুন যেমন (saiful221)" : "enter username like (saiful221)";
    return field;
  }

  function mobileField(app, onStatus) {
    const field = availabilityField(app, {
      id: "mobile", labelKey: "field.mobile", type: "tel", wrapClass: "phone-field",
      checkFn: Api.checkPhone, takenMessageKey: "field.phoneTaken", isValidFn: Utils.isValidBdPhone, onStatus, tintClass: "field--tint-b"
    });
    field.control.placeholder = Lang.current() === "bn" ? "নাম্বার লিখুন যেমন (01610-253221)" : "Enter number like (01610-253221)";
    return field;
  }

  async function ensureAvailability(cached, value, checkFn) {
    if (cached.value === value && cached.available !== null) return cached;
    try {
      const res = await checkFn(value);
      return { value, available: !!(res && res.available) };
    } catch (err) {
      return { value, available: false, networkError: true };
    }
  }

  function todaysPhotoPin() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return pad(d.getDate()) + pad(d.getMonth() + 1) + String(d.getFullYear()).slice(-2);
  }

  async function ensureDriveAccessible(cached, value) {
    if (cached.value === value && cached.available !== null) return cached;
    return new Promise((resolve) => {
      const probeUrl = Utils.resolveImageUrl(value);
      const probe = new Image();
      probe.onload = () => resolve({ value, available: true });
      probe.onerror = () => resolve({ value, available: false });
      probe.src = probeUrl;
    });
  }

  function driveImageField(app, onStatus) {
    const { wrap, control } = fieldRow({ id: "imageUrl", labelKey: "field.driverPhoto", type: "url" });
    const inputWrap = Utils.el("div", { class: "drive-image-field" });
    wrap.replaceChild(inputWrap, control);
    inputWrap.appendChild(control);
    const statusIcon = Utils.el("span", { class: "drive-image-field__status", "aria-hidden": "true" });
    inputWrap.appendChild(statusIcon);

    let requestToken = 0;
    const check = Utils.debounce(() => {
      const value = Utils.clean(control.value);
      const myToken = ++requestToken;
      statusIcon.classList.remove("is-checking", "is-available");
      statusIcon.innerHTML = "";
      setFieldError(app, "imageUrl", "");
      if (onStatus) onStatus(value, null);
      if (!value) return;
      if (!/drive\.google\.com/.test(value)) {
        setFieldError(app, "imageUrl", Lang.t("validation.driveLinkInvalid"));
        if (onStatus) onStatus(value, false);
        return;
      }
      statusIcon.classList.add("is-checking");
      statusIcon.innerHTML = Icons.more;
      ensureDriveAccessible({ value: null, available: null }, value).then((res) => {
        if (myToken !== requestToken) return;
        statusIcon.classList.remove("is-checking");
        if (res.available) {
          statusIcon.classList.add("is-available");
          statusIcon.innerHTML = Icons.checkCircle;
          setFieldError(app, "imageUrl", "");
        } else {
          statusIcon.innerHTML = "";
          setFieldError(app, "imageUrl", Lang.t("validation.driveLinkNoAccess"));
        }
        if (onStatus) onStatus(value, res.available);
      });
    }, 500);
    control.addEventListener("input", check);

    return { wrap, control };
  }

  function photoWhatsappHelpLink() {
    return Utils.el("a", {
      href: Utils.waLink("01610253221"), target: "_blank", rel: "noopener",
      class: "photo-whatsapp-help",
      html: Icons.whatsapp + "<span>" + Lang.t("register.step3.whatsappHelp") + "</span>"
    });
  }

  function buildPhotoFormUrl(mobile) {
    const cfg = (window.NOBI_CONFIG && window.NOBI_CONFIG.GOOGLE_FORM) || {};
    const base = cfg.URL || "https://docs.google.com/forms/d/e/1FAIpQLSfWSXqhzab6o0Yh6lFrRzXz_F-jxgnvvzoB29mvBg5yDiRnIA/viewform";
    const parts = ["usp=pp_url"];
    if (cfg.MOBILE_ENTRY_ID && mobile) {
      parts.push(cfg.MOBILE_ENTRY_ID + "=" + encodeURIComponent(mobile));
    }
    return base + (base.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
  }

  function photoUploadField(session) {
    const up = session.photoUpload;
    const fileInput = Utils.el("input", { type: "file", accept: "image/*", style: "display:none;" });
    const drop = Utils.el("button", { type: "button", class: "photo-upload-card__drop", onClick: () => { if (up.stage === "uploading") return; fileInput.click(); } }, [
      Utils.el("span", { class: "photo-upload-card__icon", html: Icons.upload }),
      Utils.el("div", {}, [
        Utils.el("div", { class: "photo-upload-card__title", text: Lang.t("register.step3.photoUpload.title") }),
        Utils.el("div", { class: "photo-upload-card__subtitle", text: Lang.t("register.step3.photoUpload.subtitle") })
      ])
    ]);
    const bg = (window.NOBI_CONFIG.SECTION_BACKGROUNDS || {}).registerPhotoUpload;
    if (bg) drop.style.backgroundImage = 'url("' + bg + '")';
    const status = Utils.el("div", { class: "photo-upload-card__status" });
    const wrap = Utils.el("div", { class: "photo-upload-card" }, [drop, fileInput, status]);

    function render() {
      status.innerHTML = "";
      drop.disabled = up.stage === "uploading";
      if (up.stage === "uploading") {
        status.appendChild(Utils.el("span", { class: "photo-status photo-status--loading", role: "status" }, [
          Utils.el("span", { class: "photo-spinner", "aria-hidden": "true" }),
          Utils.el("span", { text: Lang.t("field.photoUploading") })
        ]));
        status.appendChild(Utils.el("div", { class: "photo-progress", "aria-hidden": "true" }, [Utils.el("span", { class: "photo-progress__bar" })]));
      } else if (up.stage === "confirmed" && up.valid) {
        const preview = Utils.el("img", { class: "photo-preview", alt: "" });
        preview.src = up.preview;
        status.appendChild(preview);
        status.appendChild(Utils.el("span", { class: "photo-status photo-status--success", html: Icons.checkCircle + "<span>" + Lang.t("field.photoUploadSuccess") + "</span>" }));
      } else if (up.stage === "error") {
        status.appendChild(Utils.el("span", { class: "photo-status photo-status--error", text: Lang.t(up.error) }));
      }
    }
    function finish(patch) {
      Object.assign(up, patch);
      if (wrap.isConnected) render();
    }
    function failed(errorKey) {
      finish({ valid: false, stage: "error", error: errorKey, url: "", preview: "" });
    }

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      fileInput.value = "";
      if (up.stage === "uploading") return;
      if (!file.type || file.type.indexOf("image/") !== 0) { failed("field.photoTypeError"); return; }
      if (file.size < 50 * 1024 || file.size > 3 * 1024 * 1024) { failed("field.photoSizeError"); return; }
      finish({ valid: false, stage: "uploading", error: "", url: "", preview: "" });

      const reader = new FileReader();
      reader.onerror = () => failed("field.photoUploadError");
      reader.onload = async () => {
        const dataUrl = String(reader.result || "");
        const base64 = dataUrl.split(",")[1] || "";
        try {
          const res = await Api.uploadDriverPhoto(base64, file.type);
          if (!res || !res.url) { failed("field.photoUploadError"); return; }
          finish({ valid: true, stage: "confirmed", error: "", url: res.url, preview: dataUrl });
        } catch (err) {
          failed("field.photoUploadError");
        }
      };
      reader.readAsDataURL(file);
    });

    render();
    return { wrap };
  }

  function altToggleButton(isOpen, onToggle) {
    const btn = Utils.el("button", {
      type: "button", class: "photo-alt-toggle", html: Icons.link,
      title: Lang.t("register.step3.altToggle"), "aria-label": Lang.t("register.step3.altToggle"),
      "aria-expanded": isOpen ? "true" : "false"
    });
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", next ? "true" : "false");
      onToggle(next);
    });
    return btn;
  }

  function vehiclePhotoField(mobile, startOpen) {
    const row = fieldRow({ id: "vehicleImageUrl", labelKey: "register.step3.vehicleLabelPrefix", type: "url", hint: "https://..." });
    const label = row.wrap.querySelector("label");
    label.textContent = Lang.t("register.step3.vehicleLabelPrefix");
    const uploadBtn = Utils.el("button", {
      type: "button", class: "photo-form-link-btn", text: Lang.t("register.step3.vehicleLabelButton"),
      onClick: () => window.open(buildPhotoFormUrl(mobile), "_blank", "noopener")
    });
    const linkBox = Utils.el("div", { class: "photo-alt-block" });
    linkBox.style.display = startOpen ? "" : "none";
    const hintNode = row.wrap.querySelector(".hint");
    linkBox.appendChild(row.control);
    if (hintNode) linkBox.appendChild(hintNode);
    const toggle = altToggleButton(startOpen, (open) => { linkBox.style.display = open ? "" : "none"; });
    const head = Utils.el("div", { class: "photo-field-head" }, [label, toggle]);
    row.wrap.insertBefore(linkBox, row.wrap.firstChild);
    row.wrap.insertBefore(uploadBtn, row.wrap.firstChild);
    row.wrap.insertBefore(head, row.wrap.firstChild);
    return row;
  }

  function socialLinksField(mobile) {
    const row = fieldRow({ id: "socialUrl", labelKey: "register.step3.socialLabelPrefix", type: "textarea", hint: Lang.t("register.step3.socialHint") });
    row.control.rows = 1;
    row.control.placeholder = Lang.t("register.step3.socialPlaceholder");
    const socialLabel = row.wrap.querySelector("label");
    socialLabel.appendChild(Utils.el("span", { class: "social-label-icons", "aria-hidden": "true" }, [
      Utils.el("span", { class: "social-label-icons__item social-label-icons__item--facebook", html: Icons.facebook }),
      Utils.el("span", { class: "social-label-icons__item social-label-icons__item--maps", html: Icons.mapPin }),
      Utils.el("span", { class: "social-label-icons__item social-label-icons__item--tiktok", html: Icons.tiktok }),
      Utils.el("span", { class: "social-label-icons__item social-label-icons__item--youtube", html: Icons.youtube })
    ]));
    return row;
  }

  function focusFirstError(stepBody) {
    const field = stepBody.querySelector(".field.has-error");
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = field.querySelector("input, select, textarea");
    if (focusable) focusable.focus({ preventScroll: true });
  }

  async function renderRegister(app) {
    if (flushActiveSessionFields) {
      flushActiveSessionFields();
      flushActiveSessionFields = null;
    }
    app.innerHTML = "";

    let markets = [], vehicles = [];
    try {
      [markets, vehicles] = await Promise.all([Api.getMarkets(), Api.getVehicleCategories()]);
    } catch (err) {
      app.appendChild(Utils.el("section", { class: "section container" }, [
        ViewHelpers.errorBlock(Lang.t("error.network"), () => renderRegister(app))
      ]));
      return;
    }

    if (!activeRegistrationSession) {
      activeRegistrationSession = {
        data: {}, currentStep: 1,
        phoneCheck: { value: null, available: null },
        usernameCheck: { value: null, available: null },
        driveCheck: { value: null, available: null },
        photoUpload: { valid: false, stage: "idle", url: "", preview: "", error: "" }
      };
    }
    const session = activeRegistrationSession;
    const data = session.data;
    let currentStep = session.currentStep;
    let phoneCheck = session.phoneCheck;
    let usernameCheck = session.usernameCheck;
    let driveCheck = session.driveCheck;
    let syncFullAddress = null;

    const heading = Utils.el("h2", { text: Lang.t("register.heading") });
    const sub = Utils.el("p", { text: Lang.t("register.sub"), class: "hint mt-5" });

    const stepIndicator = Utils.el("div", { class: "step-indicator" }, [
      Utils.el("span", { "data-step-label": "true" }),
      Utils.el("div", { class: "step-indicator__track" }, [Utils.el("div", { class: "step-indicator__fill", "data-fill": "true" })]),
      Utils.el("span", { "data-step-title": "true" })
    ]);

    const stepBody = Utils.el("div", { "data-step-body": "true" });
    const actions = Utils.el("div", { class: "form-actions" });

    const card = Utils.el("div", { class: "form-card" }, [stepIndicator, stepBody, actions]);
    app.appendChild(Utils.el("section", { class: "section container" }, [heading, sub, Utils.el("div", { class: "mt-5" }, [card])]));

    function updateIndicator() {
      stepIndicator.querySelector("[data-step-label]").textContent = Lang.t("register.step", { current: currentStep, total: STEP_COUNT });
      stepIndicator.querySelector("[data-step-title]").textContent = Lang.t(STEP_TITLE_KEYS[currentStep - 1]);
      stepIndicator.querySelector("[data-fill]").style.width = (currentStep / STEP_COUNT * 100) + "%";
    }

    function buildStep1() {
      const villageField = fieldRow({ id: "village", labelKey: "field.village" });
      const postOfficeField = fieldRow({ id: "postOffice", labelKey: "field.postOffice" });
      const unionField = fieldRow({ id: "union", labelKey: "field.union" });
      const upazilaField = fieldRow({ id: "upazila", labelKey: "field.upazila" });
      const districtField = fieldRow({ id: "district", labelKey: "field.district" });
      const fullAddressField = fieldRow({ id: "fullAddress", labelKey: "field.fullAddress", type: "textarea" });
      fullAddressField.control.readOnly = true;
      fullAddressField.control.classList.add("is-readonly");

      const addressParts = [villageField, postOfficeField, unionField, upazilaField, districtField];
      function addressIsEnglish() {
        const words = addressParts
          .map((f) => Utils.clean(f.control.value))
          .filter(Boolean)
          .join(" ")
          .split(/\s+/)
          .filter(Boolean);
        if (!words.length) return Lang.current() !== "bn";
        const englishWords = words.filter((w) => /^[A-Za-z0-9.,'\-]+$/.test(w)).length;
        return englishWords / words.length > 0.6;
      }
      syncFullAddress = () => {
        const isEn = addressIsEnglish();
        const village = Utils.clean(villageField.control.value);
        const postOffice = Utils.clean(postOfficeField.control.value);
        const rest = [unionField, upazilaField, districtField]
          .map((f) => Utils.clean(f.control.value))
          .filter(Boolean);
        const parts = [];
        if (village) parts.push((isEn ? "Village: " : "গ্রামঃ ") + village);
        if (postOffice) parts.push((isEn ? "Post Office: " : "ডাকঘর: ") + postOffice);
        parts.push(...rest);
        fullAddressField.control.value = parts.length ? parts.join(", ") + (isEn ? "." : "।") : "";
      };
      addressParts.forEach((f) => f.control.addEventListener("input", syncFullAddress));

      const isBn = Lang.current() === "bn";

      const fullNameField = fieldRow({ id: "fullName", labelKey: "field.fullName" });
      fullNameField.wrap.classList.add("field--tint-a");
      fullNameField.control.placeholder = isBn ? "আপনার নাম লিখুন যেমন (Saiful Islam)" : "Enter your name like (Saiful Islam)";

      const fullNameBnField = fieldRow({ id: "fullNameBn", labelKey: "field.fullNameBn" });
      fullNameBnField.wrap.classList.add("field--tint-a");
      fullNameBnField.control.placeholder = isBn ? "নাম লিখুন" : "Enter name";

      const guardianField = fieldRow({ id: "guardianName", labelKey: "field.guardianName" });
      guardianField.wrap.classList.add("field--tint-a", "field--label-noshrink-guard");
      guardianField.control.placeholder = isBn ? "নাম লিখুন" : "Enter name";

      const altMobileField = fieldRow({ id: "altMobile", labelKey: "field.altMobile", type: "tel" });
      altMobileField.wrap.classList.add("field--tint-b");
      altMobileField.control.placeholder = isBn ? "নাম্বার লিখুন" : "Enter number";

      const whatsappField = fieldRow({ id: "whatsapp", labelKey: "field.whatsapp", type: "tel" });
      whatsappField.wrap.classList.add("field--tint-b");
      whatsappField.control.placeholder = isBn ? "নাম্বার লিখুন" : "Enter number";

      [villageField, postOfficeField, unionField, upazilaField, districtField].forEach((f) => f.wrap.classList.add("field--tint-c"));
      villageField.control.placeholder = isBn ? "গ্রামঃ পশ্চিম উরির চর, ৮ নং ওয়ার্ড" : "Village: West Urir Char, Ward No. 8";
      postOfficeField.control.placeholder = isBn ? "যেমনঃ জনতা বাজার - ৩৮১৩" : "e.g. Jonota Bazar - 3813";
      unionField.control.placeholder = isBn ? "যেমনঃ চরক্লার্ক" : "e.g. Char Clerk";
      upazilaField.control.placeholder = isBn ? "যেমনঃ সুবর্ণচর" : "e.g. Subarnachar";
      districtField.control.placeholder = isBn ? "যেমনঃ নোয়াখালী" : "e.g. Noakhali";

      return [
        fullNameField,
        twoColFieldRow(fullNameBnField, guardianField),
        mobileField(app, (value, available) => { phoneCheck = { value, available }; }),
        twoColFieldRow(altMobileField, whatsappField),
        villageField,
        twoColFieldRow(postOfficeField, unionField),
        twoColFieldRow(upazilaField, districtField),
        fullAddressField
      ];
    }

    function buildStep2() {
      const vehicleNumberField = fieldRow({ id: "vehicleNumber", labelKey: "field.vehicleNumber" });
      vehicleNumberField.wrap.classList.add("field--tint-b");
      vehicleNumberField.control.placeholder = Lang.current() === "bn"
        ? "যেমন: ঢাকা মেট্রো-থ ৪৯-১২৩৪, No License, No Need"
        : "e.g. Dhaka Metro-GA 11-1234, No License, No Need";

      const serviceAreaField = fieldRow({ id: "serviceArea", labelKey: "field.serviceArea" });
      serviceAreaField.wrap.classList.add("field--tint-b");
      serviceAreaField.control.placeholder = "Nobi Bazar + 50 km Coverage Radius";

      const experienceRow = experienceField();
      experienceRow.wrap.classList.add("field--tint-d");

      const vehicleTypeField = multiSelectField({
        id: "vehicleType", labelKey: "field.vehicleType", searchable: true,
        options: vehicles.map((v) => ({ value: v.slug, label: Lang.current() === "bn" ? v.nameBn : v.nameEn, search: [v.nameEn, v.nameBn, v.slug].join(" ") }))
      });
      const qualificationRow = fieldRow({ id: "qualification", labelKey: "field.qualification" });
      qualificationRow.wrap.style.display = "none";
      const extraRows = [1, 2, 3, 4].map((n) => {
        const row = fieldRow({ id: "extra" + n, labelKey: "field.extra" });
        row.wrap.style.display = "none";
        return row;
      });
      const extraGrid = Utils.el("div", { class: "field-row-2col extra-grid" },
        [qualificationRow].concat(extraRows).map((row) => row.wrap));
      function updateExtraFields() {
        const chosen = Array.from(vehicleTypeField.wrap.querySelectorAll("input[type=checkbox]:checked")).map((cb) => cb.value);
        const defs = Utils.extraFieldDefs(chosen);
        const qualificationDef = Utils.qualificationDef(chosen);
        const shown = [];
        qualificationRow.wrap.style.display = qualificationDef ? "" : "none";
        if (qualificationDef) {
          qualificationRow.wrap.querySelector("label").textContent = Utils.extraLabel(qualificationDef);
          shown.push(qualificationRow.wrap);
        } else qualificationRow.control.value = "";
        extraRows.forEach((row, i) => {
          const def = defs[i];
          row.wrap.style.display = def ? "" : "none";
          if (def) {
            row.wrap.querySelector("label").textContent = Utils.extraLabel(def);
            shown.push(row.wrap);
          } else row.control.value = "";
        });
        [qualificationRow.wrap].concat(extraRows.map((r) => r.wrap)).forEach((w) => { w.style.gridColumn = ""; });
        if (shown.length % 2 === 1) shown[shown.length - 1].style.gridColumn = "1 / -1";
      }
      vehicleTypeField.wrap.addEventListener("change", updateExtraFields);
      setTimeout(updateExtraFields, 0);

      return [
        vehicleTypeField,
        vehicleNumberField,
        multiSelectField({
          id: "marketSlug", labelKey: "field.preferredMarket", searchable: true,
          options: markets.map((m) => ({ value: m.slug, label: Lang.current() === "bn" ? m.nameBn : m.nameEn, search: [m.nameEn, m.nameBn, m.slug].join(" ") }))
        }),
        serviceAreaField,
        extraGrid,
        experienceRow
      ];
    }

    function buildStep3() {
      const photoUploadRow = photoUploadField(session);
      const driveField = driveImageField(app, (value, available) => { driveCheck = { value, available }; session.driveCheck = driveCheck; });
      const pinField = fieldRow({ id: "photoPin", labelKey: "register.step3.pinLabel" });
      const pinCheck = Utils.debounce(() => {
        const field = app.querySelector('[data-field="photoPin"]');
        if (!field) return;
        const err = field.querySelector(".error-msg");
        const value = Utils.clean(pinField.control.value);
        field.classList.remove("has-error", "has-success");
        if (err) err.textContent = "";
        if (!value) return;
        if (value === todaysPhotoPin()) {
          field.classList.add("has-success");
          if (err) err.textContent = Lang.t("validation.pinCorrect");
        } else {
          field.classList.add("has-error");
          if (err) err.textContent = Lang.t("validation.pinWrong");
        }
      }, 300);
      pinField.control.addEventListener("input", pinCheck);
      const altOpen = !!(session.altPhotoOpen || Utils.clean(data.imageUrl) || Utils.clean(data.photoPin));
      const altBlock = Utils.el("div", { class: "photo-alt-block" }, [
        Utils.el("div", { class: "photo-method-divider", text: Lang.t("register.step3.orDivider") }),
        Utils.el("div", { class: "photo-input-row" }, [driveField.wrap, pinField.wrap])
      ]);
      altBlock.style.display = altOpen ? "" : "none";
      const photoErrorProxy = Utils.el("div", { class: "field photo-error-proxy", "data-field": "imageUrl" }, [
        Utils.el("div", { class: "error-msg", "data-error-for": "imageUrl" })
      ]);
      const altRow = Utils.el("div", { class: "photo-alt-row" }, [
        photoWhatsappHelpLink(),
        altToggleButton(altOpen, (open) => {
          session.altPhotoOpen = open;
          altBlock.style.display = open ? "" : "none";
          if (open) {
            photoErrorProxy.classList.remove("has-error");
            photoErrorProxy.querySelector(".error-msg").textContent = "";
            photoErrorProxy.remove();
          } else {
            altRow.after(photoErrorProxy);
          }
        })
      ]);
      return [
        photoUploadRow,
        altRow
      ].concat(altOpen ? [] : [photoErrorProxy], [
        altBlock,
        vehiclePhotoField(Utils.clean(data.mobile), !!Utils.clean(data.vehicleImageUrl)),
        socialLinksField(Utils.clean(data.mobile))
      ]);
    }

    function buildStep4() {
      const usernameRow = usernameField(app, (value, available) => { usernameCheck = { value, available }; });
      const passwordRow = passwordField("password", "field.password");
      const confirmRow = passwordField("confirmPassword", "field.confirmPassword");
      return [usernameRow, passwordRow, confirmRow];
    }

    function buildStep5() {
      const entries = [
        ["field.fullName", data.fullName], ["field.fullNameBn", data.fullNameBn],
        ["field.guardianName", data.guardianName],
        ["field.mobile", data.mobile], ["field.altMobile", data.altMobile], ["field.whatsapp", data.whatsapp],
        ["field.village", data.village], ["field.postOffice", data.postOffice],
        ["field.union", data.union], ["field.upazila", data.upazila], ["field.district", data.district],
        ["field.vehicleType", data.vehicleType], ["field.vehicleNumber", data.vehicleNumber],
        ["field.preferredMarket", data.marketSlug], ["field.serviceArea", data.serviceArea],
        ["field.experience", Utils.formatExperience(data.experience)], ["field.username", data.username]
      ].filter(([, v]) => v);
      const reviewQualificationDef = Utils.qualificationDef(Utils.splitMulti(data.vehicleType));
      if (reviewQualificationDef && data.qualification) entries.push([Utils.extraLabel(reviewQualificationDef), data.qualification]);
      Utils.extraFieldDefs(Utils.splitMulti(data.vehicleType)).forEach((def, i) => {
        if (data["extra" + (i + 1)]) entries.push([Utils.extraLabel(def), data["extra" + (i + 1)]]);
      });
      const dl = Utils.el("dl", { class: "review-list" }, entries.map(([labelKey, value]) =>
        Utils.el("div", { class: "review-row" }, [
          Utils.el("dt", { text: Lang.t(labelKey) }),
          Utils.el("dd", { text: String(value) })
        ])
      ));
      const addressRow = Utils.el("div", { class: "review-row" }, [
        Utils.el("dt", { text: Lang.t("field.fullAddress") }),
        Utils.el("dd", { text: data.fullAddress ? data.fullAddress : "—" })
      ]);
      dl.appendChild(addressRow);
      return [dl];
    }

    const STEP_BUILDERS = [buildStep1, buildStep2, buildStep3, buildStep4, buildStep5];

    function collectStepValues() {
      const checkboxGroups = {};
      Utils.qsa("input, select, textarea", stepBody).forEach((el) => {
        if (el.type === "file" || el.hasAttribute("data-no-collect")) return;
        const key = el.name || el.id;
        if (el.type === "checkbox") {
          if (!checkboxGroups[key]) checkboxGroups[key] = [];
          if (el.checked) checkboxGroups[key].push(el.value);
        } else {
          data[key] = el.value;
        }
      });
      Object.keys(checkboxGroups).forEach((key) => { data[key] = checkboxGroups[key].join(", "); });
      if (data.experienceValue) {
        data.experience = data.experienceUnit === "from"
          ? "From " + Utils.clean(data.experienceValue)
          : Utils.clean(data.experienceValue) + " " + (data.experienceUnit === "months" ? "Months" : "Years");
      } else {
        data.experience = "";
      }
    }
    flushActiveSessionFields = collectStepValues;

    function hydrateStepValues() {
      Utils.qsa("input, select, textarea", stepBody).forEach((el) => {
        if (el.type === "file" || el.hasAttribute("data-no-collect")) return;
        const key = el.name || el.id;
        if (el.type === "checkbox") {
          const selected = Utils.splitMulti(data[key]);
          el.checked = selected.includes(el.value);
        } else if (data[key] != null) {
          el.value = data[key];
        }
      });
    }

    function validateStep() {
      let valid = true;
      collectStepValues();
      if (currentStep === 1) {
        [["fullName", true], ["fullNameBn", true], ["mobile", true]].forEach(([id, required]) => {
          const value = Utils.clean(data[id]);
          if (required && !value) { setFieldError(app, id, Lang.t("validation.required")); valid = false; }
          else setFieldError(app, id, "");
        });
        if (data.mobile && !Utils.isValidBdPhone(data.mobile)) {
          setFieldError(app, "mobile", Lang.t("validation.phoneInvalid"));
          valid = false;
        }
      }
      if (currentStep === 2) {
        const chosenCategories = Utils.splitMulti(data.vehicleType);
        const needsVehicle = !chosenCategories.length || chosenCategories.some((slug) => {
          const category = vehicles.find((v) => v.slug === slug);
          return !(category && category.isOther);
        });
        const fromYear = Number(Utils.clean(data.experienceValue));
        if (data.experienceUnit === "from" && Utils.clean(data.experienceValue) &&
            !(Number.isInteger(fromYear) && fromYear >= 1900 && fromYear <= new Date().getFullYear())) {
          setFieldError(app, "experienceValue", Lang.t("validation.yearInvalid"));
          valid = false;
        } else setFieldError(app, "experienceValue", "");
        ["vehicleType", "vehicleNumber", "marketSlug", "serviceArea"].forEach((id) => {
          if (id === "vehicleNumber" && !needsVehicle) { setFieldError(app, id, ""); return; }
          const value = Utils.clean(data[id]);
          if (!value) { setFieldError(app, id, Lang.t("validation.required")); valid = false; }
          else setFieldError(app, id, "");
        });
      }
      if (currentStep === 3) {
        const photoUploadOk = !!(session.photoUpload && session.photoUpload.valid);
        const imageValue = Utils.clean(data.imageUrl);
        const pinValue = Utils.clean(data.photoPin);
        const pinOk = !!pinValue && pinValue === todaysPhotoPin();
        const looksLikeDriveLink = !!imageValue && /drive\.google\.com/.test(imageValue);
        setFieldError(app, "imageUrl", "");
        setFieldError(app, "photoPin", "");
        if (!photoUploadOk) {
          if (!imageValue && !pinValue) {
            setFieldError(app, "imageUrl", Lang.t("validation.required"));
            valid = false;
          } else if (!pinOk && !looksLikeDriveLink) {
            if (pinValue) setFieldError(app, "photoPin", Lang.t("validation.pinInvalid"));
            if (imageValue) setFieldError(app, "imageUrl", Lang.t("validation.driveLinkInvalid"));
            valid = false;
          }
        }
      }
      if (currentStep === 4) {
        ["username", "password", "confirmPassword"].forEach((id) => {
          const value = Utils.clean(data[id]);
          if (!value) { setFieldError(app, id, Lang.t("validation.required")); valid = false; }
          else setFieldError(app, id, "");
        });
        if (data.password && data.password.length < 6) {
          setFieldError(app, "password", Lang.t("validation.passwordShort"));
          valid = false;
        }
        if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
          setFieldError(app, "confirmPassword", Lang.t("validation.passwordMismatch"));
          valid = false;
        }
      }
      return valid;
    }

    function renderStep() {
      stepBody.innerHTML = "";
      syncFullAddress = null;
      const rows = STEP_BUILDERS[currentStep - 1]();
      rows.forEach((row) => stepBody.appendChild(row.wrap || row));
      hydrateStepValues();
      if (currentStep === 1 && syncFullAddress) syncFullAddress();
      updateIndicator();
      renderActions();
    }

    function renderActions() {
      actions.innerHTML = "";
      if (currentStep > 1) {
        actions.appendChild(Utils.el("button", {
          class: "btn btn--ghost", text: Lang.t("action.back"),
          onClick: () => { collectStepValues(); currentStep -= 1; session.currentStep = currentStep; renderStep(); }
        }));
      }
      if (currentStep < STEP_COUNT) {
        const nextBtn = Utils.el("button", { class: "btn btn--primary", text: Lang.t("action.next") });
        nextBtn.addEventListener("click", async () => {
          if (!validateStep()) { focusFirstError(stepBody); return; }

          if (currentStep === 1) {
            const value = Utils.clean(data.mobile);
            nextBtn.disabled = true;
            phoneCheck = await ensureAvailability(phoneCheck, value, Api.checkPhone);
            session.phoneCheck = phoneCheck;
            nextBtn.disabled = false;
            if (!phoneCheck.available) {
              setFieldError(app, "mobile", phoneCheck.networkError ? Lang.t("error.network") : Lang.t("field.phoneTaken"));
              focusFirstError(stepBody);
              return;
            }
          }
          if (currentStep === 3) {
            const photoUploadOk = !!(session.photoUpload && session.photoUpload.valid);
            const imageValue = Utils.clean(data.imageUrl);
            const pinValue = Utils.clean(data.photoPin);
            const pinOk = !!pinValue && pinValue === todaysPhotoPin();
            if (!photoUploadOk && !pinOk && imageValue) {
              nextBtn.disabled = true;
              driveCheck = await ensureDriveAccessible(driveCheck, imageValue);
              session.driveCheck = driveCheck;
              nextBtn.disabled = false;
              if (!driveCheck.available) {
                setFieldError(app, "imageUrl", Lang.t("validation.driveLinkNoAccess"));
                focusFirstError(stepBody);
                return;
              }
            }
          }
          if (currentStep === 4) {
            const value = Utils.clean(data.username);
            nextBtn.disabled = true;
            usernameCheck = await ensureAvailability(usernameCheck, value, Api.checkUsername);
            session.usernameCheck = usernameCheck;
            nextBtn.disabled = false;
            if (!usernameCheck.available) {
              setFieldError(app, "username", usernameCheck.networkError ? Lang.t("error.network") : Lang.t("field.usernameTaken"));
              focusFirstError(stepBody);
              return;
            }
          }

          currentStep += 1;
          session.currentStep = currentStep;
          renderStep();
        });
        actions.appendChild(nextBtn);
      } else {
        const submitBtn = Utils.el("button", { class: "btn btn--primary", text: Lang.t("action.submit") });
        submitBtn.addEventListener("click", async () => {
          submitBtn.disabled = true;
          submitBtn.textContent = Lang.t("action.submitting");
          try {
            const payload = Object.assign({}, data, { phone: data.mobile, altPhone: data.altMobile });
            if (session.photoUpload && session.photoUpload.valid && session.photoUpload.url) payload.imageUrl = session.photoUpload.url;
            const result = await Api.registerDriver(payload);
            activeRegistrationSession = null;
            flushActiveSessionFields = null;
            renderSuccess(app, result);
          } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = Lang.t("action.submit");
            const map = {
              DUPLICATE_PHONE: "register.error.duplicatePhone",
              DUPLICATE_USERNAME: "register.error.duplicateUsername"
            };
            Toast.show(Lang.t(map[err.code] || "register.error.generic"), "error");
          }
        });
        actions.appendChild(submitBtn);
      }
    }

    renderStep();
  }

  function renderSuccess(app) {
    app.innerHTML = "";
    app.appendChild(Utils.el("section", { class: "section container" }, [
      Utils.el("div", { class: "state-block" }, [
        Utils.el("div", { class: "state-block__icon", html: Icons.checkCircle }),
        Utils.el("h3", { text: Lang.t("register.success.title") }),
        Utils.el("p", { text: Lang.t("register.success.body") }),
        Utils.el("button", { class: "btn btn--primary", text: Lang.t("register.success.action"), onClick: () => Router.navigate("/") })
      ])
    ]));
  }

  Router.register("/registration", renderRegister, ["/"]);
})(window, document, window.Utils, window.Lang, window.Icons, window.Api, window.Router, window.ViewHelpers, window.Toast);
