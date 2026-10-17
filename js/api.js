(function (window, Utils) {
  "use strict";

  const CONFIG = window.NOBI_CONFIG || {};
  const IS_DEMO = !CONFIG.API_BASE_URL;
  const TIMEOUT_MS = CONFIG.REQUEST_TIMEOUT_MS || 12000;
  const UPLOAD_TIMEOUT_MS = Math.max(TIMEOUT_MS, 60000);
  const CACHE_TTL = CONFIG.CACHE_TTL_MS || 5 * 60 * 1000;
  const STATUS_CACHE_TTL = CONFIG.STATUS_CACHE_TTL_MS || 60 * 1000;

  const cache = new Map();
  const PERSIST_PREFIX = "nobi.cache.v1.";

  function persistGet(key) {
    try {
      const raw = window.localStorage.getItem(PERSIST_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function persistSet(key, value) {
    try {
      window.localStorage.setItem(PERSIST_PREFIX + key, JSON.stringify({ value, time: Date.now() }));
    } catch (e) {
    }
  }

  function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  async function realCall(operation, payload) {
    const url = CONFIG.API_BASE_URL + "?op=" + encodeURIComponent(operation);
    const timeoutMs = operation === "uploadDriverPhoto" ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS;
    const response = await withTimeout(fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload || {})
    }), timeoutMs);
    if (!response.ok) throw new Error("HTTP_" + response.status);
    const data = await response.json();
    if (data && data.ok === false) {
      const err = new Error(data.errorCode || "API_ERROR");
      err.code = data.errorCode;
      throw err;
    }
    return data && data.result;
  }

  function cacheKey(op, payload) {
    return op + ":" + JSON.stringify(payload || {});
  }

  function cachedCall(op, payload, ttl) {
    const key = cacheKey(op, payload);
    const effectiveTtl = ttl != null ? ttl : CACHE_TTL;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < effectiveTtl) {
      return hit.promise;
    }

    const persistedRecord = (hit && hit.settled) ? null : persistGet(key);
    const staleValue = (hit && hit.settled) ? hit.value : (persistedRecord ? persistedRecord.value : undefined);
    const hasStale = staleValue !== undefined;

    const freshPromise = call(op, payload).then((value) => {
      persistSet(key, value);
      cache.set(key, { time: Date.now(), promise: Promise.resolve(value), settled: true, value });
      return value;
    }).catch((err) => {
      if (!hasStale) cache.delete(key);
      throw err;
    });

    if (hasStale) {
      const staleEntry = { time: Date.now(), promise: Promise.resolve(staleValue), settled: true, value: staleValue };
      cache.set(key, staleEntry);
      freshPromise.catch(() => {});
      return staleEntry.promise;
    }

    const entry = { time: Date.now(), promise: freshPromise, settled: false, value: undefined };
    cache.set(key, entry);
    return freshPromise;
  }

  function peek(op, payload, ttl) {
    const key = cacheKey(op, payload);
    const effectiveTtl = ttl != null ? ttl : CACHE_TTL;
    const hit = cache.get(key);
    if (hit && hit.settled && Date.now() - hit.time < effectiveTtl) return hit.value;
    const persisted = persistGet(key);
    return persisted ? persisted.value : undefined;
  }

  function clearPersisted(prefix) {
    try {
      Object.keys(window.localStorage).forEach((k) => {
        if (k.indexOf(PERSIST_PREFIX + prefix) === 0) window.localStorage.removeItem(k);
      });
    } catch (e) { }
  }

  function invalidateCache(prefix) {
    Array.from(cache.keys()).forEach((key) => {
      if (!prefix || key.startsWith(prefix)) cache.delete(key);
    });
  }

  const DemoStore = (function () {
    const KEYS = {
      markets: "nobi.demo.markets",
      vehicles: "nobi.demo.vehicles",
      drivers: "nobi.demo.drivers",
      pending: "nobi.demo.pending",
      session: "nobi.demo.session",
      ratings: "nobi.demo.ratings"
    };

    function seedIfEmpty() {
      if (!Utils.storage.get(KEYS.markets)) {
        Utils.storage.set(KEYS.markets, [
          { id: "M001", slug: "nobi-bazar", nameEn: "Nobi Bazar", nameBn: "নবী বাজার", imageUrl: "https://picsum.photos/seed/market-nobi/300/150", bgImageUrl: "https://picsum.photos/seed/market-nobi-bg/600/400", status: "active", sortOrder: 1 },
          { id: "M002", slug: "bangla-bazar", nameEn: "Bangla Bazar", nameBn: "বাংলা বাজার", imageUrl: "https://picsum.photos/seed/market-bangla/300/150", bgImageUrl: "", status: "active", sortOrder: 2 },
          { id: "M003", slug: "station-bazar", nameEn: "Station Bazar", nameBn: "স্টেশন বাজার", imageUrl: "", status: "active", sortOrder: 3 },
          { id: "M004", slug: "new-market", nameEn: "New Market", nameBn: "নিউ মার্কেট", imageUrl: "", status: "active", sortOrder: 4 },
          { id: "M005", slug: "central-bazar", nameEn: "Central Bazar", nameBn: "সেন্ট্রাল বাজার", imageUrl: "", status: "active", sortOrder: 5 }
        ]);
      }
      if (!Utils.storage.get(KEYS.vehicles)) {
        Utils.storage.set(KEYS.vehicles, [
          { id: "C001", slug: "cng", nameEn: "CNG", nameBn: "সিএনজি", icon: "cng", imageUrl: "https://picsum.photos/seed/cat-cng/300/150", status: "active", sortOrder: 1 },
          { id: "C002", slug: "auto", nameEn: "Auto", nameBn: "অটো", icon: "auto", imageUrl: "https://picsum.photos/seed/cat-auto/300/150", status: "active", sortOrder: 2 },
          { id: "C003", slug: "motorcycle", nameEn: "Motorcycle", nameBn: "মোটরসাইকেল", icon: "motorcycle", imageUrl: "", status: "active", sortOrder: 3 },
          { id: "C004", slug: "van", nameEn: "Van", nameBn: "ভ্যান", icon: "van", imageUrl: "https://picsum.photos/seed/cat-van/300/150", status: "active", sortOrder: 4 },
          { id: "C005", slug: "easy-bike", nameEn: "Easy Bike", nameBn: "ইজি বাইক", icon: "easy-bike", imageUrl: "", status: "active", sortOrder: 5 },
          { id: "C006", slug: "pickup", nameEn: "Pickup", nameBn: "পিকআপ", icon: "pickup", imageUrl: "", status: "active", sortOrder: 6 },
          { id: "C007", slug: "truck", nameEn: "Truck", nameBn: "ট্রাক", icon: "truck", imageUrl: "", status: "active", sortOrder: 7 },
          { id: "C008", slug: "tractor", nameEn: "Tractor", nameBn: "ট্রাক্টর", icon: "tractor", imageUrl: "", status: "active", sortOrder: 8 },
          { id: "C009", slug: "car", nameEn: "Car", nameBn: "কার", icon: "car", imageUrl: "", status: "active", sortOrder: 9 },
          { id: "C010", slug: "microbus", nameEn: "Microbus", nameBn: "মাইক্রোবাস", icon: "microbus", imageUrl: "", status: "active", sortOrder: 10 }
        ]);
      }
      if (!Utils.storage.get(KEYS.drivers)) {
        Utils.storage.set(KEYS.drivers, [
          { driverId: "D001", name: "Mohammad Karim", nameBn: "মোহাম্মদ করিম", emergencyContact: "TRUE", sortStatus: "2nd", phone: "01711000001", altPhone: "", vehicleType: "cng", vehicleNumber: "DHA-CNG-1123", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar & surrounding roads", experience: "6 years", rating: "4.2", whatsapp: "F", imageUrl: "", vehicleImageUrl: "", username: "karim.driver", password: "demo1234", status: "active", availability: "active", personalDetails: "<h3>About Karim</h3><p>Friendly and always on time. Speaks basic English.</p><ul><li>Non-smoker</li><li>Owns his own CNG</li></ul>", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", manualRating: 2 },
          { driverId: "D002", name: "Abdur Rahman", nameBn: "", emergencyContact: "FALSE", sortStatus: "1st", phone: "01711000002", altPhone: "01911000002", vehicleType: "cng", vehicleNumber: "DHA-CNG-2245", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar to Station Road", experience: "3 years", rating: "3.99", whatsapp: "A", imageUrl: "", vehicleImageUrl: "", username: "rahman.driver", password: "demo1234", status: "active", availability: "inactive" },
          { driverId: "D003", name: "Jamal Uddin", nameBn: "জামাল উদ্দিন", emergencyContact: "TRUE", phone: "01711000003", altPhone: "", vehicleType: "auto", vehicleNumber: "DHA-AUTO-0091", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar Market Area", experience: "8 years", rating: "5", whatsapp: "01800111222", imageUrl: "", vehicleImageUrl: "https://picsum.photos/seed/jamal-auto/600/450", username: "jamal.driver", password: "demo1234", status: "active", availability: "active" },
          { driverId: "D004", name: "Selina Begum", nameBn: "সেলিনা বেগম", emergencyContact: "TRUE", phone: "01711000004", altPhone: "", vehicleType: "van", vehicleNumber: "DHA-VAN-0456", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar & nearby villages", experience: "", rating: "", whatsapp: "N", imageUrl: "", vehicleImageUrl: "", username: "selina.driver", password: "demo1234", status: "active", availability: "active" },
          { driverId: "D005", name: "Farid Hossain", nameBn: "", emergencyContact: "", phone: "01711000005", altPhone: "", vehicleType: "auto", vehicleNumber: "DHA-AUTO-0154", marketSlug: "bangla-bazar", serviceArea: "", experience: "5 years", rating: "2", whatsapp: "", imageUrl: "", vehicleImageUrl: "", username: "farid.driver", password: "demo1234", status: "active", availability: "active" },
          { driverId: "D006", name: "Nurul Islam", nameBn: "নুরুল ইসলাম", emergencyContact: "FALSE", sortStatus: "3rd", phone: "01711000006", altPhone: "01911000006", vehicleType: "cng, auto", vehicleNumber: "DHA-MULTI-7788", marketSlug: "nobi-bazar, bangla-bazar", serviceArea: "Nobi Bazar, Bangla Bazar, Station Road", experience: "7 years", rating: "4", whatsapp: "F", imageUrl: "", vehicleImageUrl: "https://picsum.photos/seed/nurul-1/600/450, https://picsum.photos/seed/nurul-2/600/450, https://picsum.photos/seed/nurul-3/600/450", username: "nurul.driver", password: "demo1234", status: "active", availability: "active" },
          { driverId: "D007", name: "Kamal Hossain", nameBn: "কামাল হোসেন", emergencyContact: "TRUE", phone: "01711000007", altPhone: "", vehicleType: "motorcycle", vehicleNumber: "DHA-MOTO-2201", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar Bypass Road", experience: "4 years", rating: "4.5", whatsapp: "F", imageUrl: "", vehicleImageUrl: "", username: "kamal.driver", password: "demo1234", status: "active", availability: "active" },
          { driverId: "D008", name: "Anwar Sheikh", nameBn: "", emergencyContact: "", phone: "01711000008", altPhone: "", vehicleType: "easy-bike", vehicleNumber: "DHA-EASY-3390", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar Local Roads", experience: "2 years", rating: "3", whatsapp: "N", imageUrl: "", vehicleImageUrl: "", username: "anwar.driver", password: "demo1234", status: "active", availability: "active" },
          { driverId: "D009", name: "Dr. Rafiqul Islam", nameBn: "ডা. রফিকুল ইসলাম", doctorStatus: "TRUE", phone: "01611000001", altPhone: "01911000011", vehicleType: "MBBS, FCPS (Medicine)", vehicleNumber: "BMDC-A-45210", marketSlug: "nobi-bazar", serviceArea: "Nobi Bazar Health Complex", experience: "12 years", rating: "4.8", whatsapp: "F", imageUrl: "", vehicleImageUrl: "", username: "rafiqul.doctor", password: "demo1234", status: "active", availability: "active", personalDetails: "<h3>Chamber Hours</h3><p>Saturday–Thursday, 6 PM – 9 PM.</p>" },
          { driverId: "D010", name: "Dr. Farzana Yasmin", nameBn: "ডা. ফারজানা ইয়াসমিন", doctorStatus: "TRUE", phone: "01611000002", altPhone: "", vehicleType: "MBBS, MD (Gynecology)", vehicleNumber: "BMDC-A-51120", marketSlug: "bangla-bazar", serviceArea: "Bangla Bazar Chamber", experience: "8 years", rating: "4.5", whatsapp: "N", imageUrl: "", vehicleImageUrl: "", username: "farzana.doctor", password: "demo1234", status: "active", availability: "inactive" }
        ]);
      }
      if (!Utils.storage.get(KEYS.pending)) Utils.storage.set(KEYS.pending, []);
      if (!Utils.storage.get(KEYS.ratings)) {
        Utils.storage.set(KEYS.ratings, [
          { id: "R001", targetType: "driver", targetId: "D001", stars: 5, comment: "Very punctual and polite. Highly recommended!", dateTime: "2026-01-04T10:00:00.000Z", verified: true },
          { id: "R002", targetType: "driver", targetId: "D001", stars: 4, comment: "Good service, fair price.", dateTime: "2026-01-10T08:30:00.000Z", verified: true },
          { id: "R003", targetType: "driver", targetId: "D001", stars: 3, comment: "Was a bit late but drove safely.", dateTime: "2026-01-15T14:00:00.000Z", verified: false },
        ]);
      }
    }

    seedIfEmpty();

    return {
      keys: KEYS,
      markets: () => Utils.storage.get(KEYS.markets, []),
      vehicles: () => Utils.storage.get(KEYS.vehicles, []),
      drivers: () => Utils.storage.get(KEYS.drivers, []),
      pending: () => Utils.storage.get(KEYS.pending, []),
      ratings: () => Utils.storage.get(KEYS.ratings, []),
      saveDrivers: (list) => Utils.storage.set(KEYS.drivers, list),
      savePending: (list) => Utils.storage.set(KEYS.pending, list),
      saveRatings: (list) => Utils.storage.set(KEYS.ratings, list)
    };
  })();

  function matchesQuery(driver, query) {
    if (!query) return true;
    const q = String(query).trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const nameMatch = (driver.name || "").toLowerCase().includes(q);
    const phoneMatch = qDigits && (driver.phone || "").replace(/\D/g, "").includes(qDigits);
    return nameMatch || phoneMatch;
  }

  async function demoCall(operation, payload) {
    await new Promise((resolve) => setTimeout(resolve, 260));
    switch (operation) {
      case "getMarkets":
        return DemoStore.markets().filter((m) => m.status === "active").sort((a, b) => a.sortOrder - b.sortOrder);

      case "getVehicleCategories":
        return DemoStore.vehicles().filter((v) => v.status === "active").sort((a, b) => a.sortOrder - b.sortOrder);

      case "getDrivers": {
        const { marketSlug, vehicleSlug, query } = payload || {};
        let list = DemoStore.drivers().filter((d) => d.status === "active");
        if (marketSlug) list = list.filter((d) => Utils.splitMulti(d.marketSlug).includes(marketSlug));
        if (vehicleSlug) list = list.filter((d) => Utils.splitMulti(d.vehicleType).includes(vehicleSlug));
        if (query) list = list.filter((d) => matchesQuery(d, query));
        return list.map(publicDriverFields);
      }

      case "checkUsername": {
        const username = String(payload.username || "").trim().toLowerCase();
        if (!username) return { available: false };
        const taken = DemoStore.drivers().some((d) => (d.username || "").toLowerCase() === username) ||
          DemoStore.pending().some((p) => (p.username || "").toLowerCase() === username);
        return { available: !taken };
      }

      case "checkPhone": {
        const phoneDigits = Utils.phoneKey(payload.phone);
        if (!phoneDigits) return { available: false };
        const taken = DemoStore.drivers().some((d) => Utils.phoneKey(d.phone) === phoneDigits) ||
          DemoStore.pending().some((p) => Utils.phoneKey(p.phone) === phoneDigits);
        return { available: !taken };
      }

      case "registerDriver": {
        const drivers = DemoStore.drivers();
        const pending = DemoStore.pending();
        const phoneDigits = Utils.phoneKey(payload.phone);
        const dup = drivers.some((d) => Utils.phoneKey(d.phone) === phoneDigits) ||
          pending.some((p) => Utils.phoneKey(p.phone) === phoneDigits);
        if (dup) {
          const err = new Error("DUPLICATE_PHONE");
          err.code = "DUPLICATE_PHONE";
          throw err;
        }
        const usernameTaken = drivers.some((d) => d.username === payload.username) ||
          pending.some((p) => p.username === payload.username);
        if (usernameTaken) {
          const err = new Error("DUPLICATE_USERNAME");
          err.code = "DUPLICATE_USERNAME";
          throw err;
        }
        const applicationId = "APP-" + Utils.uid();
        pending.push(Object.assign({}, payload, {
          applicationId,
          applicationStatus: "pending",
          submittedDate: Utils.nowText()
        }));
        DemoStore.savePending(pending);
        return { applicationId };
      }

      case "uploadDriverPhoto": {
        const base64Data = String(payload.imageBase64 || "");
        const mimeType = String(payload.mimeType || "");
        if (!base64Data || ["image/jpeg", "image/png", "image/webp"].indexOf(mimeType) === -1) {
          const err = new Error("VALIDATION_FAILED"); err.code = "VALIDATION_FAILED"; throw err;
        }
        const byteLength = Math.floor((base64Data.length * 3) / 4);
        if (byteLength < 50 * 1024 || byteLength > 3 * 1024 * 1024) {
          const err = new Error("VALIDATION_FAILED"); err.code = "VALIDATION_FAILED"; throw err;
        }
        return { url: "data:" + mimeType + ";base64," + base64Data };
      }

      case "login": {
        const drivers = DemoStore.drivers();
        const pending = DemoStore.pending();
        const idInput = (payload.identifier || "").trim().toLowerCase();
        const isPending = pending.some((p) =>
          (p.username || "").toLowerCase() === idInput ||
          (p.phone || "").replace(/\D/g, "") === idInput.replace(/\D/g, ""));
        const driver = drivers.find((d) =>
          (d.username || "").toLowerCase() === idInput ||
          (d.phone || "").replace(/\D/g, "") === idInput.replace(/\D/g, ""));
        if (driver && driver.password === payload.password) {
          const token = "demo-token-" + Utils.uid();
          Utils.storage.set(demoSessionKey(token), { driverId: driver.driverId });
          return { token, driver: driverProfileFields(driver) };
        }
        if (isPending) {
          const err = new Error("PENDING_APPROVAL");
          err.code = "PENDING_APPROVAL";
          throw err;
        }
        const err = new Error("INVALID_CREDENTIALS");
        err.code = "INVALID_CREDENTIALS";
        throw err;
      }

      case "getProfile": {
        const session = getDemoSession(payload.token);
        if (!session) throw sessionError();
        const driver = DemoStore.drivers().find((d) => d.driverId === session.driverId);
        if (!driver) throw sessionError();
        return driverProfileFields(driver);
      }

      case "updateAvailability": {
        const session = getDemoSession(payload.token);
        if (!session) throw sessionError();
        const drivers = DemoStore.drivers();
        const idx = drivers.findIndex((d) => d.driverId === session.driverId);
        if (idx === -1) throw sessionError();
        drivers[idx].availability = payload.availability === "active" ? "active" : "inactive";
        DemoStore.saveDrivers(drivers);
        return driverProfileFields(drivers[idx]);
      }

      case "updateProfile": {
        const session = getDemoSession(payload.token);
        if (!session) throw sessionError();
        const drivers = DemoStore.drivers();
        const idx = drivers.findIndex((d) => d.driverId === session.driverId);
        if (idx === -1) throw sessionError();
        const d = drivers[idx];
        const fieldMap = { nameBn: "nameBn", guardianName: "guardianName", altPhone: "altPhone", whatsapp: "whatsapp", serviceArea: "serviceArea", vehicleNumber: "vehicleNumber", qualification: "qualification", extra1: "extra1", extra2: "extra2", extra3: "extra3", extra4: "extra4" };
        let changed = false;
        Object.keys(fieldMap).forEach((key) => {
          if (payload[key] !== undefined) { d[fieldMap[key]] = String(payload[key] || "").trim(); changed = true; }
        });
        if (!changed) { const err = new Error("VALIDATION_FAILED"); err.code = "VALIDATION_FAILED"; throw err; }
        DemoStore.saveDrivers(drivers);
        return driverProfileFields(d);
      }

      case "changePassword": {
        const session = getDemoSession(payload.token);
        if (!session) throw sessionError();
        const drivers = DemoStore.drivers();
        const idx = drivers.findIndex((d) => d.driverId === session.driverId);
        if (idx === -1) throw sessionError();
        if (String(drivers[idx].password || "") !== String(payload.oldPassword || "")) {
          const err = new Error("INVALID_CREDENTIALS"); err.code = "INVALID_CREDENTIALS"; throw err;
        }
        if (!payload.newPassword || String(payload.newPassword).length < 6) {
          const err = new Error("VALIDATION_FAILED"); err.code = "VALIDATION_FAILED"; throw err;
        }
        drivers[idx].password = payload.newPassword;
        DemoStore.saveDrivers(drivers);
        return { ok: true };
      }

      case "getPublicRatings": {
        const targetType = "driver";
        const targetId = String(payload.targetId || "").trim();
        if (!targetId) return [];
        const list = DemoStore.ratings()
          .filter((r) => r.targetType === targetType && r.targetId === targetId && r.verified === true)
          .sort((a, b) => Utils.parseDateMs(b.dateTime) - Utils.parseDateMs(a.dateTime))
          .map((r) => ({ stars: r.stars, comment: r.comment || "", dateTime: r.dateTime }));
        return payload.all ? list : list.slice(0, 2);
      }

      case "submitPublicRating": {
        const targetType = "driver";
        const targetId = String(payload.targetId || "").trim();
        const stars = Math.round(Number(payload.stars));
        if (!targetId || !stars || stars < 1 || stars > 5) {
          const err = new Error("VALIDATION_FAILED"); err.code = "VALIDATION_FAILED"; throw err;
        }
        const exists = DemoStore.drivers().some((t) => t.driverId === targetId && t.status === "active");
        if (!exists) {
          const err = new Error("VALIDATION_FAILED"); err.code = "VALIDATION_FAILED"; throw err;
        }
        const ratings = DemoStore.ratings();
        ratings.push({
          id: Utils.uid(), targetType, targetId, stars,
          comment: String(payload.comment || "").trim().slice(0, 1000),
          dateTime: Utils.nowText(), verified: false
        });
        DemoStore.saveRatings(ratings);
        return { ok: true };
      }

      default:
        throw new Error("UNKNOWN_OPERATION");
    }
  }

  function demoSessionKey(token) {
    return "nobi.demo.session." + token;
  }
  function getDemoSession(token) {
    if (!token) return null;
    return Utils.storage.get(demoSessionKey(token), null);
  }
  function sessionError() {
    const err = new Error("SESSION_EXPIRED");
    err.code = "SESSION_EXPIRED";
    return err;
  }

  function verifiedRatingSummary(targetType, targetId) {
    const verified = DemoStore.ratings().filter((r) => r.targetType === targetType && r.targetId === targetId && r.verified === true);
    const count = verified.length;
    const avg = count ? verified.reduce((sum, r) => sum + (Number(r.stars) || 0), 0) / count : 0;
    return { avg: Math.round(avg * 10) / 10, count };
  }

  function publicDriverFields(d) {
    const summary = verifiedRatingSummary("driver", d.driverId);
    const manualRating = Number(d.manualRating) || 0;
    return {
      driverId: d.driverId,
      name: d.name,
      nameBn: d.nameBn || "",
      phone: d.phone,
      altPhone: d.altPhone || "",
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber,
      marketSlug: d.marketSlug,
      serviceArea: d.serviceArea,
      experience: d.experience,
      rating: d.rating || "",
      whatsapp: d.whatsapp || "",
      imageUrl: d.imageUrl || "",
      vehicleImageUrl: d.vehicleImageUrl || "",
      availability: d.availability,
      emergency: String(d.emergencyContact || "").trim().toUpperCase() === "TRUE",
      doctor: String(d.doctorStatus || "").trim().toUpperCase() === "TRUE" || Utils.splitMulti(d.vehicleType).includes("doctor"),
      qualification: d.qualification || "",
      extra1: d.extra1 || "",
      extra2: d.extra2 || "",
      extra3: d.extra3 || "",
      extra4: d.extra4 || "",
      sortStatus: d.sortStatus || "",
      personalDetails: d.personalDetails || "",
      videoUrl: d.videoUrl || "",
      socialUrl: d.socialUrl || "",
      publicRating: summary.avg,
      publicRatingCount: summary.count,
      finalRating: Math.min(summary.avg + manualRating, 5)
    };
  }

  function driverProfileFields(d) {
    if (!d) return null;
    return Object.assign(publicDriverFields(d), {
      accountStatus: d.status,
      username: d.username,
      guardianName: d.guardianName || ""
    });
  }

  async function call(operation, payload) {
    return IS_DEMO ? demoCall(operation, payload) : realCall(operation, payload);
  }

  function sortDrivers(list) {
    return list.slice().sort((a, b) => {
      const aActive = a.availability === "active" ? 0 : 1;
      const bActive = b.availability === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  function sortBySortStatusThenRating(list) {
    const rank = { "1st": 0, "2nd": 1, "3rd": 2, "4th": 3, "5th": 4, "6th": 5, "7th": 6, "8th": 7, "9th": 8, "10th": 9 };
    return list.slice().sort((a, b) => {
      const aActive = a.availability === "active" ? 0 : 1;
      const bActive = b.availability === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const ra = rank[String(a.sortStatus || "").trim().toLowerCase()];
      const rb = rank[String(b.sortStatus || "").trim().toLowerCase()];
      const ranka = ra != null ? ra : 10;
      const rankb = rb != null ? rb : 10;
      if (ranka !== rankb) return ranka - rankb;
      const ratingA = parseFloat(a.rating) || 0;
      const ratingB = parseFloat(b.rating) || 0;
      return ratingB - ratingA;
    });
  }

  const Api = { isDemo: IS_DEMO };

  Api.getMarkets = () => cachedCall("getMarkets", {});
  Api.getVehicleCategories = () => cachedCall("getVehicleCategories", {});

  Api.getDriverDirectory = () => cachedCall("getDrivers", {}, STATUS_CACHE_TTL);

  Api.getDrivers = async (marketSlug, vehicleSlug, query) => {
    let list = await Api.getDriverDirectory();
    if (marketSlug) list = list.filter((d) => Utils.splitMulti(d.marketSlug).includes(marketSlug));
    if (vehicleSlug) list = list.filter((d) => Utils.splitMulti(d.vehicleType).includes(vehicleSlug));
    if (query) list = list.filter((d) => matchesQuery(d, query));
    return sortBySortStatusThenRating(list);
  };

  Api.getEmergencyDrivers = async () => {
    const list = await Api.getDriverDirectory();
    return sortBySortStatusThenRating(list.filter((d) => d.emergency === true));
  };

  Api.getDoctorDrivers = async () => {
    const list = await Api.getDriverDirectory();
    return sortBySortStatusThenRating(list.filter((d) => d.doctor === true));
  };

  Api.peekMarkets = () => peek("getMarkets", {});
  Api.peekVehicleCategories = () => peek("getVehicleCategories", {});
  Api.peekDriverDirectory = () => peek("getDrivers", {}, STATUS_CACHE_TTL);

  Api.preload = function () {
    return Api.getMarkets().then((markets) => {
      Api.getVehicleCategories().catch(() => {});
      Api.getDriverDirectory().catch(() => {});
      return markets;
    });
  };

  Api.uploadDriverPhoto = (imageBase64, mimeType) => call("uploadDriverPhoto", { imageBase64, mimeType });

  Api.registerDriver = (formData) => call("registerDriver", formData)
    .then((res) => {
      invalidateCache("getDrivers");
      return res;
    });

  Api.checkUsername = (username) => call("checkUsername", { username });

  Api.checkPhone = (phone) => call("checkPhone", { phone });

  Api.login = (identifier, password) => call("login", { identifier, password });
  Api.getProfile = (token) => cachedCall("getProfile", { token }, STATUS_CACHE_TTL);
  Api.peekProfile = (token) => peek("getProfile", { token }, STATUS_CACHE_TTL);

  Api.updateAvailability = (token, availability) =>
    call("updateAvailability", { token, availability }).then((res) => {
      invalidateCache("getDrivers");
      invalidateCache("getProfile");
      return res;
    });

  Api.updateProfile = (token, fields) =>
    call("updateProfile", Object.assign({ token }, fields)).then((res) => {
      invalidateCache("getDrivers");
      invalidateCache("getProfile");
      return res;
    });

  Api.changePassword = (token, oldPassword, newPassword) =>
    call("changePassword", { token, oldPassword, newPassword });

  const REVIEWS_KEY_PREFIX = "reviews:";
  const REVIEWS_INDEX_KEY = "reviews.index";
  const REVIEWS_KEEP_MAX = 60;

  function saveTopReviews(targetId, list) {
    persistSet(REVIEWS_KEY_PREFIX + targetId, Array.isArray(list) ? list.slice(0, 2) : []);
    const record = persistGet(REVIEWS_INDEX_KEY);
    const index = (record && Array.isArray(record.value) ? record.value : []).filter((id) => id !== targetId);
    index.push(targetId);
    while (index.length > REVIEWS_KEEP_MAX) {
      const oldest = index.shift();
      try { window.localStorage.removeItem(PERSIST_PREFIX + REVIEWS_KEY_PREFIX + oldest); } catch (e) { }
    }
    persistSet(REVIEWS_INDEX_KEY, index);
  }

  Api.peekPublicRatings = (targetId) => {
    const record = persistGet(REVIEWS_KEY_PREFIX + targetId);
    return record && Array.isArray(record.value) ? record.value : undefined;
  };

  Api.getPublicRatings = (targetType, targetId, all) => {
    const request = call("getPublicRatings", { targetType, targetId, all: !!all });
    if (all) return request;
    return request.then((list) => {
      saveTopReviews(targetId, list);
      return list;
    }).catch((err) => {
      const saved = Api.peekPublicRatings(targetId);
      if (saved !== undefined) return saved;
      throw err;
    });
  };

  Api.submitPublicRating = (targetType, targetId, stars, comment) =>
    call("submitPublicRating", { targetType, targetId, stars, comment });

  Api.refreshDirectories = function () {
    ["getDrivers", "getProfile"].forEach((prefix) => {
      invalidateCache(prefix);
      clearPersisted(prefix);
    });
  };
  Api.clearProfileCache = function () {
    invalidateCache("getProfile");
    clearPersisted("getProfile");
  };
  Api.adminEnableMode = (token, password) => call("adminEnableMode", { token, password });
  Api.adminAdjustMode = (token, adminToken, deltaMinutes) => call("adminAdjustMode", { token, adminToken, deltaMinutes });
  Api.adminModeStatus = (token, adminToken) => call("adminModeStatus", { token, adminToken });
  Api.adminDisableMode = (token, adminToken) => call("adminDisableMode", { token, adminToken });
  Api.adminListPending = (token, adminToken) => call("adminListPending", { token, adminToken });
  Api.adminGetRecord = (token, adminToken, kind, id) => call("adminGetRecord", { token, adminToken, kind, id });
  Api.adminSaveRecord = (token, adminToken, kind, id, fields) =>
    call("adminSaveRecord", { token, adminToken, kind, id, fields }).then((res) => {
      Api.refreshDirectories();
      return res;
    });
  Api.adminCreateRecord = (token, adminToken, fields) =>
    call("adminCreateRecord", { token, adminToken, fields }).then((res) => {
      Api.refreshDirectories();
      return res;
    });
  Api.adminApprovePending = (token, adminToken, id) =>
    call("adminApprovePending", { token, adminToken, id }).then((res) => {
      Api.refreshDirectories();
      return res;
    });
  Api.adminListPendingRatings = (token, adminToken) => call("adminListPendingRatings", { token, adminToken });
  Api.adminApproveRating = (token, adminToken, id, targetId) =>
    call("adminApproveRating", { token, adminToken, id, targetId }).then((res) => {
      Api.refreshDirectories();
      return res;
    });
  Api.adminPendingCounts = (token, adminToken) => call("adminPendingCounts", { token, adminToken });

  window.Api = Api;
})(window, window.Utils);
