(function (window, document, Utils, Lang, Icons, Auth, Api, Router, ViewHelpers, Toast, Modal) {
  "use strict";

  function marketLabel(slug) {
    return slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
  }

  function localizedName(item) {
    const isBn = Lang.current() === "bn";
    return (isBn && item.nameBn) ? item.nameBn : item.nameEn;
  }

  function resolveMarketNames(raw, markets) {
    const map = {};
    (markets || []).forEach((m) => { map[m.slug] = m; });
    return Utils.splitMulti(raw).map((slug) => map[slug] ? localizedName(map[slug]) : marketLabel(slug));
  }

  function resolveVehicleTypeNames(raw, categories) {
    const map = {};
    (categories || []).forEach((c) => { map[c.slug] = c; });
    return Utils.splitMulti(raw).map((slug) => map[slug] ? localizedName(map[slug]) : slug.toUpperCase());
  }

  function starsNode(ratingRaw) {
    const count = Utils.starCount(ratingRaw);
    const stars = Utils.el("span", { class: "stars", role: "img", "aria-label": Lang.t("driver.ratingAria", { n: count }) });
    for (let i = 1; i <= 5; i++) {
      stars.appendChild(Utils.el("span", {
        class: "star " + (i <= count ? "star--filled" : "star--empty"),
        "aria-hidden": "true", text: i <= count ? "★" : "☆"
      }));
    }
    return stars;
  }

  function statusPill(text, tone) {
    return Utils.el("span", { class: "status-pill status-pill--" + tone, text });
  }

  function overviewItem(iconHtml, label, valueNode) {
    return Utils.el("div", { class: "overview-item" }, [
      Utils.el("div", { class: "overview-icon", html: iconHtml }),
      Utils.el("div", { style: "min-width:0;" }, [
        Utils.el("div", { class: "overview-label", text: label }),
        typeof valueNode === "string"
          ? Utils.el("div", { class: "overview-value", text: valueNode })
          : Utils.el("div", { class: "overview-value" }, [valueNode])
      ])
    ]);
  }

  function formField({ id, labelText, type, value }) {
    const label = Utils.el("label", { for: id, text: labelText });
    const control = Utils.el("input", { id, name: id, type: type || "text", value: value || "" });
    const errorMsg = Utils.el("div", { class: "error-msg", "data-error-for": id });
    const wrap = Utils.el("div", { class: "field", "data-field": id }, [label, control, errorMsg]);
    return { wrap, control };
  }

  function setFieldError(root, id, message) {
    const field = root.querySelector('[data-field="' + id + '"]');
    if (!field) return;
    field.classList.toggle("has-error", !!message);
    const err = field.querySelector(".error-msg");
    if (err) err.textContent = message || "";
  }

  function buildVehicleGallery(driver) {
    const rawUrls = Utils.splitMulti(driver.vehicleImageUrl).filter(Boolean);
    const urls = rawUrls.map(Utils.resolveImageUrl);
    if (!urls.length) {
      return Utils.el("div", { class: "vehicle-gallery-empty" }, [
        Utils.el("div", { html: Icons.gallery }),
        Utils.el("p", { text: Lang.t("profile.noPhotos") })
      ]);
    }

    const mainImg = Utils.el("img", { alt: Utils.driverDisplayName(driver), loading: "lazy", decoding: "async" });
    const thumbButtons = [];
    let current = 0;

    function show(index) {
      current = (index + urls.length) % urls.length;
      Utils.wireImageFallback(mainImg, rawUrls[current], () => {});
      thumbButtons.forEach((btn, i) => btn.classList.toggle("is-active", i === current));
    }

    const mainChildren = [mainImg];
    if (urls.length > 1) {
      mainChildren.push(Utils.el("button", {
        type: "button", class: "gallery__arrow gallery__arrow--prev",
        "aria-label": Lang.t("a11y.previousImage"), html: Icons.chevronLeft,
        onClick: () => show(current - 1)
      }));
      mainChildren.push(Utils.el("button", {
        type: "button", class: "gallery__arrow gallery__arrow--next",
        "aria-label": Lang.t("a11y.nextImage"), html: Icons.chevronRight,
        onClick: () => show(current + 1)
      }));
    }
    const mainWrap = Utils.el("div", { class: "gallery__main" }, mainChildren);

    const children = [];
    if (urls.length > 1) {
      const thumbs = urls.map((url, i) => {
        const thumbImg = Utils.el("img", { alt: "", loading: "lazy" });
        Utils.wireImageFallback(thumbImg, rawUrls[i], () => {});
        const btn = Utils.el("button", {
          type: "button", class: "gallery__thumb", "aria-label": (i + 1) + " / " + urls.length,
          onClick: () => show(i)
        }, [thumbImg]);
        thumbButtons.push(btn);
        return btn;
      });
      children.push(Utils.el("div", { class: "gallery__thumbs" }, thumbs));
    }
    children.push(mainWrap);

    show(0);
    return Utils.el("div", { class: "gallery" }, children);
  }

  function renderLogin(app) {
    app.innerHTML = "";
    if (Auth.isLoggedIn()) { Router.navigate("/profile"); return; }

    const idInput = Utils.el("input", {
      id: "identifier", type: "text", autocomplete: "username", autocapitalize: "none", autocorrect: "off", spellcheck: "false",
      placeholder: Lang.t("login.usernamePlaceholder")
    });
    const pwInput = Utils.el("input", {
      id: "password", type: "password", autocomplete: "current-password",
      placeholder: Lang.t("login.passwordPlaceholder")
    });

    const pwToggle = Utils.el("button", {
      type: "button", class: "login-eye", "aria-label": Lang.t("login.showPassword"), html: Icons.eye,
      onClick: () => {
        const showing = pwInput.type === "text";
        pwInput.type = showing ? "password" : "text";
        pwToggle.innerHTML = showing ? Icons.eye : Icons.eyeOff;
        pwToggle.setAttribute("aria-label", Lang.t(showing ? "login.showPassword" : "login.hidePassword"));
      }
    });

    function loginField(inputId, labelKey, input, iconHtml, extra) {
      const err = Utils.el("div", { class: "error-msg", role: "alert" });
      const box = Utils.el("div", { class: "login-input" }, [
        Utils.el("span", { class: "login-input__icon", "aria-hidden": "true", html: iconHtml }),
        input
      ].concat(extra || []));
      const field = Utils.el("div", { class: "field" }, [
        Utils.el("label", { for: inputId, text: Lang.t(labelKey) }),
        box,
        err
      ]);
      return {
        field,
        setError(msg) {
          err.textContent = msg || "";
          field.classList.toggle("has-error", !!msg);
          if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
        }
      };
    }

    const idField = loginField("identifier", "login.usernameLabel", idInput, Icons.user);
    const pwField = loginField("password", "login.passwordLabel", pwInput, Icons.lock, [pwToggle]);

    const alertIcon = Utils.el("span", { class: "login-alert__icon", "aria-hidden": "true", html: Icons.alertCircle });
    const alertText = Utils.el("span", { class: "login-alert__text" });
    const alertBox = Utils.el("div", { class: "login-alert", role: "alert", hidden: "" }, [alertIcon, alertText]);

    function showAlert(msg, kind) {
      alertText.textContent = msg;
      alertBox.className = "login-alert" + (kind === "info" ? " login-alert--info" : "");
      alertBox.hidden = false;
    }
    function hideAlert() { alertBox.hidden = true; }

    const submitLabel = Utils.el("span", { class: "login-submit__label", text: Lang.t("login.submit") });
    const submitBtn = Utils.el("button", { type: "submit", class: "btn btn--primary btn--block login-submit" }, [submitLabel]);
    const slowHint = Utils.el("p", { class: "login-slow", role: "status", hidden: "" });

    idInput.addEventListener("input", () => { idField.setError(""); hideAlert(); refreshForgotLinks(); });
    pwInput.addEventListener("input", () => { pwField.setError(""); hideAlert(); });

    const cfg = (window.NOBI_CONFIG && window.NOBI_CONFIG.SOCIAL_LINKS) || {};
    const adminPhone = Utils.clean(cfg.call) && cfg.call !== "#" ? cfg.call : "";
    const adminWhatsapp = Utils.clean(cfg.whatsapp) && cfg.whatsapp !== "#" ? cfg.whatsapp : "";

    const waBtn = adminWhatsapp ? Utils.el("a", {
      class: "btn btn--primary btn--sm login-forgot__btn", target: "_blank", rel: "noopener"
    }, [Utils.el("span", { "aria-hidden": "true", html: Icons.whatsapp }), Utils.el("span", { text: Lang.t("login.forgotWhatsapp") })]) : null;
    const callBtn = adminPhone ? Utils.el("a", {
      class: "btn btn--ghost btn--sm login-forgot__btn", href: "tel:" + Utils.normalizePhone(adminPhone)
    }, [Utils.el("span", { "aria-hidden": "true", html: Icons.phone }), Utils.el("span", { text: Lang.t("login.forgotCall") })]) : null;

    function refreshForgotLinks() {
      if (!waBtn) return;
      const who = Utils.clean(idInput.value) || "____";
      const msg = Lang.t("login.forgotMessage").split("{id}").join(who);
      waBtn.href = Utils.waLink(adminWhatsapp) + "?text=" + encodeURIComponent(msg);
    }
    refreshForgotLinks();

    const forgotPanel = Utils.el("div", { class: "login-forgot", id: "login-forgot", hidden: "" }, [
      Utils.el("h3", { class: "login-forgot__title", text: Lang.t("login.forgotTitle") }),
      Utils.el("p", { class: "login-forgot__text", text: Lang.t("login.forgotText") }),
      Utils.el("div", { class: "login-forgot__actions" }, [waBtn, callBtn].filter(Boolean))
    ]);
    const forgotLink = Utils.el("button", {
      type: "button", class: "login-forgot__link", "aria-expanded": "false", "aria-controls": "login-forgot",
      text: Lang.t("login.forgot"),
      onClick: () => {
        const open = forgotPanel.hidden;
        forgotPanel.hidden = !open;
        forgotLink.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) refreshForgotLinks();
      }
    });

    const form = Utils.el("form", { novalidate: "" }, [
      idField.field,
      pwField.field,
      alertBox,
      submitBtn,
      slowHint,
      Utils.el("div", { class: "login-forgot__row" }, [forgotLink]),
      forgotPanel,
      Utils.el("p", { class: "text-center mt-5 hint" }, [
        document.createTextNode(Lang.t("login.noAccount") + " "),
        Utils.el("a", { href: "#/registration", text: Lang.t("login.registerLink") })
      ])
    ]);

    const card = Utils.el("div", { class: "form-card login-card" }, [form]);

    function validate() {
      const id = Utils.clean(idInput.value);
      const pw = pwInput.value;
      let first = null;
      idField.setError("");
      pwField.setError("");
      if (!id) { idField.setError(Lang.t("login.error.usernameRequired")); first = idInput; }
      if (!pw) { pwField.setError(Lang.t("login.error.passwordRequired")); if (!first) first = pwInput; }
      else if (pw.length < 6) { pwField.setError(Lang.t("validation.passwordShort")); if (!first) first = pwInput; }
      if (first) { first.focus(); return false; }
      return true;
    }

    let busy = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      hideAlert();
      if (!validate()) return;
      busy = true;
      card.classList.add("is-loading");
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-busy", "true");
      idInput.readOnly = true;
      pwInput.readOnly = true;
      submitLabel.textContent = Lang.t("login.loading");
      submitBtn.insertBefore(Utils.el("span", { class: "login-spinner", "aria-hidden": "true" }), submitLabel);
      const slowTimer = setTimeout(() => {
        slowHint.textContent = Lang.t("login.slow");
        slowHint.hidden = false;
      }, 3500);
      try {
        await Auth.login(idInput.value, pwInput.value);
        Router.navigate("/profile");
        return;
      } catch (err) {
        if (err.code === "PENDING_APPROVAL") showAlert(Lang.t("login.error.pending"), "info");
        else if (err.code === "INVALID_CREDENTIALS") showAlert(Lang.t("login.error"));
        else showAlert(Lang.t("login.error.generic"));
        card.classList.remove("login-card--shake");
        void card.offsetWidth;
        card.classList.add("login-card--shake");
      } finally {
        clearTimeout(slowTimer);
        busy = false;
        card.classList.remove("is-loading");
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
        idInput.readOnly = false;
        pwInput.readOnly = false;
        const spin = submitBtn.querySelector(".login-spinner");
        if (spin) spin.remove();
        submitLabel.textContent = Lang.t("login.submit");
        slowHint.hidden = true;
      }
    });

    const badge = Utils.el("div", { class: "login-badge", "aria-hidden": "true" });
    const badgeImg = Utils.el("img", { src: "assets/brand/logo-low.png", alt: "", width: "64", height: "64" });
    badgeImg.onerror = () => { badge.innerHTML = Icons.userLarge; };
    badge.appendChild(badgeImg);

    app.appendChild(Utils.el("section", { class: "section container login-page" }, [
      Utils.el("div", { class: "section-head text-center login-head" }, [
        badge,
        Utils.el("h2", { text: Lang.t("login.heading") }),
        Utils.el("p", { text: Lang.t("login.sub") })
      ]),
      card
    ]));
  }

  async function renderProfile(app) {
    app.innerHTML = "";
    if (!Auth.isLoggedIn()) {
      app.appendChild(Utils.el("section", { class: "section container" }, [
        ViewHelpers.emptyBlock({
          message: Lang.t("profile.loginRequired"), icon: Icons.userLarge,
          actionLabel: Lang.t("nav.login"), onAction: () => Router.navigate("/login")
        })
      ]));
      return;
    }

    const cachedDriver = Auth.peekProfile();
    const cachedMarkets = Api.peekMarkets();
    const cachedVehicleCategories = Api.peekVehicleCategories();

    const section = Utils.el("section", { class: "section container" });
    app.appendChild(section);

    if (cachedDriver) {
      section.classList.add("profile-page");
      paintProfile(app, section, cachedDriver, cachedMarkets || [], cachedVehicleCategories || []);
    } else {
      section.appendChild(ViewHelpers.loadingBlock());
    }

    try {
      const results = await Promise.all([
        Auth.getProfile(),
        Api.getMarkets().catch(() => cachedMarkets || []),
        Api.getVehicleCategories().catch(() => cachedVehicleCategories || [])
      ]);
      if (!app.contains(section)) return;
      const driver = results[0];
      const markets = results[1] || [];
      const vehicleCategories = results[2] || [];
      section.classList.add("profile-page");
      paintProfile(app, section, driver, markets, vehicleCategories);
    } catch (err) {
      if (!app.contains(section)) return;
      if (err.code === "SESSION_EXPIRED") {
        Toast.show(Lang.t("error.sessionExpired"), "error");
        Router.navigate("/login");
        return;
      }
      if (cachedDriver) return;
      section.innerHTML = "";
      section.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderProfile(app)));
    }
  }

  function paintProfile(app, section, driver, markets, vehicleCategories) {
    section.innerHTML = "";

    const photoWrap = Utils.el("div", { class: "profile-photo" });
    const photoUrl = Utils.resolveImageUrl(driver.imageUrl);
    const photoLocalUrl = Utils.localFixtureUrl("profile", driver.driverId);
    if (photoUrl || photoLocalUrl) {
      const img = Utils.el("img", { alt: Utils.driverDisplayName(driver) });
      Utils.wireImageFallback(img, driver.imageUrl, () => { photoWrap.innerHTML = Icons.userLarge; }, photoLocalUrl);
      photoWrap.appendChild(img);
    } else {
      photoWrap.innerHTML = Icons.userLarge;
    }

    const vehicleSlugs = Utils.splitMulti(driver.vehicleType);
    const primarySlug = vehicleSlugs[0] || "";
    const heroModifier = ["cng", "auto", "van", "motorcycle", "easy-bike"].indexOf(primarySlug) !== -1 ? primarySlug : "";

    const accountStatus = driver.accountStatus || "active";
    const isVerified = accountStatus === "active";
    const badge = Utils.el("span", { class: "profile-badge profile-badge--" + accountStatus }, [
      Utils.el("span", { html: Icons.checkCircle, style: "display:flex;" }),
      Utils.el("span", { text: isVerified ? Lang.t("profile.verifiedBadge") : Lang.t("profile.accountStatus." + accountStatus) })
    ]);

    const ratingNum = parseFloat(driver.rating);
    const ratingDisplay = isNaN(ratingNum) ? "0.0" : ratingNum.toFixed(1);

    const hero = Utils.el("div", { class: "profile-hero" + (heroModifier ? " profile-hero--" + heroModifier : "") }, [
      Utils.el("div", { class: "profile-hero__decor", html: Icons.vehicle(primarySlug || "other") }),
      Utils.el("div", { class: "profile-hero__top" }, [
        photoWrap,
        Utils.el("div", { style: "min-width:0;" }, [
          badge,
          Utils.el("h1", { class: "profile-name", text: Utils.driverDisplayName(driver) }),
          Utils.el("div", { class: "profile-vehicle-type", text: resolveVehicleTypeNames(driver.vehicleType, vehicleCategories).join(", ") || "—" }),
          Utils.el("div", { class: "profile-meta-row" }, [
            starsNode(driver.rating),
            document.createTextNode(Lang.t("profile.ratingLabel", { rating: ratingDisplay })),
            Utils.el("span", { class: "dot-sep", text: "|" }),
            Utils.el("span", { html: Icons.shield, style: "display:inline-flex;" }),
            Utils.el("span", { text: Utils.formatExperience(Utils.localizedField(driver, "experience")) || "—" })
          ])
        ])
      ])
    ]);

    const whatsappNumber = Utils.resolveWhatsApp(driver);
    const availabilityPill = statusPill(
      driver.availability === "active" ? Lang.t("profile.setActive") : Lang.t("profile.setInactive"),
      driver.availability === "active" ? "success" : "neutral"
    );
    const overviewGrid = Utils.el("div", {}, [
      Utils.el("div", { class: "overview-grid overview-grid--top" }, [
        overviewItem(Icons.userLarge, Lang.t("profile.driverId"), driver.driverId || "—"),
        overviewItem(Icons.phone, Lang.t("profile.primaryPhone"), driver.phone || "—"),
        overviewItem(Icons.whatsapp, Lang.t("driver.whatsapp"), statusPill(
          whatsappNumber ? Lang.t("profile.whatsappActive") : Lang.t("profile.whatsappInactive"),
          whatsappNumber ? "success" : "neutral"
        ))
      ]),
      Utils.el("div", { class: "overview-grid overview-grid--bottom" }, [
        overviewItem(Icons.userLarge, Lang.t("profile.accountStatus"), statusPill(
          Lang.t("profile.accountStatus." + accountStatus),
          accountStatus === "active" ? "success" : (accountStatus === "pending" ? "warning" : "danger")
        )),
        overviewItem(Icons.checkCircle, Lang.t("profile.availability"), availabilityPill),
        overviewItem(Icons.shield, Lang.t("profile.adminStatus"), driver.isAdmin ? statusPill(Lang.t("profile.adminActive"), "success") : statusPill("False", "neutral"))
      ])
    ]);

    const accountOverviewCard = Utils.el("div", { class: "profile-card" }, [
      Utils.el("div", { class: "profile-card__head" }, [
        Utils.el("h2", { html: Icons.userLarge + "<span>" + Lang.t("profile.accountOverview") + "</span>" })
      ]),
      overviewGrid
    ]);

    const marketNames = resolveMarketNames(driver.marketSlug, markets);
    const serviceAreasCard = Utils.el("div", { class: "profile-card" }, [
      Utils.el("div", { class: "profile-card__head" }, [
        Utils.el("h2", { html: Icons.map + "<span>" + Lang.t("profile.serviceAreas") + "</span>" }),
        editProfileButton()
      ]),
      marketNames.length
        ? Utils.el("div", { class: "info-chip-row" }, marketNames.map((name) => Utils.el("span", { class: "info-chip", text: name })))
        : null,
      Utils.el("div", { class: "service-area-row" }, [
        Utils.el("span", { html: Icons.map }),
        Utils.el("div", {}, [
          Utils.el("div", { class: "service-area-row__label", text: Lang.t("driver.serviceArea") }),
          Utils.el("div", { class: "service-area-row__text", text: Utils.localizedField(driver, "serviceArea") || "—" })
        ])
      ])
    ].filter(Boolean));

    const vehiclePhotoUrlsRaw = Utils.splitMulti(driver.vehicleImageUrl).filter(Boolean);
    const vehiclePhotoUrls = vehiclePhotoUrlsRaw.map(Utils.resolveImageUrl);
    const thumb = Utils.el("button", { type: "button", class: "vehicle-thumb", onClick: () => openVehiclePhotosModal(driver) });
    if (vehiclePhotoUrls.length) {
      const img = Utils.el("img", { alt: "", loading: "lazy" });
      Utils.wireImageFallback(img, vehiclePhotoUrlsRaw[0], () => { thumb.innerHTML = Icons.vehicle(primarySlug || "other"); });
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = Icons.vehicle(primarySlug || "other");
    }

    const sideUrls = vehiclePhotoUrls.slice(1, 4);
    const sideUrlsRaw = vehiclePhotoUrlsRaw.slice(1, 4);
    let sideColumn = null;
    if (sideUrls.length) {
      const extraCount = vehiclePhotoUrls.length - 4;
      const sideThumbs = sideUrls.map((url, i) => {
        const isLast = i === sideUrls.length - 1;
        const img = Utils.el("img", { alt: "", loading: "lazy" });
        Utils.wireImageFallback(img, sideUrlsRaw[i], () => { img.remove(); });
        const children = [img];
        if (isLast && extraCount > 0) children.push(Utils.el("span", { class: "vehicle-side-thumb__badge", text: "+" + extraCount }));
        return Utils.el("button", { type: "button", class: "vehicle-side-thumb", onClick: () => openVehiclePhotosModal(driver) }, children);
      });
      sideColumn = Utils.el("div", { class: "vehicle-gallery-compact__side" }, sideThumbs);
    }

    const galleryBlock = Utils.el("div", { class: "vehicle-gallery-compact" }, [thumb, sideColumn].filter(Boolean));

    const vehicleInfoCard = Utils.el("div", { class: "profile-card" }, [
      Utils.el("div", { class: "profile-card__head" }, [
        Utils.el("h2", { html: Icons.vehicle(primarySlug || "other") + "<span>" + Lang.t("profile.vehicleInformation") + "</span>" }),
        editProfileButton()
      ]),
      Utils.el("div", { class: "vehicle-info-grid" }, [
        galleryBlock,
        Utils.el("div", { class: "vehicle-info-top" }, [
          overviewItem(Icons.vehicle(primarySlug || "other"), Lang.t("detail.regNumber"), driver.vehicleNumber || "—"),
          overviewItem(Icons.shield, Lang.t("detail.experience"), Utils.formatExperience(Utils.localizedField(driver, "experience")) || "—")
        ]),
        overviewItem(Icons.userLarge, Lang.t("detail.serviceType"), resolveVehicleTypeNames(driver.vehicleType, vehicleCategories).join(", ") || "—"),
        overviewItem(Icons.map, Lang.t("profile.preferredBazar"),
          marketNames.length
            ? Utils.el("div", { class: "info-chip-row", style: "margin-bottom:0;" }, marketNames.map((name) => Utils.el("span", { class: "info-chip", text: name })))
            : "—")
      ])
    ]);

    const profileFieldsCard = Utils.el("div", { class: "profile-card" }, [
      Utils.el("div", { class: "profile-card__head" }, [
        Utils.el("h2", { html: Icons.userLarge + "<span>" + Lang.t("profile.profileFields") + "</span>" }),
        editProfileButton()
      ]),
      Utils.el("div", { class: "profile-fields-grid" }, [
        overviewItem(Icons.userLarge, Lang.t("profile.bengaliName"), driver.nameBn || "—"),
        overviewItem(Icons.phone, Lang.t("driver.altPhone"), driver.altPhone || "—"),
        overviewItem(Icons.userLarge, Lang.t("profile.guardianName"), driver.guardianName || "—"),
        overviewItem(Icons.userLarge, Lang.t("profile.email"), driver.email || "—")
      ])
    ]);

    function editProfileButton() {
      return Utils.el("button", {
        type: "button", class: "pill-btn", html: Icons.pencil + "<span>" + Lang.t("action.edit") + "</span>",
        onClick: () => openEditProfileModal(driver, () => paintProfile(app, section, driver, markets, vehicleCategories))
      });
    }

    const changePasswordRow = Utils.el("button", { type: "button", class: "profile-link-row", onClick: () => openChangePasswordModal() }, [
      Utils.el("div", { class: "profile-link-row__icon", html: Icons.lock }),
      Utils.el("div", { class: "profile-link-row__body" }, [
        Utils.el("div", { class: "profile-link-row__title", text: Lang.t("profile.changePassword") }),
        Utils.el("div", { class: "profile-link-row__sub", text: Lang.t("profile.changePasswordSub") })
      ]),
      Utils.el("span", { class: "profile-link-row__chevron", html: Icons.chevronRight })
    ]);

    const vehiclePhotosRow = Utils.el("button", { type: "button", class: "profile-link-row", onClick: () => openVehiclePhotosModal(driver) }, [
      Utils.el("div", { class: "profile-link-row__icon", html: Icons.gallery }),
      Utils.el("div", { class: "profile-link-row__body" }, [
        Utils.el("div", { class: "profile-link-row__title", text: Lang.t("detail.photos") }),
        Utils.el("div", { class: "profile-link-row__sub", text: Lang.t("profile.vehiclePhotosSub") })
      ]),
      Utils.el("span", { class: "profile-link-row__chevron", html: Icons.chevronRight })
    ]);

    const activeOption = Utils.el("button", { type: "button", class: "availability-toggle__option" }, [
      Utils.el("span", { html: Icons.checkCircle }),
      Utils.el("span", {}, [
        Utils.el("span", { class: "availability-toggle__title", text: Lang.t("profile.setActive") }),
        Utils.el("span", { class: "availability-toggle__sub", text: Lang.t("profile.availableDesc") })
      ])
    ]);
    const inactiveOption = Utils.el("button", { type: "button", class: "availability-toggle__option" }, [
      Utils.el("span", { html: Icons.alertCircle }),
      Utils.el("span", {}, [
        Utils.el("span", { class: "availability-toggle__title", text: Lang.t("profile.setInactive") }),
        Utils.el("span", { class: "availability-toggle__sub", text: Lang.t("profile.unavailableDesc") })
      ])
    ]);

    function paintAvailability() {
      activeOption.classList.toggle("is-selected--active", driver.availability === "active");
      inactiveOption.classList.toggle("is-selected--inactive", driver.availability !== "active");
    }
    paintAvailability();

    async function switchAvailability(target) {
      if (driver.availability === target) return;
      const confirmed = await Modal.confirm({
        title: Lang.t(target === "inactive" ? "profile.confirmInactive.title" : "profile.confirmActive.title"),
        body: Lang.t(target === "inactive" ? "profile.confirmInactive.body" : "profile.confirmActive.body"),
        danger: target === "inactive"
      });
      if (!confirmed) return;
      try {
        await Auth.updateAvailability(target);
        driver.availability = target;
        paintAvailability();
        availabilityPill.textContent = target === "active" ? Lang.t("profile.setActive") : Lang.t("profile.setInactive");
        availabilityPill.className = "status-pill status-pill--" + (target === "active" ? "success" : "neutral");
        Toast.show(Lang.t(target === "active" ? "profile.statusUpdated.active" : "profile.statusUpdated.inactive"), "success");
      } catch (err) {
        Toast.show(Lang.t("profile.statusUpdateError"), "error");
      }
    }
    activeOption.addEventListener("click", () => switchAvailability("active"));
    inactiveOption.addEventListener("click", () => switchAvailability("inactive"));

    const logoutBtn = Utils.el("button", {
      class: "btn btn--outline-danger btn--block", html: Icons.logout + "<span>" + Lang.t("nav.logout") + "</span>",
      onClick: async () => {
        const confirmed = await Modal.confirm({ title: Lang.t("nav.logout"), body: Lang.t("profile.logoutConfirm"), confirmLabel: Lang.t("nav.logout"), danger: true });
        if (confirmed) { Auth.logout(); Router.navigate("/"); }
      }
    });

    section.appendChild(hero);
    if (driver.isAdmin && window.Admin) section.appendChild(window.Admin.buildDashboardCard());
    section.appendChild(accountOverviewCard);
    section.appendChild(serviceAreasCard);
    section.appendChild(vehicleInfoCard);
    section.appendChild(profileFieldsCard);
    section.appendChild(changePasswordRow);
    section.appendChild(vehiclePhotosRow);
    section.appendChild(Utils.el("div", { class: "availability-toggle" }, [activeOption, inactiveOption]));
    section.appendChild(logoutBtn);
  }

  function openEditProfileModal(driver, onSaved) {
    const RF = window.RegistrationForm;
    const form = Utils.el("form", { novalidate: "novalidate" });

    const personal = RF.createPersonalRows(form, null, null);
    const pf = personal.fields;
    const twoCol = (a, b) => Utils.el("div", { class: "field-row-2col" }, [a.wrap, b.wrap]);

    const base = Object.assign({}, driver, driver.pendingEdit || {});
    const hasPendingEdit = !!(driver.pendingEdit && Object.keys(driver.pendingEdit).length);
    const ownCategories = Utils.splitMulti(driver.vehicleType);
    const category = RF.createCategoryRows({
      vehicleOptions: ownCategories.map((slug) => ({ value: slug, label: slug, search: slug })),
      marketOptions: [],
      clearHidden: false
    });
    const cf = category.fields;
    cf.vehicleType.wrap.querySelectorAll("input[type=checkbox]").forEach((cb) => { cb.checked = true; });
    category.updateExtraFields();

    const serviceAreaBnField = formField({ id: "serviceAreaBn", labelText: Lang.t("field.serviceAreaBn"), type: "text" });
    const experienceBnField = formField({ id: "experienceBn", labelText: Lang.t("field.experienceBn"), type: "text" });
    const socialControl = Utils.el("textarea", { id: "socialUrl", name: "socialUrl", rows: "2", placeholder: Lang.t("register.step3.socialPlaceholder") });
    const socialWrap = Utils.el("div", { class: "field", "data-field": "socialUrl" }, [
      Utils.el("label", { for: "socialUrl", text: Lang.t("register.step3.socialLabelPrefix") }),
      socialControl,
      Utils.el("div", { class: "hint", text: Lang.t("register.step3.socialHint") })
    ]);

    cf.experience.control.value = Utils.clean(base.experience);

    pf.fullName.control.value = base.name || "";
    pf.fullNameBn.control.value = base.nameBn || "";
    pf.guardianName.control.value = base.guardianName || "";
    pf.village.control.value = base.village || "";
    pf.postOffice.control.value = base.postOffice || "";
    pf.union.control.value = base.union || "";
    pf.upazila.control.value = base.upazila || "";
    pf.district.control.value = base.district || "";
    pf.fullAddress.control.value = base.fullAddress || "";
    pf.altMobile.control.value = base.altPhone || "";
    pf.whatsapp.control.value = base.whatsapp || "";
    cf.vehicleNumber.control.value = base.vehicleNumber || "";
    cf.serviceArea.control.value = base.serviceArea || "";
    serviceAreaBnField.control.value = base.serviceAreaBn || "";
    experienceBnField.control.value = base.experienceBn || "";
    socialControl.value = base.socialUrl || "";
    cf.qualification.control.value = base.qualification || "";
    cf.extra.forEach((row, i) => { row.control.value = base["extra" + (i + 1)] || ""; });

    const saveBtn = Utils.el("button", { type: "submit", class: "btn btn--primary btn--block mt-5", text: Lang.t("profile.save") });

    [
      pf.fullName,
      twoCol(pf.fullNameBn, pf.guardianName),
      twoCol(pf.altMobile, pf.whatsapp),
      pf.village,
      twoCol(pf.postOffice, pf.union),
      twoCol(pf.upazila, pf.district),
      pf.fullAddress,
      cf.vehicleNumber,
      cf.serviceArea,
      serviceAreaBnField,
      category.rows[4],
      category.rows[5],
      experienceBnField,
      { wrap: socialWrap }
    ].forEach((row) => form.appendChild(row.wrap || row));
    form.appendChild(saveBtn);

    const content = Utils.el("div", {}, [
      Utils.el("div", { class: "modal-head" }, [
        Utils.el("h3", { text: Lang.t("profile.editProfile") }),
        Utils.el("button", { class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"), html: Icons.close, onClick: () => Modal.close() })
      ]),
      hasPendingEdit ? Utils.el("p", { class: "hint", text: Lang.t("profile.editPendingNote") }) : null,
      form
    ]);

    const isShown = (row) => row.wrap.style.display !== "none";

    const setNameError = (row, message) => {
      row.wrap.classList.toggle("has-error", !!message);
      const err = row.wrap.querySelector(".error-msg");
      if (err) err.textContent = message || "";
    };
    [pf.fullName, pf.fullNameBn].forEach((row) => row.control.addEventListener("input", () => setNameError(row, "")));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameRows = [pf.fullName, pf.fullNameBn].filter((row) => !Utils.clean(row.control.value));
      [pf.fullName, pf.fullNameBn].forEach((row) => setNameError(row, nameRows.includes(row) ? Lang.t("validation.required") : ""));
      if (nameRows.length) { nameRows[0].control.focus(); return; }
      const fields = {
        name: Utils.clean(pf.fullName.control.value),
        nameBn: Utils.clean(pf.fullNameBn.control.value),
        guardianName: Utils.clean(pf.guardianName.control.value),
        altPhone: Utils.clean(pf.altMobile.control.value),
        whatsapp: Utils.clean(pf.whatsapp.control.value),
        serviceArea: Utils.clean(cf.serviceArea.control.value),
        vehicleNumber: Utils.clean(cf.vehicleNumber.control.value)
      };
      [["serviceAreaBn", serviceAreaBnField.control], ["experienceBn", experienceBnField.control], ["socialUrl", socialControl]].forEach(([key, control]) => {
        const value = Utils.clean(control.value);
        if (value || Utils.clean(base[key] || "")) fields[key] = value;
      });
      [["village", pf.village], ["postOffice", pf.postOffice], ["union", pf.union], ["upazila", pf.upazila], ["district", pf.district], ["fullAddress", pf.fullAddress]].forEach(([key, row]) => {
        const value = Utils.clean(row.control.value);
        if (value || Utils.clean(base[key] || "")) fields[key] = value;
      });
      const experienceValue = Utils.clean(cf.experience.control.value);
      if (experienceValue || Utils.clean(base.experience || "")) fields.experience = experienceValue;
      if (isShown(cf.qualification)) fields.qualification = Utils.clean(cf.qualification.control.value);
      cf.extra.forEach((row, i) => { if (isShown(row)) fields["extra" + (i + 1)] = Utils.clean(row.control.value); });
      const changed = Object.keys(fields).some((key) => fields[key] !== Utils.clean(base[key] || ""));
      if (!changed) { Toast.show(Lang.t("profile.noChanges")); return; }

      saveBtn.disabled = true;
      const original = saveBtn.textContent;
      saveBtn.textContent = Lang.t("profile.saving");
      try {
        const updated = await Auth.updateProfile(fields);
        Object.assign(driver, updated);
        Modal.close();
        Toast.show(Lang.t(updated && updated.pendingApproval ? "profile.editPending" : "profile.editSuccess"), "success");
        if (onSaved) onSaved();
      } catch (err) {
        if (err.code === "SESSION_EXPIRED") {
          Auth.logout();
          Toast.show(Lang.t("error.sessionExpired"), "error");
          Modal.close();
          Router.navigate("/login");
          return;
        }
        Toast.show(Lang.t("profile.editError"), "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = original;
      }
    });

    Modal.open(content);
  }

  function openChangePasswordModal() {
    const oldField = formField({ id: "oldPassword", labelText: Lang.t("profile.oldPassword"), type: "password" });
    const newField = formField({ id: "newPassword", labelText: Lang.t("profile.newPassword"), type: "password" });
    const confirmField = formField({ id: "confirmNewPassword", labelText: Lang.t("profile.confirmNewPassword"), type: "password" });

    const saveBtn = Utils.el("button", { type: "submit", class: "btn btn--primary btn--block mt-5", text: Lang.t("profile.save") });
    const form = Utils.el("form", {}, [oldField.wrap, newField.wrap, confirmField.wrap, saveBtn]);
    const root = Utils.el("div", {}, [
      Utils.el("div", { class: "modal-head" }, [
        Utils.el("h3", { text: Lang.t("profile.changePassword") }),
        Utils.el("button", { class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"), html: Icons.close, onClick: () => Modal.close() })
      ]),
      form
    ]);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      ["oldPassword", "newPassword", "confirmNewPassword"].forEach((id) => setFieldError(root, id, ""));

      const oldPassword = oldField.control.value;
      const newPassword = newField.control.value;
      const confirmPassword = confirmField.control.value;
      let valid = true;
      if (!oldPassword) { setFieldError(root, "oldPassword", Lang.t("validation.required")); valid = false; }
      if (!newPassword) { setFieldError(root, "newPassword", Lang.t("validation.required")); valid = false; }
      else if (newPassword.length < 6) { setFieldError(root, "newPassword", Lang.t("validation.passwordShort")); valid = false; }
      if (valid && newPassword !== confirmPassword) { setFieldError(root, "confirmNewPassword", Lang.t("validation.passwordMismatch")); valid = false; }
      if (!valid) return;

      saveBtn.disabled = true;
      const original = saveBtn.textContent;
      saveBtn.textContent = Lang.t("profile.saving");
      try {
        await Auth.changePassword(oldPassword, newPassword);
        Modal.close();
        Toast.show(Lang.t("profile.passwordUpdated"), "success");
      } catch (err) {
        if (err.code === "SESSION_EXPIRED") {
          Auth.logout();
          Toast.show(Lang.t("error.sessionExpired"), "error");
          Modal.close();
          Router.navigate("/login");
          return;
        }
        if (err.code === "INVALID_CREDENTIALS") {
          setFieldError(root, "oldPassword", Lang.t("profile.oldPasswordWrong"));
        } else {
          Toast.show(Lang.t("error.generic"), "error");
        }
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = original;
      }
    });

    Modal.open(root);
  }

  function openVehiclePhotosModal(driver) {
    const content = Utils.el("div", {}, [
      Utils.el("div", { class: "modal-head" }, [
        Utils.el("h3", { text: Lang.t("detail.photos") }),
        Utils.el("button", { class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"), html: Icons.close, onClick: () => Modal.close() })
      ]),
      buildVehicleGallery(driver)
    ]);
    Modal.open(content);
  }

  Router.register("/login", renderLogin, ["/"]);
  Router.register("/profile", renderProfile, ["/"]);
})(window, document, window.Utils, window.Lang, window.Icons, window.Auth, window.Api, window.Router, window.ViewHelpers, window.Toast, window.Modal);
