# 🏪 Market Photos

*Local photos, bundled with the site.*

Drop real photos here to make a market's photo / background **100 % reliable** — it always shows, works offline from the very first visit, and never depends on Google Drive or the internet. This is an optional first step before the Sheet's Drive-link system; nothing here is required — a market with no file here simply falls back to the Drive link (or the plain icon if there is no link either).

## 🏷️ File name = the market's own slug

Open the market on the live site and look at the address bar — whatever comes right after `/markets/` is the slug to use here. No separate naming step, no guessing: it is the same lowercase, hyphen-separated text the Sheet / site already generates.

**Example** — `https://saiful-987-yu.github.io/amader-elaka/#/markets/abdur-rab-bazar/easy-bike` means this market's slug is `abdur-rab-bazar`, so:

| File name | What it is for |
|---|---|
| `abdur-rab-bazar.jpg` | The market's own photo (shown on its selection card) |
| `abdur-rab-bazar-bg.jpg` | The market's card background image |

> [!NOTE]
> Every file must be **`.jpg`**. A market can have one, both, or neither — files that are not here fall through to the Drive link / icon exactly as before.

## 🔀 Order it is tried in (photo and background)

1. **This folder** — instant, same-origin, works offline forever once loaded once
2. The Sheet's Drive link, if any (same retry system as driver / doctor photos)
3. The plain icon / blank background (if neither worked)

## ➕ Adding a new market later

Drop the two files in here (or however many you have) and push to GitHub — no code change, no version bump. The first person to open that market after the update downloads it once like any other site file; every visit after that (online or offline) is instant.
