# Chili Cookoff Voting App — PRD

Oct 25, 2026 · @Joel

## Overview

A mobile web app for today's neighborhood chili cookoff: tasters scan one QR code, tag chilis live, and submit a ranked top-3 ballot; results stay hidden until a host-set reveal time. Deploy on Vercel + Supabase, live and tested before the event starts (about 4 hours from now, so target a 2.5-hour build).

**Event size:** about 20 chilis, 30–50 voters, one afternoon. One-off; no multi-event support.

**Success means:**

- A taster goes from QR scan to ballot submitted in under 60 seconds, with no sign-up or app install.
- Tags appear on every open phone within 2 seconds of being added.
- Nobody can see standings before the reveal time, even by inspecting network traffic.
- At reveal, every open phone shows the ranked results.

## Scope

| In v1 (must ship today) | Out of v1 |
| --- | --- |
| One event-wide QR code opening the web app | Native iOS/Android app |
| "Add a chili" walkthrough for cooks: name, optional description, allergens | Ingredient lists, recipes, photo uploads |
| One ballot per device (anonymous device ID) | Accounts, sign-in, phone verification |
| Ranked top 3, scored 3/2/1 points | Instant runoff; ranking all 20 |
| Preset tags with live counts per chili | Free-text tags |
| Host-set reveal time, enforced on the server | Multiple events, categories, judges' panel |
| Host admin page behind a passcode | Recipe requests, history across years |
| Results on every phone at reveal | TV / big-screen display, push notifications, email |

Cheating is out of scope beyond the device ID: a private window can vote again. That's acceptable for a casual event; don't spend build time on it.

## User flows

The event moves through three phases, set by the host: **Setup** (cooks add their chilis, host reviews), **Voting** (tagging and ballots open), **Revealed** (voting closed, results visible to all). The app moves from Voting to Revealed automatically at the reveal time.

**Cook (Add a chili walkthrough)**

1. Scans the same QR code and taps "Bringing a chili? Add it" on the home screen.
2. **Step 1 – Name:** enters the chili's name (required) and their own name (optional, hidden until reveal).
3. **Step 2 – Description:** a short description, or taps Skip.
4. **Step 3 – Allergens:** ticks every allergen that applies, or ticks "None of these". One of the two is required.
5. **Step 4 – Review:** checks the summary, edits any step, and submits.
6. Sees the assigned pot number in large type, with a prompt to write it on the table card. Their chili appears on everyone's list right away.
7. Can reopen and edit their own chili from the same phone until the reveal.

**Taster**

1. Scans the QR code on the table; the app opens to the chili list, sorted by pot number.
2. The app creates a device ID on first load and keeps it in localStorage.
3. Taps a chili to see its name, its live tags and counts, and tag buttons; taps a tag to add it (taps again to remove).
4. Opens the ballot, picks 1st, 2nd and 3rd (three different chilis), and submits.
5. Sees a confirmation with a countdown to the reveal; can change the ballot until voting closes.
6. At reveal time, the phone switches to the results screen without a reload.

**Host**

1. Opens `/admin`, enters the passcode.
2. Reviews the chilis cooks have added: fixes names, changes pot numbers if needed, removes duplicates, and adds entries for cooks without a phone.
3. Sets the reveal time and opens voting; prints or displays the QR code from the admin page.
4. During the event: watches the ballot count, removes a bad tag if needed, can close voting early or move the reveal time.
5. At reveal: nothing to do; results appear on every phone automatically.

## Functional requirements

**Chili list and detail**

- FR1. List all chilis by pot number: large tap targets, pot number prominent, name below. Allergen badges sit under the name; the cook's name is not shown before reveal.
- FR2. Each chili shows its top 3 tags with counts on the list, and all tags on the detail view.

**Add a chili walkthrough** (route `/add`)

- W1. A 4-step flow, one step per screen, with a progress indicator (Step 2 of 4), Back and Next buttons, and answers kept if the cook goes back.
- W2. Step 1 – Name: chili name required, 2–40 characters; cook name optional, up to 40 characters. Names must be unique, case-insensitive, with a friendly error if taken.
- W3. Step 2 – Description: optional, up to 200 characters with a live counter; Skip moves on.
- W4. Step 3 – Allergens: a checklist of the 9 US major allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame) plus gluten, since beer and thickeners are common in chili. A separate "None of these" option clears and disables the others. Next stays disabled until something is ticked, so "no allergens" is always a deliberate answer.
- W5. Step 4 – Review: shows all answers with an Edit link per step, and the note "Allergen info comes from the cook; ask them if you're unsure." Submit sends one request to `/api/chili`.
- W6. On success: show the auto-assigned pot number in large type and a "Write this on your table card" prompt. The new chili streams to every open list via Realtime.
- W7. The creating device can edit its chili (all fields) until reveal; up to 3 chilis per device. The host can edit or delete any chili.
- W8. The walkthrough is available while the host has entries open (`event.entries_open`), in Setup and Voting; otherwise the home-screen button is hidden.
- W9. Tasters see allergens as badges on the list and in full on the chili detail, with the same disclaimer.

**Tags**

- FR3. Preset tags only: Spicy, Mild, Smoky, Meaty, Veggie, Beany, Sweet, Tangy, Rich, Unique. Each tag has a stable `id`, a label, and an optional `same_as` URI (FoodOn, ChEBI or Wikidata) for later RDF export.
- FR4. A device can apply each tag to a chili once; tapping again removes it.
- FR5. Tag counts update live on every open phone (Supabase Realtime), within 2 seconds.
- FR6. Tags are open during Voting only.

**Ballot**

- FR7. A ballot is three distinct chilis ranked 1st, 2nd, 3rd. Submit is disabled until all three are picked. *(Open question: allow ballots with only 1–2 picks?)*
- FR8. One ballot per device ID: resubmitting replaces the earlier ballot (upsert), until voting closes.
- FR9. Scoring: 1st = 3 points, 2nd = 2, 3rd = 1. Ties are broken by number of 1st-place votes, then 2nd-place votes; remaining ties are shown as ties.
- FR10. After submitting, the voter sees their picks and a countdown to the reveal.

**Reveal**

- FR11. The host sets `reveal_at`. Before it, the results endpoint returns nothing, enforced in the database, not just hidden in the UI.
- FR12. At `reveal_at`, voting and tagging close and all clients switch to results within 5 seconds (realtime event plus a client timer as backup).
- FR13. Results show every chili ranked by points, with points, 1st-place count, cook name and top tags. Medals for the top 3.
- FR14. Before reveal, the home screen shows the ballot count and a countdown to the reveal time.

**Admin**

- FR15. `/admin` is protected by a single passcode from an environment variable; every admin write goes through a server route that checks it.
- FR16. Admin can add, edit and delete chilis; set or change `reveal_at`; open or close entries and voting; delete individual tags or clear a tag from a chili.
- FR17. Admin sees the live ballot count and tag activity, but not standings before reveal.
- FR18. Admin page shows the QR code for the app URL, large enough to print.

## Architecture and data model

Next.js (App Router, TypeScript, Tailwind) on Vercel; Supabase for Postgres and Realtime. Phones read public data directly from Supabase with the anon key; every write goes through a Next.js route handler that uses the service-role key and checks the event state. Ballots are never readable by the anon role, and results come only from a database function that returns nothing before `reveal_at`.

&#91;embedded content: architecture · 3 clients, Vercel, Supabase\]

All writes pass through Vercel's API routes; reads go straight to Supabase, where `get_results()` is the only way to see standings.

**Tables**

| Table | Columns | Notes |
| --- | --- | --- |
| `event` | `id` (always 1), `name`, `status` (setup / voting / revealed), `reveal_at` timestamptz, `entries_open` bool | Single row. Anon can read. |
| `chilis` | `id` uuid, `pot_number` int unique (identity, auto-assigned), `name` (unique, case-insensitive), `description` null, `cook` null, `owner_device_id`, `created_at`, `updated_at` | Anon reads through view `chilis_public`, which hides `cook` and `owner_device_id` until reveal (`owner_device_id` always). In the Realtime publication. |
| `allergens` | `id` text, `label`, `same_as` text null, `sort` int | Seeded: milk, eggs, fish, shellfish, tree\_nuts, peanuts, wheat, soy, sesame, gluten. Anon can read. |
| `chili_allergens` | `chili_id`, `allergen_id`; PK (chili\_id, allergen\_id) | No rows = "none of these" (the walkthrough makes that an explicit choice). Anon can read. |
| `tags` | `id` text, `label`, `same_as` text null, `sort` int | Seeded with the 10 preset tags. Anon can read. |
| `chili_tags` | `chili_id`, `tag_id`, `device_id`, `created_at`; PK (chili\_id, tag\_id, device\_id) | Anon can read (counts only, via view `tag_counts`). In the Realtime publication with `replica identity full` so deletes stream. |
| `ballots` | `device_id` text PK, `first_id`, `second_id`, `third_id` (uuid FKs), `updated_at` | Check: all three distinct. No anon access at all. |

**Database functions**

- `voting_open()`: true when `status = 'voting'` and `now() < reveal_at`.
- `get_results()`: `security definer`; returns nothing until `now() >= reveal_at`, then each chili with points, 1st/2nd/3rd counts, cook and rank. Granted to anon.
- A `pg_cron` job, or the check inside `voting_open()`, makes the reveal time a hard cutoff even if the host does nothing.

**API routes** (all `POST`, JSON, validated with zod)

| Route | Body | Rule |
| --- | --- | --- |
| `/api/chili` | `deviceId`, `name`, `cook`?, `description`?, `allergens` \[ids\] or `noAllergens: true` | Rejected unless `entries_open` and before reveal; max 3 per device. Inserts the chili and its allergens in one transaction; returns `pot_number`. |
| `/api/chili/update` | `deviceId`, `chiliId`, changed fields | Only the `owner_device_id`, only before reveal. Replaces the allergen set. |
| `/api/chili/mine` | `deviceId` | Returns this device's chilis, for editing. |
| `/api/tag` | `chiliId`, `tagId`, `deviceId`, `on` | Rejected unless `voting_open()`. Insert or delete one row. |
| `/api/ballot` | `deviceId`, `picks` \[3 ids\] | Rejected unless `voting_open()`. Upsert on `device_id`. |
| `/api/ballot/mine` | `deviceId` | Returns that device's own picks, so a returning voter sees them. |
| `/api/admin/*` | passcode header + payload | Chilis CRUD, `entries_open`, set `reveal_at`/`status`, delete tags, ballot count. |

**Device ID:** `crypto.randomUUID()` on first load, stored in localStorage and mirrored to a long-lived cookie; sent with every write.

**Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE`, `NEXT_PUBLIC_APP_URL` (for the QR code).

## Non-functional requirements and risks

- **Mobile first:** designed for a 375 px phone held in one hand, outdoors. High contrast, tap targets at least 48 px, no hover-only controls.
- **Weak signal:** first load under 200 KB of JavaScript; writes show a pending state and retry up to 3 times; the ballot is kept in localStorage until the server confirms it.
- **Load:** 50 voters and about 1,000 tag taps fit easily in the Supabase and Vercel free tiers. No caching layer needed.
- **Clocks:** use the server's time for the reveal, never the phone's. The client countdown is cosmetic; the database decides.
- **Accessibility:** semantic buttons, visible focus, ranks readable without color.

| Risk | Fallback |
| --- | --- |
| Build isn't done in time | Cut in this order: admin tag moderation, tag removal, cook edit-after-submit. Walkthrough, ballot and reveal are the core. |
| Venue has no signal | Use the existing Claude ballot page on the host's phone as a pass-around voting device. |
| Supabase Realtime drops | Clients also poll the chili list, tag counts and event state every 10 s. |
| Someone votes repeatedly in private windows | Accepted. Host can eyeball the ballot count against headcount. |
| Junk or offensive chili names or descriptions | Host edits or deletes from `/admin`; entries are short and capped at 3 per device. |
| Wrong or missing allergen info | Self-reported by the cook; the disclaimer is shown wherever allergens appear. |
| Two cooks submit the same chili | Unique-name check; host removes duplicates. |

## Build plan for Claude Code

Build in this order and deploy after step 3, so a working link exists early. Times are targets inside a 2.5-hour window.

1. **Scaffold (15 min):** Next.js + Tailwind + Supabase client; one SQL migration with tables, views, RLS, `voting_open()`, `get_results()`, seeded tags, allergens and event row. Deploy an empty shell to Vercel.
2. **Add a chili walkthrough (30 min):** `/add` 4-step flow, `/api/chili`, success screen with pot number, edit-my-chili.
3. **Chili list + tags (30 min):** list and detail views with allergen badges, tag toggle via `/api/tag`, Realtime on `chilis` and `chili_tags` plus 10 s polling. **Deploy, and share the link with cooks so they can start adding chilis.**
4. **Ballot (25 min):** pick-3 screen, `/api/ballot` upsert, "my ballot" view with countdown.
5. **Admin (20 min):** passcode gate, chilis edit/delete, entries and reveal controls, ballot count, QR code (the `qrcode` package).
6. **Reveal (15 min):** results screen from `get_results()`, auto-switch on the `event` Realtime update or client timer.
7. **Test (20 min):** run the checklist below on two real phones on cellular data.

**Acceptance checklist**

- [ ] Scanning the QR code opens the chili list on iOS Safari and Android Chrome.
- [ ] A cook completes the walkthrough in under 90 seconds and gets a pot number; the chili appears on another phone within 2 s.
- [ ] Step 3 can't advance until an allergen or "None of these" is ticked; ticking "None of these" clears the others.
- [ ] Going Back in the walkthrough keeps earlier answers.
- [ ] A duplicate chili name is rejected with a clear message; a 4th chili from one device is rejected.
- [ ] A cook can edit their own chili, and another device can't.
- [ ] A tag added on phone A appears on phone B within 2 s; removing it also syncs.
- [ ] The same device can't apply the same tag twice to one chili.
- [ ] A ballot with duplicate chilis is rejected by the API and by the database check.
- [ ] Resubmitting from the same device replaces the earlier ballot; the ballot count doesn't increase.
- [ ] Before `reveal_at`, calling `get_results()` with the anon key returns no rows, and `ballots` returns no rows.
- [ ] After `reveal_at`, chili, tag and ballot writes are rejected, and every open phone shows results within 5 s.
- [ ] Points and ties match a hand count on 5 test ballots.
- [ ] Cook names are hidden everywhere until reveal.
- [ ] Admin routes reject requests without the passcode.
- [ ] Test data cleared before cooks start adding real chilis.

**Open questions**

- Allow partial ballots (1–2 picks)? Default: no.
- Reveal time? Host sets it on the day, from the admin page.
- Show a live ballot count to tasters before reveal? Default: yes, count only.
