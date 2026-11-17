# Cambodia Travel Community — Design Overview

Nov 16, 2026 · @kry longdy

## Overview

The design covers a community travel platform for Cambodia as an installable web app (PWA): five core pages, each drawn for desktop/tablet and for phone, plus one alternative Home concept called the Season wheel.

- **Product:** locals and foreign travellers discover and share places to explore in Cambodia.
- **Users:** Cambodians aged 18–35 and foreign tourists, mostly on phones with slow internet.
- **Goal of the Home screen:** get the visitor to open a place within 10 seconds.
- **Canvas:** 12 artboards in two rows, "Desktop and tablet" (1280 px wide, fluid) and "Phone (installed PWA)" (390 px wide).
- **Languages:** English and Khmer, with a language toggle on every page.
- **Platform name:** not decided; the header shows a `[Platform name]` placeholder and a stand-in logo.

## Design language

The look is warm and photography-led, built on three Cambodia-inspired colours over a warm white ground, with no blue.

| Role | Colour | Hex | Used for |
| --- | --- | --- | --- |
| Primary | Deep forest green | `#1F4D3A` | Headings, search outline, primary buttons, best-month cells |
| Accent | Laterite red-orange | `#B8461F` | "Add a place" button, like hearts, links, selected map pin, "Open in Google Maps" |
| Surface | Warm sand | `#F3E9D8` | Chips, toggles, info cards, active tab |
| Ground | Warm white | `#FFFDF9` | Page background |
| Text | Dark green-black | `#1B2A22` | Body text |
| Muted text | Grey-green | `#5C665F` | Secondary lines, placeholders |

- **Type:** Bricolage Grotesque for headings, Noto Sans for body text, Noto Sans Khmer for Khmer script.
- **Shapes:** rounded cards (16–24 px corners), pill-shaped chips and buttons, soft shadows on photo cards.
- **Touch targets:** every button, chip and link is at least 44 px tall.
- **Photos:** large photo areas lead each card; they are currently labelled tinted blocks in pale green, sand and laterite tints.
- **Adjustable accent:** each artboard has one tweak, the accent colour.

## Screens

Five pages make up the core flow; each exists once for desktop/tablet and once for phone.

| Page | What it contains | Desktop and tablet | Phone |
| --- | --- | --- | --- |
| Home | Search by name, season filter ("Best in November"), province picker with photos and Khmer names, category chips (temples, waterfalls, beaches, mountains, food), "Best this month" photo cards with name, province and likes, "Recently added by the community", floating "Add a place" | Top navigation (Explore, Map, Saved, Log in); three cards per row; "See on map" link | Bottom tab bar (Explore, Map, Saved, Profile); cards stacked; provinces and chips scroll sideways |
| Place detail | Photos, category and province tags, "In season now" tag, likes, save, comments, description, What you need, Best season, Practical, Getting there, Local tours and guides, posted-by and last-updated, report link | Photo gallery on top; main column plus a side column for Getting there, tours and trust | Full-width photo with back and save buttons; Getting there moves up right after the description |
| Map view | Province, category and season filters; pins for matching places; selected place card with "View place" and "Directions" | Results list on the left, map on the right | Map fills the screen; filters scroll along the top; "Show list" button; place card at the bottom |
| Add a place | Required: photos, name, province and category, map pin. Optional: description, best months, entry fee for Cambodians and for foreigners, what to bring and how to get there | Single centred column, 720 px wide | One column; "Publish place" pinned at the bottom; "Draft saved on this phone" note |
| Sign up / Log in | Sign up and Log in tabs; name, email or phone number, password; "Keep browsing without an account" | Form on the left, large photo on the right | Single screen, no tab bar |

### Place detail fields

The sample place is Bou Sra Waterfall, Mondulkiri.

| Group | Fields shown |
| --- | --- |
| What you need | Entry fee (Cambodians and foreigners), ticket or pass, dress code, what to bring, difficulty |
| Best season | 12-month strip: best months filled green (Jul–Dec), months to avoid outlined in laterite (Mar–Apr), current month marked; a warning note for the months to avoid |
| Getting there | Map with pin, distance from the nearest town, transport options, road condition, "Open in Google Maps" button |
| Practical | Opening hours, time needed, facilities |
| Local tours and guides | Guide name, tour and price, a Telegram or Call button; a note that booking and payment happen outside the site |
| Trust | Posted by, last updated date, "Report a problem with this place" |

## Season wheel (alternative Home)

The Season wheel is a second Home concept that makes the month the first choice: tap a month and the page shows the places at their best then.

- **The wheel:** twelve month buttons around a ring, sand for the dry season (Nov–Apr) and pale green for the rainy season (May–Oct). The selected month is filled in the laterite accent.
- **Centre:** the selected month in English and Khmer, the season name, and the number of places at their best.
- **Headline:** "When are you going?", with the search bar kept above the wheel.
- **Cards:** a "Best in \[month\]" list of photo cards that changes with the month; it opens on November.
- **Phone:** the wheel sits above the cards (up to three), followed by provinces, categories and two recently added places.
- **Desktop and tablet:** the wheel sits on the left and up to four cards on the right; on a narrow tablet the wheel stacks above the cards.
- **Trade-off on phone:** the wheel fills most of the first screen, so the first place card starts lower than on the standard Home.

Both Home versions are on the canvas; no choice between them has been made yet.

## How the screens link

The artboards are linked as a clickable prototype, separately for the desktop row and the phone row.

&#91;embedded content: page flow · 5 pages, 7 links\]

Home reaches every other page directly; publishing a place or picking a map pin ends on Place detail, which links out to Google Maps for directions. On phone, a back button on Place detail, Add a place and Sign up returns to Home.

## Placeholders, sample content and gaps

The design is a layout and flow reference; most of its content is placeholder or sample and needs replacing before build.

**Placeholders to fill**

- [ ] Platform name and logo
- [ ] Real photos for provinces, places and the sign-up page
- [ ] Real maps in place of the tinted map blocks
- [ ] Entry fees, shown as `[PRICE]`
- [ ] Opening hours, shown as `[OPENING HOURS]`
- [ ] Guide names and tour prices, shown as `[GUIDE NAME]` and `[PRICE]`

**Sample content to verify**

- The places are real, but like counts, contributor names, comments and timestamps are made up.
- Bou Sra details (best months, 43 km from Sen Monorom, road, facilities) are illustrative.
- Best months for the seven Season wheel places are sample data.
- Khmer text (headline, province names, month names) needs a native reader's check.

**Not designed yet**

- Admin screens: review reports, edit or hide places, ban users.
- Saved page; the Saved link and tab go nowhere.
- Full Khmer versions of the pages.
- A separate tablet frame; tablet is covered by the desktop pages reflowing.
- Log in form state; only the Sign up tab is drawn.
