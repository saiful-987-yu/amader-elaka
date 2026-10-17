# Vehicle-Category Photos (local, bundled with the site)

Same idea as `assets/local-photos/markets/` — drop a real photo here to
make a vehicle category's photo 100% reliable, offline from the very
first visit, no Google Drive or internet dependency at all. Fully
optional; any category with no file here just falls back to the Sheet's
Drive link (or the plain built-in icon, if there's no link either).

## Filename = the vehicle type's own slug (exactly what's already in the URL)

Same rule as the markets folder: whatever comes right after the market
slug in the address bar is the slug to use here.

Example — `.../markets/abdur-rab-bazar/easy-bike` means this category's
slug is `easy-bike`, so the file is:

| Filename | What it's for |
|---|---|
| `easy-bike.jpg` | This vehicle category's photo (shown on its selection card) |

Every file must be `.jpg`. Common slugs already in the system: `cng`,
`auto`, `van`, `motorcycle`, `easy-bike` — but any slug the Sheet ever
introduces works the same way, with no code change.

## Order it's tried in

1. **This folder** (instant, same-origin, offline-forever once loaded once)
2. The Sheet's Drive link, if any (same retry system as driver/doctor photos)
3. The plain built-in vehicle icon (if neither of the above worked)

## Adding a new vehicle type later

Just drop the file in here and push to GitHub — no code change, no
version bump needed.
