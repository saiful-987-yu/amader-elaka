# Market Photos (local, bundled with the site)

Drop real photos here to make a market's photo/background 100% reliable
— always shows, works offline from the very first visit, never depends
on Google Drive or the internet at all. This is a NEW, optional first
step before the Sheet's Drive-link system; nothing here is required —
any market with no file in this folder just falls back to the existing
Drive link (or the plain icon, if there's no link either).

## Filename = the market's own slug (exactly what's already in the URL)

Open that market on the live site and look at the address bar —
whatever comes right after `/markets/` is the slug to use here. No
separate naming step, no guessing: it's the same lowercase,
hyphen-separated text the Sheet/site already generates automatically.

Example — `https://saiful-987-yu.github.io/amader-elaka/#/markets/abdur-rab-bazar/easy-bike`
means this market's slug is `abdur-rab-bazar`, so:

| Filename | What it's for |
|---|---|
| `abdur-rab-bazar.jpg` | The market's own photo (shown on its selection card) |
| `abdur-rab-bazar-bg.jpg` | The market's card background image |

Every file must be `.jpg`. A market can have one, both, or neither —
whichever files aren't here just fall through to the Drive link/icon
exactly as before.

## Order it's tried in (for both the photo and the background)

1. **This folder** (instant, same-origin, works offline forever once
   loaded once — no internet needed after that)
2. The Sheet's Drive link, if any (same retry system as driver/doctor
   photos)
3. The plain icon/blank background (if neither of the above worked)

## Adding a new market later

Just drop the two files in here (or however many you have) and push to
GitHub — no code change, no version bump needed. The very first person
to open that market after the update downloads it once like any other
site file; every visit after that (online or offline) is instant.
