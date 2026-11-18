# 🚗 Vehicle-Category Photos

*Local photos, bundled with the site.*

Same idea as `assets/local-photos/markets/` — drop a real photo here to make a vehicle category's photo **100 % reliable**: offline from the very first visit, with no Google Drive or internet dependency. **Fully optional:** a category with no file here falls back to the Sheet's Drive link (or the plain built-in icon if there is no link either).

## 🏷️ File name = the vehicle type's own slug

Same rule as the markets folder: whatever comes right after the market slug in the address bar is the slug to use here.

**Example** — `.../markets/abdur-rab-bazar/easy-bike` means this category's slug is `easy-bike`, so the file is:

| File name | What it is for |
|---|---|
| `easy-bike.jpg` | This vehicle category's photo (shown on its selection card, and slide 1 of its banner) |

> [!NOTE]
> Every file must be **`.jpg`**. Slugs already in the system: `cng`, `auto`, `van`, `motorcycle`, `easy-bike` — but any slug the Sheet ever introduces works the same way, with no code change.

## 🔀 Order it is tried in

1. **This folder** — instant, same-origin, offline-forever once loaded once
2. The Sheet's Drive link, if any (same retry system as driver / doctor photos)
3. The plain built-in vehicle icon (if neither worked)

## ➕ Adding a new vehicle type later

Just drop the file in here and push to GitHub — no code change, no version bump.
