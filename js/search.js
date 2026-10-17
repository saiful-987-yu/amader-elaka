(function (window, Utils) {
  "use strict";

  const Search = {};

  Search.matches = function (driver, query) {
    if (!query) return true;
    const q = Utils.clean(query).toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const nameMatch = (driver.name || "").toLowerCase().includes(q);
    const phoneMatch = qDigits && (driver.phone || "").replace(/\D/g, "").includes(qDigits);
    return nameMatch || phoneMatch;
  };

  Search.filterLocal = function (list, query) {
    if (!query) return list;
    return list.filter((driver) => Search.matches(driver, query));
  };

  window.Search = Search;
})(window, window.Utils);
