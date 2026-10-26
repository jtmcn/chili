# Cook-Off History Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every year's results by archiving the live event into read-only history tables before each reset, and show them at `/history`, starting with 2026.

**Architecture:** The live app stays single-event (`event.id = 1`). A `security definer` function, `archive_event()`, snapshots the revealed results, tags, allergens and photo paths into `past_events` and `past_chilis`. `npm run event -- archive` calls it, then copies the photos under a `<year>/` prefix in the same bucket. `reset_event()` refuses to wipe an unarchived event unless forced, and `reset` deletes only the photos that aren't archived. `/history` reads the past tables with the anon key, like the rest of the public reads.

**Tech Stack:** Next.js App Router (Cache Components), `@supabase/supabase-js`, pgTAP via `supabase test db`, Vitest + Testing Library, Node 24 type stripping for `scripts/event.mts`.

**Spec:** "Option A" from the 2026-10-26 planning session, restated in **Design** below. Background: `docs/prd.md`, `docs/running-next-year.md`.

## Design

- `past_events(year int pk, name text, held_on date, ballot_count int, archived_at timestamptz default now())`
- `past_chilis(year int → past_events on delete cascade, pot_number int, name text, cook text null, description text null, allergen_ids text[], photo_path text null, points int, firsts int, seconds int, thirds int, rank int, tag_counts jsonb)` with primary key `(year, pot_number)`. `tag_counts` is `{"spicy": 4, …}` with every tag that has at least one tap. `owner_device_id` is never archived.
- `event.archived_year int null`: set by the archive, cleared by the reset. A reset is allowed when there are no chilis, when `archived_year` is set, or when forced.
- Archived photos are copied, not moved, so the live results keep their images until the reset. The archived path is `<year>/<original path>`.
- `held_on` is the reveal date in the machine's local time zone (`--held-on YYYY-MM-DD` overrides it). `year` defaults to the year of `held_on` (`--year` overrides it).

## Global Constraints

- Branch `joel/history-archive`. Commits have no co-author lines.
- Code comments: 1–2 lines, only the non-obvious why.
- New migration: `supabase/migrations/20261026000200_history.sql`. Never edit earlier migrations.
- New functions are revoked from `public, anon, authenticated` and granted to `service_role`, following `20261026000100_next_year.sql`. `grant_gaps()` must stay empty.
- New tables: RLS enabled, `grant select … to anon`, and a `for select to anon using (true)` policy, following `init.sql` lines 79–91. No anon writes.
- Database errors are raised as bare messages that `fromDbError`/the script map: `not_revealed`, `already_archived`, `not_archived`.
- Exact copy:
  - Home link "Past cook-offs".
  - `/history` heading "Past cook-offs"; rows read "2026 · Overlook Chili Cook-Off" and "5 chilis · 22 ballots"; empty state "No past cook-offs yet."
  - `/history/[year]`: heading "<name>, <year>"; unknown year "No cook-off on record for <year>." plus the link "All past cook-offs".
- Node is run as `fnm exec --using=24 --`.

## Review Focus

- **Archiving before the reveal, or twice:** it must fail without writing anything (`not_revealed`, `already_archived`). Task 1 tests both.
- **Re-running `archive` after the photo copy failed partway:** it must skip the database step and copy only the missing objects. Task 2 tests a re-run.
- **A revealed event with zero ballots:** it archives every chili with 0 points and rank 1 (all tied), and history shows "T-1st". Tests in Task 1 (database) and Task 3 (UI).
- **`reset` after archiving:** it must keep the `<year>/…` objects and delete the rest, and a new event must start with `archived_year` null so next year can't skip archiving. Tests in Tasks 1 and 2.
- **Unknown or non-numeric year in `/history/[year]`:** it shows the "No cook-off on record" state, not a crash or blank page. Task 3 tests `/history/abc` and `/history/2031`.

---

### Task 1: History tables, archive function, reset guard

**Files:**
- Create: `supabase/migrations/20261026000200_history.sql`
- Create: `supabase/tests/database/12_history.test.sql`
- Modify: `supabase/tests/database/11_update_and_reset.test.sql` (the `reset_event` call passes `p_force => true`, since it resets unarchived chilis)
- Modify: `src/lib/database.types.ts` (regenerate)
- Modify: `tests/integration/helpers.ts` (`resetDb` also deletes `past_events` and clears `event.archived_year`)

**Interfaces:**
- Produces: `public.archive_event(p_year int, p_held_on date) returns int` (number of chilis archived), and `public.reset_event(p_name text default null, p_force boolean default false) returns void`. Drop the old one-argument `reset_event(text)` first.
- Produces: tables `past_events` and `past_chilis` and column `event.archived_year`, as in **Design**.

- [ ] **Step 1: Write `12_history.test.sql`** with a `plan()` count matching the assertions below, inside `begin … rollback`. Seed it with `create_chili(..., true)` and direct `ballots`/`chili_tags` inserts, then assert:
  - With reveal in the future, `archive_event(2099, '2099-10-25')` throws `not_revealed`.
  - After `update event set reveal_at = now() - interval '1 minute'`, `archive_event` returns the chili count.
  - `past_chilis` points, firsts and rank equal `get_results()` for the same chilis.
  - `tag_counts` equals `'{"spicy": 2}'::jsonb` for a chili tagged spicy by two devices.
  - `allergen_ids` is sorted, and `photo_path` is `'2099/' || chilis.photo_path`, or null when there was no photo.
  - `past_events.ballot_count` equals `ballot_count()`, and `event.archived_year = 2099`.
  - A second `archive_event(2099, …)` throws `already_archived`.
  - Zero-ballot case: archive a second, separate revealed event state, and every row has `points = 0` and `rank = 1`. Use year 2098 after `reset_event(p_force => true)` and re-seeding.
  - Reset guard: after a reset and re-seeding without archiving, `reset_event()` throws `not_archived`. `reset_event(p_force => true)` succeeds and leaves `archived_year` null.
  - As `anon`: `select` from `past_events` succeeds, `insert into past_chilis` throws `42501`, and `archive_event` throws `42501`.

- [ ] **Step 2: Run** `npx supabase test db`. Expected: `12_history` fails because `archive_event` doesn't exist.

- [ ] **Step 3: Write the migration.** `archive_event` checks `not_revealed` (`reveal_at` is null or in the future) and `already_archived` (the `past_events` row exists), inserts `past_events` with `name` from `event` and `ballot_count()`, then inserts `past_chilis` from `get_results()` joined to `chilis`. Allergens come from `array(select … order by 1)`; `tag_counts` comes from `coalesce(jsonb_object_agg(...) filter (...), '{}')`. Finally it sets `event.archived_year`. `reset_event` raises `not_archived` when chilis exist, `archived_year` is null, and `not p_force`, then truncates as before and sets `archived_year = null`.

- [ ] **Step 4: Run** `npx supabase migration up && npx supabase test db`. Expected: `All tests successful`, including `09_service_role_grants` (proves the new functions are granted).

- [ ] **Step 5: Regenerate types and update `resetDb`.** Run `npx supabase gen types typescript --local > src/lib/database.types.ts`. Add the two cleanup statements to `resetDb` (delete `past_events` rows with `.gte('year', 0)`, then set `archived_year: null` in the existing event update). Run `fnm exec --using=24 -- npm run typecheck`. Expected: no errors.

- [ ] **Step 6: Commit** `Add history tables, archive_event, and the reset guard`.

### Task 2: `event archive` and photo-safe `event reset`

**Files:**
- Modify: `scripts/event.mts`
- Create: `tests/integration/event-script.test.ts`

**Interfaces:**
- Consumes: `archive_event(p_year, p_held_on)` and `reset_event(p_name, p_force)` from Task 1.
- Produces the CLI `npm run event -- archive [--year N] [--held-on YYYY-MM-DD]`. It exits 0 when the year is archived and every archived photo exists. Also `npm run event -- reset [--name "..."] [--force] --yes`.

- [ ] **Step 1: Write `event-script.test.ts`.** It runs `node scripts/event.mts` through `execFileSync` (with `process.execPath`), passing `process.env`. It uses `call`/`resetDb` from `helpers.ts` and the photo upload helper pattern from `photo.test.ts`. Tests:
  - `archive before reveal exits 1 and prints not_revealed`.
  - `archive copies photos under the year and keeps the originals`: after seeding 2 chilis (1 with a photo) and 1 ballot, and setting reveal in the past, `archive --year 2099 --held-on 2099-10-25` exits 0. Then `storage.list('2099/<chiliId>')` has 1 object, `storage.list(chiliId)` still has 1, and `past_chilis` has 2 rows.
  - `archive re-run copies only what's missing`: delete the `2099/…` object, re-run, and it exits 0 with the object back. The output contains `already archived`.
  - `reset refuses an unarchived event`: exits 1, prints `--force`, and the chilis still exist.
  - `reset after archive keeps archived photos`: `reset --yes` exits 0, `storage.list(chiliId)` is empty, and `storage.list('2099/<chiliId>')` still has 1.

- [ ] **Step 2: Run** `fnm exec --using=24 -- npx vitest run -c vitest.integration.config.ts --mode test tests/integration/event-script.test.ts`. Expected: FAIL (`Usage:` printed for `archive`).

- [ ] **Step 3: Implement it in `scripts/event.mts`.**
  - Add the options `--year`, `--held-on` and `--force` to `parseArgs`.
  - `archive()`: read `event` and compute the defaults from `reveal_at` (local `held_on` via `toLocaleDateString('en-CA')`). If `archived_year` already equals the year, print `<year> already archived; checking photos`; otherwise call `archive_event`. Then, for each `past_chilis` row of the year with a `photo_path`, copy `photo_path.slice(5)` → `photo_path` with `storage.copy` when the target isn't listed.
  - `photoPaths()` skips top-level folders matching `/^\d{4}$/`, so `reset` deletes only live photos.
  - `reset` passes `p_force` and maps the `not_archived` error to the message `Archive first: npm run event -- archive (or pass --force to discard).`
  - Update the usage line.

- [ ] **Step 4: Run** the test file, then the full integration suite. Expected: all pass.

- [ ] **Step 5: Commit** `Add event archive command; reset keeps archived photos`.

### Task 3: `/history` pages

**Files:**
- Create: `src/lib/history.ts`, `src/components/History.tsx`, `src/components/HistoryYear.tsx`, `src/app/history/page.tsx`, `src/app/history/[year]/page.tsx`
- Modify: `src/lib/types.ts` (`ResultRow` gains `photoPath?: string | null`)
- Modify: `src/components/Results.tsx` (a third column thumbnail when `photoPath` is set, using the same `<Image>` props as `ChiliCard.tsx` lines 31–40)
- Modify: `src/components/Home.tsx` (adds the "Past cook-offs" link under the list and under the results)
- Test: `tests/unit/history.test.tsx`

**Interfaces:**
- Produces in `src/lib/history.ts`:
  - `fetchPastEvents(): Promise<PastEvent[]>`, newest year first.
  - `fetchPastYear(year: number): Promise<{ event: PastEvent; rows: ResultRow[]; tagCounts: TagCount[] } | null>`. Each row's `chiliId` is `` `${year}-${pot}` `` and its `photoPath` is the archived path; `tagCounts` is flattened from `tag_counts`.
  - `PastEvent = { year: number; name: string; heldOn: string; ballotCount: number; chiliCount: number; podium: { rank: number; name: string; cook: string | null }[] }`. The podium is the rows with rank ≤ 3.
- Pages follow the `src/app/chili/[id]/page.tsx` pattern (a `<Suspense>` around a client view). `HistoryYear` reads the year with `useParams` and renders `<Results>` with `topTags(tagCounts, id, tags)`.

- [ ] **Step 1: Write `history.test.tsx`** with `@/lib/history` and `@/lib/reference` mocked. Tests:
  - `History` lists "2026 · Overlook Chili Cook-Off" and "5 chilis · 22 ballots", with a link to `/history/2026`.
  - `History` shows "No past cook-offs yet." for `[]`.
  - `HistoryYear` for 2026 renders the heading "Overlook Chili Cook-Off, 2026" and the rows in rank order.
  - A zero-ballot year shows "T-1st" on every row.
  - Unknown year (`fetchPastYear` → `null`) and the param `abc` (no fetch) both show "No cook-off on record for …" and the link "All past cook-offs".
  - `Results` renders an `img` when `photoPath` is set.

- [ ] **Step 2: Run** `fnm exec --using=24 -- npx vitest run tests/unit/history.test.tsx`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `history.ts`, the two components and pages, the `Results` thumbnail, and the Home link.** Data loads through `useLive([], fetch…, 86_400_000)`, since history doesn't change live.

- [ ] **Step 4: Run** `fnm exec --using=24 -- npm test && fnm exec --using=24 -- npm run lint && fnm exec --using=24 -- npm run typecheck && fnm exec --using=24 -- npm run build`. Expected: all pass, and the build lists `○ /history`.

- [ ] **Step 5: Commit** `Add /history pages for archived cook-offs`.

### Task 4: Runbook, PR, and archiving 2026 in prod

**Files:**
- Modify: `docs/running-next-year.md`: before step 4 (reset), add "`npm run event -- archive`; check `/history/<year>`".

- [ ] **Step 1: Update the runbook. Then run the full verification:** unit, integration, `npx supabase test db`, and build. Expected: all green.
- [ ] **Step 2: Commit, push, and open the PR** with the `mattpocock-skills:pr` template.
- [ ] **Step 3 (human gate: ask before each prod action): push the migration** with `npx supabase db push --db-url "$SUPABASE_DB_URL"` from `.env.local`, after a `--dry-run` that lists only `20261026000200_history.sql`.
- [ ] **Step 4 (human gate): archive 2026.** With `.env.production.local` present, run `npm run event -- check`, then `npm run event -- archive --year 2026 --held-on 2026-10-25`.
- [ ] **Step 5: Verify in prod with SQL.** `past_chilis` for 2026 has 5 rows with points 41, 35, 24, 20, 12 and ranks 1–5. `past_events.ballot_count = 22`. The object `2026/074fffd9-8d6e-4325-8361-ec8379099444/94d4a2a2-e48c-4748-a444-ef7e7518e41e.jpg` exists. After the merge deploys, `/history/2026` shows the same table. Don't run `reset` in prod; that's next year's runbook.
