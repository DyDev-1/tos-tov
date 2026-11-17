# Loading places from a spreadsheet

Stage 1 of the launch needs 100 to 200 places added by the team. You can type them in a spreadsheet
(Google Sheets, Excel) and load them all at once.

**The importer never invents anything.** Whatever is empty stays empty ("Not listed yet" on the site).
Check fees, opening hours and coordinates against a real source before you import.

## Steps

1. Open `places.template.csv` in a spreadsheet. The first row has the column names. Do not rename them.
2. Fill one row per place. The columns are explained below. `places.example.csv` shows two finished rows.
3. Save as CSV (Google Sheets: File > Download > Comma-separated values). Keep the file in UTF-8, so Khmer shows correctly.
4. **Check without writing anything:**
   ```bash
   npm run db:import -- data/places.csv --dry-run
   ```
   It lists every problem with the row number. Fix them in the spreadsheet and check again.
5. **Import for real:**
   ```bash
   npm run db:import -- data/places.csv --admin-email=you@example.com
   ```
   To import into staging or production, add `ENV_FILE=.env.staging` in front (see the README).

Good to know:

- **All or nothing.** If even one row has a problem, nothing is written.
- **Existing places are left alone** (matched by the `slug`). Add `--update` to change them from the file. This
  overwrites edits made in the admin screens, so use it with care.
- `--pending` adds the places as "waiting", so an admin can look at each one before it goes live.
- `--strict` treats warnings (for example "no Khmer name" or "within 150 m of another place") as problems.
- `--admin-email` records who imported (it shows as "Added by" and in the activity log). The person must be an admin.

## Columns

| Column | Required | What to write |
| --- | --- | --- |
| `slug` | no | The web name, like `bou-sra-waterfall`. Lowercase letters, numbers and dashes. If empty it is made from `name_en`. It must not change later. |
| `name_en`, `name_km` | English yes, Khmer strongly advised | The name in each language. Without a Khmer name, Khmer visitors see the English one (you get a warning). |
| `tagline_en`, `tagline_km` | no | One short line for the cards, up to 160 characters. |
| `description_en`, `description_km` | no | A short description, up to 2000 characters. |
| `province` | yes | The province name ("Siem Reap") or its web name (`siem-reap`). One of the 25 provinces. |
| `category` | yes | `temples`, `waterfalls`, `beaches`, `mountains` or `food` (or any category an admin added). |
| `lat`, `lng` | yes | The map pin, in decimal degrees: `12.5135` and `107.4287`. Latitude first. Cambodia is roughly 10 to 14.7 and 102.3 to 107.6. |
| `entry_fee_khr` | no | Riel for Cambodians, a whole number. `0` means free. Empty means not known. |
| `entry_fee_usd` | no | US dollars for foreigners, like `5` or `2.5`. `0` means free. Empty means not known. |
| `best_months` | no | Months at their best: numbers `7 8 9`, a range `7-12`, or names `Jul-Dec`. A range may wrap the year: `11-2` is Nov, Dec, Jan, Feb. Without it the place is missing from season filters. |
| `avoid_months` | no | Months to avoid, same format. A month cannot be in both columns. |
| `photo_urls` | no | Addresses of photos already uploaded to our photo storage, separated by spaces. They must start with `R2_PUBLIC_URL`. Up to 10. |
| `ticket_*`, `dress_code_*`, `what_to_bring_*`, `difficulty_*`, `nearest_town_*`, `transport_*`, `road_*`, `opening_hours_*`, `time_needed_*`, `facilities_*`, `avoid_note_*` | no | The facts on the place page. Each has an `_en` (English) and a `_km` (Khmer) column, up to 500 characters. `avoid_note` is the warning shown under the month strip. |

Local tours and guides are not imported: add them in the admin screen after checking each contact.
