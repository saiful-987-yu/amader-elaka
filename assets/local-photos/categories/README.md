# 🗂️ Category Photos

*Local photos, bundled with the site.*

One folder for every **non-vehicle** category picture: the home-page cards, the Other Section categories and any other category. Driver vehicle categories (`cng`, `auto`, `van`, …) stay in `assets/local-photos/vehicles/`.

Drop a photo here to show it next to the emoji icon on a home-page category card (the cards defined in `assets/home-content/home-content.js`), the same way the bazar and vehicle cards show their photos. **Fully optional:** a card with no file here simply shows its emoji icon, exactly as before.

## 🏷️ File name = the card's `id` in `home-content.js`

| File name | Card |
|---|---|
| `drivers.jpg` | Drivers |
| `doctor.jpg` | Doctors |
| `emergency.jpg` | Emergency |
| `shop.jpg` | Shops & Business |
| `mosque.jpg` | Mosque & Madrasa |
| `notable.jpg` | Notable People |
| `sports.jpg` | Sports & Tournaments |
| `education.jpg` | School & College |
| `other.jpg` | Others |

For a card you add later, use the `id` written on its line (e.g. `id: "farm"` → `farm.jpg`).

## 🔗 Other Section categories and banners

- Other Section categories use their own slug (the text after `/other/` in the page address), e.g. `mosque.jpg`.
- The same file is used as **slide 1 of that category's banner** — also for the Emergency, Doctor, Other and Drivers pages: `emergency.jpg`, `doctor.jpg`, `other.jpg`, `drivers.jpg`.
- A card `id` and a category slug that are the same share **one** picture.

> [!NOTE]
> Every file must be **`.jpg`**, roughly **2:1** (wider than tall), like the vehicle photos.

Just drop the file in and push to GitHub: **no code change and no backend work.**
