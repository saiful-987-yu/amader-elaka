# 🖼️ Banner Images

Drop image files into this folder using these **exact file names** — the website picks them up automatically, no code changes needed.

> [!NOTE]
> A missing file never breaks anything: slides 2 / 3 show a clean placeholder, and the Registration / Doctor sections keep their solid background colour. There is never a broken-image icon.

---

## 🏠 Home page banner

| File name | Used for |
|---|---|
| `home-banner-01.jpg` | Slide 1 — used as the **background** behind the automatic headline / text (not a replacement for it) |
| `home-banner-02.gif` | Slide 2 — tried **first** (animated). Optional |
| `home-banner-02.jpg` | Slide 2 — shown if the `.gif` is missing |
| `home-banner-03.jpg` | Slide 3 — shown whenever the slide-3 video can't play (error, offline, no link) |

## 🏪 Markets page banner

| File name | Used for |
|---|---|
| `market-banner-01.jpg` | Slide 1 (picture only) |
| `market-banner-02.gif` | Slide 2 — tried **first** (animated). Optional |
| `market-banner-02.jpg` | Slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `market-banner-03.jpg` | Slide 3 — shown whenever the slide-3 video can't play |

## 🚗 Category & vehicle lists

| File name | Used for |
|---|---|
| `category-drivers-banner-02.gif` | Slide 2 on the vehicle-category list that opens from the **Drivers** card — tried first (animated). Optional |
| `category-drivers-banner-02.jpg` | Same slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `category-drivers-banner-03.jpg` | Same banner, slide 3 — shown whenever the slide-3 video can't play |
| `category-<slug>-banner-02.gif` / `.jpg` / `-03.jpg` | The same three files for a non-vehicle category list inside the Other Section (e.g. `category-mosque-banner-02.jpg`) |
| `vehicle-<slug>-banner-02.gif` | Slide 2 on the driver list of that vehicle category (e.g. `vehicle-cng-banner-02.gif`) — tried first. Optional |
| `vehicle-<slug>-banner-02.jpg` | Same slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `vehicle-<slug>-banner-03.jpg` | Same banner, slide 3 — shown whenever the slide-3 video can't play; blank if missing |

## 🌍 Global banner (fallback)

| File name | Used for |
|---|---|
| `global-banner-01.jpg` | Slide 1 — shown on any page whose own slide-1 picture is missing |
| `global-banner-02.gif` | Slide 2 — tried first (animated). Optional |
| `global-banner-02.jpg` | Slide 2 — shown if the `.gif` is missing |
| `global-banner-03.jpg` | Slide 3 — shown on any page whose own slide-3 picture is missing (and whose video can't play) |

## 📢 Notices & section backgrounds

| File name | Used for |
|---|---|
| `home-notice-01.jpg`, `home-notice-02.jpg`, `home-notice-03.jpg` … | Background picture of the Home page notices. The number is the notice's position, in the order written in `assets/home-content/home-content.js`; add more numbers as notices grow. Looked for **first**; if missing, that notice's Google Drive `bgImage` link is used. 2:1 JPG recommended |
| `home-registration-banner.jpg` | Background image of the "Register as a Driver" section |
| `register-photo-upload-bg.jpg` | Background of the top "Upload your profile photo" button on Registration Step 3 (a soft-green overlay keeps the text readable; if missing, the plain soft-green colour is shown) |

## 🎬 Videos

| File name | Used for |
|---|---|
| `banner-videos.js` | **Not a picture** — the video links (one clearly-headed line per banner). Open it and paste a YouTube link to change a banner video |

---

## 📝 Notes

- Slide 1's headline / text is always automatic and always follows the selected language (English / বাংলা), on the same solid background used by the Doctor / Registration sections by default — `home-banner-01.jpg` only ever supplies the background photo behind that text.
- If `home-banner-01.jpg` is missing (or fails to load), slide 1 simply keeps that solid background with the same automatic text — you don't need to provide it to get started.
- To use different file names or a different folder, edit `BANNER_IMAGES` and `SECTION_BACKGROUNDS` in `config/config.js`.

> [!TIP]
> **Recommended size:** roughly a **2:1** width : height ratio (e.g. 1200 × 600 px), compressed JPG or WebP, to keep the homepage fast on slow mobile connections.

## ⏱️ Banner timing and videos

- Every slide stays **5 seconds**.
- Slide 3 (Home and Emergency) tries its YouTube video first. It starts automatically, **muted**; a small speaker button on the video turns the sound on / off. The slide stays until the video ends, then the banner moves on. If the video can't start within the 5 seconds (error, offline, empty link), the `…-banner-03.jpg` picture is shown for 5 seconds instead.
- The video links live in `banner-videos.js` in this folder.
- The Emergency, Doctor, Markets and Other Section banners are 2:1 (e.g. 1200 × 600 px) and sit behind the breadcrumb / heading / subtitle; they never move the search bar. Their heading / breadcrumb / subtitle text is bright with a dark outline so it stays readable on any picture, in Light and Dark theme.

## 🚙 Vehicle category banners

*(driver list inside a Bazar and inside the Other Section)*

- **Slide 1** is the category's own photo from `assets/local-photos/vehicles/<slug>.jpg`.
- **Slides 2 and 3** use the `vehicle-<slug>-banner-02/03` files above, where `<slug>` is the category slug (e.g. `cng`, `auto`, `easy-bike`).
- The slide-3 video link goes in the `vehicle03` list inside `banner-videos.js`.
- Any missing file just leaves that slide blank; nothing breaks.

## 🥇 Where slide 1 comes from

| Banner | Slide 1 picture |
|---|---|
| Home | `home-banner-01.jpg` (this folder) |
| Markets | `market-banner-01.jpg` (this folder) |
| Emergency, Doctor, Other, Drivers and every non-vehicle category | `assets/local-photos/categories/<slug>.jpg` (`emergency.jpg`, `doctor.jpg`, `other.jpg`, `drivers.jpg`, …) |
| Vehicle categories | `assets/local-photos/vehicles/<slug>.jpg` |

The Drivers banner video link is `drivers03` in `banner-videos.js`.
