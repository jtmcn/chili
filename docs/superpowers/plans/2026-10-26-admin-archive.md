# Archive from the Admin Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The host archives the year from `/admin` with the passcode, replacing `npm run event -- archive`.

**Architecture:** The archive logic moves from `scripts/event.mts` into a server-only module, `src/lib/archive.ts`, called by a new passcode-checked route, `/api/admin/archive`. It wraps the existing `archive_event()` RPC and copies photos idempotently. An `AdminArchive` card on the dashboard sends the year and the date in the browser's own time zone. `check` and `reset` stay as CLI commands.

**Tech Stack:** Next.js route handlers, `@supabase/supabase-js` storage, zod, Vitest + Testing Library.

**Spec:** The 2026-10-26 session's proposal for archiving from the admin screen, restated in **Design**. It builds on `docs/superpowers/plans/2026-10-26-history-archive.md` (merged in #20).

## Design

- **When the card shows:** after the reveal, the dashboard shows an "Archive" card. If the event isn't archived, it has a year field (default: the reveal's local year), a date field (default: the reveal's local date) and the button "Archive this year" (pending: "Archiving…").
- **After archiving,** the card shows "Archived as <year>", the link "View history" to `/history/<year>`, and the button "Re-check photos". The button re-runs the same route, which skips the database step and copies any missing photos.
- **If any photo fails to copy,** the card shows "<n> photo(s) didn't copy. Try again." as an alert.
- **The date always comes from the browser,** because the server runs in UTC.
- **Reset stays CLI-only.** `npm run event -- archive` is removed, and the runbook points to the admin card.

## Global Constraints

- Branch `joel/admin-archive`. Commits have no co-author lines. Code comments are 1–2 lines covering only the why.
- No new migration: `archive_event(p_year int, p_held_on date)` and `event.archived_year` already exist.
- Admin writes go through `requireAdmin` (`src/lib/admin-auth.ts`), and bodies are validated with zod in `src/lib/schemas.ts`.
- Error mapping: add `not_revealed` and `already_archived` to `MESSAGES` and `RAISED` (409) in `src/lib/http.ts`. Messages: "Results aren't revealed yet." and "This event is already archived."
- Node is run as `fnm exec --using=24 --`.

## Review Focus

- **Double-tapping "Archive this year":** the second request must get `already_archived` for a different year, or skip the database step for the same year. It must never create duplicate rows. Task 1 has a same-year re-run test.
- **Archiving before the reveal:** a forged request is refused with 409, even though the card is hidden. Task 1.
- **Typing a year that doesn't match the date:** allowed, since the host decides. Bad formats get 400. Task 1 tests a malformed `heldOn` and a 5-digit year.
- **A photo whose live source is gone:** it's reported in `missingPhotos` and doesn't crash the route. Task 1.
- **Reloading the admin page after a partial failure:** the card shows "Archived as <year>" with "Re-check photos", so the host can retry. Task 2.

---

### Task 1: `src/lib/archive.ts` and `/api/admin/archive`

**Files:**
- Create: `src/lib/archive.ts`, `src/app/api/admin/archive/route.ts`, `tests/integration/archive.test.ts`
- Modify: `src/lib/schemas.ts`, `src/lib/http.ts`

**Interfaces:**
- Produces: `archiveEvent(db: SupabaseClient<Database>, year: number, heldOn: string): Promise<{ archived: number | null; missingPhotos: string[] }>`. `archived` is null when the database step was skipped because the event was already archived under that year. RPC errors are thrown as the `PostgrestError`.
- Produces: `adminArchiveInput = z.object({ year: z.number().int().min(1000).max(9999), heldOn: z.iso.date() })`.
- Produces: `POST /api/admin/archive` returning `{ ok: true, year, archived, missingPhotos }`, or a `fromDbError` response.

- [ ] **Step 1: Write `archive.test.ts`.** Seed it like `event-script.test.ts`: 3 chilis, 1 photo, 1 ballot. Tests:
  - 401 without the passcode.
  - 400 for `heldOn: '25/10/2099'` and for `year: 20990`.
  - 409 `not_revealed` before the reveal, with no `past_events` row.
  - After the reveal: 200 with `archived: 3` and `missingPhotos: []`; the `2099/<id>/…` object exists and the original is still there.
  - Same-year re-run: 200 with `archived: null`, and it restores a deleted archive copy.
  - A different year after archiving gets 409 `already_archived`.
  - If the live photo is deleted before archiving, the response is 200 and `missingPhotos` holds the one `2099/…` path.
- [ ] **Step 2: Run** `fnm exec --using=24 -- npx vitest run -c vitest.integration.config.ts --mode test tests/integration/archive.test.ts`. Expected: FAIL (route missing).
- [ ] **Step 3: Implement.** Port the logic of `archive()` from `scripts/event.mts`: skip the RPC when `archived_year === year`, then copy each `past_chilis.photo_path` that doesn't exist from `photo_path.slice(String(year).length + 1)`. Re-check the paths after copying to fill `missingPhotos`. The route validates, calls `archiveEvent`, and maps errors with `fromDbError`.
- [ ] **Step 4: Run** the test file and the full integration suite. Expected: all pass.
- [ ] **Step 5: Commit** `Add /api/admin/archive`.

### Task 2: Admin "Archive" card

**Files:**
- Create: `src/components/admin/AdminArchive.tsx`, `tests/unit/admin-archive.test.tsx`
- Modify: `src/app/api/admin/state/route.ts` (adds `archivedYear: number | null`, read from `event.archived_year`), `src/components/admin/AdminDashboard.tsx` (renders `<AdminArchive>` after `<AdminEvent>`)

**Interfaces:**
- Consumes: `POST /api/admin/archive` from Task 1, through `useAdminPost()`.
- Produces: `AdminArchive({ event: EventState; archivedYear: number | null; onChange: () => void })`.

- [ ] **Step 1: Write `admin-archive.test.tsx`.** Wrap `AdminGate` the way `admin-gate.test.tsx` does, or mock `useAdminPost`. Tests:
  - Renders nothing before the reveal.
  - After the reveal, it shows defaults equal to the local year and date of `revealAt`.
  - Clicking "Archive this year" posts `{ year, heldOn }` and calls `onChange`.
  - With `archivedYear: 2026`, it shows "Archived as 2026", the link "View history" to `/history/2026`, and "Re-check photos".
  - A response with 2 missing photos shows the alert "2 photo(s) didn't copy. Try again."
  - A 409 shows the message.
- [ ] **Step 2: Run** `fnm exec --using=24 -- npx vitest run tests/unit/admin-archive.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the card, the `archivedYear` field in the state route, and the dashboard wiring. Decide "revealed" with `currentPhase(event, Date.parse(event.serverNow))`.
- [ ] **Step 4: Run** unit tests, lint, typecheck and build. Expected: all pass.
- [ ] **Step 5: Commit** `Add archive card to the admin screen`.

### Task 3: Remove the CLI archive and update the runbook

**Files:**
- Modify: `scripts/event.mts` (remove `archive` and its options; keep `missingArchivedPhotos` for the reset guard)
- Modify: `tests/integration/event-script.test.ts` (archive through the route handler instead of the CLI; drop the CLI archive-only tests now covered in `archive.test.ts`)
- Modify: `docs/running-next-year.md` (step 4 becomes "In `/admin`, tap **Archive this year** under Archive…")

- [ ] **Step 1: Update the tests first.** `event-script.test.ts` archives through `POST` from `@/app/api/admin/archive/route`, and its reset tests stay. Add `archive is no longer a CLI command`: `run('archive')` exits 1 and prints `Usage:`.
- [ ] **Step 2: Run it.** Expected: the new test fails (archive still works).
- [ ] **Step 3: Remove** `archive` from the script and update the usage line and the runbook.
- [ ] **Step 4: Run** the full suites: unit, integration, `npx supabase test db`, and build. Expected: all pass.
- [ ] **Step 5: Commit** `Drop CLI archive in favour of the admin card`. Then do the whole-branch review, open the PR, merge, and tell the user to archive 2026 from `/admin`.
