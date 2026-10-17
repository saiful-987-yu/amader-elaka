# Driver & Doctor Profile Photos (local, bundled with the site)

Drop a person's photo here to make it 100% reliable — always shows,
survives phone "clean/boost" apps, works offline, never depends on
Google Drive. Fully optional: anyone without a file here just uses
their Sheet photo link, exactly as before (and the plain person icon
if there is no link either).

## Filename = the person's own ID, exactly as in the Sheet

Drivers and doctors share this one folder (their IDs never overlap).

| Person's ID | File to add |
|---|---|
| `D1111` | `D1111.jpg` |
| `D1112` | `D1112.jpg` |

Rules:
- Always `.jpg` (not .png).
- Capital letters must match the Sheet exactly — `D1111.jpg`, not
  `d1111.jpg` (GitHub Pages file names are case-sensitive).

## Order it's tried in

1. **This folder** (file named after the ID)
2. The Sheet's photo link (with the same retry + local-database cache
   as before)
3. The plain person icon

## Where it applies

Everywhere that person's photo appears: Driver cards, Doctor cards,
Emergency list, the detail popup, and the logged-in Profile page plus
the small round photo in the mobile menu. One file, all places.

## Good to know

- Only add photos for the few people who matter (e.g. emergency
  services, top-rated drivers/doctors). No file = no cost.
- People with no file here cost one instant, harmless "file not found"
  check on your own site before falling back to the Sheet link.
- Replacing a photo (same name) shows the new one from the second
  visit onward. No code change or version bump needed for adding photos.
