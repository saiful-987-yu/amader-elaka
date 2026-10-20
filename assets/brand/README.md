# 🎨 Brand Assets

Logo, favicons and app icons of **আমাদের এলাকা · Amader Elaka**.

> [!IMPORTANT]
> All files below already exist in this folder, generated from the official logo. To replace the logo itself, regenerate **every file in the table** from the new artwork at the listed sizes and **keep the exact file names** — the website and the Android app pick them up automatically, no code changes needed.

---

## 📋 Files at a glance

| File | Format | Size (px) | Ratio | Used for |
|---|---|---|---|---|
| `logo-low.png` | PNG | 128×128 | 1:1 | Header and footer brand mark (small, shown on every page — see `.brand__mark` in `css/style.css`) |
| `logo-medium.png` | PNG | 512×512 | 1:1 | General-purpose website logo — anywhere a medium square logo is needed |
| `logo-high.png` | PNG | 1024×1024 | 1:1 | High-quality / HD use only (large displays, print, source for other assets). Not used on any page directly — too heavy |
| `favicon-32.png` | PNG | 32×32 | 1:1 | Browser tab icon |
| `favicon-16.png` | PNG | 16×16 | 1:1 | Browser tab icon, smaller fallback |
| `apple-touch-icon.png` | PNG | 180×180 | 1:1 | "Add to Home Screen" icon on iOS / Safari |
| `pwa-icon-192.png` | PNG | 192×192 | 1:1 | PWA / app icon, standard "192" size (`purpose: any`) |
| `pwa-icon-512.png` | PNG | 512×512 | 1:1 | PWA / app icon, standard "512" size (`purpose: any`) |
| `pwa-icon-maskable-512.png` | PNG | 512×512 | 1:1 | 🆕 **Android maskable icon** — logo scaled to ~70 % on a solid green background so Android can crop it to a circle / squircle without cutting the artwork (`purpose: maskable`) |

The social-share cover lives in `../images/` (a different shape — landscape, not the square logo):

| File | Format | Size (px) | Ratio | Used for |
|---|---|---|---|---|
| `../images/og-cover.jpg` | JPG | 1200×630 | ~1.9:1 | Facebook / Messenger / WhatsApp / Twitter link-preview image |

---

## 📱 App icons (PWA & Android APK)

`manifest.json` lists three icons:

| Icon | `purpose` | Why |
|---|---|---|
| `pwa-icon-192.png` | `any` | Normal icon (install dialog, shortcuts) |
| `pwa-icon-512.png` | `any` | Large icon, splash screen |
| `pwa-icon-maskable-512.png` | `maskable` | Android adaptive icon — fills the whole shape |

> [!TIP]
> **Keep the artwork in the centre.** A maskable icon is cropped by the phone, so important parts must stay inside the central ~80 % circle (the *safe zone*). The current file keeps the round logo inside that zone, on a solid green (`rgb(2, 117, 13)`) background that matches the logo's outer ring.

If you change the logo, remake **all three** app icons together, then re-check the manifest with [PWABuilder](https://www.pwabuilder.com). The **Android APK** takes its icon from these files too; after changing them you must rebuild the APK (see the main `README.md` → §9).

---

## 🖼️ Logo vs. Social Share Image

These are **not** the same shape and shouldn't be — don't just drop the square logo in as the share image:

- **Logo** (`logo-*.png`) — square, 1:1, the badge / icon on its own.
- **Social Share Cover** (`og-cover.jpg`) — landscape (~1200×630, Facebook's recommended ratio), with the logo placed alongside the brand name / short tagline rather than the logo alone filling the frame, so it is legible as a small link-preview thumbnail.

## 🔎 Low / Medium / High versions

Three sizes of the same logo exist for different jobs:

| Version | File | What it is for |
|---|---|---|
| **Low** | `logo-low.png` (128×128) | Smallest file. Used wherever the logo appears small and often (header / footer on every page load), so the page never downloads more image data than that spot needs |
| **Medium** | `logo-medium.png` (512×512) | The standard, general-use size for anything not covered by a more specific file |
| **High / HD** | `logo-high.png` (1024×1024) | Largest and heaviest; only for a large display or as a source to derive other sizes. Intentionally not linked from any page |

## 📌 Favicon / Apple Touch Icon / PWA icon rules

- `index.html` already links `favicon-32.png` / `favicon-16.png` as the browser tab icon and `apple-touch-icon.png` for "Add to Home Screen" on iOS — nothing further to wire up.
- `manifest.json` already points its `icons` array at `pwa-icon-192.png`, `pwa-icon-512.png` and `pwa-icon-maskable-512.png`.
- These icon files are part of the service-worker cache list (`sw.js`) except the maskable one, which is only read at install time (by the browser / PWABuilder).

## 🌐 OG / Social Share image rules

- `index.html`'s `<meta property="og:image">` and `<meta name="twitter:image">` already point at `assets/images/og-cover.jpg`, with `og:image:width` / `og:image:height` set to `1200` / `630` to match.
- To update the wording or design of the share image, regenerate it at the same 1200×630 size and overwrite the same file — no other change needed.

## 🛟 Missing / broken image → fallback behaviour

If any file in this folder is missing, misnamed, corrupted, or fails to load for any reason:

| File | What happens |
|---|---|
| Header / footer brand mark | Automatically falls back to the site's original built-in car icon (drawn in code, not a file) — never a broken-image icon or blank box. See the `img.onerror` handler next to `.brand__mark` in `index.html` and in `Utils.buildFooterClone()` in `js/utils.js` |
| Favicon / Apple touch icon | The browser shows its own default icon — the page itself is never affected |
| `og-cover.jpg` | Link previews on Facebook / WhatsApp etc. show no image (or their own default) — the website itself is never affected |

None of these ever throw a JavaScript error or affect any other part of the site — image loading here is always optional / best-effort.
