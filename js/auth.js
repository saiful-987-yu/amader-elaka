(function (window, Utils, Api) {
  "use strict";

  const TOKEN_KEY = "nobi.session.token";
  const FAV_KEY = "nobi.favorites";
  const FAV_DIRTY_KEY = "nobi.favorites.dirty";
  const FAV_PUSH_DELAY_MS = 700;
  const Auth = {};
  const Favorites = {};
  let favPushTimer = null;

  function favKey(id) { return String(id == null ? "" : id).trim().toLowerCase(); }

  function favNormalize(raw) {
    const parts = Array.isArray(raw) ? raw : String(raw == null ? "" : raw).split(/[,\n]+/);
    const seen = {};
    const out = [];
    parts.forEach((p) => {
      const id = String(p == null ? "" : p).trim();
      const k = favKey(id);
      if (!k || seen[k]) return;
      seen[k] = true;
      out.push(id);
    });
    return out;
  }

  function favSame(a, b) {
    return a.length === b.length && a.every((id, i) => favKey(id) === favKey(b[i]));
  }

  function favStore(list) {
    Utils.storage.set(FAV_KEY, list);
    document.dispatchEvent(new CustomEvent("nobi:favoriteschange"));
  }

  Favorites.list = () => favNormalize(Utils.storage.get(FAV_KEY, []));

  Favorites.has = (id) => {
    const k = favKey(id);
    return !!k && Favorites.list().some((x) => favKey(x) === k);
  };

  Favorites.toggle = function (id) {
    const k = favKey(id);
    if (!k) return false;
    const list = Favorites.list();
    const index = list.findIndex((x) => favKey(x) === k);
    if (index >= 0) list.splice(index, 1);
    else list.push(String(id).trim());
    favStore(list);
    favSchedulePush();
    return index < 0;
  };

  async function favPush(list, token) {
    try {
      await Api.saveFavorites(token, list);
      if (favSame(Favorites.list(), list)) Utils.storage.remove(FAV_DIRTY_KEY);
    } catch (err) { }
  }

  function favSchedulePush() {
    if (!Auth.isLoggedIn()) return;
    Utils.storage.set(FAV_DIRTY_KEY, true);
    if (favPushTimer) clearTimeout(favPushTimer);
    favPushTimer = setTimeout(() => {
      favPushTimer = null;
      const token = Auth.getToken();
      if (token) favPush(Favorites.list(), token);
    }, FAV_PUSH_DELAY_MS);
  }

  Favorites.sync = async function (mode) {
    const token = Auth.getToken();
    if (!token) return;
    let res;
    try { res = await Api.getFavorites(token); } catch (err) { return; }
    if (Auth.getToken() !== token) return;
    const raw = res && !Array.isArray(res) && typeof res === "object" ? res.favorites : res;
    if (raw === undefined || raw === null) return;
    const server = favNormalize(raw);
    const local = Favorites.list();
    let merged = server;
    if (mode === "login" || Utils.storage.get(FAV_DIRTY_KEY, false)) {
      const seen = {};
      server.forEach((id) => { seen[favKey(id)] = true; });
      merged = server.concat(local.filter((id) => !seen[favKey(id)]));
    }
    if (!favSame(merged, local)) favStore(merged);
    if (!favSame(merged, server)) await favPush(merged, token);
    else Utils.storage.remove(FAV_DIRTY_KEY);
  };

  Favorites.onLogout = function (token) {
    if (favPushTimer) { clearTimeout(favPushTimer); favPushTimer = null; }
    if (token && Utils.storage.get(FAV_DIRTY_KEY, false)) favPush(Favorites.list(), token);
    Utils.storage.remove(FAV_DIRTY_KEY);
    if (Favorites.list().length) favStore([]);
  };

  window.Favorites = Favorites;

  Auth.getToken = () => Utils.storage.get(TOKEN_KEY, null);

  Auth.isLoggedIn = () => !!Auth.getToken();

  Auth.login = async function (identifier, password) {
    const result = await Api.login(Utils.clean(identifier), password);
    Utils.storage.set(TOKEN_KEY, result.token);
    document.dispatchEvent(new CustomEvent("nobi:authchange", { detail: { loggedIn: true } }));
    Favorites.sync("login");
    return result.driver;
  };

  Auth.logout = function () {
    Favorites.onLogout(Auth.getToken());
    if (Api && Api.clearProfileCache) Api.clearProfileCache();
    Utils.storage.remove(TOKEN_KEY);
    document.dispatchEvent(new CustomEvent("nobi:authchange", { detail: { loggedIn: false } }));
  };

  Auth.getProfile = async function () {
    const token = Auth.getToken();
    if (!token) return null;
    try {
      return await Api.getProfile(token);
    } catch (err) {
      if (err.code === "SESSION_EXPIRED") {
        Auth.logout();
      }
      throw err;
    }
  };

  Auth.peekProfile = function () {
    const token = Auth.getToken();
    return token ? Api.peekProfile(token) : undefined;
  };

  Auth.updateAvailability = async function (availability) {
    const token = Auth.getToken();
    if (!token) throw new Error("SESSION_EXPIRED");
    return Api.updateAvailability(token, availability);
  };

  Auth.updateProfile = async function (fields) {
    const token = Auth.getToken();
    if (!token) throw new Error("SESSION_EXPIRED");
    return Api.updateProfile(token, fields);
  };

  Auth.changePassword = async function (oldPassword, newPassword) {
    const token = Auth.getToken();
    if (!token) throw new Error("SESSION_EXPIRED");
    return Api.changePassword(token, oldPassword, newPassword);
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (Auth.isLoggedIn()) Favorites.sync("start");
  });

  window.Auth = Auth;
})(window, window.Utils, window.Api);
