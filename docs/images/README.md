# Application screenshots

This folder holds the images shown in the [root README](../../README.md) gallery.

Every file here right now is a **generated placeholder**. Overwrite it with a real screenshot using the **same filename** and the README updates itself — no markdown edit needed.

---

## Expected files

| Filename | Shows | Capture at |
|---|---|---|
| `01-home.png` | Homepage — hero, search bar, featured properties grid | `/` |
| `02-listings.png` | Listings — filter drawer open, sorting, pagination | `/buy` or `/rent` |
| `03-property-details.png` | Property detail — gallery, specs, features, agent card, location map | `/property/buy/{id}` |
| `04-map-search.png` | Map view — price bubbles in a viewport, a card popover open | listings map toggle |
| `05-admin-dashboard.png` | Admin dashboard — monthly statistics, most-viewed | `/admin` |
| `06-admin-properties.png` | Admin properties — the table, or the create/edit form with media | `/admin/properties` |
| `07-admin-permissions.png` | Positions and permissions — the grant matrix | `/admin/positions/{id}` |
| `08-mobile.png` | Mobile — a narrow viewport of the homepage or a listing | any, at 390 px wide |

Adding more is fine. If you do, add the row to the gallery table in the root README so it is actually visible.

---

## Conventions

| | |
|---|---|
| **Format** | PNG for UI (crisp text). JPEG only for photo-heavy captures where the file would otherwise be large |
| **Size** | 1600 × 900 for desktop, 390 × 844 for mobile |
| **File size** | Keep under ~400 KB each — run them through `pngquant` or TinyPNG |
| **Browser chrome** | Crop it out. Capture the viewport, not the window |
| **Theme** | Light for public pages, the dark admin theme for `/admin/*` — that contrast is part of the design and worth showing |
| **Zoom** | 100%. Retina captures are fine; downscale to the target width |

### Content rules

- **Use seeded demo data only.** No real client names, phone numbers, email addresses or transaction values.
- **Never capture a signed-in session that shows a real token**, and crop or blur anything resembling a credential.
- Prefer a populated state over an empty one — a listings page with results says more than one with a spinner.
- If you are showing an error or empty state deliberately, name the file accordingly (`09-empty-state.png`) so nobody mistakes it for a bug.

### Capturing

```bash
# macOS — region capture to the clipboard, then paste and save
Cmd + Shift + 4

# Chrome DevTools — a clean, exact-size viewport capture
# ⌘⇧P → "Capture screenshot" (viewport) or "Capture full size screenshot"

# Mobile — DevTools device toolbar, iPhone 14 Pro (390 × 844)
```

For the admin screens, log in with the `MAIN_ADMIN_EMAIL` from your local `.env` and use the seeded data — `SEED_DATA=true` produces 49 listings, 12 agents, 15 areas and 14 developments, which photographs well.

---

## Regenerating the placeholders

They were produced with Pillow at 1600 × 900 using the brand palette (`#2B2D42` header, `#EF233C` accent, `#F6F7FA` field). There is no script committed for it — if you need a new placeholder, the simplest path is to copy an existing PNG and rename it, or just add the real screenshot and skip the placeholder entirely.
