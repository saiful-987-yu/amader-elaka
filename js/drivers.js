(function (window, document, Utils, Lang, Icons, Api, Router, ViewHelpers, Modal, Toast, Search) {
  "use strict";

  function marketName(market) { return Lang.current() === "bn" ? market.nameBn : market.nameEn; }
  function vehicleName(vehicle) { return Lang.current() === "bn" ? vehicle.nameBn : vehicle.nameEn; }

  function speakerButton(text) {
    return Utils.el("button", {
      type: "button", class: "speak-btn",
      "aria-label": Lang.t("a11y.speak", { text }),
      onClick: (e) => { e.stopPropagation(); Utils.speak(text, Lang.current()); },
      html: Icons.speaker
    });
  }

  function speakableHeading(text) {
    return Utils.el("h2", { class: "section-head__title-row" }, [
      Utils.el("span", { text }),
      speakerButton(text)
    ]);
  }

  function speakableHeadingCustom(displayText, spokenText, extraClass) {
    return Utils.el("h2", { class: "section-head__title-row" + (extraClass ? " " + extraClass : "") }, [
      Utils.el("span", { text: displayText }),
      speakerButton(spokenText)
    ]);
  }

  function mutableSpeakerButton(initialText) {
    let spoken = initialText || "";
    const btn = Utils.el("button", {
      type: "button", class: "speak-btn",
      "aria-label": Lang.t("a11y.speak", { text: spoken }),
      onClick: (e) => { e.stopPropagation(); Utils.speak(spoken, Lang.current()); },
      html: Icons.speaker
    });
    btn.setSpokenText = (text) => {
      spoken = text || "";
      btn.setAttribute("aria-label", Lang.t("a11y.speak", { text: spoken }));
    };
    return btn;
  }

  function vehicleHeaderSpeech(marketNameStr) {
    return Lang.current() === "bn"
      ? `${marketNameStr} বাজারে আপনি কোন ধরনের গাড়ির ড্রাইভার খুঁজছেন?`
      : `What type of vehicle driver are you looking for in ${marketNameStr}?`;
  }

  function canPlaceCall() {
    return matchMedia("(pointer: coarse)").matches;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  function handleCall(driver, e) {
    if (e) e.stopPropagation();
    const tel = Utils.normalizePhone(driver.phone);
    if (canPlaceCall()) {
      window.location.href = "tel:" + tel;
      return;
    }
    copyToClipboard(tel).then((ok) => {
      Toast.show(ok ? Lang.t("driver.callNotSupported") : tel, ok ? "info" : undefined);
    });
  }

  let currentDetail = null;

  function openDriverModalWithHistory(contentNode, opts) {
    Modal.open(contentNode, opts);
  }

  function driverPhotoNode(driver, size) {
    const wrap = Utils.el("div", { class: size === "large" ? "detail-photo" : "driver-card__photo" });
    const url = Utils.resolveImageUrl(driver.imageUrl);
    const localUrl = Utils.localFixtureUrl("profile", driver.driverId);
    if (url || localUrl) {
      const img = Utils.el("img", { alt: Utils.driverDisplayName(driver), loading: "lazy", decoding: "async" });
      Utils.wireImageFallback(img, driver.imageUrl, () => {
        wrap.innerHTML = size === "large" ? Icons.userLarge : Icons.user;
      }, localUrl);
      wrap.appendChild(img);
    } else {
      wrap.innerHTML = size === "large" ? Icons.userLarge : Icons.user;
    }
    return wrap;
  }

  function statusNode(driver, large) {
    const available = driver.availability === "active";
    return Utils.el("span", {
      class: "status-dot " + (available ? "status-dot--available" : "status-dot--unavailable") + (large ? " status-dot--lg" : ""),
      text: available ? Lang.t("status.available") : Lang.t("status.unavailable")
    });
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

  function formatMultiUpper(raw) {
    const parts = Utils.splitMulti(raw);
    return parts.length ? parts.map((s) => s.toUpperCase()).join(", ") : "—";
  }

  function isVehicleDriver(driver) {
    if (driver.doctor) return false;
    const vehicles = Api.peekVehicleCategories();
    if (!vehicles) return true;
    const slugs = new Set(vehicles.filter((v) => !v.isOther && v.slug !== DOCTOR_CATEGORY_SLUG).map((v) => v.slug));
    return Utils.splitMulti(driver.vehicleType).some((x) => slugs.has(x));
  }

  function cardCategoryText(driver, vehicleLabel, categoryMode) {
    const degree = driver.doctor && driver.qualification ? driver.qualification : "";
    if (categoryMode === "none") return "";
    if (categoryMode === "doctor") return degree;
    if (categoryMode === "vehicleOnly") return isVehicleDriver(driver) ? (vehicleLabel || formatMultiUpper(driver.vehicleType)) : degree;
    return vehicleLabel || (degree || formatMultiUpper(driver.vehicleType));
  }

  function vehicleServiceLine(driver, vehicleLabel, categoryMode) {
    const label = cardCategoryText(driver, vehicleLabel, categoryMode);
    const text = label && driver.serviceArea ? label + " · " + driver.serviceArea : (label || driver.serviceArea || "");
    if (!text) return null;
    return Utils.el("div", { class: "driver-card__meta", title: text, text });
  }

  function experienceRatingRow(driver) {
    const parts = [];
    if (driver.experience) {
      parts.push(Utils.el("span", { class: "driver-card__experience", text: Utils.formatExperience(driver.experience) }));
      parts.push(Utils.el("span", { class: "dot-sep", "aria-hidden": "true", text: "·" }));
    }
    parts.push(starsNode(driver.rating));
    return Utils.el("div", { class: "driver-card__rating-row" }, parts);
  }

  function driverCard(driver, vehicleLabel, crumbTrail, categoryMode) {
    const whatsappNumber = Utils.resolveWhatsApp(driver);
    const actions = [
      Utils.el("button", {
        class: "driver-card__call-btn",
        "aria-label": Lang.t("detail.call") + " " + Utils.driverDisplayName(driver),
        html: Icons.phone + "<span>" + Lang.t("detail.call") + "</span>",
        disabled: driver.availability !== "active" ? "true" : null,
        onClick: (e) => driver.availability === "active" && handleCall(driver, e)
      })
    ];
    if (whatsappNumber) {
      actions.push(Utils.el("a", {
        class: "whatsapp-btn", href: Utils.waLink(whatsappNumber), target: "_blank", rel: "noopener",
        "aria-label": Lang.t("driver.whatsapp") + " " + Utils.driverDisplayName(driver), html: Icons.whatsapp,
        onClick: (e) => e.stopPropagation()
      }));
    }
    actions.push(Utils.el("div", { class: "driver-card__spacer", "aria-hidden": "true" }));

    const card = Utils.el("div", {
      class: "driver-card", tabindex: "0", role: "button",
      "aria-label": Utils.driverDisplayName(driver),
      onClick: () => openDriverDetail(driver, crumbTrail),
      onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDriverDetail(driver, crumbTrail); } }
    }, [
      driverPhotoNode(driver, "small"),
      Utils.el("div", { class: "driver-card__body" }, [
        Utils.el("div", { class: "driver-card__name", text: Utils.driverDisplayName(driver) }),
        vehicleServiceLine(driver, vehicleLabel, categoryMode),
        experienceRatingRow(driver),
        statusNode(driver),
        Utils.el("div", { class: "driver-card__actions" }, actions)
      ]),
      window.Admin ? window.Admin.penButton("driver", driver.driverId) : null
    ]);
    return card;
  }

  function twoColRow(labelA, valueA, labelB, valueB) {
    return Utils.el("div", { class: "detail-row" }, [
      Utils.el("div", { class: "detail-col" }, [
        Utils.el("div", { class: "detail-col__label", text: labelA }),
        Utils.el("div", { class: "detail-col__value", text: valueA })
      ]),
      Utils.el("div", { class: "detail-col" }, [
        Utils.el("div", { class: "detail-col__label", text: labelB }),
        Utils.el("div", { class: "detail-col__value", text: valueB })
      ])
    ]);
  }

  function buildGallery(driver) {
    const rawUrls = Utils.splitMulti(driver.vehicleImageUrl).filter(Boolean);
    const urls = rawUrls.map(Utils.resolveImageUrl);
    if (!urls.length) return null;

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

  function formatReviewDate(iso) {
    if (!iso) return "";
    return Utils.formatDateTime(iso);
  }

  function renderReviewList(container, list) {
    container.innerHTML = "";
    if (!list.length) {
      container.appendChild(Utils.el("p", { class: "reviews-empty", text: Lang.t("driver.reviewsEmpty") }));
      return;
    }
    list.forEach((r) => {
      container.appendChild(Utils.el("div", { class: "review-item" }, [
        starsNode(r.stars),
        r.comment ? Utils.el("p", { class: "review-item__comment", text: r.comment }) : null,
        Utils.el("div", { class: "review-item__date", text: formatReviewDate(r.dateTime) })
      ].filter(Boolean)));
    });
  }

  function buildRatingSection(driver) {
    const summaryRow = Utils.el("div", { class: "reviews-summary" }, [
      starsNode(driver.finalRating),
      Utils.el("span", { class: "reviews-summary__value", text: (Number(driver.finalRating) || 0).toFixed(1) }),
      Utils.el("span", { class: "reviews-summary__count", text: Lang.t("driver.reviewCount", { n: driver.publicRatingCount || 0 }) })
    ]);

    const savedTopReviews = Api.peekPublicRatings(driver.driverId);
    const listContainer = Utils.el("div", { class: "reviews-list" }, [ViewHelpers.loadingBlock()]);
    if (savedTopReviews && savedTopReviews.length) renderReviewList(listContainer, savedTopReviews);
    const expandedContainer = Utils.el("div", { class: "reviews-list reviews-list--expanded" });
    expandedContainer.style.display = "none";

    const viewAllBtn = Utils.el("button", {
      type: "button", class: "btn btn--ghost btn--sm reviews-view-all-btn", text: Lang.t("driver.viewAllReviews")
    });
    const closeReviewsBtn = Utils.el("button", {
      type: "button", class: "btn btn--ghost btn--sm reviews-view-all-btn", text: Lang.t("driver.closeReviews")
    });
    closeReviewsBtn.style.display = "none";
    if ((driver.publicRatingCount || 0) <= 2) viewAllBtn.style.display = "none";

    const reviewBubble = Utils.el("span", { class: "review-bubble", text: Lang.t("detail.reviewBubble") });
    const reviewActionRow = Utils.el("div", { class: "reviews-action-row" }, [viewAllBtn, closeReviewsBtn, reviewBubble]);
    function syncReviewActionRow() {
      const anyBtn = viewAllBtn.style.display !== "none" || closeReviewsBtn.style.display !== "none";
      reviewActionRow.classList.toggle("is-solo", !anyBtn);
    }
    syncReviewActionRow();

    Api.getPublicRatings("driver", driver.driverId, false)
      .then((list) => renderReviewList(listContainer, list))
      .catch(() => { if (!(savedTopReviews && savedTopReviews.length)) renderReviewList(listContainer, []); });

    viewAllBtn.addEventListener("click", async () => {
      viewAllBtn.disabled = true;
      try {
        const all = await Api.getPublicRatings("driver", driver.driverId, true);
        renderReviewList(expandedContainer, all);
        listContainer.style.display = "none";
        expandedContainer.style.display = "";
        viewAllBtn.style.display = "none";
        closeReviewsBtn.style.display = "";
        syncReviewActionRow();
      } catch (err) {
        Toast.show(Lang.t("error.network"), "error");
      } finally {
        viewAllBtn.disabled = false;
      }
    });

    closeReviewsBtn.addEventListener("click", () => {
      expandedContainer.style.display = "none";
      expandedContainer.innerHTML = "";
      listContainer.style.display = "";
      closeReviewsBtn.style.display = "none";
      if ((driver.publicRatingCount || 0) > 2) viewAllBtn.style.display = "";
      syncReviewActionRow();
    });

    const starButtons = [];
    let selectedStars = 0;
    const starsRow = Utils.el("div", { class: "rate-stars", role: "radiogroup", "aria-label": Lang.t("detail.rateSectionTitle") });

    function select(n) {
      selectedStars = n;
      starButtons.forEach((btn, idx) => {
        const filled = idx < n;
        btn.classList.toggle("star--filled", filled);
        btn.classList.toggle("star--empty", !filled);
        btn.textContent = filled ? "★" : "☆";
        btn.setAttribute("aria-checked", idx === n - 1 ? "true" : "false");
      });
    }

    for (let i = 1; i <= 5; i++) {
      const btn = Utils.el("button", {
        type: "button", class: "star star--empty", role: "radio", "aria-checked": "false",
        "aria-label": Lang.t("driver.ratingAria", { n: i }), text: "☆",
        onClick: () => select(i)
      });
      starButtons.push(btn);
      starsRow.appendChild(btn);
    }

    const commentInput = Utils.el("textarea", {
      class: "rate-textarea", rows: "3",
      placeholder: Lang.t("driver.ratingCommentPlaceholder"),
      "aria-label": Lang.t("driver.ratingCommentPlaceholder")
    });

    const submitBtn = Utils.el("button", {
      class: "btn btn--primary btn--sm",
      text: Lang.t("driver.ratingSubmit"),
      onClick: async () => {
        if (!selectedStars) { Toast.show(Lang.t("driver.ratingSelectStars")); return; }
        submitBtn.disabled = true;
        try {
          await Api.submitPublicRating("driver", driver.driverId, selectedStars, commentInput.value);
          Toast.show(Lang.t("driver.ratingSubmitted"), "success");
          commentInput.value = "";
          select(0);
        } catch (err) {
          Toast.show(Lang.t("error.generic"), "error");
        } finally {
          submitBtn.disabled = false;
        }
      }
    });

    return Utils.el("div", { class: "rate-section" }, [
      Utils.el("h3", { class: "detail-section-title", text: Lang.t("detail.rateSectionTitle") }),
      summaryRow,
      listContainer,
      expandedContainer,
      reviewActionRow,
      starsRow,
      commentInput,
      Utils.el("div", { class: "rate-submit-row" }, [submitBtn])
    ]);
  }

  function homeifyDriverRoute() {
    const apply = () => {
      if (!/^#\/driver\//.test(window.location.hash)) return true;
      if (history.state && history.state.nobiModal) return false;
      history.replaceState(history.state, "", "#/");
      return true;
    };
    if (apply()) return;
    const onPop = () => {
      window.removeEventListener("popstate", onPop);
      setTimeout(apply, 0);
    };
    window.addEventListener("popstate", onPop);
    setTimeout(() => window.removeEventListener("popstate", onPop), 2000);
  }

  function openDriverDetail(driver, crumbTrail, returnTo, stackNew, fromRoute) {
    const ctx = { driver: driver, crumbTrail: crumbTrail, returnTo: returnTo || null, fromRoute: !!fromRoute };
    currentDetail = ctx;
    const children = [];
    if (crumbTrail && crumbTrail.length) {
      const crumbNode = ViewHelpers.breadcrumb(crumbTrail.concat([{ label: Utils.driverDisplayName(driver) }]));
      Utils.qsa("a", crumbNode).forEach((a) => a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = a.getAttribute("href");
        Modal.closeThen(() => { window.location.hash = target; });
      }));
      children.push(crumbNode);
    }

    const nameNode = Utils.el("h2", { class: "detail-name", text: Utils.driverDisplayName(driver) });
    const nameRowChildren = [nameNode];
    let detailShareBtn = null;
    if (Utils.clean(driver.driverId)) {
      detailShareBtn = ViewHelpers.shareButton(
        () => ViewHelpers.driverShareUrl(driver.driverId),
        () => Utils.driverDisplayName(driver)
      );
      nameRowChildren.push(ViewHelpers.shareAnchor(detailShareBtn));
    }
    nameRowChildren.push(Utils.el("button", { class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"), html: Icons.close, onClick: () => Modal.close() }));
    children.push(Utils.el("div", { class: "detail-name-row" }, nameRowChildren));

    children.push(driverPhotoNode(driver, "large"));
    children.push(statusNode(driver, true));

    children.push(Utils.el("h3", { class: "detail-section-title", text: Lang.t("detail.information") }));

    children.push(driver.doctor && driver.qualification
      ? twoColRow(
        Utils.qualificationLabel(), driver.qualification,
        Lang.t("detail.regNumber"), driver.vehicleNumber || "—"
      )
      : twoColRow(
        Lang.t("detail.serviceType"), formatMultiUpper(driver.vehicleType),
        Lang.t("detail.regNumber"), driver.vehicleNumber || "—"
      ));

    if (driver.serviceArea) {
      children.push(Utils.el("div", { class: "detail-row" }, [
        Utils.el("div", { class: "detail-col detail-col--full" }, [
          Utils.el("div", { class: "detail-col__label", text: Lang.t("driver.serviceArea") }),
          Utils.el("div", { class: "detail-col__value detail-col__value--truncate", title: driver.serviceArea, text: driver.serviceArea })
        ])
      ]));
    }

    const expRatingCols = [];
    if (driver.experience) {
      expRatingCols.push(Utils.el("div", { class: "detail-col" }, [
        Utils.el("div", { class: "detail-col__label", text: Lang.t("detail.experience") }),
        Utils.el("div", { class: "detail-col__value", text: Utils.formatExperience(driver.experience) })
      ]));
    }
    expRatingCols.push(Utils.el("div", { class: "detail-col" }, [
      Utils.el("div", { class: "detail-col__label", text: Lang.t("driver.rating") }),
      Utils.el("div", { class: "detail-col__value" }, [starsNode(driver.rating)])
    ]));
    children.push(Utils.el("div", { class: "detail-row" }, expRatingCols));

    function phoneLinkNode(number) {
      return Utils.el("a", { class: "detail-col__value detail-col__value--link detail-col__value--phone", href: "tel:" + Utils.normalizePhone(number) }, [
        Utils.el("span", { class: "detail-col__phone-icon", "aria-hidden": "true", html: Icons.phone }),
        document.createTextNode(number)
      ]);
    }

    const phoneCols = [
      Utils.el("div", { class: "detail-col" }, [
        Utils.el("div", { class: "detail-col__label", text: Lang.t("driver.phone") }),
        phoneLinkNode(driver.phone)
      ])
    ];
    if (driver.altPhone) {
      phoneCols.push(Utils.el("div", { class: "detail-col" }, [
        Utils.el("div", { class: "detail-col__label", text: Lang.t("driver.altPhone") }),
        phoneLinkNode(driver.altPhone)
      ]));
    }
    children.push(Utils.el("div", { class: "detail-row" }, phoneCols));

    const actionButtons = [
      Utils.el("button", {
        class: "btn btn--primary btn--sm action-row__btn",
        html: Icons.phone + "<span>" + Lang.t("detail.call") + "</span>",
        disabled: driver.availability !== "active" ? "true" : null,
        onClick: () => driver.availability === "active" && handleCall(driver)
      })
    ];
    if (driver.altPhone) {
      actionButtons.push(Utils.el("button", {
        class: "btn btn--ghost btn--sm action-row__btn",
        html: Icons.phone + "<span>" + Lang.t("driver.callAlternative") + "</span>",
        disabled: driver.availability !== "active" ? "true" : null,
        onClick: () => driver.availability === "active" && handleCall(Object.assign({}, driver, { phone: driver.altPhone }))
      }));
    }
    const whatsappNumber = Utils.resolveWhatsApp(driver);
    if (whatsappNumber) {
      actionButtons.push(Utils.el("a", {
        class: "whatsapp-btn", href: Utils.waLink(whatsappNumber), target: "_blank", rel: "noopener",
        "aria-label": Lang.t("driver.whatsapp"), html: Icons.whatsapp
      }));
    }
    children.push(Utils.el("div", { class: "action-row mt-5" }, actionButtons));

    const gallery = buildGallery(driver);
    if (gallery) {
      children.push(Utils.el("h3", { class: "detail-section-title mt-5", text: Lang.t("detail.photos") }));
      children.push(gallery);
    }

    const extraDefs = Utils.extraFieldDefs(Utils.splitMulti(driver.vehicleType));
    const extraRows = extraDefs
      .map((def, i) => {
        const value = Utils.clean(driver["extra" + (i + 1)]);
        const isDate = String(def.en || "").trim().toLowerCase() === "date" || Utils.isJsDateString(value);
        return [Utils.extraLabel(def), isDate ? Utils.formatDateTime(value) : value];
      })
      .filter((pair) => pair[1]);
    for (let i = 0; i < extraRows.length; i += 2) {
      const a = extraRows[i];
      const b = extraRows[i + 1] || ["", ""];
      children.push(twoColRow(a[0], a[1], b[0], b[1]));
    }

    if (Utils.clean(driver.personalDetails)) {
      children.push(Utils.el("div", { class: "personal-details-section mt-5" }, [
        Utils.el("h3", { class: "detail-section-title", text: Lang.t("detail.personalDetails") }),
        Utils.el("div", { class: "personal-details", html: Utils.safeHtml(driver.personalDetails) })
      ]));
    }

    children.push(buildRatingSection(driver));
    const socialSection = Utils.buildSocialLinksSection(driver.socialUrl);
    if (socialSection) children.push(socialSection);

    const videoSection = Utils.buildVideoSection(driver.videoUrl, Lang.t("detail.video"));
    if (videoSection) { videoSection.classList.add("mt-5"); children.push(videoSection); }

    children.push(Utils.buildFooterClone());

    openDriverModalWithHistory(Utils.el("div", {}, children), {
      stack: !!stackNew,
      onClose: () => {
        if (currentDetail === ctx) currentDetail = null;
        if (Modal.isReplacing || Modal.isLeaving) return;
        if (ctx.fromRoute) homeifyDriverRoute();
        if (ctx.returnTo) openDriverDetail(ctx.returnTo.driver, ctx.returnTo.crumbTrail, ctx.returnTo.returnTo, false, ctx.returnTo.fromRoute);
      }
    });
    if (detailShareBtn) {
      requestAnimationFrame(() => {
        if (nameNode.scrollWidth > nameNode.clientWidth + 1) detailShareBtn.classList.add("share-btn--tuck");
      });
    }
  }

  async function openDriverById(id) {
    let directory = Api.peekDriverDirectory();
    if (!directory) {
      try { directory = await Api.getDriverDirectory(); } catch (err) { directory = null; }
    }
    const wanted = String(id).trim().toLowerCase();
    const target = (directory || []).find((d) => String(d.driverId || "").trim().toLowerCase() === wanted);
    if (!target) { Toast.show(Lang.t("error.generic"), "error"); return; }
    openDriverDetail(target, [{ label: Lang.t("nav.home"), path: "/" }]);
  }

  async function openLinkedDetail(id, from) {
    let directory = Api.peekDriverDirectory();
    if (!directory) {
      try { directory = await Api.getDriverDirectory(); } catch (err) { directory = null; }
    }
    if (currentDetail !== from) return;
    const wanted = String(id).trim().toLowerCase();
    const target = (directory || []).find((d) => String(d.driverId || "").trim().toLowerCase() === wanted);
    if (!target) { Toast.show(Lang.t("error.generic"), "error"); return; }
    openDriverDetail(target, from.crumbTrail, from, true);
  }

  document.addEventListener("click", (e) => {
    const link = e.target && e.target.closest ? e.target.closest("a[data-internal]") : null;
    if (!link) return;
    const href = String(link.getAttribute("href") || "");
    const m = href.match(/^#\/driver\/([^\/?#]+)$/);
    if (!m) return;
    e.preventDefault();
    if (!currentDetail) { window.location.hash = href; return; }
    let id = m[1];
    try { id = decodeURIComponent(id); } catch (err) { }
    if (String(currentDetail.driver.driverId || "").trim().toLowerCase() === id.trim().toLowerCase()) return;
    openLinkedDetail(id, currentDetail);
  });

  const SELECTED_MARKET_KEY = "area.selectedMarket";

  function storedMarketSlug() {
    const v = Utils.storage.get(SELECTED_MARKET_KEY, null);
    return typeof v === "string" && v ? v : null;
  }

  function effectiveMarketSlug() {
    const markets = Api.peekMarkets();
    const known = (slug) => !markets || markets.some((m) => m.slug === slug);
    const stored = storedMarketSlug();
    if (stored && known(stored)) return stored;
    const def = Utils.clean((window.NOBI_CONFIG || {}).DEFAULT_MARKET_SLUG);
    if (def && known(def)) return def;
    return markets && markets.length ? markets[0].slug : null;
  }

  function inMarket(driver, marketSlug) {
    return !marketSlug || Utils.splitMulti(driver.marketSlug).includes(marketSlug);
  }

  const DOCTOR_CATEGORY_SLUG = "doctor";

  function homeGridSlugs() {
    const items = Array.isArray(window.HOME_CATEGORIES) ? window.HOME_CATEGORIES : [];
    return new Set(items.filter((i) => i && i.type === "other" && i.slug).map((i) => i.slug));
  }

  function isHiddenFromOther(slug) {
    return slug === DOCTOR_CATEGORY_SLUG || homeGridSlugs().has(slug);
  }

  function pickText(en, bn) {
    const a = Utils.clean(en);
    const b = Utils.clean(bn);
    return Lang.current() === "bn" ? (b || a) : (a || b);
  }

  let noticeRingObserver = null;

  function noticeRing(host) {
    if ("IntersectionObserver" in window) {
      if (!noticeRingObserver) {
        noticeRingObserver = new IntersectionObserver((entries) => {
          entries.forEach((e) => e.target.classList.toggle("is-ring-live", e.isIntersecting));
        }, { rootMargin: "60px" });
      }
      noticeRingObserver.observe(host);
    } else {
      host.classList.add("is-ring-live");
    }
    return Utils.el("span", { class: "notice-ring", "aria-hidden": "true" }, [Utils.el("i", { class: "notice-ring__spin" })]);
  }

  function homeNoticeCard(n, opts) {
    const withSpeaker = !!(opts && opts.speaker);
    const title = pickText(n.titleEn, n.titleBn);
    const text = pickText(n.textEn, n.textBn);
    const children = [];
    if (Utils.clean(n.date)) children.push(Utils.el("div", { class: "notice-card__date", text: Utils.clean(n.date) }));
    if (title) children.push(Utils.el("h3", { class: "notice-card__title", text: title }));
    if (text) children.push(Utils.el("p", { class: "notice-card__text", text: text }));
    const link = Utils.clean(n.link);
    const inAppHash = Utils.siteHashLink(link);
    const driverLink = inAppHash.match(/^#\/driver\/([^\/?#]+)$/);
    let linkEl = null;
    if (driverLink) {
      linkEl = Utils.el("a", {
        class: "btn btn--ghost btn--sm notice-card__link", href: inAppHash,
        text: Lang.t("home.noticeMore"),
        onClick: (e) => {
          e.preventDefault();
          let id = driverLink[1];
          try { id = decodeURIComponent(id); } catch (err) { }
          openDriverById(id);
        }
      });
    } else if (/^https?:\/\//i.test(link)) {
      linkEl = Utils.el("a", {
        class: "btn btn--ghost btn--sm notice-card__link", href: link, target: "_blank", rel: "noopener",
        text: Lang.t("home.noticeMore")
      });
    }
    if (withSpeaker) {
      const speakBtn = Utils.el("button", {
        type: "button", class: "speak-btn notice-card__speak",
        "aria-label": Lang.t("a11y.speak", { text: title || text }),
        onClick: (e) => {
          e.stopPropagation();
          const spoken = [pickText(n.titleEn, n.titleBn), pickText(n.textEn, n.textBn)].filter(Boolean).join(". ");
          if (spoken) Utils.speak(spoken, Lang.current());
        },
        html: Icons.speaker
      });
      children.push(Utils.el("div", { class: "notice-card__foot" }, [linkEl, speakBtn].filter(Boolean)));
    } else if (linkEl) {
      children.push(linkEl);
    }
    const card = Utils.el("article", { class: "notice-card" + (n.urgent ? " notice-card--urgent" : "") }, children);
    card.appendChild(noticeRing(card));
    const bgLink = Utils.clean(n.bgImage);
    const noticeNo = opts && typeof opts.index === "number" ? String(opts.index + 1).padStart(2, "0") : "";
    const localBg = noticeNo ? Utils.localFixtureUrl("homeNotice", noticeNo) : null;
    if (bgLink || localBg) {
      const probe = Utils.el("img", { alt: "", class: "notice-card__probe", "aria-hidden": "true" });
      card.appendChild(probe);
      Utils.wireImageFallback(probe, bgLink, () => {}, localBg, () => {
        card.style.backgroundImage = `linear-gradient(rgba(10, 30, 20, 0.55), rgba(10, 30, 20, 0.55)), url("${probe.src}")`;
        card.classList.add("notice-card--has-bg");
        probe.remove();
      });
    }
    return card;
  }

  function categoryNoticeNode(slug) {
    const all = window.CATEGORY_NOTICES;
    const raw = all && slug ? all[slug] : null;
    const list = (Array.isArray(raw) ? raw : []).filter((n) =>
      n && (Utils.clean(n.titleEn) || Utils.clean(n.titleBn) || Utils.clean(n.textEn) || Utils.clean(n.textBn)));
    if (!list.length) return null;
    const cards = list.map((n) => {
      const title = pickText(n.titleEn, n.titleBn);
      const text = pickText(n.textEn, n.textBn);
      const children = [];
      const date = Utils.clean(n.date);
      if (date || n.urgent) {
        const meta = [];
        if (date) meta.push(Utils.el("span", { class: "cat-notice__date", text: date }));
        if (n.urgent) meta.push(Utils.el("span", { class: "cat-notice__urgent", text: pickText("Urgent", "জরুরি") }));
        children.push(Utils.el("div", { class: "cat-notice__meta" }, meta));
      }
      if (title) children.push(Utils.el("h3", { class: "cat-notice__title", text: title }));
      if (text) children.push(Utils.el("p", { class: "cat-notice__text", text: text }));
      const link = Utils.clean(n.link);
      if (/^https?:\/\//i.test(link)) {
        children.push(Utils.el("a", {
          class: "btn btn--ghost btn--sm cat-notice__link", href: link, target: "_blank", rel: "noopener",
          text: Lang.t("home.noticeMore")
        }));
      }
      return Utils.el("article", { class: "cat-notice__item" + (n.urgent ? " cat-notice__item--urgent" : "") }, children);
    });
    return Utils.el("section", { class: "cat-notice", "aria-label": pickText("Notice", "নোটিশ") }, [
      Utils.el("div", { class: "cat-notice__head" }, [
        Utils.el("span", { class: "cat-notice__badge", "aria-hidden": "true", text: "📢" }),
        Utils.el("span", { class: "cat-notice__label", text: pickText("Notice", "নোটিশ") })
      ]),
      Utils.el("div", { class: "cat-notice__list" }, cards)
    ]);
  }

  function homeCategoryCard(item, info) {
    const name = pickText(item.en, item.bn);
    const soon = info.state === "soon";
    const go = () => {
      if (item.type === "drivers") {
        const slug = effectiveMarketSlug();
        Router.navigate(slug ? `/markets/${slug}` : "/markets");
      } else if (item.type === "doctor") Router.navigate("/doctor");
      else if (item.type === "emergency") Router.navigate("/emergency");
      else if (item.type === "otherAll") Router.navigate("/other");
      else if (item.type === "other" && item.slug) Router.navigate(`/other/${item.slug}`);
    };
    const props = {
      class: "chip-card chip-card--vehicle home-cat" + (soon ? " home-cat--soon" : ""),
      "aria-label": name
    };
    if (soon) {
      props["aria-disabled"] = "true";
    } else {
      props.role = "button";
      props.tabindex = "0";
      props.onClick = go;
      props.onKeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    }
    const topChildren = [
      Utils.el("div", { class: "chip-card__icon home-cat__icon", "aria-hidden": "true", text: item.icon || "•" })
    ];
    const localImgUrl = Utils.localFixtureUrl("homeCategory", item.id);
    if (localImgUrl) {
      const img = Utils.el("img", { alt: "", loading: "lazy" });
      const imgWrap = Utils.el("div", { class: "chip-card__image" }, [img]);
      Utils.wireImageFallback(img, "", () => imgWrap.remove(), localImgUrl);
      topChildren.push(imgWrap);
    }
    const children = [
      Utils.el("div", { class: "chip-card__top" }, topChildren),
      Utils.el("div", { class: "chip-card__name" }, [
        Utils.el("span", { class: "chip-card__name-text", text: name }),
        speakerButton(name)
      ])
    ];
    if (soon) {
      children.push(Utils.el("div", { class: "home-cat__soon", text: Lang.t("home.comingSoon") }));
    } else if (info.online !== null && info.online !== undefined) {
      children.push(Utils.el("div", { class: "chip-card__online" }, [
        Utils.el("span", { class: "online-dot", "aria-hidden": "true" }),
        Utils.el("span", { text: Lang.t("vehicle.onlineCount", { n: info.online }) })
      ]));
    }
    return Utils.el("div", props, children);
  }

  let lastKnownDirectory = null;

  async function renderHome(app) {
    app.innerHTML = "";

    if (window.Clock) app.appendChild(window.Clock.build());
    app.appendChild(buildBanner(homeBannerSlides()));

    const bazarZone = Utils.el("section", { class: "section section--flush-top container home-bazar" });
    const noticeZone = Utils.el("div", { class: "home-notice-zone" });
    const categoryZone = Utils.el("section", { class: "section container" });
    app.appendChild(bazarZone);
    app.appendChild(noticeZone);
    app.appendChild(categoryZone);
    appendHowItWorks(app);
    appendRegisterCta(app);
    const moreNoticeZone = Utils.el("div", { class: "home-notice-more-zone" });
    app.appendChild(moreNoticeZone);

    let markets = Api.peekMarkets() || null;
    let vehicles = Api.peekVehicleCategories() || null;
    let directory = Api.peekDriverDirectory() || null;
    if (directory) lastKnownDirectory = directory;
    let pickerOpen = false;

    function homeNotices() {
      return (Array.isArray(window.HOME_NOTICES) ? window.HOME_NOTICES : []).filter((n) =>
        n && (Utils.clean(n.titleEn) || Utils.clean(n.titleBn) || Utils.clean(n.textEn) || Utils.clean(n.textBn)));
    }

    function noticeSpeech(list) {
      return list.map((n) =>
        [pickText(n.titleEn, n.titleBn), pickText(n.textEn, n.textBn)].filter(Boolean).join(". ")
      ).filter(Boolean).join(". ");
    }

    function noticeHeadEl(list, noSpeaker) {
      const heading = Lang.t("home.noticeHeading");
      const head = Utils.el("div", { class: "home-bazar__notice-head" }, [
        Utils.el("span", { class: "home-bazar__notice-title", text: heading }),
        noSpeaker ? null : Utils.el("button", {
          type: "button", class: "speak-btn",
          "aria-label": Lang.t("a11y.speak", { text: heading }),
          onClick: (e) => { e.stopPropagation(); Utils.speak(noticeSpeech(list), Lang.current()); },
          html: Icons.speaker
        })
      ].filter(Boolean));
      head.appendChild(noticeRing(head));
      return head;
    }

    function noticeBarHead() {
      const list = homeNotices().slice(0, 1);
      return list.length ? noticeHeadEl(list) : null;
    }

    function chooseMarket(slug) {
      Utils.storage.set(SELECTED_MARKET_KEY, slug);
      pickerOpen = false;
      paintBazar();
      paintCategories();
    }

    function paintBazar() {
      bazarZone.innerHTML = "";
      if (!markets) {
        bazarZone.appendChild(ViewHelpers.loadingBlock(Lang.t("market.loading")));
        return;
      }
      const needsChoice = !storedMarketSlug();
      const showPicker = needsChoice || pickerOpen;
      const current = markets.find((m) => m.slug === effectiveMarketSlug());

      const noticeHead = noticeBarHead();
      if (!needsChoice && current) {
        bazarZone.appendChild(Utils.el("div", { class: "home-bazar__bar" + (noticeHead ? " home-bazar__bar--split" : "") }, [
          noticeHead,
          Utils.el("button", {
            type: "button", class: "home-bazar__current", "aria-expanded": String(showPicker),
            onClick: () => { pickerOpen = !pickerOpen; paintBazar(); paintCategories(); }
          }, [
            Utils.el("span", { class: "home-bazar__pin", "aria-hidden": "true", html: Icons.map }),
            Utils.el("span", { class: "home-bazar__label", text: Lang.t("home.yourBazar") }),
            Utils.el("strong", { class: "home-bazar__name", text: marketName(current) }),
            Utils.el("span", { class: "home-bazar__change", text: pickerOpen ? Lang.t("home.closeBazar") : Lang.t("home.changeBazar") })
          ])
        ].filter(Boolean)));
      } else if (noticeHead) {
        bazarZone.appendChild(Utils.el("div", { class: "home-bazar__bar home-bazar__bar--split" }, [noticeHead]));
      }

      if (showPicker) {
        const picker = Utils.el("div", { class: "home-bazar__picker" }, [
          marketSectionHead(() => paintBazar()),
          marketGrid(markets, (m) => chooseMarket(m.slug))
        ]);
        if (needsChoice) {
          picker.appendChild(Utils.el("div", { class: "home-bazar__skip" }, [
            Utils.el("button", {
              type: "button", class: "btn btn--ghost btn--compact", text: Lang.t("home.skipBazar"),
              onClick: () => { const def = effectiveMarketSlug(); if (def) chooseMarket(def); }
            })
          ]));
        }
        bazarZone.appendChild(picker);
      }
    }

    function paintNotices() {
      noticeZone.innerHTML = "";
      moreNoticeZone.innerHTML = "";
      const list = homeNotices();
      if (!list.length) return;
      noticeZone.appendChild(Utils.el("section", { class: "section section--flush-top container" }, [
        Utils.el("div", { class: "notice-list" }, [homeNoticeCard(list[0], { index: 0 })])
      ]));
      const rest = list.slice(1);
      if (!rest.length) return;
      moreNoticeZone.appendChild(Utils.el("section", { class: "section section--flush-top container home-notice-more" }, [
        Utils.el("div", { class: "home-notice-more__bar" }, [noticeHeadEl(rest, true)]),
        Utils.el("div", { class: "notice-list" }, rest.map((n, i) => homeNoticeCard(n, { speaker: true, index: i + 1 })))
      ]));
    }

    function categoryInfo(item) {
      const list = directory || lastKnownDirectory;
      if (!vehicles || !list) return { state: "pending", online: null };
      const mk = effectiveMarketSlug();
      const count = (match) => {
        let total = 0;
        let online = 0;
        list.forEach((d) => {
          if (!match(d)) return;
          total++;
          if (d.availability === "active") online++;
        });
        return { total, online };
      };
      const hasSlug = (d, slugs) => Utils.splitMulti(d.vehicleType).some((x) => slugs.has(x));
      let result;
      if (item.type === "drivers") {
        const slugs = new Set(vehicles.filter((v) => !v.isOther && v.slug !== DOCTOR_CATEGORY_SLUG).map((v) => v.slug));
        result = count((d) => inMarket(d, mk) && hasSlug(d, slugs));
      } else if (item.type === "doctor") {
        result = count((d) => d.doctor === true && inMarket(d, mk));
      } else if (item.type === "emergency") {
        result = count((d) => d.emergency === true && inMarket(d, mk));
      } else if (item.type === "other") {
        const known = vehicles.some((x) => x.slug === item.slug && x.isOther);
        const slugs = new Set([item.slug]);
        result = known ? count((d) => inMarket(d, mk) && hasSlug(d, slugs)) : { total: 0, online: 0 };
      } else if (item.type === "otherAll") {
        const slugs = new Set(vehicles.filter((v) => v.isOther && !isHiddenFromOther(v.slug)).map((v) => v.slug));
        result = count((d) => inMarket(d, mk) && hasSlug(d, slugs));
      } else {
        return { state: "ready", online: null };
      }
      return result.total ? { state: "ready", online: result.online } : { state: "soon", online: null };
    }

    function paintCategories() {
      categoryZone.innerHTML = "";
      if (pickerOpen) return;
      const items = Array.isArray(window.HOME_CATEGORIES) ? window.HOME_CATEGORIES : [];
      if (!items.length) return;
      const current = markets && markets.find((m) => m.slug === effectiveMarketSlug());
      const headChildren = [speakableHeading(Lang.t("home.categoryHeading"))];
      if (current) headChildren.push(Utils.el("p", { text: Lang.t("home.categorySub", { bazar: marketName(current) }) }));
      categoryZone.appendChild(Utils.el("div", { class: "section-head" }, headChildren));
      categoryZone.appendChild(Utils.el("div", { class: "chip-grid home-cat-grid" },
        items.map((item) => homeCategoryCard(item, categoryInfo(item)))));
    }

    paintBazar();
    paintNotices();
    paintCategories();

    if (!markets) {
      try {
        markets = await Api.getMarkets();
      } catch (err) {
        bazarZone.innerHTML = "";
        bazarZone.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderHome(app)));
        return;
      }
      paintBazar();
      paintCategories();
    }

    if (!vehicles || !directory) {
      try {
        const loaded = await Promise.all([Api.getVehicleCategories(), Api.getDriverDirectory()]);
        vehicles = loaded[0];
        directory = loaded[1];
        lastKnownDirectory = directory;
        paintCategories();
      } catch (err) {
      }
    }
  }

  function othersThumb(item, kind) {
    const isMarket = kind === "market";
    const tile = Utils.el("div", { class: "chip-collage__tile" }, [
      Utils.el("span", { class: "chip-collage__icon", html: isMarket ? Icons.map : Icons.vehicle(item.slug) })
    ]);
    const imgUrl = Utils.resolveImageUrl(item.imageUrl);
    const localImgUrl = Utils.localFixtureUrl(isMarket ? "market" : (item.isOther ? "category" : "vehicle"), item.slug);
    if (imgUrl || localImgUrl) {
      const img = Utils.el("img", { alt: "", loading: "lazy" });
      tile.appendChild(img);
      Utils.wireImageFallback(img, item.imageUrl, () => img.remove(), localImgUrl);
    }
    return tile;
  }

  function othersChip(onClick, hiddenItems, kind) {
    const hidden = hiddenItems || [];
    const showMore = hidden.length > 4;
    const tiles = hidden.slice(0, showMore ? 3 : 4).map((item) => othersThumb(item, kind));
    if (showMore) tiles.push(Utils.el("div", { class: "chip-collage__tile chip-collage__tile--more", text: "+" + (hidden.length - 3) }));
    const top = tiles.length
      ? Utils.el("div", { class: "chip-collage", "aria-hidden": "true" }, tiles)
      : Utils.el("div", { class: "chip-card__icon", html: Icons.more });
    return Utils.el("button", { class: "chip-card chip-card--others", onClick }, [
      top,
      Utils.el("div", { class: "chip-card__name", text: Lang.t("action.others") })
    ]);
  }

  const expandedChipGrids = {};

  function cappedChipGrid(items, buildChip, kind) {
    if (!items.length) return null;
    const gridKey = window.location.hash || "#/";
    let expanded = !!expandedChipGrids[gridKey];
    const container = Utils.el("div", { class: "chip-grid" });
    function paint() {
      container.innerHTML = "";
      const capped = items.length > 4 && !expanded;
      const visible = capped ? items.slice(0, 3) : items;
      visible.forEach((item) => container.appendChild(buildChip(item)));
      if (capped) container.appendChild(othersChip(() => { expanded = true; expandedChipGrids[gridKey] = true; paint(); }, items.slice(3), kind));
    }
    paint();
    return container;
  }

  const MARKET_ORDER_KEY = "nobi.marketOrder";

  function applyCustomMarketOrder(markets) {
    const order = Utils.storage.get(MARKET_ORDER_KEY, null);
    if (!order || !order.length) return markets;
    const rank = new Map(order.map((slug, i) => [slug, i]));
    return markets.slice().sort((a, b) => {
      const ra = rank.has(a.slug) ? rank.get(a.slug) : order.length;
      const rb = rank.has(b.slug) ? rank.get(b.slug) : order.length;
      return ra - rb;
    });
  }

  function marketSectionHead(onSaved) {
    const heading = speakableHeading(Lang.t("market.chooseHeading"));
    heading.appendChild(Utils.el("button", {
      type: "button", class: "icon-btn section-head__sort-btn",
      "aria-label": Lang.t("marketOrder.button"), title: Lang.t("marketOrder.button"),
      html: Icons.sort,
      onClick: () => openMarketOrderModal(onSaved)
    }));
    return Utils.el("div", { class: "section-head" }, [
      heading,
      Utils.el("p", { text: Lang.t("market.chooseSub") })
    ]);
  }

  function openMarketOrderModal(onSaved) {
    const markets = Api.peekMarkets();
    if (!markets || !markets.length) { Toast.show(Lang.t("market.loading")); return; }
    let order = applyCustomMarketOrder(markets).map((m) => m.slug);
    const listWrap = Utils.el("div", { class: "market-order-list" });

    function renderRows() {
      listWrap.innerHTML = "";
      order.forEach((slug, i) => {
        const m = markets.find((mm) => mm.slug === slug);
        if (!m) return;
        const upBtn = Utils.el("button", {
          type: "button", class: "icon-btn", "aria-label": Lang.t("marketOrder.moveUp"), html: Icons.chevronUp,
          onClick: () => { if (i === 0) return; [order[i - 1], order[i]] = [order[i], order[i - 1]]; renderRows(); }
        });
        const downBtn = Utils.el("button", {
          type: "button", class: "icon-btn", "aria-label": Lang.t("marketOrder.moveDown"), html: Icons.chevronDown,
          onClick: () => { if (i === order.length - 1) return; [order[i + 1], order[i]] = [order[i], order[i + 1]]; renderRows(); }
        });
        upBtn.disabled = i === 0;
        downBtn.disabled = i === order.length - 1;
        listWrap.appendChild(Utils.el("div", { class: "market-order-row" }, [
          Utils.el("span", { class: "market-order-row__name", text: marketName(m) }),
          Utils.el("div", { class: "market-order-row__btns" }, [upBtn, downBtn])
        ]));
      });
    }
    renderRows();

    const saveBtn = Utils.el("button", { type: "button", class: "btn btn--primary", text: Lang.t("marketOrder.save") });
    saveBtn.addEventListener("click", () => {
      Utils.storage.set(MARKET_ORDER_KEY, order);
      Modal.close();
      Toast.show(Lang.t("marketOrder.saved"), "success");
      if (onSaved) onSaved();
    });
    const resetBtn = Utils.el("button", { type: "button", class: "btn btn--ghost", text: Lang.t("marketOrder.reset") });
    resetBtn.addEventListener("click", () => {
      Utils.storage.remove(MARKET_ORDER_KEY);
      Modal.close();
      Toast.show(Lang.t("marketOrder.resetDone"));
      if (onSaved) onSaved();
    });

    Modal.open(Utils.el("div", {}, [
      Utils.el("div", { class: "modal-head" }, [
        Utils.el("h3", { text: Lang.t("marketOrder.title") }),
        Utils.el("button", { class: "icon-btn", "aria-label": Lang.t("a11y.closeModal"), html: Icons.close, onClick: () => Modal.close() })
      ]),
      Utils.el("p", { class: "market-order-hint", text: Lang.t("marketOrder.hint") }),
      listWrap,
      Utils.el("div", { class: "market-order-actions" }, [resetBtn, saveBtn])
    ]));
  }

  function applyMarketCardBackground(card, url, localUrl) {
    if (!url && !localUrl) return;
    const probe = Utils.el("img", { alt: "" });
    Utils.wireImageFallback(probe, url, () => {}, localUrl, () => {
      card.style.backgroundImage = `linear-gradient(rgba(10, 30, 20, 0.45), rgba(10, 30, 20, 0.45)), url("${probe.src}")`;
      card.classList.add("chip-card--market-has-bg");
    });
  }

  function marketGrid(markets, onSelect) {
    if (!markets.length) return ViewHelpers.emptyBlock({ message: Lang.t("market.empty") });
    markets = applyCustomMarketOrder(markets);
    return cappedChipGrid(markets, (m) => {
      const topChildren = [Utils.el("div", { class: "chip-card__icon", html: Icons.map })];
      const imgUrl = Utils.resolveImageUrl(m.imageUrl);
      const localImgUrl = Utils.localFixtureUrl("market", m.slug);
      if (imgUrl || localImgUrl) {
        const img = Utils.el("img", { alt: "", loading: "lazy" });
        const imgWrap = Utils.el("div", { class: "chip-card__image" }, [img]);
        Utils.wireImageFallback(img, m.imageUrl, () => imgWrap.remove(), localImgUrl);
        topChildren.push(imgWrap);
      }
      const name = marketName(m);
      const card = Utils.el("div", {
        class: "chip-card chip-card--vehicle chip-card--market",
        role: "button", tabindex: "0", "aria-label": name,
        onClick: () => onSelect(m),
        onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(m); } }
      }, [
        Utils.el("div", { class: "chip-card__top" }, topChildren),
        Utils.el("div", { class: "chip-card__name" }, [
          Utils.el("span", { class: "chip-card__name-text", text: name }),
          speakerButton(name)
        ])
      ]);
      applyMarketCardBackground(card, Utils.resolveImageUrl(m.bgImageUrl), Utils.localFixtureUrl("marketBg", m.slug));
      return card;
    }, "market");
  }

  function vehicleChip(v, onSelect, onlineCount) {
    const topChildren = [Utils.el("div", { class: "chip-card__icon", html: Icons.vehicle(v.slug) })];
    const imgUrl = Utils.resolveImageUrl(v.imageUrl);
    const localImgUrl = Utils.localFixtureUrl(v.isOther ? "category" : "vehicle", v.slug);
    if (imgUrl || localImgUrl) {
      const img = Utils.el("img", { alt: "", loading: "lazy" });
      const imgWrap = Utils.el("div", { class: "chip-card__image" }, [img]);
      Utils.wireImageFallback(img, v.imageUrl, () => imgWrap.remove(), localImgUrl);
      topChildren.push(imgWrap);
    }
    const count = onlineCount || 0;
    const name = vehicleName(v);
    return Utils.el("div", {
      class: "chip-card chip-card--vehicle",
      role: "button", tabindex: "0", "aria-label": name,
      onClick: () => onSelect(v),
      onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(v); } }
    }, [
      Utils.el("div", { class: "chip-card__top" }, topChildren),
      Utils.el("div", { class: "chip-card__name" }, [
        Utils.el("span", { class: "chip-card__name-text", text: name }),
        speakerButton(name)
      ]),
      Utils.el("div", { class: "chip-card__online" }, [
        Utils.el("span", { class: "online-dot", "aria-hidden": "true" }),
        Utils.el("span", { text: Lang.t("vehicle.onlineCount", { n: count }) })
      ])
    ]);
  }

  function vehicleGrid(vehicles, onSelect, onlineCounts) {
    if (!vehicles.length) return ViewHelpers.emptyBlock({ message: Lang.t("vehicle.empty") });
    return cappedChipGrid(vehicles, (v) => vehicleChip(v, onSelect, (onlineCounts && onlineCounts.get(v.slug)) || 0), "vehicle");
  }

  function categoriesWithDrivers(directory, marketSlug) {
    const set = new Set();
    directory.forEach((d) => {
      if (Utils.splitMulti(d.marketSlug).includes(marketSlug)) {
        Utils.splitMulti(d.vehicleType).forEach((slug) => set.add(slug));
      }
    });
    return set;
  }

  function onlineCountByCategory(directory, marketSlug) {
    const counts = new Map();
    directory.forEach((d) => {
      if (d.availability !== "active") return;
      if (!Utils.splitMulti(d.marketSlug).includes(marketSlug)) return;
      Utils.splitMulti(d.vehicleType).forEach((slug) => {
        counts.set(slug, (counts.get(slug) || 0) + 1);
      });
    });
    return counts;
  }

  function appendHowItWorks(app) {
    app.appendChild(Utils.el("section", { class: "section container" }, [
      Utils.el("div", { class: "section-head" }, [Utils.el("h2", { text: Lang.t("howItWorks.heading") })]),
      Utils.el("div", { class: "steps" }, [1, 2, 3].map((n) =>
        Utils.el("div", { class: "step-card step-card--" + n }, [
          Utils.el("div", { class: "step-card__num", text: String(n) }),
          Utils.el("h3", { text: Lang.t(`howItWorks.step${n}.title`) }),
          Utils.el("p", { text: Lang.t(`howItWorks.step${n}.text`) })
        ])
      ))
    ]));
  }

  function applyCtaBandBackground(el, path) {
    if (!path) return;
    el.style.backgroundImage = `linear-gradient(rgba(10, 30, 20, 0.55), rgba(10, 30, 20, 0.55)), url("${path}")`;
  }

  function appendRegisterCta(app) {
    const band = Utils.el("div", { class: "cta-band" }, [
      Utils.el("h2", { text: Lang.t("registerCta.heading") }),
      Utils.el("p", { text: Lang.t("registerCta.text") }),
      Utils.el("button", { class: "btn btn--accent", text: Lang.t("registerCta.button"), onClick: () => Router.navigate("/registration") })
    ]);
    applyCtaBandBackground(band, (window.NOBI_CONFIG.SECTION_BACKGROUNDS || {}).registration);
    app.appendChild(Utils.el("section", { class: "section container" }, [band]));
  }

  function appendOtherSection(app) {
    const band = Utils.el("div", { class: "cta-band cta-band--other" }, [
      Utils.el("h2", { text: Lang.t("other.sectionHeading") }),
      Utils.el("p", { text: Lang.t("other.sectionSub") }),
      Utils.el("button", { class: "btn btn--accent", text: Lang.t("other.sectionCta"), onClick: () => Router.navigate("/other") })
    ]);
    applyCtaBandBackground(band, (window.NOBI_CONFIG.SECTION_BACKGROUNDS || {}).other);
    app.appendChild(Utils.el("section", { class: "section container" }, [band]));
  }

  function appendDoctorSection(app) {
    const band = Utils.el("div", { class: "cta-band" }, [
      Utils.el("h2", { text: Lang.t("doctor.sectionHeading") }),
      Utils.el("p", { text: Lang.t("doctor.sectionSub") }),
      Utils.el("button", {
        class: "btn btn--accent", html: Icons.doctor + "<span>" + Lang.t("doctor.sectionCta") + "</span>",
        onClick: () => Router.navigate("/doctor")
      })
    ]);
    applyCtaBandBackground(band, (window.NOBI_CONFIG.SECTION_BACKGROUNDS || {}).doctor);
    app.appendChild(Utils.el("section", { class: "section container" }, [band]));
  }

  const BANNER_SLIDE_MS = 5000;

  const SOUND_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9.5v5h3.2L12 18.3V5.7L7.2 9.5H4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  function youTubeIdFromUrl(rawUrl) {
    const m = Utils.clean(rawUrl).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return m && m[1] ? m[1] : null;
  }

  function videoEmbedSrc(videoId) {
    const params = ["enablejsapi=1", "autoplay=1", "mute=1", "controls=0", "playsinline=1", "rel=0", "modestbranding=1", "fs=0", "disablekb=1", "iv_load_policy=3"];
    if (/^https?:$/.test(window.location.protocol)) params.push("origin=" + encodeURIComponent(window.location.origin));
    return "https://www.youtube.com/embed/" + videoId + "?" + params.join("&");
  }

  let youTubeApiPromise = null;
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (youTubeApiPromise) return youTubeApiPromise;
    youTubeApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === "function") previous();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => { youTubeApiPromise = null; reject(new Error("youtube-api")); };
      document.head.appendChild(script);
    });
    return youTubeApiPromise;
  }

  function globalBannerSrcs(slideNumber) {
    const g = (window.NOBI_CONFIG && window.NOBI_CONFIG.GLOBAL_BANNER_IMAGES) || {};
    const base = "assets/banner-images/global-banner-";
    if (slideNumber === 1) return [g.slide1 || base + "01.jpg"];
    if (slideNumber === 2) return [g.slide2Gif || base + "02.gif", g.slide2 || base + "02.jpg"];
    return [g.slide3 || base + "03.jpg"];
  }

  function homeBannerSlides() {
    const images = window.NOBI_CONFIG.BANNER_IMAGES || {};
    const videos = window.BANNER_VIDEOS || {};
    const slide2 = images.slide2 || "assets/banner-images/home-banner-02.jpg";
    return [
      { type: "dynamic", src: images.slide1 },
      { type: "image", srcs: [images.slide2Gif || slide2.replace(/\.[a-z0-9]+$/i, ".gif"), slide2].concat(globalBannerSrcs(2)), placeholder: true },
      { type: "video", videoUrl: videos.home03, fallback: images.slide3, fallbackMore: globalBannerSrcs(3), placeholder: true }
    ];
  }

  function categoryBannerSlides(configKey, slug, videoKey) {
    const images = window.NOBI_CONFIG[configKey] || {};
    const videos = window.BANNER_VIDEOS || {};
    const base = "assets/banner-images/category-" + slug + "-banner-";
    const slide2 = images.slide2 || base + "02.jpg";
    return [
      { type: "image", srcs: [Utils.localFixtureUrl("category", slug)].concat(globalBannerSrcs(1)), placeholder: false },
      { type: "image", srcs: [images.slide2Gif || slide2.replace(/\.[a-z0-9]+$/i, ".gif"), slide2].concat(globalBannerSrcs(2)), placeholder: false },
      { type: "video", videoUrl: videos[videoKey], fallback: images.slide3 || base + "03.jpg", fallbackMore: globalBannerSrcs(3), placeholder: false }
    ];
  }

  function emergencyBannerSlides() {
    return categoryBannerSlides("EMERGENCY_BANNER_IMAGES", "emergency", "emergency03");
  }

  function doctorBannerSlides() {
    return categoryBannerSlides("DOCTOR_BANNER_IMAGES", "doctor", "doctor03");
  }

  function sectionBannerSlides(configKey, prefix, videoKey) {
    const images = window.NOBI_CONFIG[configKey] || {};
    const videos = window.BANNER_VIDEOS || {};
    const slide2 = images.slide2 || "assets/banner-images/" + prefix + "-banner-02.jpg";
    return [
      { type: "image", srcs: [images.slide1 || "assets/banner-images/" + prefix + "-banner-01.jpg"].concat(globalBannerSrcs(1)), placeholder: false },
      { type: "image", srcs: [images.slide2Gif || slide2.replace(/\.[a-z0-9]+$/i, ".gif"), slide2].concat(globalBannerSrcs(2)), placeholder: false },
      { type: "video", videoUrl: videos[videoKey], fallback: images.slide3 || "assets/banner-images/" + prefix + "-banner-03.jpg", fallbackMore: globalBannerSrcs(3), placeholder: false }
    ];
  }

  function vehicleBannerSlides(slug, isOther) {
    const videos = (window.BANNER_VIDEOS && window.BANNER_VIDEOS.vehicle03) || {};
    const base = "assets/banner-images/" + (isOther ? "category-" : "vehicle-") + slug + "-banner-";
    return [
      { type: "image", srcs: [Utils.localFixtureUrl(isOther ? "category" : "vehicle", slug)].concat(globalBannerSrcs(1)), placeholder: false },
      { type: "image", srcs: [base + "02.gif", base + "02.jpg"].concat(globalBannerSrcs(2)), placeholder: false },
      { type: "video", videoUrl: videos[slug], fallback: base + "03.jpg", fallbackMore: globalBannerSrcs(3), placeholder: false }
    ];
  }

  function buildBanner(slideDefs, opts) {
    const emergency = !!(opts && opts.emergency);
    const realCount = slideDefs.length;
    const frameCount = realCount + 2;
    const stepPercent = 100 / frameCount;

    const slides = slideDefs.map((def) => buildSlide(def));

    const track = Utils.el("div", { class: "banner__track" });
    track.style.width = (frameCount * 100) + "%";
    track.appendChild(buildSlide(slideDefs[realCount - 1], { clone: true }).el);
    slides.forEach((s) => track.appendChild(s.el));
    track.appendChild(buildSlide(slideDefs[0], { clone: true }).el);
    Utils.qsa(".banner__slide", track).forEach((el) => { el.style.width = stepPercent + "%"; });

    const dots = slideDefs.map((_, i) =>
      Utils.el("button", { type: "button", class: "banner__dot" + (i === 0 ? " is-active" : ""), "aria-label": "Slide " + (i + 1) })
    );
    const dotsRow = Utils.el("div", { class: "banner__dots" }, dots);

    const viewport = Utils.el("div", { class: "banner__viewport" }, [track]);
    const root = emergency
      ? Utils.el("div", { class: "banner banner--emergency" }, [viewport, dotsRow])
      : Utils.el("div", { class: "banner" }, [Utils.el("div", { class: "container" }, [viewport, dotsRow])]);

    let real = 0;
    let frame = 1;
    let timerId = null;

    function paint(animate) {
      track.style.transition = animate ? "" : "none";
      track.style.transform = "translateX(-" + (frame * stepPercent) + "%)";
      dots.forEach((d, i) => d.classList.toggle("is-active", i === real));
      if (!animate) {
        void track.offsetHeight;
        track.style.transition = "";
      }
    }

    function onSlideEnded() {
      if (!document.body.contains(root)) return;
      step(1);
    }

    function activate(prev) {
      if (prev >= 0 && prev !== real && slides[prev].leave) slides[prev].leave();
      if (prev !== real && slides[real].enter) slides[real].enter(onSlideEnded);
      const upcoming = slides[(real + 1) % realCount];
      if (upcoming.preload) upcoming.preload();
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        if (!document.body.contains(root)) return;
        if (slides[real].isHolding && slides[real].isHolding()) return;
        step(1);
      }, BANNER_SLIDE_MS);
    }

    function goToIndex(i) {
      const prev = real;
      real = (i + realCount) % realCount;
      frame = real + 1;
      paint(true);
      activate(prev);
    }

    function step(delta) {
      if (frame === 0 || frame === frameCount - 1) { frame = real + 1; paint(false); }
      const prev = real;
      real = (real + delta + realCount) % realCount;
      frame += delta;
      paint(true);
      activate(prev);
    }

    track.addEventListener("transitionend", () => {
      if (frame === 0 || frame === frameCount - 1) { frame = real + 1; paint(false); }
    });

    dots.forEach((d, i) => d.addEventListener("click", () => goToIndex(i)));

    let touchStartX = null;
    viewport.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    viewport.addEventListener("touchend", (e) => {
      if (touchStartX == null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 30) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });

    paint(false);
    activate(-1);
    return root;
  }

  const bannerImageRetry = new Set();
  let bannerImageRetryBound = false;

  function runBannerImageRetry() {
    bannerImageRetry.forEach((fn) => { if (!fn()) bannerImageRetry.delete(fn); });
  }

  function bindBannerImageRetry() {
    if (bannerImageRetryBound) return;
    bannerImageRetryBound = true;
    window.addEventListener("online", runBannerImageRetry);
    window.addEventListener("pageshow", runBannerImageRetry);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") runBannerImageRetry();
    });
  }

  function attachImageChain(host, srcs, placeholder) {
    const list = (srcs || []).filter(Boolean);
    let failed = false;
    let timedTries = 0;

    function recheck() {
      if (!host.isConnected) return false;
      if (failed) { failed = false; build(); }
      return true;
    }

    function fail() {
      failed = true;
      host.innerHTML = "";
      if (placeholder) {
        host.classList.add("banner__slide--placeholder");
        host.innerHTML = Icons.map;
      } else {
        host.classList.add("banner__slide--blank");
      }
      if (timedTries < 3) {
        timedTries += 1;
        setTimeout(recheck, 5000 * timedTries);
      }
    }

    function build() {
      host.innerHTML = "";
      host.classList.remove("banner__slide--placeholder", "banner__slide--blank");
      let index = 0;
      const img = Utils.el("img", { alt: "", loading: "lazy" });
      img.addEventListener("error", () => {
        index += 1;
        if (index < list.length) img.src = list[index];
        else fail();
      });
      img.src = list[0];
      host.appendChild(img);
    }

    if (!list.length) { fail(); return; }
    build();
    bannerImageRetry.add(recheck);
    bindBannerImageRetry();
  }

  function buildSlide(def, opts) {
    const asClone = !!(opts && opts.clone);

    if (def.type === "dynamic") {
      const slide = Utils.el("div", { class: "banner__slide banner__slide--text" }, [
        Utils.el("div", { class: "banner__slide-text" }, [
          Utils.el("h2", { text: Lang.t("hero.heading") }),
          Utils.el("p", { class: "banner__slide-sub", text: Lang.t("hero.tagline") })
        ])
      ]);
      if (def.src) {
        const probe = new Image();
        probe.onload = () => {
          slide.style.backgroundImage = `linear-gradient(rgba(10, 30, 20, 0.45), rgba(10, 30, 20, 0.45)), url("${def.src}")`;
        };
        probe.src = def.src;
      }
      return { el: slide };
    }

    const slide = Utils.el("div", { class: "banner__slide" });

    if (def.type === "image") {
      attachImageChain(slide, def.srcs, def.placeholder);
      return { el: slide };
    }

    const fallbackHost = Utils.el("div", { class: "banner__fallback" });
    slide.appendChild(fallbackHost);
    attachImageChain(fallbackHost, [def.fallback].concat(def.fallbackMore || []), def.placeholder);

    const videoId = asClone ? null : youTubeIdFromUrl(def.videoUrl);
    if (!videoId) return { el: slide };

    const videoLayer = Utils.el("div", { class: "banner__video" });
    const shield = Utils.el("div", { class: "banner__shield" });
    const soundBtn = Utils.el("button", { type: "button", class: "banner__sound" });
    slide.appendChild(videoLayer);
    slide.appendChild(shield);
    slide.appendChild(soundBtn);

    let player = null;
    let frameEl = null;
    let ready = false;
    let pending = false;
    let frameToken = 0;
    let active = false;
    let playing = false;
    let onEnded = null;
    let safetyTimer = null;

    function refreshSound() {
      let muted = true;
      try { muted = !player || player.isMuted(); } catch (err) { muted = true; }
      soundBtn.innerHTML = muted ? SOUND_OFF_ICON : Icons.speaker;
      soundBtn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
    }

    function setPlaying(on) {
      playing = on;
      videoLayer.classList.toggle("is-playing", on);
      soundBtn.classList.toggle("is-visible", on);
    }

    function finish() {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      setPlaying(false);
      const cb = onEnded;
      if (active && cb) cb();
    }

    function armSafety() {
      if (safetyTimer) clearTimeout(safetyTimer);
      let seconds = 0;
      try { seconds = player.getDuration(); } catch (err) { seconds = 0; }
      safetyTimer = setTimeout(() => { if (active && playing) finish(); }, ((seconds > 0 ? seconds : 120) + 10) * 1000);
    }

    function teardown() {
      frameToken += 1;
      pending = false;
      ready = false;
      if (player) { try { player.destroy(); } catch (err) {} }
      player = null;
      frameEl = null;
      videoLayer.innerHTML = "";
    }

    function kick() {
      if (!player || !ready) return;
      try {
        player.mute();
        const wasPlaying = player.getPlayerState() === window.YT.PlayerState.PLAYING;
        player.seekTo(0, true);
        if (wasPlaying) {
          if (active && !playing) { setPlaying(true); armSafety(); }
        } else {
          player.playVideo();
        }
      } catch (err) {}
      refreshSound();
    }

    function buildFrame() {
      if (frameEl || pending) return;
      if (navigator.onLine === false) return;
      pending = true;
      const token = frameToken;
      loadYouTubeApi().then((YT) => {
        if (token !== frameToken) return;
        pending = false;
        if (!slide.isConnected) return;
        const iframe = document.createElement("iframe");
        iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("tabindex", "-1");
        iframe.setAttribute("aria-hidden", "true");
        iframe.setAttribute("title", "Banner video");
        iframe.src = videoEmbedSrc(videoId);
        videoLayer.appendChild(iframe);
        frameEl = iframe;
        player = new YT.Player(iframe, {
          events: {
            onReady: () => {
              ready = true;
              if (active) kick();
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                if (active && !playing) { setPlaying(true); armSafety(); refreshSound(); }
              } else if (e.data === YT.PlayerState.ENDED) {
                if (active) finish();
              }
            },
            onError: () => {
              if (active && playing) finish();
            }
          }
        });
      }).catch(() => { if (token === frameToken) pending = false; });
    }

    soundBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!player) return;
      try {
        if (player.isMuted()) {
          player.unMute();
          if (player.getPlayerState() !== window.YT.PlayerState.PLAYING) player.playVideo();
        } else {
          player.mute();
        }
      } catch (err) {}
      refreshSound();
    });

    refreshSound();

    return {
      el: slide,
      preload: buildFrame,
      enter: (cb) => {
        active = true;
        onEnded = cb;
        setPlaying(false);
        if (frameEl) kick();
        else buildFrame();
      },
      leave: () => {
        active = false;
        onEnded = null;
        if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
        setPlaying(false);
        teardown();
      },
      isHolding: () => playing
    };
  }

  async function renderMarkets(app) {
    app.innerHTML = "";
    const crumb = ViewHelpers.breadcrumb([
      { label: Lang.t("nav.home"), path: "/" },
      { label: Lang.t("nav.markets") }
    ]);

    const cachedMarkets = Api.peekMarkets();
    let section;
    const refreshMarketGrid = () => {
      const fresh = Api.peekMarkets();
      if (fresh && section) section.replaceChild(marketGrid(fresh, (m) => Router.navigate(`/markets/${m.slug}`)), section.lastChild);
    };
    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--standard" }, [
      buildBanner(sectionBannerSlides("MARKET_BANNER_IMAGES", "market", "market03"), { emergency: true }),
      crumb,
      marketSectionHead(refreshMarketGrid)
    ]);
    section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      cachedMarkets
        ? marketGrid(cachedMarkets, (m) => Router.navigate(`/markets/${m.slug}`))
        : ViewHelpers.loadingBlock(Lang.t("market.loading"))
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);

    if (cachedMarkets) return;
    try {
      const markets = await Api.getMarkets();
      section.replaceChild(marketGrid(markets, (m) => Router.navigate(`/markets/${m.slug}`)), section.lastChild);
    } catch (err) {
      section.replaceChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderMarkets(app)), section.lastChild);
    }
  }

  function driverListHead(headingText, subText) {
    const speaker = mutableSpeakerButton(headingText);
    const row = Utils.el("h2", { class: "section-head__title-row" }, [
      Utils.el("span", { "data-heading": "true", text: headingText }),
      speaker
    ]);
    row.__speaker = speaker;
    const head = Utils.el("div", { class: "section-head" }, [row, Utils.el("p", { text: subText })]);
    return head;
  }

  function setDriverListHeading(section, text) {
    const node = section.querySelector("[data-heading]");
    node.textContent = text;
    const speaker = node.parentNode && node.parentNode.__speaker;
    if (speaker) speaker.setSpokenText(text);
  }

  async function renderVehicles(app, params) {
    app.innerHTML = "";

    const cachedMarkets = Api.peekMarkets();
    const cachedVehicles = Api.peekVehicleCategories();
    const cachedDirectory = Api.peekDriverDirectory();

    function buildBody(market, vehicles, directory) {
      const availableSlugs = categoriesWithDrivers(directory, market.slug);
      const filtered = vehicles.filter((v) => !v.isOther && v.slug !== DOCTOR_CATEGORY_SLUG && availableSlugs.has(v.slug));
      const onlineCounts = onlineCountByCategory(directory, market.slug);
      return vehicleGrid(filtered, (v) => Router.navigate(`/markets/${market.slug}/${v.slug}`), onlineCounts);
    }

    const knownMarket = cachedMarkets && cachedMarkets.find((m) => m.slug === params.market);
    const allCachedReady = knownMarket && cachedVehicles && cachedDirectory;

    const crumb = ViewHelpers.breadcrumb([
      { label: Lang.t("nav.home"), path: "/" },
      { label: Lang.t("nav.markets"), path: "/markets" },
      { label: knownMarket ? marketName(knownMarket) : "…" }
    ]);

    const vehicleSpeaker = mutableSpeakerButton(knownMarket ? vehicleHeaderSpeech(marketName(knownMarket)) : "");
    const vehicleHeadingRow = Utils.el("h2", { class: "section-head__title-row" }, [
      Utils.el("span", { text: Lang.t("vehicle.chooseHeading") }),
      vehicleSpeaker
    ]);

    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--standard banner-zone--head-below" }, [
      buildBanner(categoryBannerSlides("DRIVERS_BANNER_IMAGES", "drivers", "drivers03"), { emergency: true }),
      crumb
    ]);
    const vehicleHead = Utils.el("div", { class: "section-head" }, [
      vehicleHeadingRow,
      Utils.el("p", { "data-market-sub": "true", text: knownMarket ? Lang.t("vehicle.chooseSub", { market: marketName(knownMarket) }) : "" })
    ]);
    const section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      vehicleHead,
      allCachedReady ? buildBody(knownMarket, cachedVehicles, cachedDirectory) : ViewHelpers.loadingBlock(Lang.t("vehicle.loading"))
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);

    if (allCachedReady) return;

    try {
      const [markets, vehicles, directory] = await Promise.all([Api.getMarkets(), Api.getVehicleCategories(), Api.getDriverDirectory()]);
      const market = markets.find((m) => m.slug === params.market);
      if (!market) { Router.navigate("/markets"); return; }

      const freshCrumb = ViewHelpers.breadcrumb([
        { label: Lang.t("nav.home"), path: "/" },
        { label: Lang.t("nav.markets"), path: "/markets" },
        { label: marketName(market) }
      ]);
      bannerZone.replaceChild(freshCrumb, crumb);
      section.querySelector("[data-market-sub]").textContent = Lang.t("vehicle.chooseSub", { market: marketName(market) });
      vehicleSpeaker.setSpokenText(vehicleHeaderSpeech(marketName(market)));
      section.replaceChild(buildBody(market, vehicles, directory), section.lastChild);
    } catch (err) {
      section.replaceChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderVehicles(app, params)), section.lastChild);
    }
  }

  async function renderDriverList(app, params) {
    app.innerHTML = "";

    const cachedMarkets = Api.peekMarkets();
    const cachedVehicles = Api.peekVehicleCategories();
    const knownMarket = cachedMarkets && cachedMarkets.find((m) => m.slug === params.market);
    const knownVehicle = cachedVehicles && cachedVehicles.find((v) => v.slug === params.vehicle);

    let crumbNode = null;
    function paintCrumb(market, vehicle) {
      const nextCrumb = ViewHelpers.breadcrumb([
        { label: Lang.t("nav.home"), path: "/" },
        { label: Lang.t("nav.markets"), path: "/markets" },
        { label: market ? marketName(market) : "…", path: market ? `/markets/${market.slug}` : null },
        { label: vehicle ? vehicleName(vehicle) : "…" }
      ]);
      if (crumbNode && crumbNode.parentNode) crumbNode.parentNode.replaceChild(nextCrumb, crumbNode);
      crumbNode = nextCrumb;
    }
    paintCrumb(knownMarket, knownVehicle);

    const searchInput = Utils.el("input", {
      type: "search", "data-i18n-placeholder": "search.placeholder",
      placeholder: Lang.t("search.placeholder"), "aria-label": Lang.t("search.heading")
    });
    const searchBar = Utils.el("div", { class: "search-bar" }, [
      Utils.el("span", { html: Icons.search }), searchInput
    ]);

    const availableOnlyToggle = Utils.el("input", { type: "checkbox", id: "avail-only" });
    const filterRow = Utils.el("div", { class: "filter-row" }, [
      Utils.el("span", { class: "result-count", "data-count": "true" }),
      Utils.el("label", { class: "toggle-pill", for: "avail-only" }, [availableOnlyToggle, Utils.el("span", { text: Lang.t("drivers.filterAvailableOnly") })])
    ]);

    const resultsWrap = Utils.el("div", {});
    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--standard banner-zone--search" }, [
      buildBanner(vehicleBannerSlides(params.vehicle), { emergency: true }),
      crumbNode,
      driverListHead(knownVehicle ? Lang.t("drivers.heading", { vehicle: vehicleName(knownVehicle) }) : "", Lang.t("drivers.sub"))
    ]);
    const section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      searchBar, filterRow, categoryNoticeNode(params.vehicle), resultsWrap
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);
    if (!Api.peekDriverDirectory()) {
      resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));
    }

    let markets, vehicles;
    try {
      [markets, vehicles] = await Promise.all([Api.getMarkets(), Api.getVehicleCategories()]);
    } catch (err) {
      resultsWrap.innerHTML = "";
      resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderDriverList(app, params)));
      return;
    }
    const market = markets.find((m) => m.slug === params.market);
    const vehicle = vehicles.find((v) => v.slug === params.vehicle);
    if (!market || !vehicle) { Router.navigate("/markets"); return; }

    paintCrumb(market, vehicle);
    const crumbTrail = [
      { label: Lang.t("nav.home"), path: "/" },
      { label: Lang.t("nav.markets"), path: "/markets" },
      { label: marketName(market), path: `/markets/${market.slug}` },
      { label: vehicleName(vehicle), path: `/markets/${market.slug}/${vehicle.slug}` }
    ];

    setDriverListHeading(section,
      Lang.t("drivers.heading", { vehicle: vehicleName(vehicle) }) + " " + Lang.t("drivers.subInMarket", { market: marketName(market) }));

    async function load(query) {
      const alreadyCached = !!Api.peekDriverDirectory();
      if (!alreadyCached) {
        resultsWrap.innerHTML = "";
        renderedCards.clear();
        resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));
      }
      try {
        let list = await Api.getDrivers(market.slug, vehicle.slug, query);
        if (availableOnlyToggle.checked) list = list.filter((d) => d.availability === "active");
        renderResults(list, query);
      } catch (err) {
        resultsWrap.innerHTML = "";
        renderedCards.clear();
        resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => load(query)));
      }
    }

    let renderedCards = new Map();

    function renderResults(list, query) {
      section.querySelector("[data-count]").textContent = Lang.t("drivers.count", { count: list.length });
      if (!list.length) {
        resultsWrap.innerHTML = "";
        renderedCards.clear();
        resultsWrap.appendChild(ViewHelpers.emptyBlock({
          message: query ? Lang.t("empty.noSearchResults") : Lang.t("empty.noDrivers"),
          sub: query ? undefined : Lang.t("empty.noDriversSub"),
          actionLabel: Lang.t("empty.backToVehicleTypes"),
          onAction: () => Router.navigate(`/markets/${market.slug}`)
        }));
        return;
      }
      let grid = resultsWrap.querySelector(".driver-grid");
      if (!grid) {
        resultsWrap.innerHTML = "";
        grid = Utils.el("div", { class: "driver-grid" });
        resultsWrap.appendChild(grid);
        renderedCards.clear();
      }
      const nextIds = new Set();
      list.forEach((d) => {
        const id = d.driverId;
        nextIds.add(id);
        const sig = JSON.stringify(d);
        const existing = renderedCards.get(id);
        let node;
        if (existing && existing.sig === sig) {
          node = existing.node;
        } else {
          node = driverCard(d, vehicleName(vehicle), crumbTrail);
          if (existing && existing.node.parentNode) existing.node.parentNode.removeChild(existing.node);
          renderedCards.set(id, { node, sig });
        }
        grid.appendChild(node);
      });
      renderedCards.forEach((entry, id) => {
        if (!nextIds.has(id)) {
          if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
          renderedCards.delete(id);
        }
      });
    }

    const debouncedSearch = Utils.debounce((q) => load(q), 250);
    searchInput.addEventListener("input", () => debouncedSearch(searchInput.value.trim()));
    availableOnlyToggle.addEventListener("change", () => load(searchInput.value.trim()));

    load("");
  }

  function buildOtherBody(vehicles, directory) {
    const withDrivers = new Set();
    const onlineCounts = new Map();
    const marketSlug = effectiveMarketSlug();
    directory.forEach((d) => {
      if (!inMarket(d, marketSlug)) return;
      Utils.splitMulti(d.vehicleType).forEach((slug) => {
        withDrivers.add(slug);
        if (d.availability === "active") onlineCounts.set(slug, (onlineCounts.get(slug) || 0) + 1);
      });
    });
    const filtered = vehicles.filter((v) => v.isOther && !isHiddenFromOther(v.slug) && withDrivers.has(v.slug));
    if (!filtered.length) return ViewHelpers.emptyBlock({ message: Lang.t("other.empty") });
    return vehicleGrid(filtered, (v) => Router.navigate(`/other/${v.slug}`), onlineCounts);
  }

  async function renderOtherCategories(app) {
    app.innerHTML = "";
    const cachedVehicles = Api.peekVehicleCategories();
    const cachedDirectory = Api.peekDriverDirectory();
    const ready = cachedVehicles && cachedDirectory;

    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--standard banner-zone--head-below" }, [
      buildBanner(categoryBannerSlides("OTHER_BANNER_IMAGES", "other", "other03"), { emergency: true }),
      ViewHelpers.breadcrumb([
        { label: Lang.t("nav.home"), path: "/" },
        { label: Lang.t("other.sectionHeading") }
      ])
    ]);
    const otherHead = Utils.el("div", { class: "section-head" }, [
      speakableHeading(Lang.t("other.sectionHeading")),
      Utils.el("p", { text: Lang.t("other.chooseSub") })
    ]);
    const section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      otherHead,
      ready ? buildOtherBody(cachedVehicles, cachedDirectory) : ViewHelpers.loadingBlock(Lang.t("vehicle.loading"))
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);

    if (ready) return;

    try {
      const [vehicles, directory] = await Promise.all([Api.getVehicleCategories(), Api.getDriverDirectory()]);
      section.replaceChild(buildOtherBody(vehicles, directory), section.lastChild);
    } catch (err) {
      section.replaceChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderOtherCategories(app)), section.lastChild);
    }
  }

  async function renderOtherDriverList(app, params) {
    app.innerHTML = "";

    const cachedVehicles = Api.peekVehicleCategories();
    const knownVehicle = cachedVehicles && cachedVehicles.find((v) => v.slug === params.vehicle);

    let crumbNode = null;
    function paintCrumb(vehicle) {
      const nextCrumb = ViewHelpers.breadcrumb([
        { label: Lang.t("nav.home"), path: "/" },
        { label: Lang.t("other.sectionHeading"), path: "/other" },
        { label: vehicle ? vehicleName(vehicle) : "…" }
      ]);
      if (crumbNode && crumbNode.parentNode) crumbNode.parentNode.replaceChild(nextCrumb, crumbNode);
      crumbNode = nextCrumb;
    }
    paintCrumb(knownVehicle);

    const searchInput = Utils.el("input", {
      type: "search", "data-i18n-placeholder": "search.placeholderOther",
      placeholder: Lang.t("search.placeholderOther"), "aria-label": Lang.t("search.heading")
    });
    const searchBar = Utils.el("div", { class: "search-bar" }, [
      Utils.el("span", { html: Icons.search }), searchInput
    ]);

    const availableOnlyToggle = Utils.el("input", { type: "checkbox", id: "avail-only" });
    const filterRow = Utils.el("div", { class: "filter-row" }, [
      Utils.el("span", { class: "result-count", "data-count": "true" }),
      Utils.el("label", { class: "toggle-pill", for: "avail-only" }, [availableOnlyToggle, Utils.el("span", { text: Lang.t("drivers.filterAvailableOnly") })])
    ]);

    const resultsWrap = Utils.el("div", {});
    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--standard banner-zone--search" }, [
      buildBanner(vehicleBannerSlides(params.vehicle, true), { emergency: true }),
      crumbNode,
      driverListHead(knownVehicle ? vehicleName(knownVehicle) : "", Lang.t("other.listSub"))
    ]);
    const section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      searchBar, filterRow, categoryNoticeNode(params.vehicle), resultsWrap
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);
    if (!Api.peekDriverDirectory()) {
      resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));
    }

    let vehicles;
    try {
      vehicles = await Api.getVehicleCategories();
    } catch (err) {
      resultsWrap.innerHTML = "";
      resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderOtherDriverList(app, params)));
      return;
    }
    const vehicle = vehicles.find((v) => v.slug === params.vehicle);
    if (!vehicle || !vehicle.isOther) { Router.navigate("/other"); return; }

    paintCrumb(vehicle);
    const crumbTrail = [
      { label: Lang.t("nav.home"), path: "/" },
      { label: Lang.t("other.sectionHeading"), path: "/other" },
      { label: vehicleName(vehicle), path: `/other/${vehicle.slug}` }
    ];

    setDriverListHeading(section, vehicleName(vehicle));

    async function load(query) {
      const alreadyCached = !!Api.peekDriverDirectory();
      if (!alreadyCached) {
        resultsWrap.innerHTML = "";
        renderedCards.clear();
        resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));
      }
      try {
        let list = await Api.getDrivers(effectiveMarketSlug(), vehicle.slug, query);
        if (availableOnlyToggle.checked) list = list.filter((d) => d.availability === "active");
        renderResults(list, query);
      } catch (err) {
        resultsWrap.innerHTML = "";
        renderedCards.clear();
        resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => load(query)));
      }
    }

    let renderedCards = new Map();

    function renderResults(list, query) {
      section.querySelector("[data-count]").textContent = Lang.t("profiles.count", { count: list.length });
      if (!list.length) {
        resultsWrap.innerHTML = "";
        renderedCards.clear();
        resultsWrap.appendChild(ViewHelpers.emptyBlock({
          message: query ? Lang.t("empty.noSearchResults") : Lang.t("empty.noDrivers"),
          sub: query ? undefined : Lang.t("empty.noDriversSub"),
          actionLabel: Lang.t("other.backToCategories"),
          onAction: () => Router.navigate("/other")
        }));
        return;
      }
      let grid = resultsWrap.querySelector(".driver-grid");
      if (!grid) {
        resultsWrap.innerHTML = "";
        grid = Utils.el("div", { class: "driver-grid" });
        resultsWrap.appendChild(grid);
        renderedCards.clear();
      }
      const nextIds = new Set();
      list.forEach((d) => {
        const id = d.driverId;
        nextIds.add(id);
        const sig = JSON.stringify(d);
        const existing = renderedCards.get(id);
        let node;
        if (existing && existing.sig === sig) {
          node = existing.node;
        } else {
          node = driverCard(d, vehicleName(vehicle), crumbTrail, "none");
          if (existing && existing.node.parentNode) existing.node.parentNode.removeChild(existing.node);
          renderedCards.set(id, { node, sig });
        }
        grid.appendChild(node);
      });
      renderedCards.forEach((entry, id) => {
        if (!nextIds.has(id)) {
          if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
          renderedCards.delete(id);
        }
      });
    }

    const debouncedSearch = Utils.debounce((q) => load(q), 250);
    searchInput.addEventListener("input", () => debouncedSearch(searchInput.value.trim()));
    availableOnlyToggle.addEventListener("change", () => load(searchInput.value.trim()));

    load("");
  }

  async function renderSearch(app) {
    app.innerHTML = "";
    const searchInput = Utils.el("input", {
      type: "search", "data-i18n-placeholder": "search.placeholderOther",
      placeholder: Lang.t("search.placeholderOther"), "aria-label": Lang.t("search.heading")
    });
    const resultsWrap = Utils.el("div", { class: "mt-5" });
    const section = Utils.el("section", { class: "section container" }, [
      Utils.el("div", { class: "section-head" }, [Utils.el("h2", { text: Lang.t("search.heading") })]),
      Utils.el("div", { class: "search-bar" }, [Utils.el("span", { html: Icons.search }), searchInput]),
      resultsWrap
    ]);
    app.appendChild(section);

    async function run(query) {
      if (!query) { resultsWrap.innerHTML = ""; return; }
      const alreadyCached = !!Api.peekDriverDirectory();
      resultsWrap.innerHTML = "";
      if (!alreadyCached) resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));
      try {
        let list = await Api.getDrivers(effectiveMarketSlug(), null, query);
        list = Search.filterLocal(list, query);
        resultsWrap.innerHTML = "";
        if (!list.length) {
          resultsWrap.appendChild(ViewHelpers.emptyBlock({ message: Lang.t("empty.noSearchResults") }));
          return;
        }
        resultsWrap.appendChild(Utils.el("p", { class: "result-count", text: Lang.t("search.resultsFor", { query }) }));
        resultsWrap.appendChild(Utils.el("div", { class: "driver-grid mt-5" }, list.map((d) => driverCard(d, null, null, "vehicleOnly"))));
      } catch (err) {
        resultsWrap.innerHTML = "";
        resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => run(query)));
      }
    }

    searchInput.addEventListener("input", Utils.debounce(() => run(searchInput.value.trim()), 300));
    searchInput.focus();
  }

  function holdSearchBarPosition(zone) {
    const head = zone.querySelector(".section-head");
    const host = zone.parentNode;
    if (!head || !host) return;
    const probe = head.cloneNode(true);
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;margin:0;padding:0;";
    host.insertBefore(probe, zone);
    let observer = null;
    function apply() {
      if (!zone.isConnected) {
        window.removeEventListener("resize", apply);
        if (observer) observer.disconnect();
        return;
      }
      probe.style.width = zone.clientWidth + "px";
      const extra = head.getBoundingClientRect().height - probe.getBoundingClientRect().height;
      const lift = extra > 0.5 ? Math.min(extra, 28) : 0;
      zone.style.marginTop = lift ? "-" + lift + "px" : "";
      zone.style.setProperty("--zone-lift", lift + "px");
    }
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(apply);
      observer.observe(head);
    }
    window.addEventListener("resize", apply);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
    apply();
  }

  async function renderEmergencyList(app) {
    app.innerHTML = "";

    const crumb = ViewHelpers.breadcrumb([
      { label: Lang.t("nav.home"), path: "/" },
      { label: Lang.t("emergency.heading") }
    ]);
    const searchInput = Utils.el("input", {
      type: "search", "data-i18n-placeholder": "search.placeholderOther",
      placeholder: Lang.t("search.placeholderOther"), "aria-label": Lang.t("search.heading")
    });
    const searchBar = Utils.el("div", { class: "search-bar" }, [
      Utils.el("span", { html: Icons.search }), searchInput
    ]);
    const availableOnlyToggle = Utils.el("input", { type: "checkbox", id: "avail-only" });
    const countNode = Utils.el("span", { class: "result-count" });
    const filterRow = Utils.el("div", { class: "filter-row" }, [
      countNode,
      Utils.el("label", { class: "toggle-pill", for: "avail-only" }, [availableOnlyToggle, Utils.el("span", { text: Lang.t("drivers.filterAvailableOnly") })])
    ]);
    const resultsWrap = Utils.el("div", {});
    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--search" }, [
      buildBanner(emergencyBannerSlides(), { emergency: true }),
      crumb,
      Utils.el("div", { class: "section-head" }, [
        speakableHeadingCustom(Lang.t("emergency.heading"), Lang.t("emergency.sub")),
        Utils.el("p", { text: Lang.t("emergency.sub") })
      ])
    ]);
    const section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      searchBar,
      filterRow,
      categoryNoticeNode("emergency"),
      resultsWrap
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);

    const alreadyCached = !!Api.peekDriverDirectory();
    if (!alreadyCached) resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));

    try {
      const marketSlug = effectiveMarketSlug();
      const list = (await Api.getEmergencyDrivers()).filter((d) => inMarket(d, marketSlug));
      resultsWrap.innerHTML = "";
      if (!list.length) {
        resultsWrap.appendChild(ViewHelpers.emptyBlock({ message: Lang.t("empty.noEmergency") }));
        return;
      }
      const crumbTrail = [
        { label: Lang.t("nav.home"), path: "/" },
        { label: Lang.t("emergency.heading"), path: "/emergency" }
      ];
      function paintList(query) {
        resultsWrap.innerHTML = "";
        let shown = Search.filterLocal(list, query);
        if (availableOnlyToggle.checked) shown = shown.filter((d) => d.availability === "active");
        countNode.textContent = Lang.t("profiles.count", { count: shown.length });
        if (!shown.length) {
          resultsWrap.appendChild(ViewHelpers.emptyBlock({ message: Lang.t("empty.noSearchResults") }));
          return;
        }
        resultsWrap.appendChild(Utils.el("div", { class: "driver-grid" }, shown.map((d) => driverCard(d, null, crumbTrail))));
      }
      paintList("");
      const debouncedFilter = Utils.debounce((q) => paintList(q), 250);
      searchInput.addEventListener("input", () => debouncedFilter(searchInput.value.trim()));
      availableOnlyToggle.addEventListener("change", () => paintList(searchInput.value.trim()));
    } catch (err) {
      resultsWrap.innerHTML = "";
      resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderEmergencyList(app)));
    }
  }

  async function renderDoctorList(app) {
    app.innerHTML = "";

    const crumb = ViewHelpers.breadcrumb([
      { label: Lang.t("nav.home"), path: "/" },
      { label: Lang.t("doctor.heading") }
    ]);
    const searchInput = Utils.el("input", {
      type: "search", "data-i18n-placeholder": "search.placeholderDoctor",
      placeholder: Lang.t("search.placeholderDoctor"), "aria-label": Lang.t("search.heading")
    });
    const searchBar = Utils.el("div", { class: "search-bar" }, [
      Utils.el("span", { html: Icons.search }), searchInput
    ]);
    const availableOnlyToggle = Utils.el("input", { type: "checkbox", id: "avail-only" });
    const countNode = Utils.el("span", { class: "result-count" });
    const filterRow = Utils.el("div", { class: "filter-row" }, [
      countNode,
      Utils.el("label", { class: "toggle-pill", for: "avail-only" }, [availableOnlyToggle, Utils.el("span", { text: Lang.t("drivers.filterAvailableOnly") })])
    ]);
    const resultsWrap = Utils.el("div", {});
    const bannerZone = Utils.el("div", { class: "banner-zone banner-zone--search" }, [
      buildBanner(doctorBannerSlides(), { emergency: true }),
      crumb,
      Utils.el("div", { class: "section-head" }, [
        speakableHeadingCustom(Lang.t("doctor.pageHeading"), Lang.t("doctor.sectionSub")),
        Utils.el("p", { text: Lang.t("doctor.sectionSub") })
      ])
    ]);
    const section = Utils.el("section", { class: "section container" }, [
      bannerZone,
      searchBar,
      filterRow,
      categoryNoticeNode("doctor"),
      resultsWrap
    ]);
    app.appendChild(section);
    holdSearchBarPosition(bannerZone);

    const alreadyCached = !!Api.peekDriverDirectory();
    if (!alreadyCached) resultsWrap.appendChild(ViewHelpers.loadingBlock(Lang.t("drivers.loading")));

    try {
      const marketSlug = effectiveMarketSlug();
      const list = (await Api.getDoctorDrivers()).filter((d) => inMarket(d, marketSlug));
      resultsWrap.innerHTML = "";
      if (!list.length) {
        resultsWrap.appendChild(ViewHelpers.emptyBlock({ message: Lang.t("empty.noDoctors") }));
        return;
      }
      const crumbTrail = [
        { label: Lang.t("nav.home"), path: "/" },
        { label: Lang.t("doctor.heading"), path: "/doctor" }
      ];
      function paintList(query) {
        resultsWrap.innerHTML = "";
        let shown = Search.filterLocal(list, query);
        if (availableOnlyToggle.checked) shown = shown.filter((d) => d.availability === "active");
        countNode.textContent = Lang.t("doctors.count", { count: shown.length });
        if (!shown.length) {
          resultsWrap.appendChild(ViewHelpers.emptyBlock({ message: Lang.t("empty.noDoctorSearchResults") }));
          return;
        }
        resultsWrap.appendChild(Utils.el("div", { class: "driver-grid" }, shown.map((d) => driverCard(d, null, crumbTrail, "doctor"))));
      }
      paintList("");
      const debouncedFilter = Utils.debounce((q) => paintList(q), 250);
      searchInput.addEventListener("input", () => debouncedFilter(searchInput.value.trim()));
      availableOnlyToggle.addEventListener("change", () => paintList(searchInput.value.trim()));
    } catch (err) {
      resultsWrap.innerHTML = "";
      resultsWrap.appendChild(ViewHelpers.errorBlock(Lang.t("error.network"), () => renderDoctorList(app)));
    }
  }

  function wireDriversNavLinks() {
    document.querySelectorAll('a[href="#/markets"]').forEach((link) => {
      if (link.dataset.driversNav) return;
      link.dataset.driversNav = "1";
      link.addEventListener("click", (e) => {
        const slug = storedMarketSlug();
        if (!slug) return;
        e.preventDefault();
        Router.navigate(`/markets/${slug}`);
      });
    });
  }
  wireDriversNavLinks();

  Router.register("/", renderHome);
  Router.register("/markets", renderMarkets, ["/"]);
  Router.register("/markets/:market", renderVehicles, ["/", "/markets"]);
  Router.register("/markets/:market/:vehicle", renderDriverList, ["/", "/markets", "/markets/:market"]);
  async function renderSharedProfile(app, params) {
    await renderHome(app);
    let directory = Api.peekDriverDirectory();
    if (!directory) {
      try { directory = await Api.getDriverDirectory(); } catch (err) { directory = null; }
    }
    const wanted = String(params.id || "").trim().toLowerCase();
    const driver = (directory || []).find((d) => String(d.driverId || "").trim().toLowerCase() === wanted);
    if (!driver) { homeifyDriverRoute(); return; }
    openDriverDetail(driver, [{ label: Lang.t("nav.home"), path: "/" }], null, false, true);
  }

  Router.register("/driver/:id", renderSharedProfile, []);
  Router.register("/search", renderSearch, ["/"]);
  Router.register("/emergency", renderEmergencyList, ["/"]);
  Router.register("/doctor", renderDoctorList, ["/"]);
  Router.register("/other", renderOtherCategories, ["/"]);
  Router.register("/other/:vehicle", renderOtherDriverList, ["/", "/other"]);
})(window, document, window.Utils, window.Lang, window.Icons, window.Api, window.Router, window.ViewHelpers, window.Modal, window.Toast, window.Search);
