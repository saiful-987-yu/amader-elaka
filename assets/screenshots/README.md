# Install screenshots

These pictures are listed under `screenshots` in `manifest.json`. Browsers and
PWABuilder show them in the install dialog of the app. They are not used
anywhere else on the site and are not part of the `sw.js` cache.

| File | Size (px) | Type | form_factor | Label |
|---|---|---|---|---|
| `narrow-home.jpg` | 1080 x 2436 | image/jpeg | narrow | Home |
| `narrow-drivers.jpg` | 1080 x 2436 | image/jpeg | narrow | Drivers |
| `narrow-doctors.jpg` | 1080 x 2436 | image/jpeg | narrow | Doctors |
| `wide-home.png` | 1920 x 1080 | image/png | wide | Home |

## If a picture is missing

The site and the service worker keep working. Only the picture in the install
dialog is lost, and PWABuilder shows a warning. If you delete a picture, also
delete its entry from `screenshots` in `manifest.json`.

## Making the files smaller

You may compress or re-export them as long as these stay exactly the same:

- the pixel size written in the table above (it must also match `sizes` in `manifest.json`)
- the format (`.jpg` stays JPEG, `.png` stays PNG)
- the file name

If you change any of these, update the matching entry in `manifest.json`.
All narrow screenshots should keep the same shape, and the wide one the same shape as itself.

## Replacing them

Put the new picture here with the same file name. No other file needs to change.
