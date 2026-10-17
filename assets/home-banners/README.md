# Homepage images

Drop image files into this folder using these EXACT filenames — the
website picks them up automatically, no code changes needed:

| Filename | Used for |
|---|---|
| `home-banner-01.jpg` | Homepage banner, slide 1 — used as the BACKGROUND behind the automatic headline/text (not a replacement for it) |
| `home-banner-02.gif` | Homepage banner, slide 2 — tried FIRST (animated). Optional |
| `home-banner-02.jpg` | Homepage banner, slide 2 — shown if the `.gif` is missing |
| `home-banner-03.jpg` | Homepage banner, slide 3 — shown whenever the slide-3 video can't play (error, offline, no link) |
| `emergency-banner-01.jpg` | Emergency page banner, slide 1 (picture only) |
| `emergency-banner-02.gif` | Emergency page banner, slide 2 — tried FIRST (animated). Optional |
| `emergency-banner-02.jpg` | Emergency page banner, slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `emergency-banner-03.jpg` | Emergency page banner, slide 3 — shown whenever the slide-3 video can't play |
| `doctor-banner-01.jpg` | Doctor page banner, slide 1 (picture only) |
| `doctor-banner-02.gif` | Doctor page banner, slide 2 — tried FIRST (animated). Optional |
| `doctor-banner-02.jpg` | Doctor page banner, slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `doctor-banner-03.jpg` | Doctor page banner, slide 3 — shown whenever the slide-3 video can't play |
| `market-banner-01.jpg` | Markets page banner, slide 1 (picture only) |
| `market-banner-02.gif` | Markets page banner, slide 2 — tried FIRST (animated). Optional |
| `market-banner-02.jpg` | Markets page banner, slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `market-banner-03.jpg` | Markets page banner, slide 3 — shown whenever the slide-3 video can't play |
| `other-banner-01.jpg` | Other Section page banner, slide 1 (picture only) |
| `other-banner-02.gif` | Other Section page banner, slide 2 — tried FIRST (animated). Optional |
| `other-banner-02.jpg` | Other Section page banner, slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `other-banner-03.jpg` | Other Section page banner, slide 3 — shown whenever the slide-3 video can't play |
| `vehicle-<slug>-banner-02.gif` | Banner slide 2 on the driver list of that vehicle category (e.g. `vehicle-cng-banner-02.gif`) — tried FIRST. Optional |
| `vehicle-<slug>-banner-02.jpg` | Same slide 2 — shown if the `.gif` is missing; blank if neither exists |
| `vehicle-<slug>-banner-03.jpg` | Same banner, slide 3 — shown whenever the slide-3 video can't play; blank if missing |
| `banner-videos.js` | NOT a picture — the video links (one clearly-headed line per banner). Open it and paste a YouTube link to change a banner video |
| `home-registration-banner.jpg` | Background image of the "Register as a Driver" section |
| `home-doctor-banner.jpg` | Background image of the "Find a Doctor" section |
| `register-photo-upload-bg.jpg` | Background of the top "Upload your profile photo" button on Registration Step 3 (a soft-green overlay sits on top so the text stays readable; if missing, the plain soft-green color is shown) |

Notes:

- Slide 1's headline/text is always automatic and always follows the
  selected language (English/বাংলা), on the same solid background used
  by the Doctor/Registration sections by default — `home-banner-01.jpg`
  only ever supplies the background photo behind that text.
- If `home-banner-01.jpg` is missing (or fails to load), slide 1 simply
  keeps that solid background with the same automatic text — you don't
  need to provide it to get started.
- If any of these other files is missing, nothing breaks: slides 2/3
  show a clean placeholder instead, and the Registration/Doctor
  sections just keep their existing solid background color. There is
  never a broken-image icon.
- To use different filenames or a different folder, edit `BANNER_IMAGES`
  and `SECTION_BACKGROUNDS` in `config/config.js`.
- Recommended for the banner images: roughly a 2:1 width:height ratio
  (e.g. 1200×600px), compressed JPG or WebP, to keep the homepage fast
  on slow mobile connections.

Banner timing and videos:

- Every slide stays 5 seconds.
- Slide 3 (Home and Emergency) tries its YouTube video first. It starts
  automatically, muted; a small speaker button on the video turns the sound
  on/off. The slide stays until the video ends, then the banner moves on.
  If the video can't start within the 5 seconds (error, offline, empty
  link), the `…-banner-03.jpg` picture is shown for 5 seconds instead.
- The video links live in `banner-videos.js` in this folder.
- The Emergency, Doctor, Markets and Other Section banners are 2:1 (e.g. 1200×600px) and sit behind the
  breadcrumb / heading / subtitle; it never moves the search bar. Its
  heading / breadcrumb / subtitle text is bright with a dark outline so it
  stays readable on any picture, in Light and Dark theme.

Vehicle category banners (driver list inside a Bazar and inside the Other Section):

- Slide 1 is the category's own photo from `assets/local-photos/vehicles/<slug>.jpg`.
- Slides 2 and 3 use the `vehicle-<slug>-banner-02/03` files above, where `<slug>`
  is the category slug (e.g. `cng`, `auto`, `easy-bike`).
- The slide-3 video link goes in the `vehicle03` list inside `banner-videos.js`.
- Any missing file just leaves that slide blank; nothing breaks.
