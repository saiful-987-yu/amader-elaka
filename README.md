# আমাদের এলাকা (Amader Elaka)

> This project started as "Amader Drivers" and is now an area directory. Sections
> 3.7 and 3.8 below describe the area-directory features added later; where older
> text still says "driver" or "vehicle type", read it as "listing" and "category".

A lightweight, bilingual (English/বাংলা) local driver directory. A customer
scans a QR code, picks a bazar, picks a vehicle type (CNG / Auto / Van /
Other), browses drivers, and taps **Call Driver** — no account required.
Drivers can register, and once approved can log in to switch their own
listing between **Active** and **Currently Unavailable**.

The site runs entirely on the front end and treats **Google Sheets** as its
database, through a small Google Apps Script backend. It also ships with a
**demo mode** (sample data, no Google Sheet needed) so you can try the full
experience — search, registration, login, availability — before connecting
anything.

**Performance:** Markets load first; Vehicle Categories and the full Driver
directory then preload in the background (`Api.preload()` in `js/api.js`).
Every screen checks the cache first, so moving from Bazar → Vehicle Type →
Driver List feels instant once that initial preload has settled, and no
market/vehicle click ever re-requests data that's already loaded. Driver
photos load lazily and never block a card's text/call button from
appearing. In the public driver list, **Active drivers are always sorted
before Inactive ones**.

Besides the normal Bazar → Vehicle Type → Driver flow, the site also has an
**Emergency Contact** list, a **Find a Doctor** list and an **Other Section**
(other services and businesses, see §3.6), a site-wide **search** (name or
phone number), animated **banners** on every main page (§5.5), and it is an
installable **PWA** with a service worker (§5.7).

A compact breadcrumb (`Home › Bazar › Vehicle`) sits at the top of the
directory screens for quick backward navigation, and the footer is a single
slim two-row bar (brand + links, then copyright + language) rather than a
tall multi-column block.

---

## 1. Project structure

```
project/
├── index.html
├── README.md
├── manifest.json         # PWA manifest (name, icons, theme colors, start_url)
├── sw.js                 # service worker (app-shell cache, see §5.7)
├── robots.txt
├── sitemap.xml
├── css/
│   ├── themes.css        # color tokens, light/dark theme
│   ├── style.css         # base layout + components (mobile-first)
│   ├── responsive.css    # tablet/desktop breakpoint overrides
│   └── pwa.css           # install / update banner styles
├── js/
│   ├── utils.js          # shared helpers (DOM, phone, storage, text-to-speech)
│   ├── icons.js          # inline SVG icon set
│   ├── language.js       # EN/BN translation system
│   ├── theme.js          # light/dark theme switcher
│   ├── api.js            # data layer (Google Sheets or demo data) + caching
│   ├── auth.js           # driver session/login state
│   ├── search.js         # shared search-matching helpers (name / phone)
│   ├── app.js            # router, toasts, modal, header wiring, service worker registration
│   ├── clock.js          # live date + 24-hour clock bar with Bangla and Hijri dates on the Home page (EN/বাংলা)
│   ├── pwa-install.js    # "Add to Home Screen" banner + "new version ready" banner
│   ├── drivers.js        # home, banners, bazar/vehicle selection, driver lists
│   │                     # (bazar, Emergency, Doctor, Other Section), driver detail, search
│   ├── registration.js   # 5-step "Register as a Driver" form
│   ├── profile.js        # driver login + profile/availability screen
│   └── admin.js          # Admin Mode: dashboard, record editing, Pending Users, Public Rating review
├── assets/
│   ├── images/           # og-cover.jpg (social-share cover image)
│   ├── brand/            # logo, favicons, PWA icons (see its own README)
│   ├── icons/            # favicon.svg, sacarmart-logo.svg
│   ├── banner-images/    # banner pictures + banner-videos.js (see its own README)
│   ├── screenshots/      # install-dialog screenshots listed in manifest.json (see its own README)
│   └── local-photos/     # optional bundled photos, see §5.8
│       ├── markets/      #   <market-slug>.jpg / <market-slug>-bg.jpg
│       ├── vehicles/     #   <vehicle-slug>.jpg (driver vehicle categories only)
│       ├── categories/   #   home cards + Other Section categories <slug>.jpg
│       └── profilePhoto/ #   <Driver ID>.jpg
├── config/
│   ├── config.example.js # documented configuration template
│   └── config.js         # your actual configuration
└── google-apps-script/
    └── Code.gs           # backend for real Google Sheets access
```

---

## 2. Running it locally (demo mode, no setup)

`config/config.js` ships with `API_BASE_URL: null`, which puts the site in
**demo mode**: it uses realistic sample drivers, markets and vehicle types
stored in your browser's `localStorage`, so registration, login
(`karim.driver` / `demo1234`, or any of the other seeded usernames — see
`js/api.js`) and availability switching all work end-to-end with no backend.

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```
npx serve .
```

---

## 3. Connecting a real Google Sheet

### 3.1 Create the spreadsheet

Create one Google Sheet with these exact tab names — just **4 main tabs**
(there is no separate `Doctors` tab and no separate account tab; a user's
own row on `Users` is the only source of truth for their login). Three more
tabs (`Public Ratings`, `Admin Editor History`, `Sessions`) are created
automatically by the backend when first needed — see below:

| Tab | Purpose |
|---|---|
| `Users` | Approved, publicly visible drivers (and doctors) — also where each user's own Username/Password live |
| `Pending Users` | New registrations awaiting review (approved from Admin Mode, or manually in the sheet) |
| `Markets` | The list of bazars |
| `Vehicle Categories` | CNG / Auto / Van / Other, etc. (and the categories of the Other Section) |

### 3.2 Column headers

**Markets**
`Market ID | Market Name English | Market Name Bengali | Location | Status | Sort Order | Markets Image URL | Markets BG Image URL`

- Only rows with `Status = Active` are shown, ordered by `Sort Order`. A visitor can also reorder the bazars for themselves from the homepage (sort button next to the "Choose your bazar" heading); that custom order is saved only in that visitor's own browser/device and has a Reset button — it never changes the sheet.
- `Markets Image URL` — an optional photo shown next to the bazar's icon on the homepage's market cards (same idea as the Vehicle Categories image below). Leave it empty and the card just shows its icon as before, no broken image.
- `Markets BG Image URL` — an optional large background photo for the whole market card (separate from the small icon/image above, which stays visible either way). Leave it empty and the card keeps its existing plain background (white in Light Mode, dark in Dark Mode); if the URL doesn't load, the same plain background is used — never a broken image. A photo placed in `assets/local-photos/markets/` is tried before either URL (see §5.8).

**Vehicle Categories**
`Category ID | English Name | Bengali Name | Icon | Status | Sort Order | Vehicle Categories Image URL | Other Categories`

- `Vehicle Categories Image URL` — a category artwork image shown next to the existing small icon on the vehicle-type selection screen (roughly 2:1, wider than tall). This is completely separate from a driver's own `Vehicle Image URL` in the Users tab — leave it empty and the category card just shows its icon as before, no broken image. A photo placed in `assets/local-photos/vehicles/` is tried first (see §5.8).
- `Other Categories` — `TRUE` (case-insensitive) moves the category out of the normal Bazar → Vehicle flow and into the **Other Section** (see §3.6). `FALSE` or blank keeps it a normal vehicle category. The two groups never overlap: a category marked `TRUE` is not offered under any bazar.

**Users**
`Driver ID | Name | Bengali Name | Father/Husband Name | Phone | Alternative Phone | Village | Post Office | Union | Upazila | District | Full Address | Vehicle Type | Vehicle Number | Bazar | Service Area | Driving Experience | Driver Image URL | Vehicle Image URL | Social Media URL | Username | Password | Status | Availability | Created Date | Updated Date | Star Rating | WhatsApp | Emergency Contact | Doctor Status | Sort Status | Personal Details | Video URL | Manual Rating | Public Rating Cache | Public Rating Count | Admin Status`

- `Social Media URL` — optional. One or more links (Facebook, YouTube, TikTok, Google Maps, a website, etc.) separated by a new line or `, `; shown as icon buttons on the driver/doctor detail page. Leave it empty and nothing is shown.
- `Admin Status` — `TRUE` gives that driver access to Admin Mode (after logging in and re-entering their password). It can only be set here, directly in the sheet — it can never be changed from the website. Leave it empty or `FALSE` for every normal driver.
- `Username` / `Password` — **a user logs in directly against their own row here.** There is no separate account sheet at all. `Password` is a SHA-256 hash, never plain text — see "Pending Users" below for how a value gets here in the first place.
- `Sort Status` — one of `1st`, `2nd`, `3rd`, `4th`, `5th`, `6th`, `7th`, `8th`, `9th`, `10th`, or blank. Offline (Unavailable) profiles always go to the bottom first. Among the rest, this is **the first sort priority**: every `1st` driver appears before every `2nd`, and so on up to `10th`, then everyone left blank. Drivers sharing the same Sort Status are then ordered by `Star Rating` (highest first).
- `Bengali Name` — shown instead of `Name` whenever the site is in বাংলা mode. Leave it blank and the English `Name` is used as a fallback automatically — a driver never shows with a blank name.
- `Emergency Contact` — `TRUE` (case-insensitive) adds the driver to the "Emergency Contact" list regardless of their vehicle type; the list follows the visitor's chosen bazar, so the driver appears only in the bazars written in their `Bazar` cell (a blank `Bazar` cell means they appear in no bazar's Emergency list). `FALSE` or blank keeps them out of it. This never affects their normal listing under their own bazar/vehicle type. This list is ordered by the same `Sort Status` → `Star Rating` rule as a bazar+vehicle-type list — not a separate rule.
- `Star Rating` — a number from 0–5 (decimals like `4.2` are fine); shown to customers as rounded stars, never as the raw number, in the driver's own basic info row. Leave empty for 0 stars. This is unrelated to the new Rating/Review system below.
- `WhatsApp` — controls the WhatsApp button on the driver card/profile: `F` uses the main `Phone`, `A` uses `Alternative Phone`, a real phone number is used directly, `N` or empty hides the button.
- `Bazar`, `Vehicle Type`, and `Vehicle Image URL` all support **multiple values** in one cell, separated by `, ` (comma + space) — e.g. `Nobi Bazar, Bangla Bazar` or `Motorcycle, CNG, Auto` or `image1.jpg, image2.jpg, image3.jpg`. A driver with multiple bazars/vehicle types shows up under every one of them; multiple vehicle images become a clickable thumbnail gallery on the driver detail screen. A single plain value (no comma) still works exactly as before.
- `Bazar` must match a `Market Name English` value from the Markets tab (matched by a lowercased, hyphenated "slug" of the name — e.g. "Nobi Bazar" → `nobi-bazar`).
- `Vehicle Type` must similarly match an `English Name` from Vehicle Categories.
- For a profile in the Other Section, set `Vehicle Type` to a category that has `Other Categories = TRUE`; it then appears in the Other Section list of that category (see §3.6).
- `Status` = `Active` to make the driver eligible to appear publicly at all.
- `Availability` = `Active` or `Inactive` — this is the flag the driver controls from their own profile.
- `Personal Details` — shown as its own "Personal Details" section right after the Photo Gallery on the driver's detail page. Plain text is shown as plain text; you can also use basic HTML (`<h3>`, `<b>`, `<strong>`, `<p>`, `<ul>`, `<li>`, etc.) and it renders formatted, exactly as written. Leave it empty and the whole section — heading included — doesn't appear at all.
- `Video URL` — shown as its own "Video" section, right after the Rating/Reviews section. A YouTube link plays in an embedded YouTube player; a Google Drive video link plays via Drive's own preview player. Leave it empty, or if the link doesn't actually work, the whole section — heading included — doesn't appear at all.
- `Manual Rating` — the admin's own rating input, 0–5. Combines with verified public reviews below to make up the driver's displayed Rating (see "Public Ratings" further down): `Final Rating = MIN(Public Rating Cache + Manual Rating, 5)`. Leave empty for 0.
- `Public Rating Cache` / `Public Rating Count` — **do not edit these by hand** — they're the average and count of that driver's VERIFIED public reviews, kept up to date automatically (see "Public Ratings" below) whenever you mark a review Verified. Leave both empty (they'll read as 0) until the driver has at least one verified review.

**Public Ratings**
`Rating ID | Target Type | Target ID | Star Rating | Comment | Date Time | Verified`

The Driver/Doctor Details page's public review system — one row per
submitted review (`Target Type` is always `driver`, `Target ID` is that
profile's own `Driver ID`; doctors are Users rows too). This tab is created automatically the first time it's
needed, so you don't have to create it yourself — but you can add
Column headers ahead of time if you prefer.

- Every new review a visitor submits starts with `Verified` = `FALSE`, and an unverified review is **never** shown publicly and **never** counted in the rating — it only ever exists here for you to review.
- To publish a review, an admin taps **Public Rating** in the Admin Dashboard and presses **True** next to it (see "Admin Mode" below), or you change its `Verified` cell to `TRUE` yourself, directly in this sheet — both do exactly the same thing. The moment you do, that profile's `Public Rating Cache`/`Public Rating Count` (on the Users tab) is **automatically recalculated** — no page reload, no manual math, and nothing else on the site needs to recompute anything. This runs via the `onEdit()` trigger in `Code.gs`, so no separate Apps Script trigger setup is needed — it works as soon as `Code.gs` is deployed on this spreadsheet.
- Setting `Verified` back to `FALSE` (or anything other than `TRUE`) un-publishes that review and recalculates the average again, minus that review.
- The Details page only ever loads 2 verified reviews at first (for a fast initial load); the full list is fetched only when a visitor taps "View All Reviews".



**My Profile (driver-side)**
A logged-in driver's own "My Profile" page (Change Password + a
"Edit Profile" action) writes back to their SAME row on `Users` —
still no separate account sheet. Only a small, fixed set of columns are
ever editable this way: `Bengali Name`, `Father/Husband Name`,
`Alternative Phone`, `WhatsApp`, `Service Area`, `Vehicle Number`, and
`Password` (via Change Password, after the current password is
verified). Everything else shown on the profile — `Name`, `Phone`,
`Username`, `Vehicle Type`, `Bazar`, `Driving Experience`, both photo
URLs, `Status`, and `Availability` (which has its own dedicated
toggle) — stays read-only there by design; see `updateProfile()` /
`changePassword()` in `Code.gs`. As with Availability, the row to
change is always located by the Driver ID tied to the caller's own
session token, never a value the client sends directly.

**Pending Users**
Same idea as Users (including `Social Media URL`), plus `Application ID`,
`Application Status`, `Submitted Date`. `Username`/`Password` are already collected at
registration (password stored hashed, same as on the Users tab). An admin
reviews and approves applications from **Pending Users** in the Admin
Dashboard (see "Admin Mode" below): approving copies the row to `Users`
with a new `Driver ID` and removes it from `Pending Users`. You can still
do it by hand instead — copy the whole row's information into the `Users`
tab (give it a `Driver ID`) and delete it from `Pending Users`. Because
`Username`/`Password` copy over as-is, the user can log in immediately
with the same credentials they registered with — no separate account
sheet to keep in sync.

The registration form has 5 steps — Personal Information, Driver & Vehicle
Information, Photo, Account Information, Review & Submit. It collects: Full Name (English, required),
Full Name (Bangla, required — falls back to the English name anywhere
it's displayed if left blank later), Mobile (required), Alternative
Mobile and WhatsApp Number (both optional), a multi-select for Vehicle
Type and for Preferred Bazar (each saved as one comma-separated cell,
same as elsewhere in this project), and Driving Experience as a number
plus a Years/Months choice (combined into one free-text value like
"2 Years" when saved). A live check while typing a Username or the
Mobile number shows a small blue check mark once it's confirmed
available, or a red "already taken" message otherwise (see
`checkUsernameAvailable()` / `checkPhoneAvailable()` in `Code.gs` —
each only ever returns true/false, never the list of existing
usernames/numbers or any password data). The result for whichever
value was last checked is remembered, so pressing Next doesn't
re-check/re-load the same, unchanged value a second time — only
editing the field invalidates that remembered result.

**Profile photo upload (registration Step 3)**
Step 3 offers two ways to add a profile photo. (1) Direct upload from the
phone/computer (JPG, PNG or WebP, between 50 KB and 3 MB): the backend's
`uploadDriverPhoto()` saves it in a Google Drive folder named
`Amader Elaka - Profile Photos` (created automatically in the Apps Script
owner's Drive, with "anyone with the link can view") and the resulting link
goes into `Driver Image URL`. (2) The Google Form route configured in
`GOOGLE_FORM` in `config/config.js` — a Google Form file upload always
needs a Google sign-in and opens in its own tab; `MOBILE_ENTRY_ID`
pre-fills the mobile number there. The first time `Code.gs` is deployed (or
after changing it), the script owner must authorize the Drive permission
once. Step 3 order: (1) profile photo (with the "OR send it on WhatsApp /
use a link or PIN" option), (2) social media links, (3) other photos
(vehicle, shop, place).

**Admin Editor History**
`Date Time | Admin Driver ID | Admin Name | Target Type | Target ID | Target Name | Old 1 | New 1 | Old 2 | New 2 | ...`

Created automatically the first time an admin saves a change in Admin Mode
— you don't need to create it yourself. One row per real change (plus one
row per approved pending application and one row per review set to `TRUE`
from Public Rating): who changed it, when (Bangladesh
time), which Driver/Doctor/Pending/Rating record, and each changed field as an
`Old n` / `New n` pair. The `Old`/`New` columns are added automatically as
needed. Passwords are never written here — only "hidden" → "changed".

The backend also auto-creates a `Sessions` tab the first time someone logs
in — you don't need to create it yourself, and you never need to look at
it (it just tracks per-token login expiry).

### 3.2.1 Admin Mode

A user whose `Admin Status` cell on `Users` is `TRUE` sees an **Admin
Dashboard** card on their profile. The **Admin Mode** switch asks for the
login password again, then stays on for a limited time (adjustable with
the `-10m / -30m / -1h / +10m / +30m / +1h` buttons). Every admin action is
re-checked on the server (session, `Admin Status` and the admin-mode
token). Three buttons appear while Admin Mode is on:

- **Add User** — opens the registration form.
- **Public Rating** — lists every review whose `Verified` is not `TRUE`
  (`FALSE` or blank), oldest first, with the reviewed person's photo, name
  and ID, the stars given and the comment. Pressing **True** sets that
  review's `Verified` to `TRUE`, recalculates the person's public rating
  and count, and logs the action in `Admin Editor History`. There is no
  reject button — a review that is not approved simply stays `FALSE`.
- **Pending Users** — lists new registrations; each can be edited or
  approved with **OK**.

The Public Rating and Pending Users buttons show a small red count of
waiting items. The count refreshes when the dashboard opens, every 60
seconds while it is on screen, when the app comes back to the foreground,
and immediately after an item is approved. It is hidden when the count is 0.

To edit an existing user, open their card in the normal bazar → vehicle →
driver list while Admin Mode is on and use the pen icon on the card. When
editing an approved driver/doctor, Username is not required (name and phone
are); editing a pending application still requires a Username, because
approval needs it.

### 3.3 Deploy the Apps Script backend

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete the default code and paste in `google-apps-script/Code.gs`.
3. **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the resulting URL (ends in `/exec`).
5. After you edit `Code.gs` later, paste the new code and use **Deploy →
   Manage deployments → Edit → New version**, so the same `/exec` URL
   keeps working. Approve any permission prompt (Sheets, Drive).

### 3.4 Configure the frontend

Edit `config/config.js`:

```js
window.NOBI_CONFIG = {
  API_BASE_URL: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
  ...
};
```

Setting `API_BASE_URL` automatically switches the site out of demo mode —
no other code changes are needed anywhere in the project.

**Never put a Google API key, OAuth secret, or service-account credential
in `config.js`.** The Apps Script Web App URL is the only thing that
belongs there, and it is meant to be public — the actual spreadsheet access
happens inside your Apps Script project under your own Google account.

### 3.5 Doctors (the `Doctor Status` column)

There is no separate `Doctors` tab. Doctors are normal rows on the `Users`
tab, with every column and feature of a driver (login, admin edit, ratings,
photos, etc.). The `Doctor Status` column on the `Users` tab decides
whether a profile appears in "Find a Doctor":

- `TRUE` (case-insensitive) adds the profile to the Doctor section.
- `FALSE` or blank keeps it out of the Doctor section.

It works exactly like `Emergency Contact`, and it never affects the
profile's normal listing under its own bazar/vehicle type. The Doctor list
is ordered by the same `Sort Status` → `Star Rating` rule as the other lists.

### 3.6 Other Section, Emergency Contact list and Doctor list

- **Other Section** (`#/other`): a homepage button/band ("Other Section")
  opens a page of categories; each category opens a driver-style list
  (`#/other/<category-slug>`) with the same search box, "available only"
  filter, cards, call/WhatsApp buttons and detail view as a normal list.
  A category is shown here only if its `Other Categories` cell on the
  `Vehicle Categories` tab is `TRUE` **and** at least one approved profile
  has that `Vehicle Type`. The bazar does not matter. Adding a new
  category = one new row in `Vehicle Categories`; no code change.
- **Emergency Contact** (`#/emergency`): every profile with
  `Emergency Contact = TRUE` (see §3.2) whose `Bazar` includes the chosen
  bazar.
- **Find a Doctor** (`#/doctor`): every profile with `Doctor Status = TRUE`
  (see §3.5).
- All lists use the same order: offline profiles last, then `Sort Status`,
  then `Star Rating`.
- **Card info line:** vehicle-type lists (CNG, Auto, ...) show the category
  and the service area; Other Section lists show only the service area;
  Doctor cards show the degree/qualification (if any) and the service area;
  the Emergency list shows the category as before; site search shows the
  category only for vehicle drivers.
- **Search** (`#/search` and the search boxes on the lists) matches the
  driver's name or phone number.

---

### 3.7 Home page, bazar memory and categories (area directory)

- The chosen bazar is remembered in the browser (`area.selectedMarket`). On the
  first visit a chooser appears, with a "Skip" button that uses the default bazar
  (`DEFAULT_MARKET_SLUG`). The home bar shows the bazar and lets people change it.
- The home page order is: hero, banner, a one-line bar with the "Notices & News"
  header (left, 50%, its speaker button reads notice no. 1 aloud) and the bazar
  button (right, 50%, shows only the bazar name; tapping it opens/closes the
  bazar chooser), notice no. 1, then the category cards under "Choose what you
  need". Notices no. 2 and onward appear at the very bottom, below the
  "Add your information" registration section, under a centered "Notices & News"
  header whose speaker button reads those notices. While the bazar chooser is
  open, the category cards are hidden until a bazar is picked.
  Notices and category cards are edited in `assets/home-content/home-content.js`
  (no backend work). A card for an Other category shows "Coming soon" until at
  least one approved profile exists for it in the chosen bazar.
- Each home notice can have its own background picture. The site first looks in
  `assets/banner-images/` for `home-notice-01.jpg`, `home-notice-02.jpg`,
  `home-notice-03.jpg` ... (the number is the notice's position on the home
  page, in the order written in `home-content.js`: notice 1 = `01`, notice 2 = `02`,
  and so on; add more numbers as notices grow). If that file is not there, it uses
  the Google Drive photo link in the notice's `bgImage` line (the Drive file must be
  shared as "Anyone with the link"; empty = no picture). A dark layer is
  added automatically so the white text stays readable. Pictures load in the
  background and never delay the text; Drive pictures are kept in the
  browser's photo cache. Recommended: JPG, roughly 2:1, compressed.
- A home notice's `link` can be a normal web address (opens in a new tab) or
  `#/driver/<Driver ID>` (e.g. `#/driver/D1264`): the profile card then opens
  over the page you are on, without reloading the app, and the Back button
  returns to the same place.
- Notice animation: a coloured light runs once around the header's border every
  ~11 seconds, and runs slowly and continuously around each notice card. It is
  drawn with a rotating layer (GPU-friendly) and is paused for any notice that
  is off-screen, so scrolling stays smooth. It is switched off automatically
  when the phone's "reduce motion" setting is on.
- Drivers, doctors, the Emergency list, the Other Section and site search
  follow the chosen bazar.
- The Other Section page lists only categories that do not already have a card
  on the home page.
- The top-menu "Drivers" link goes straight to the chosen bazar's vehicle types.
- To add a category such as Shop, add a row in the category sheet
  (`Vehicle Categories`, or `All Categories`) with `Other Categories` = TRUE.
  English Names used by the home cards: `Shop`, `Mosque & Madrasa`,
  `Notable People`, `Sports`, `School & College`.

### 3.8 Doctors by category, extra columns and renamed sheets

- A listing is a doctor when its category (the `Vehicle Type` / `Category`
  column) contains `Doctor`; add a category row with English Name `Doctor`.
  The older `Doctor Status` column still works. Doctors' degree/specialty goes
  in the `Qualification` column. The `Doctor` category never appears in the
  vehicle chooser or the Other Section.
- Extra columns in `Users` and `Pending Users`: `Qualification`, `Extra 1`,
  `Extra 2`, `Extra 3`, `Extra 4`. (For a map link or a longer description use the
  `Social Media URL` and `Personal Details` columns.)
- `Extra 1` to `Extra 4` hold category-specific details. Their labels are set per
  category in `CATEGORY_EXTRA_FIELDS` (`assets/home-content/home-content.js`),
  for example date, venue, organizer and result for `sports`.
- The backend accepts both old and new names. Sheet tab: `Vehicle Categories`
  or `All Categories`. Columns: `Driver ID`/`Profile ID`, `Vehicle Type`/`Category`,
  `Vehicle Number`/`Reference Number`, `Driver Image URL`/`Profile Image URL`,
  `Vehicle Image URL`/`Gallery Image URL`, `Driving Experience`/`Experience`,
  `Vehicle Categories Image URL`/`Category Image URL`.
- Admin Mode has **Add Directly** (creates an approved listing without the pending
  step; only name and phone are required) next to **Add User** (the normal form).
- Logged-in owners can edit their qualification (doctors) and the extra details
  from the profile page.

## 4. How to add things later

- **Add a new bazar:** add a row to `Markets` with `Status = Active`. It
  appears on the homepage automatically — no code changes. If there are
  more than 4 active bazars, the homepage shows the first 3 (by `Sort
  Order`) plus an "Others" tile that reveals the rest in place.
- **Add a new vehicle category:** add a row to `Vehicle Categories` the
  same way. The same "first 3 + Others" rule applies, and a category only
  shows for a given bazar if at least one approved driver in that bazar
  actually has that vehicle type — an active-but-empty category for that
  bazar stays hidden there (it can still show normally in a bazar that
  does have a driver for it).
- **Add a service to the Other Section:** add a `Vehicle Categories` row with `Other Categories = TRUE`, then give profiles that `Vehicle Type` (see §3.6).
- **Approve a driver:** use **Pending Users** → **OK** in the Admin
  Dashboard, or move their whole row from `Pending Users` to
  `Users` (see §3.2) — their `Username`/`Password` come along with it,
  so they can log in immediately with no separate account step.
- **Update a driver's photo:** edit `Driver Image URL` in the `Users`
  sheet. Google Drive share links are supported — the frontend converts
  them to a direct-view URL automatically (see `Utils.resolveImageUrl` in
  `js/utils.js`). If the URL is missing or broken, a placeholder icon is
  shown instead of a broken image.

---

## 5. Driver login & availability

- Only drivers need an account — customers never log in.
- Login uses **Username or Mobile Number + Password**.
- After login, a driver can only see and edit **their own** profile: the
  backend identifies the driver strictly from their session token, never
  from any ID the browser sends, so one driver can never modify another's
  row.
- The one thing a driver can change is **Availability** (Active /
  Inactive). This is separate from **Account Status** (whether the account
  itself is approved) — see `Code.gs` and `js/profile.js`.

---

## 5.5 Banners, section backgrounds & footer social links

All banner pictures live in `assets/banner-images/` and all banner videos are
set in `assets/banner-images/banner-videos.js` — see that folder's own
`README.md` for the exact filenames. Nothing needs a code change, and a
missing file never shows a broken-image icon.

- **Where banners appear:** Home, Markets, Emergency Contact, Find a Doctor,
  Other Section, and the driver list of every vehicle category (inside a
  bazar and inside the Other Section). Each is a 3-slide banner.
- **Slides:**
  - Slide 1 — Home: automatic headline text (follows the language toggle)
    on a solid background, with `home-banner-01.jpg` behind it if present.
    Other pages: a picture only (`<page>-banner-01.jpg`; on vehicle lists,
    the category photo from `assets/local-photos/vehicles/<slug>.jpg`, or from
    `assets/local-photos/categories/<slug>.jpg` for Other Section categories).
  - Slide 2 — an animated `.gif` is tried first, then the `.jpg`.
  - Slide 3 — a YouTube video (link in `banner-videos.js`) plays muted and
    automatically, with a small speaker button to turn the sound on/off; the
    slide stays until the video ends. If the video can't start (error,
    offline, empty link) the `…-banner-03.jpg` picture is shown instead.
    Vehicle-category video links go in the `vehicle03` list, one line per
    category slug.
- **Global banner (fallback):** put `global-banner-01.jpg`,
  `global-banner-02.gif` / `global-banner-02.jpg` and `global-banner-03.jpg`
  in `assets/banner-images/`. Wherever a page's own slide 1, 2 or 3 picture
  is missing, the global picture with the same number is shown instead
  (Home slide 1 is the text slide and is not affected). Optional overrides:
  `GLOBAL_BANNER_IMAGES` (`slide1`, `slide2Gif`, `slide2`, `slide3`) in
  `config/config.js`.
- **Timing and touch:** every slide stays 5 seconds (`BANNER_SLIDE_MS` in
  `js/drivers.js`); the banner also responds to touch swipe (left = next,
  right = previous), and swiping restarts the timer.
- **Config:** `BANNER_IMAGES`, `EMERGENCY_BANNER_IMAGES`,
  `DOCTOR_BANNER_IMAGES`, `MARKET_BANNER_IMAGES`, `OTHER_BANNER_IMAGES` and
  `SECTION_BACKGROUNDS` in `config/config.js` hold the file paths. Banners
  on non-home pages sit behind the breadcrumb (and the heading/subtitle on
  pages with a search bar) and never move the search bar, which always keeps
  a 12 px gap below the banner. On the Drivers (vehicle types) and Other
  Section category pages the heading and subtitle sit just below the banner.
- **Section backgrounds:** the homepage bands "Register as a Driver",
  "Other Section" and "Find a Doctor" use `home-registration-banner.jpg`,
  `home-other-banner.jpg` and `home-doctor-banner.jpg`, and the top button
  of registration Step 3 uses `register-photo-upload-bg.jpg`. Without the
  file, the normal solid color is kept.
- **Footer social links:** edit `SOCIAL_LINKS` in `config/config.js`.
  `call` and `whatsapp` take a plain phone number (the footer builds the
  `tel:` / wa.me link); `facebook`, `tiktok`, `instagram` and `website`
  take URLs. Leave an entry as `"#"` until you have a real URL — the icon
  still shows, it just doesn't go anywhere yet.

---

## 5.6 Performance & offline-friendly caching

Markets, Vehicle Categories, and the Driver directory (which also feeds the Emergency and Doctor lists) is cached
in the browser's `localStorage` (not just in memory), so:

- **Cold start / reopen / refresh**: whatever was last shown successfully
  is displayed **instantly** — no blank/loading screen — while a fresh
  copy is quietly fetched in the background.
- **A failed or slow refresh never erases what's already shown.** Old
  data is only replaced once a complete, valid new response has arrived
  (see `cachedCall()` in `js/api.js`).
- Driver availability is treated as more time-sensitive than
  static data: it refreshes on a shorter cycle (`STATUS_CACHE_TTL_MS` in
  `config/config.js`, 60 seconds by default) than Markets/Vehicle
  Categories (`CACHE_TTL_MS`, 5 minutes by default).
- Images are not re-fetched for a URL the browser has already
  downloaded — this relies on the browser's normal HTTP cache, plus
  `loading="lazy"` so off-screen photos don't load until needed. The
  service worker (§5.7) caches only the app's own files; Google Drive
  photos and Apps Script requests are deliberately never intercepted
  (caching them broke image loading in the past).

---

## 5.7 Installable app (PWA) & service worker

- `manifest.json` makes the site installable (standalone display, green
  theme color, 192/512 px icons from `assets/brand/`). On supported browsers
  a small banner (`js/pwa-install.js`) offers **Add to Home Screen**; on iOS
  it shows the manual steps instead. Dismissing it hides it for 1 day.
- `sw.js` caches the app shell — `index.html`, CSS, JS, `config/config.js`,
  logos and icons — so the site opens even offline. Pages are always
  requested from the network first, with the cached `index.html` as the
  offline fallback; Google Drive photos and Apps Script requests are never
  intercepted.
- When a new version of the site is deployed, the visitor sees a "new
  version is ready" banner with a refresh button.
- **Opening animation:** while the app is still starting, a small splash (logo, with
  the app name sliding up from below) is shown. It appears only if opening takes
  longer than 0.5 second; if the app opens faster, nothing is shown. It is plain
  CSS in `index.html` (id `app-splash`) and is removed by `hideSplash()` once the
  first screen is drawn (with an 8-second safety limit). It uses the existing
  `assets/brand/logo-low.png`, so no extra file is downloaded. To remove it, delete
  the `app-splash` block and its `<style>` in `index.html`, and the `hideSplash`
  lines in `js/app.js`.
- **Cache version:** `CACHE_VERSION` at the top of `sw.js` (currently `v6`)
  decides when visitors' old cached files are replaced. Change it only when
  you deliberately want every visitor to download the new app files; adding
  photos or banner files, or editing the Google Sheet, never needs it.
- If you add a new `.js`/`.css` file to the project, also add it to
  `APP_SHELL` in `sw.js` so it works offline.

---

## 5.8 Local (bundled) photos

Optional photos placed inside the project load instantly, work offline and
never depend on Google Drive. Each is tried first; if the file is missing,
the Sheet's link is used, then a plain icon. Always `.jpg`; file names are
case-sensitive on GitHub Pages.

| Folder | File name | Used for |
|---|---|---|
| `assets/local-photos/markets/` | `<market-slug>.jpg`, `<market-slug>-bg.jpg` | bazar card photo / card background |
| `assets/local-photos/vehicles/` | `<vehicle-slug>.jpg` | driver vehicle category photo only (also slide 1 of that category's banner) |
| `assets/local-photos/categories/` | `<slug>.jpg` | home category cards and Other Section category photos (also slide 1 of that category's banner) |
| `assets/local-photos/profilePhoto/` | `<Driver ID>.jpg` (e.g. `D1111.jpg`) | driver/doctor photo everywhere it appears |

The slug is the text after `/markets/` (or after the bazar name) in the page
address. See the README inside each folder for details.

---

## 5.9 Install screenshots & converting to an APK

- `assets/screenshots/` holds the four screenshots listed under
  `screenshots` in `manifest.json` (three phone-shaped `narrow` ones and one
  desktop-shaped `wide` one). Browsers and PWABuilder use them to show a
  richer install dialog. They are only read at install time, so they are
  deliberately **not** in the `sw.js` cache list.
- The site and the service worker work normally even if these pictures are
  missing; only the richer install dialog is lost and PWABuilder shows a
  warning. If you delete them, also remove the matching entries from
  `screenshots` in `manifest.json`. You may compress them freely as long as
  the pixel size, format and file name stay the same as written in the
  manifest. See the README inside the folder.
- `manifest.json` also has `launch_handler` (`navigate-existing`): opening
  the app from a link or a shortcut reuses the already-open app window
  instead of starting a second one.
- Converting to an APK (for example with PWABuilder): the site is served from
  a sub-folder (`.../amader-elaka/`), while Android's Digital Asset Links file
  (`.well-known/assetlinks.json`) must sit at the **root** of the domain. Without
  it the APK still works but shows the browser address bar at the top.

---

## 6. Known limitations

- Google Sheets is a lightweight, convenient store for a small local
  directory — it is **not** a transactional database. Under heavy
  simultaneous writes (e.g. many drivers toggling availability at once) it
  can be slower than a real database, and it has no built-in row-level
  locking. For this project's scale (a single bazar's worth of drivers)
  this is not expected to be an issue.
- Admin Mode only covers what is listed in "Admin Mode" above; anything
  else (for example setting `Admin Status`, or editing markets and vehicle
  categories) is still done directly in the spreadsheet.
- Demo mode's "backend" lives entirely in the visitor's own browser
  storage, so it resets if they clear site data, and different visitors in
  demo mode do not share data with each other. This is expected — demo mode
  exists for trying out the UI, not for running a real directory.

---

## 7. Security notes

- No Google credentials, API keys, or service-account secrets exist
  anywhere in the frontend code — only the public Apps Script Web App URL.
- Passwords are hashed (SHA-256) before they are ever written to a sheet,
  and are never returned to the browser at any point, including right
  after registration.
- The public driver directory only ever receives the specific fields
  listed in `publicDriverFields()` in both `js/api.js` (demo mode) and
  `google-apps-script/Code.gs` (real mode) — the `Users` sheet and the
  `Pending Users` sheet are never exposed to normal visitors.
- This is a practical, appropriate level of security for a small community
  tool — it is not a claim of bank-level security.

---

## 8. Deploying the site itself

The frontend is static HTML/CSS/JS, so it can be hosted anywhere that
serves static files — GitHub Pages, Netlify, Vercel, or a normal web host.
For GitHub Pages: push this folder to a repository and enable Pages on the
`main` branch (root). No build step is required.

`robots.txt` and `sitemap.xml` sit in the project root; if the site's public
address changes, update the URLs inside them and the `og:` tags in
`index.html`. The service worker (§5.7) needs the site to be served over
HTTPS (GitHub Pages already is).

The site is a single page (`index.html`) with hash-based routing
(`#/drivers/nobi-bazar/cng`, etc.), so it will not 404 on refresh when
hosted on GitHub Pages or any other static host.
