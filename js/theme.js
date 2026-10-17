(function (window, Utils) {
  "use strict";

  const STORAGE_KEY = "nobi.theme";
  const Theme = {};

  let current = Utils.storage.get(STORAGE_KEY, null) ||
    (window.NOBI_CONFIG && window.NOBI_CONFIG.DEFAULT_THEME) || "light";
  if (current !== "light" && current !== "dark") current = "light";

  Theme.current = () => current;

  Theme.set = function (theme) {
    if (theme !== "light" && theme !== "dark") return;
    current = theme;
    document.documentElement.setAttribute("data-theme", theme);
    Utils.storage.set(STORAGE_KEY, theme);
    Utils.qsa("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    });
    document.dispatchEvent(new CustomEvent("nobi:themechange", { detail: { theme } }));
  };

  Theme.toggle = function () {
    Theme.set(current === "light" ? "dark" : "light");
  };

  document.documentElement.setAttribute("data-theme", current);

  window.Theme = Theme;
})(window, window.Utils);
