# Logo / Brand Image Assets

All files below already exist in this folder, generated from the
official "Amader Driver" logo. If you ever want to replace the logo
itself, regenerate every file in this table from the new artwork at
the sizes listed — keep the exact filenames so the website picks them
up automatically, no code changes needed.

| Filename | Format | Pixel Size | Aspect Ratio | File Size | Used for |
|---|---|---|---|---|---|
| `logo-low.png` | PNG | 128×128 | 1:1 | ~24 KB | Header & footer brand mark (small, shown on every page — see `.brand__mark` in `css/style.css`) |
| `logo-medium.png` | PNG | 512×512 | 1:1 | ~227 KB | General-purpose website logo — anywhere a medium-size square logo is needed |
| `logo-high.png` | PNG | 1024×1024 | 1:1 | ~767 KB | High-quality/HD use only (large displays, print, source for other assets) — not used on any page directly, since it's too heavy for that |
| `favicon-32.png` | PNG | 32×32 | 1:1 | ~3 KB | Browser tab icon (favicon) |
| `favicon-16.png` | PNG | 16×16 | 1:1 | ~1 KB | Browser tab icon (favicon), smaller fallback size |
| `apple-touch-icon.png` | PNG | 180×180 | 1:1 | ~41 KB | "Add to Home Screen" icon on iOS/Safari |
| `pwa-icon-192.png` | PNG | 192×192 | 1:1 | ~45 KB | App icon for a future PWA manifest (standard "192" size) |
| `pwa-icon-512.png` | PNG | 512×512 | 1:1 | ~227 KB | App icon for a future PWA manifest (standard "512" size) |

The Open Graph / social-share cover image lives in `../images/` instead
(not this folder), since it's a different shape (landscape, not the
square logo) and `index.html`'s `og:image`/`twitter:image` tags already
point there:

| Filename | Format | Pixel Size | Aspect Ratio | File Size | Used for |
|---|---|---|---|---|---|
| `../images/og-cover.jpg` | JPG | 1200×630 | ~1.9:1 | ~47 KB | Facebook/Messenger/WhatsApp/Twitter link-preview image when the site is shared |

## Logo vs. Social Share Image

These are NOT the same shape and shouldn't be — don't just drop the
square logo in as the share image:

- **Logo** (`logo-*.png`) — square, 1:1, the badge/icon on its own.
- **Social Share Cover** (`og-cover.jpg`) — landscape (~1200×630,
  Facebook's recommended ratio), with the logo placed alongside the
  brand name/short tagline rather than the logo alone filling the
  frame, so it's legible as a small link-preview thumbnail.

## Low / Medium / High versions

Three sizes of the same logo exist for different jobs:

- **Low** (`logo-low.png`, 128×128) — smallest file, used wherever the
  logo appears small and often (header/footer on every page load), so
  the page never downloads more image data than that spot needs.
- **Medium** (`logo-medium.png`, 512×512) — the standard, general-use
  size for anything not covered by a more specific file above.
- **High/HD** (`logo-high.png`, 1024×1024) — largest and heaviest;
  only for a large display or a source file to derive other sizes
  from. It's intentionally not linked from any page.

## Favicon / Apple Touch Icon / PWA Icon rules

- `index.html` already links `favicon-32.png`/`favicon-16.png` as the
  browser tab icon and `apple-touch-icon.png` for "Add to Home Screen"
  on iOS — nothing further to wire up for those two.
- `pwa-icon-192.png`/`pwa-icon-512.png` are prepared for when this site
  gets an actual `manifest.json` (installable PWA) — not created by
  this update, since that's a separate, bigger feature. When that's
  added, point its `icons` array at these two files.

## OG / Social Share Image rules

- `index.html`'s `<meta property="og:image">` and `<meta
  name="twitter:image">` already point at `assets/images/og-cover.jpg`
  with `og:image:width`/`og:image:height` set to `1200`/`630` to match.
- If you want to update the wording or design on the share image,
  regenerate it at the same 1200×630 size and overwrite this same file
  — no other change needed.

## Missing/broken image → fallback behavior

If any file in this folder is missing, misnamed, corrupted, or fails
to load for any reason:

- The header/footer brand mark (`.brand__mark`) automatically falls
  back to the site's original built-in car icon (drawn in code, not a
  file) — never a broken-image icon, never a blank box. See the
  `img.onerror` handler next to `.brand__mark` in `index.html` and in
  `Utils.buildFooterClone()` in `js/utils.js`.
- A missing/broken favicon or Apple touch icon simply means the
  browser shows its own default icon instead — it never breaks the
  page itself.
- A missing/broken `og-cover.jpg` means link previews on Facebook/
  WhatsApp/etc. show no image (or their own default) — it never
  affects the website itself in any way.

None of these ever throw a JavaScript error or affect any other part
of the site — image loading here is always optional/best-effort.
