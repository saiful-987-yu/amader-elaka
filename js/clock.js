(function (window, document, Utils) {
  "use strict";

  const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DIGITS_BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  const BANGLA_MONTHS = ["বৈশা", "জ্যৈ", "আষা", "শ্রাব", "ভাদ্র", "আশ্ব", "কার্তি", "অগ্র", "পৌষ", "মাঘ", "ফাল্গু", "চৈত্র"];
  const BANGLA_STARTS = [
    [0, 15, 9], [1, 14, 10], [2, 15, 11], [3, 14, 0], [4, 15, 1], [5, 15, 2],
    [6, 16, 3], [7, 16, 4], [8, 16, 5], [9, 17, 6], [10, 16, 7], [11, 16, 8]
  ];

  const HIJRI_MONTHS = ["মুহাররম", "সফর", "রবি-আউ", "রবি-সানি", "জমা-আউ", "জমা-সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toBanglaDigits(text) {
    return String(text).replace(/\d/g, (d) => DIGITS_BN[Number(d)]);
  }

  function paintSide(el, day, month, year) {
    el.textContent = "";
    [["clock-bar__num", toBanglaDigits(pad(day))], ["clock-bar__month", month], ["clock-bar__num", toBanglaDigits(year)]].forEach((part) => {
      el.appendChild(Utils.el("span", { class: part[0], text: part[1] }));
    });
  }

  function banglaDate(now) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    let start = null;
    for (let i = BANGLA_STARTS.length - 1; i >= 0; i--) {
      const s = BANGLA_STARTS[i];
      if (m > s[0] || (m === s[0] && d >= s[1])) { start = s; break; }
    }
    let startDate;
    if (start) {
      startDate = Date.UTC(y, start[0], start[1]);
    } else {
      start = BANGLA_STARTS[BANGLA_STARTS.length - 1];
      startDate = Date.UTC(y - 1, start[0], start[1]);
    }
    const day = Math.round((Date.UTC(y, m, d) - startDate) / 86400000) + 1;
    const year = (m > 3 || (m === 3 && d >= 14)) ? y - 593 : y - 594;
    return { day, month: start[2], year };
  }

  function hijriDate(now) {
    try {
      const shifted = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
      const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric" });
      const out = {};
      fmt.formatToParts(shifted).forEach((p) => { out[p.type] = p.value; });
      const day = parseInt(out.day, 10);
      const month = parseInt(out.month, 10);
      const year = parseInt(out.year, 10);
      if (!day || !month || !year) return null;
      return { day, month: month - 1, year };
    } catch (err) {
      return null;
    }
  }

  function build() {
    const bnEl = Utils.el("span", { class: "clock-bar__side clock-bar__side--start" });
    const dateEl = Utils.el("span", { class: "clock-bar__date" });
    const hmEl = Utils.el("span", { class: "clock-bar__hm" });
    const secEl = Utils.el("span", { class: "clock-bar__sec" });
    const hjEl = Utils.el("span", { class: "clock-bar__side clock-bar__side--end" });
    const bar = Utils.el("div", { class: "clock-bar", role: "timer", "aria-live": "off" }, [
      bnEl,
      Utils.el("span", { class: "clock-bar__center" }, [
        dateEl,
        Utils.el("span", { class: "clock-bar__time" }, [hmEl, secEl])
      ]),
      hjEl
    ]);
    const wrap = Utils.el("div", { class: "container clock-bar-wrap" }, [bar]);

    let seen = false;
    let ticks = 0;
    let lastDay = "";

    function paintDates(now) {
      dateEl.textContent = pad(now.getDate()) + "-" + MONTHS_EN[now.getMonth()] + "-" + pad(now.getFullYear() % 100);
      const b = banglaDate(now);
      paintSide(bnEl, b.day, BANGLA_MONTHS[b.month], b.year);
      const h = hijriDate(now);
      if (h) paintSide(hjEl, h.day, HIJRI_MONTHS[h.month], h.year);
      else hjEl.textContent = "";
    }

    function paint() {
      const now = new Date();
      const dayKey = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        paintDates(now);
      }
      hmEl.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
      secEl.textContent = ":" + pad(now.getSeconds());
    }

    function loop() {
      if (bar.isConnected) seen = true;
      else if (seen || ticks > 3) return;
      ticks++;
      paint();
      setTimeout(loop, 1000 - (Date.now() % 1000));
    }

    loop();
    return wrap;
  }

  window.Clock = { build };
})(window, document, window.Utils);
