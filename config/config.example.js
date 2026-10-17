/**
 * ============================================================
 * AMADER ELAKA — PUBLIC CONFIGURATION
 * ============================================================
 *
 * HOW TO USE:
 *   1. Copy this file and rename the copy to "config.js"
 *      (keep it in this same /config folder).
 *   2. Fill in the values below.
 *   3. index.html already loads /config/config.js — do not
 *      rename the file to anything else, and do not delete
 *      this example file (it is documentation).
 *
 * IMPORTANT — WHAT NEVER GOES IN THIS FILE:-
 *   - Google service-account private keys
 *   - Google API secrets
 *   - Any password or credential
 *   This file is served to every visitor's browser, so only
 *   PUBLIC information belongs here. The Google Apps Script
 *   Web App URL below is safe to publish: it is a public
 *   endpoint by design, the same way a normal API endpoint
 *   URL is public. The actual spreadsheet access happens
 *   inside your Google Apps Script project, under your
 *   Google account, not in this file.
 * ============================================================
 */

window.NOBI_CONFIG = {

  // --------------------------------------------------------
  // GOOGLE APPS SCRIPT WEB APP URL  ◄── CHANGE THIS VALUE
  // --------------------------------------------------------
  // Deploy the script in /google-apps-script/Code.gs as a
  // Web App (Deploy → New deployment → Web app → Execute as:
  // Me → Who has access: Anyone), then paste the resulting
  // URL here. It looks like:
  // "https://script.google.com/macros/s/XXXXXXXXXXXX/exec"
  //
  // Leave this as null to run the site in DEMO MODE with
  // built-in sample data (no Google Sheet required). This is
  // useful for local testing before you connect a real sheet.
  API_BASE_URL: null,

  // --------------------------------------------------------
  // PROFILE PHOTO — GOOGLE FORM (Registration Step 3, "Photo Upload")
  // --------------------------------------------------------
  // URL is the existing Google Form used for the direct photo-upload
  // option. Google Forms' "file upload" question type always requires
  // the respondent to sign in with a Google account and can never be
  // embedded in an iframe or auto-submitted from JavaScript (this is a
  // hard restriction on Google's side, not something this site can
  // work around) — so the form itself has to open in its own browser
  // tab for the actual upload step. To at least skip re-typing the
  // Mobile Number there, set MOBILE_ENTRY_ID to that field's prefill
  // entry ID and the number the driver already typed in Step 1 will be
  // filled in automatically.
  //
  // HOW TO FIND MOBILE_ENTRY_ID:
  //   1. Open the form's edit link in Google Forms (not the public
  //      viewform link) and open the Mobile Number question.
  //   2. Click the ⋮ (More) menu on that question → "Get pre-filled
  //      link".
  //   3. Fill in any sample value and click "Get link", then "Copy
  //      link". The copied URL contains "...&entry.123456789=...";
  //      the "entry.123456789" part (with your own numbers) is the
  //      value to paste below, as a quoted string.
  //   Leave as null to open the form without pre-filling the number —
  //   everything else keeps working, the driver just has to type their
  //   number again inside the Google Form itself.
  GOOGLE_FORM: {
    URL: "https://docs.google.com/forms/d/e/1FAIpQLSfWSXqhzab6o0Yh6lFrRzXz_F-jxgnvvzoB29mvBg5yDiRnIA/viewform",
    MOBILE_ENTRY_ID: null
  },

  // --------------------------------------------------------
  // WEBSITE IDENTITY
  // --------------------------------------------------------
  SITE_NAME_EN: "Amader Elaka",
  SITE_NAME_BN: "আমাদের এলাকা",
  DEFAULT_MARKET_SLUG: "nobi-bazar",

  // --------------------------------------------------------
  // DEFAULT LANGUAGE — "en" or "bn"
  // --------------------------------------------------------
  DEFAULT_LANGUAGE: "en",

  // --------------------------------------------------------
  // DEFAULT THEME — "light" or "dark"
  // --------------------------------------------------------
  DEFAULT_THEME: "light",

  // --------------------------------------------------------
  // REQUEST BEHAVIOUR
  // --------------------------------------------------------
  // How long (ms) to cache public directory data in the
  // visitor's browser before quietly refreshing it again.
  CACHE_TTL_MS: 5 * 60 * 1000,

  // Driver/Doctor availability can change at any time, so their
  // directory data is refreshed more often than static data like
  // Markets/Vehicle Categories (which barely ever change).
  STATUS_CACHE_TTL_MS: 60 * 1000,

  // How long (ms) to wait for the API before showing a
  // network-error state with a Retry button.
  REQUEST_TIMEOUT_MS: 12000,

  // --------------------------------------------------------
  // HOMEPAGE BANNER — Slide 1 always shows the automatic site
  // headline/text (translated live) on the same solid background
  // as the Doctor/Registration sections; drop in
  // home-banner-01.jpg and it's used as that slide's background
  // image instead. Slides 2 and 3 are plain images — drop your
  // own images into /assets/home-banners/ using these exact
  // filenames and they'll appear automatically — no other
  // change needed. Until then, a placeholder is shown so
  // nothing looks broken. See that folder's own README.
  // --------------------------------------------------------
  BANNER_IMAGES: {
    slide1: "assets/home-banners/home-banner-01.jpg",
    slide2: "assets/home-banners/home-banner-02.jpg",
    slide3: "assets/home-banners/home-banner-03.jpg"
  },

  // --------------------------------------------------------
  // SECTION BACKGROUND IMAGES — Registration and Doctor
  // homepage sections. Falls back to the existing solid color
  // automatically if the file isn't there yet.
  // --------------------------------------------------------
  SECTION_BACKGROUNDS: {
    registration: "assets/home-banners/home-registration-banner.jpg",
    doctor: "assets/home-banners/home-doctor-banner.jpg",
    other: "assets/home-banners/home-other-banner.jpg",
    registerPhotoUpload: "assets/home-banners/register-photo-upload-bg.jpg"
  },

  // --------------------------------------------------------
  // FOOTER SOCIAL LINKS  ◄── CHANGE THESE VALUES
  // --------------------------------------------------------
  // Leave any entry as "#" until you have a real link — the
  // icon still shows, it just doesn't go anywhere yet.
  // call and whatsapp are the exceptions: put a plain phone number here
  // (any format), not a URL — the footer builds the tel: / wa.me link.
  SOCIAL_LINKS: {
    call: "#",
    whatsapp: "#",
    facebook: "#",
    tiktok: "#",
    instagram: "#",
    website: "#"
  }
};
