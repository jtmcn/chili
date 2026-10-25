# Chili Cookoff Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the whole chili cookoff app (issues #1–#8, #10) as one linear `gh stack` of three PRs (nine layers of tasks), with CI green on every PR and a production deploy after PR A.

**Architecture:** Next.js App Router on Vercel. Phones read public data straight from Supabase with the anon key. Every write goes through a Next.js route handler that validates with zod and calls a `security definer` Postgres function, using the service-role key. The rules (event state, ownership, limits) live in those functions, so the database enforces them. Live updates use Supabase Realtime **Broadcast from Database**: triggers send a bare `{table}` ping and clients refetch. A 10 s poll is the fallback.

**Tech Stack:** Next.js (App Router, TypeScript, Tailwind), `@supabase/supabase-js`, zod, `qrcode`, Vitest + Testing Library (jsdom), pgTAP via `supabase test db` (local only), Supabase CLI, GitHub Actions (app checks only), Vercel Git integration, `gh stack`.

**Spec:** `docs/prd.md`. Tickets: GitHub issues #1–#10 on `jtmcn/chili` (#9 is the human acceptance pass and is not part of the stack).

## Global Constraints

- Mobile first: 375 px width, tap targets ≥ 48 px, high contrast, no hover-only controls, semantic `<button>`s, visible focus.
- First-load JS on `/` < 200 KB.
- Writes show a pending state and retry up to 3 times (network errors and 5xx only, never 4xx).
- The server's clock decides reveal and voting. The client countdown is cosmetic and uses a server-time offset.
- `ballots` is never readable by `anon`. Standings come only from `get_results()`, which returns no rows before `reveal_at`.
- Cook names are hidden from tasters everywhere until reveal. `owner_device_id` is never exposed to clients.
- Limits: chili name 2–40 chars (unique, case-insensitive); cook name ≤ 40; description ≤ 200; max 3 chilis per device.
- Allergens (id → label): `milk` Milk, `eggs` Eggs, `fish` Fish, `shellfish` Shellfish, `tree_nuts` Tree nuts, `peanuts` Peanuts, `wheat` Wheat, `soy` Soy, `sesame` Sesame, `gluten` Gluten (sort in that order).
- Tags (id → label): `spicy` Spicy, `mild` Mild, `smoky` Smoky, `meaty` Meaty, `veggie` Veggie, `beany` Beany, `sweet` Sweet, `tangy` Tangy, `rich` Rich, `unique` Unique (sort in that order; `same_as` seeded null).
- Exact copy:
  - Home: add link "Bringing a chili? Add it", vote link "Vote for your top 3", empty list "No chilis yet. Bringing one? Add it."
  - Walkthrough: progress "Step N of 4", submit "Add my chili" (pending: "Adding…"), success prompt "Write this on your table card".
  - Disclaimer: "Allergen info comes from the cook; ask them if you're unsure."
  - Ballot:
    - Save button: "Save my picks" (pending: "Saving…"), or "Update my picks" once a ballot exists.
    - Confirmation: "Picks saved".
    - Before voting opens: "Voting opens when the host starts it."
    - After voting closes: "Voting is closed. Results at {time}."
- Live: changes visible on other phones within 2 s; reveal switch within 5 s; poll every 10 s.
- Git: branches `joel/<desc>` (< 50 chars); plain imperative commit messages; **no co-author trailers**; terse 1–2 line code comments.
- CI runs on `pull_request` for **every** base branch (stacked PRs target each other, not `main`). CI runs only the app checks (lint, typecheck, unit, build). pgTAP and integration tests run locally against `npx supabase start` before each push; Docker is already running.
- Migrations reach prod via `npx supabase db push --db-url "$SUPABASE_DB_URL"` from the laptop, run **just before** merging the PR that adds them (Joel puts the Session pooler URL in `.env.local`; never commit it). Migrations are additive only, so the live app keeps working against the newer schema. No CI deploy job.
- Test split: pgTAP owns every rule the database enforces (event state, ownership, limits, privileges, scoring). Integration tests cover only what the route adds: zod validation, `fromDbError` status mapping and admin auth. Don't re-test a DB rule at the HTTP level.
- Function privileges: Postgres grants `EXECUTE` to `PUBLIC` on every new function, and Supabase also grants it to `anon`/`authenticated`. Every write function (`create_chili`, `set_tag`, `submit_ballot`, `admin_*`, `update_chili`) ends with `revoke execute on function … from public, anon, authenticated; grant execute on function … to service_role;`, and its layer's pgTAP file asserts that calling it as `anon` throws `42501`.
- Every `security definer` function sets `set search_path = ''` and schema-qualifies names (`public.chilis`), so `get_advisors` stays clean.
- Anon reads public chili and tag data only through `security definer` functions (`get_chilis()`, `get_tag_counts()`), not views. A view over RLS-hidden tables trips Supabase's `security_definer_view` lint.
- After the first merge checkpoint, real cooks are using the prod database, which previews share. From then on, **never write from a preview**. Do manual testing against local Supabase only. Never change event state on prod outside the admin page on the event day.
- Test rows use device IDs prefixed `test-` and chili names prefixed `TEST `, so cleanup can target them without touching real entries.
- Local tooling: the Supabase CLI is a pinned npm dev dependency (`npx supabase …`); there's no global install. Node 24 (`.nvmrc`) to match Vercel and CI; the laptop defaults to Node 26, so `nvm use` before `npm install`.
- DB types are generated, not hand-written: `npx supabase gen types typescript --local > src/lib/database.types.ts` after each migration, and both clients are typed `SupabaseClient<Database>`. `types.ts` keeps only the camelCase domain types.

## Review Focus

1. **Phone clock wrong by minutes.** The countdown and the reveal switch must follow server time. Test: `serverNow()` with a 10-minute skew (Task 5.3).
2. **Reveal time not set yet** (`reveal_at` null). Voting and tagging stay closed, the countdown reads "Reveal time not set", and `get_results()` is empty. Tests in Tasks 1.2 and 5.3.
3. **Host deletes a chili that is already on ballots.** The other picks on those ballots must survive and still score. Test: FK `on delete set null` in Task 5.1.
4. **Double-tap on a tag, or a retry after a lost response.** Adding twice must be a no-op, not an error. Test: `set_tag` idempotency in Task 4.1.
5. **Host moves `reveal_at` while phones are open.** Clients re-arm their timer from the new event state. Test: Task 7.2 `Home` re-arms when the event changes.
6. **A phone calls a write function directly via PostgREST `/rpc/`** with the anon key, skipping the API route. It must get `42501`. Test: an anon privilege assertion in each layer's pgTAP file.
7. **A phone wakes from sleep after reveal.** iOS throttles timers and drops the socket in the background. `useLive` refetches on `visibilitychange`, so the phone catches up immediately. Test: Task 3.1.

## Visual design

Phones are used outdoors in sunlight, one-handed, by tasters walking between tables. Each table has a card with the pot number written in marker. The pot number is how people find a chili, so it's the one memorable element; everything else stays quiet. Chili's obvious look (cream, terracotta, serif headline) is deliberately avoided. The palette comes from speckled enamel camp pots and county-fair ribbons.

**Tokens** (Tailwind v4 `@theme` in `src/app/globals.css`; light theme only, for daylight):

| Token | Hex | Use |
|---|---|---|
| `plate` | `#FFFFFF` | Page background |
| `ink` | `#14213D` | Text (≈15:1 on plate) |
| `enamel` | `#1D3F8F` | Primary buttons, pressed tags, selected ranks, focus ring |
| `rule` | `#D3DAE6` | Row dividers, empty slots, outlined badges |
| `chili` | `#C21F1F` | Errors and delete only |
| `ribbon-gold` | `#E8B53B` | 1st-place ribbon fill |

**Type** (`next/font/google`, self-hosted, `display: 'swap'`):
- `Permanent Marker` (`--font-pot`), used **only** for pot numbers via `<PotNumber>`. Sizes:
  - List rows and ballot rows: 56 px.
  - Detail page: 96 px.
  - Success screen: `min(40vw, 200px)`.
- `Atkinson Hyperlegible Next` (`--font-body`) for everything else.
  - Body text is 18 px; the scale is 18 / 22 / 28 / 40, and chili names are semibold 22 px.
  - Sentence case everywhere: no all-caps labels, no `→` on buttons.

**Layout:**
- One left-aligned column, `max-w-md`, 16 px gutters.
- Lists are full-width rows separated by `rule` hairlines, not shadowed cards. Each row is one ≥ 72 px tap target, with the `PotNumber` in a fixed 72 px left column.
- Primary actions sit in a sticky bottom bar (thumb reach), with `pb-[env(safe-area-inset-bottom)]`.
```
┌──────────────────────────┐
│ Overlook Chili Cook-Off  │  header: name, countdown, ballot count
│ Results in 1:12:40       │
│ 23 ballots in            │
├──────────────────────────┤
│ 3   Brisket Fire         │  PotNumber | name, allergen badges, top tags
│     Milk  Wheat          │
│     Smoky 4  Meaty 2     │
├──────────────────────────┤
│ …                        │
├──────────────────────────┤
│ [ Vote for your top 3 ]  │  sticky bar (Voting only)
│ Bringing a chili? Add it │  (entries open only)
└──────────────────────────┘
```

**Components and states:**
- Allergen badges: outlined `rule` pills with `ink` text, never color-coded.
- Tag pills show a count. When pressed they're filled `enamel` with a leading ✓, so the state reads without color. While a tap is posting, the pill dims to 60% opacity.
- Ballot rows: each has a `1st | 2nd | 3rd` segmented control (each segment ≥ 48 px, `aria-pressed`). A sticky summary shows the three picks and the save button.
- Results: top 3 get a CSS `<Ribbon>` rosette with "1st"/"2nd"/"3rd" printed on it. Its fill is `ribbon-gold` for 1st, `enamel` for 2nd and plain `plate` with a `rule` border for 3rd. No emoji.
- Motion: there's exactly one animation. On reveal, the ribbons drop in from 3rd to 1st (about 150 ms apart), and nothing animates under `prefers-reduced-motion: reduce`. Nothing else in the app animates.
- Focus: `outline: 3px solid enamel; outline-offset: 2px` on every interactive element.
- Admin: same tokens with no flourish. A print stylesheet shows only the event name and the QR code (at least 12 cm).

**Cut order if time runs short:** the print stylesheet first, then the ribbon animation. Tokens, fonts and `PotNumber` stay.

---

## Stack layout

```
(main) <- joel/chili-foundation <- joel/chili-core <- joel/chili-extras
```

| PR | Branch | Layers | Closes | Budget |
|---|---|---|---|---|
| A | `joel/chili-foundation` | 1 scaffold, 2 walkthrough, 3 list | #1, #2, #3 | 75 min → **merge checkpoint: to prod, share with cooks** |
| B | `joel/chili-core` | 4 tags, 5 ballot, 6 admin, 7 reveal | #5, #6, #7, #8 | 75 min → **cut line: PR C is optional** |
| C | `joel/chili-extras` | 8 cook edit, 9 tag moderation | #4, #10 | 20 min |

Layers stay as task groups with one commit per task; only the PR boundaries changed. Dropping the cut-list tickets (#4, #10) means not merging PR C.

**Schedule reality:** about 170 min of tasks plus about 15 min of visual design (spread over L1, L3 and L7), against the PRD's 150-min target. Three PRs and app-only CI keep the CI overhead to a few short runs. Treat the PR B cut line as the likely finish, and tell Joel early if Layer 5 runs over.

### Per-layer loop (applies to every layer)

- [ ] Do the layer's tasks (TDD, commit per task with `git add <paths>`, never `-A`).
- [ ] Run `npm run lint && npm run typecheck && npm test && npm run build`, plus `npx supabase test db && npm run test:integration` once those exist. Everything passes. In the `next build` output, check that the first-load JS for `/` is still well under 200 KB.
- [ ] Push the branch (`gh stack push`) so a preview builds, but don't wait on CI between layers.

### Per-PR loop

- [ ] Create the branch at the PR's first layer. PR A: `gh stack init joel/chili-foundation`. After that: `gh stack add <branch>` from the top of the stack.
- [ ] At the PR's last layer: `gh stack submit --auto`, then `gh pr edit <n> --body-file <tmp>` with a body that starts with one `Closes #<issue>` line per ticket (use the `mattpocock-skills:pr` skill for the body).
- [ ] `gh pr checks <n> --watch` until green. Fix on this PR's branch, then `gh stack rebase --upstack`.
- [ ] A fix belonging to a lower PR: `gh stack checkout <branch>`, commit there, `gh stack rebase --upstack`, `gh stack top`, `gh stack push`.

### Merge checkpoints (ask Joel before each merge)

- **After PR A is green:**
  1. Push the migrations first: `npx supabase db push --db-url "$SUPABASE_DB_URL"`. Then MCP `list_migrations` shows the L1–L3 files, and `get_advisors` (security) reports no RLS, exposure, `security_definer_view` or `function_search_path_mutable` issues.
  2. `gh stack merge <PR A#> --yes --squash`. Vercel deploys `main`; wait for the production deployment to be `READY`. Then `gh stack sync --prune`.
  3. Before sharing the URL with cooks, verify:
     - The production URL (whatever Task 1.0 confirmed) returns `200` to `curl -sI` while logged out, not `401` or a redirect to `vercel.com/login`.
     - The home page shows the event name, and an add-a-chili submission named `TEST …` appears on a second device within 2 s (proves Realtime public access is on). Then delete it from SQL and confirm that `chilis` is empty before the URL goes to cooks.
  4. From here on, previews are read-only (see Global Constraints).
- **After PR B (or C) is green:** `db push` the new migrations, re-check `list_migrations` and `get_advisors`, then merge the same way and `gh stack sync --prune`. Hand off to #9 (human acceptance pass).

## File structure

```
.github/workflows/ci.yml            CI: check (lint, typecheck, unit, build)
supabase/config.toml                supabase init
supabase/migrations/
  20261025000100_init.sql           L1: tables, RLS, default privileges, voting_open, get_chilis, get_tag_counts, get_results, ballot_count, get_event, seeds
  20261025000200_create_chili.sql   L2: entries_ok, create_chili
  20261025000300_live.sql           L3: notify_live triggers
  20261025000400_tags.sql           L4: set_tag
  20261025000500_ballot.sql         L5: submit_ballot
  20261025000600_admin.sql          L6: admin_update_chili, admin_delete_chili
  20261025000800_update_chili.sql   L8: update_chili
supabase/tests/database/*.test.sql  pgTAP, one file per layer
src/lib/types.ts                    shared client/server domain types
src/lib/database.types.ts           generated by `supabase gen types`
src/lib/supabase/browser.ts         anon client singleton
src/lib/supabase/server.ts          service-role client (server only)
src/lib/device-id.ts                getDeviceId
src/lib/post-json.ts                postJson with retry
src/lib/http.ts                     ok(), fail(), fromDbError()
src/lib/schemas.ts                  zod request schemas
src/lib/event.ts                    fetchEvent, serverNow, currentPhase
src/lib/live.ts                     subscribeLive, useLive
src/lib/reference.ts                fetchAllergens, fetchTags
src/lib/wizard.ts                   walkthrough reducer
src/lib/tags.ts                     topTags
src/lib/ballot.ts                   setPick, isComplete, pending-ballot storage
src/lib/admin-auth.ts               requireAdmin
src/app/page.tsx, src/components/Home.tsx              home: list or results
src/app/add/page.tsx, src/components/add/*             walkthrough
src/app/chili/[id]/page.tsx, src/components/ChiliDetail.tsx
src/app/ballot/page.tsx, src/components/Ballot.tsx
src/app/admin/page.tsx, src/components/admin/*
src/components/{ChiliCard,AllergenBadges,AllergenDisclaimer,TagButtons,Countdown,Results,PotNumber,Ribbon}.tsx
src/app/globals.css, src/app/layout.tsx  design tokens and fonts (see Visual design)
src/app/api/**/route.ts             one handler per PRD route
tests/unit/**                       Vitest jsdom
tests/integration/**                Vitest node, against local Supabase
```

---

## Layer 1: scaffold (PR A, closes #1)

### Task 1.0: Human setup (done, verified 2026-10-25)

- [x] Supabase project `overlook-chili-cook-off` (ref `ivvzfqqkhftoyowanhck`, us-east-1, Postgres 17).
- [x] GitHub secret `SUPABASE_DB_URL`: the Session pooler connection string. No longer used by CI; kept for reference.
- [x] Vercel project `chili` (`prj_ZRZrcv3HsLVs85xuJ0vJefIs8DH9`, team `jtmcn`, Node 24.x). All 5 env vars are set on Production + Preview.
- Previews share the prod database. Before the first merge checkpoint, preview writes are fine, as long as they use `TEST ` names and are cleared at the checkpoint. After it, previews are read-only. Previews of a PR whose migrations aren't pushed yet will error on the new routes. That's expected.
- #1's "deployed shell" criterion is met by the PR A preview deploy. The first prod deploy is the PR A checkpoint. Say so in the PR A body.

### Task 1.0b: Pre-flight (Joel, before Task 1.1; found 2026-10-25)

- [ ] **Deployment Protection:** Vercel → `chili` → Settings → Deployment Protection → Vercel Authentication → **Only Preview Deployments**. It's currently `all_except_custom_domains`, and the project has no custom domain, so the production `*.vercel.app` URL would need a Vercel login.
- [ ] **Production URL:** `NEXT_PUBLIC_APP_URL` is `https://chili-chi.vercel.app`, but that domain isn't attached to the project (it returns `DEPLOYMENT_NOT_FOUND`). The project's domains are `chili-jtmcn.vercel.app` and `chili-git-main-jtmcn.vercel.app`. Either add `chili-chi.vercel.app` under Settings → Domains, or set `NEXT_PUBLIC_APP_URL=https://chili-jtmcn.vercel.app` on Production + Preview. The QR code is built from this value.
- [ ] **Realtime public access:** Supabase → Project Settings → Realtime → "Allow public access" on. Without it, broadcast pings never arrive and clients fall back to the 10 s poll.
- [ ] **Local DB URL:** add `SUPABASE_DB_URL=<Session pooler URL>` to `.env.local` (gitignored) for `supabase db push` at the checkpoints.
- [ ] `nvm use 24` (the laptop default is Node 26).

### Task 1.1: App scaffold, test harness, CI

**Files:**
- Create: Next.js app at the repo root (see Step 1), `vitest.config.ts`, `vitest.integration.config.ts`, `tests/unit/setup.ts`, `.github/workflows/ci.yml`, `.env.example`, `.nvmrc` (`24`), `src/lib/types.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/device-id.ts`
- Modify: `.gitignore` (add `!.env.example` after `.env.*`)
- Test: `tests/unit/device-id.test.ts`

**Interfaces:**
- Produces:
  - `getDeviceId(): string`. localStorage key `chili.deviceId`, cookie `chili_device_id` (max-age 1 year, path `/`, SameSite=Lax).
  - `browserClient(): SupabaseClient`, an anon-key singleton.
  - `serverClient(): SupabaseClient`, using the service-role key with `auth.persistSession: false`.
  - `package.json` scripts: `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:integration` (`vitest run -c vitest.integration.config.ts`), `build`.
  - In `types.ts`:
    ```ts
    type EventStatus = 'setup' | 'voting' | 'revealed'
    type Phase = EventStatus
    interface EventState { name: string; status: EventStatus; revealAt: string | null; entriesOpen: boolean; serverNow: string }
    interface PublicChili { id: string; potNumber: number; name: string; description: string | null; cook: string | null; allergenIds: string[] }
    interface RefItem { id: string; label: string; sort: number }
    interface TagCount { chiliId: string; tagId: string; count: number }
    interface ResultRow { chiliId: string; potNumber: number; name: string; cook: string | null; points: number; firsts: number; seconds: number; thirds: number; rank: number }
    type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; message: string }
    ```

- [ ] **Step 1: Scaffold.** create-next-app refuses a directory that contains `AGENTS.md` and `.claude/`. Scaffold into the scratchpad instead: `npx create-next-app@latest <scratch>/app --yes --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install`. Copy its files into the repo root. Don't overwrite `AGENTS.md`, `.gitignore` or `.claude/`; merge `node_modules`/`.next`/`next-env.d.ts` into the existing `.gitignore`. Then run `npm install`. Install `@supabase/supabase-js zod` and dev deps `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom supabase` (pin the exact `supabase` CLI version). In both Vitest configs, alias `server-only` to an empty module. In `vitest.integration.config.ts`, set `fileParallelism: false`, because every file calls `resetDb()` on the same database.
- [ ] **Step 2: Write failing tests** in `tests/unit/device-id.test.ts`:
  - `creates and persists a uuid`: two calls return the same value, matching `/^[0-9a-f-]{36}$/`; localStorage and `document.cookie` both contain it.
  - `restores from cookie when localStorage is cleared`: set the cookie `chili_device_id=abc`, clear localStorage → returns `'abc'` and rewrites localStorage.
- [ ] **Step 3:** `npm test`. Expected: FAIL, `getDeviceId` not defined.
- [ ] **Step 4:** Implement `getDeviceId`, `browserClient` and `serverClient` (`serverClient` starts with `import 'server-only'`).
- [ ] **Step 5:** `npm test`. Expected: PASS.
- [ ] **Step 6: CI.** `ci.yml` triggers on `push: branches: [main]` and `pull_request` (no branch filter). One job, `check`: checkout@v4, setup-node@v4 (node 24 to match Vercel, npm cache), `npm ci`, lint, typecheck, `npm test`, `npm run build`. Set the dummy env `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`.
- [ ] **Step 6b: Local DB test env.** Add `.env.test.local` (gitignored) for the integration config, from `npx supabase status -o env` mapped to `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, plus `ADMIN_PASSCODE=test-passcode`. `vitest.integration.config.ts` loads it with Vite's `loadEnv(mode, process.cwd(), '')` into `test.env`. Check the key names the pinned CLI prints, since newer CLIs renamed them. `test:integration` uses `--passWithNoTests` until Layer 2.
- [ ] **Step 7: Commit.** `git commit -m "Scaffold Next.js app with Vitest and CI"`

### Task 1.2: Initial schema and read model

**Files:**
- Create: `supabase/config.toml` (`supabase init`, with `[db] major_version = 17` to match prod), `supabase/migrations/20261025000100_init.sql`, `src/lib/event.ts`, `src/lib/reference.ts`
- Modify: `src/app/page.tsx` (shows the event name, fetched on the client, so `next build` never calls Supabase. A server-component fetch would be prerendered at build time, fail in CI against the dummy URL and freeze the name on Vercel.)
- Test: `supabase/tests/database/01_schema.test.sql`, `tests/unit/event.test.ts`

**Interfaces:**
- Produces (SQL):
  - Tables as in PRD § Tables, with these specifics:
    - `chilis.pot_number int generated by default as identity unique`.
    - Unique index `chilis_name_ci on chilis (lower(name))`.
    - `ballots.first_id/second_id/third_id uuid references chilis on delete set null`, with check `ballots_distinct` that all three are distinct.
    - `chili_allergens.chili_id` and `chili_tags.chili_id` reference `chilis on delete cascade`. Admin delete and the scoped test-data cleanup both rely on this.
    - `event.status` check in ('setup','voting','revealed'), default `'setup'`.
    - Seed event `(1, 'Overlook Chili Cook-Off', 'setup', null, true)`.
  - Never rely on Supabase's default grants. Start with `revoke all on all tables in schema public from anon, authenticated` and the same `on all functions`. These only cover objects that already exist, so also change the defaults for later migrations:
    ```sql
    -- PUBLIC's execute default is global; IN SCHEMA can't revoke it
    alter default privileges for role postgres revoke execute on functions from public;
    alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
    ```
    Then grant only what's listed here.
  - RLS on every table, with an explicit `for select to anon using (true)` policy on each anon-readable table. `anon` may select only `event`, `allergens`, `tags` and `chili_allergens`. `chilis`, `chili_tags` and `ballots` have no anon grants.
  - `get_chilis() returns table(id uuid, pot_number int, name text, description text, cook text, allergen_ids text[])`, ordered by `pot_number`. `cook` is null unless `reveal_at <= now()`, and there's no `owner_device_id` column. `security definer`, `stable`, granted to anon.
  - `get_tag_counts() returns table(chili_id uuid, tag_id text, count int)`. `security definer`, `stable`, granted to anon.
  - All `security definer` functions here and in later layers use `set search_path = ''`.
  - `voting_open() returns boolean`: `status = 'voting' and reveal_at is not null and now() < reveal_at`.
  - `get_results() returns table(chili_id uuid, pot_number int, name text, cook text, points int, firsts int, seconds int, thirds int, rank int)`. `security definer`; returns empty if `reveal_at is null or now() < reveal_at`; `rank() over (order by points desc, firsts desc, seconds desc)`. Granted to anon.
  - `ballot_count() returns int`. `security definer`, granted to anon.
  - `get_event() returns table(name text, status text, reveal_at timestamptz, entries_open boolean, server_now timestamptz)`, granted to anon.
- Produces (TS):
  - `fetchEvent(): Promise<EventState>` (calls `get_event`).
  - `serverNow(offsetMs: number, now = Date.now()): number`.
  - `offsetFrom(e: EventState, receivedAt = Date.now()): number`.
  - `currentPhase(e: EventState, nowMs: number): Phase`: `'revealed'` when `revealAt && nowMs >= Date.parse(revealAt)`, else `e.status`.
  - `fetchAllergens()` and `fetchTags(): Promise<RefItem[]>`, ordered by `sort`.

- [ ] **Step 1: Write failing pgTAP tests** in `01_schema.test.sql`:
  - As `anon`: `tags` has 10 rows, `allergens` 10, `event` 1.
  - `throws_ok('select * from ballots', '42501')`, and the same for `chilis` and `chili_tags`.
  - `get_chilis()` returns no `owner_device_id` key: `is(…(select to_jsonb(c) ? 'owner_device_id' from get_chilis() c limit 1), false)` after inserting a chili.
  - With `reveal_at` null: `voting_open()` is false and `get_results()` has 0 rows.
  - With status `voting` and `reveal_at = now() + 1h`: `voting_open()` is true, `get_results()` has 0 rows, and `get_chilis().cook` is null for a chili with cook `'Ann'`.
  - With `reveal_at = now() - 1m`: `voting_open()` is false, `get_results()` has 1 row, `cook = 'Ann'`.
  - As `postgres`: inserting a ballot with `first_id = second_id` → `throws_ok(..., '23514')`.
  - As `postgres`: create a throwaway function `public._probe()` inside the test, then `function_privs_are('public','_probe',array[]::text[],'anon',array[]::text[])`. This proves the default-privilege revoke covers functions added later.
- [ ] **Step 2:** `npx supabase start && npx supabase test db`. Expected: FAIL (relations missing).
- [ ] **Step 3:** Write the migration. `npx supabase db reset && npx supabase test db`. Expected: PASS. Then `npx supabase gen types typescript --local > src/lib/database.types.ts` and type both clients with it (repeat after every later migration).
- [ ] **Step 4: Write failing unit tests** in `tests/unit/event.test.ts`:
  - `currentPhase` is `'revealed'` when `now >= revealAt`, even if status is `'voting'`; it is `'setup'` when `revealAt` is null.
  - `serverNow(offsetFrom({..., serverNow: '2026-10-25T18:00:00Z'}, Date.parse('2026-10-25T18:10:00Z')), Date.parse('2026-10-25T18:10:00Z'))` === `Date.parse('2026-10-25T18:00:00Z')`. This covers a phone 10 minutes fast.
- [ ] **Step 5:** Implement `event.ts` and `reference.ts`. Make `page.tsx` render the event name from `fetchEvent()` inside a small client component. `npm test && npm run build`. Expected: PASS, and the build output marks `/` as static with no Supabase call.
- [ ] **Step 6: Commit.** `git commit -m "Add initial schema, RLS and event read model"`

### Task 1.3: Design tokens, fonts and `PotNumber`

**Files:**
- Modify: `src/app/globals.css` (replace the create-next-app styles with the Visual design tokens, the focus ring and the reduced-motion rule), `src/app/layout.tsx` (load both fonts with `next/font/google`, set `lang="en"`, `bg-plate text-ink font-body`, and a viewport `themeColor: '#1D3F8F'`)
- Create: `src/components/PotNumber.tsx`
- Test: `tests/unit/pot-number.test.tsx`

**Interfaces:**
- Produces: `PotNumber({ n, size = 'row' }: { n: number; size?: 'row' | 'detail' | 'hero' })`. Renders the number in `font-pot` at the Visual design size, with `aria-label="Pot {n}"`.

- [ ] **Step 1: Write failing test:** `PotNumber` with `n=7` has the accessible name "Pot 7" and the class `font-pot`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS. Make the event-name page from Task 1.2 use the tokens, so the preview shows the look.
- [ ] **Step 3: Commit.** `git commit -m "Add design tokens, fonts and PotNumber"`
- [ ] **Step 4:** Run the per-layer loop. When PR A is submitted (end of Layer 3), push a temporary failing unit test once, confirm CI goes red, then drop it (#1 acceptance criterion).

---

## Layer 2: add-a-chili walkthrough (PR A, closes #2)

### Task 2.1: `create_chili` and `/api/chili`

**Files:**
- Create: `supabase/migrations/20261025000200_create_chili.sql`, `src/lib/http.ts`, `src/lib/schemas.ts`, `src/app/api/chili/route.ts`, `tests/integration/helpers.ts`
- Test: `supabase/tests/database/02_create_chili.test.sql`, `tests/unit/http.test.ts`, `tests/integration/chili.test.ts`

**Interfaces:**
- Produces (SQL):
  - `entries_ok() returns boolean`: `entries_open and (reveal_at is null or now() < reveal_at)`.
  - `create_chili(p_device_id text, p_name text, p_cook text, p_description text, p_allergens text[], p_as_admin boolean default false) returns int` (the pot number). Raises `'entries_closed'` and `'device_limit'` (more than 3 per device) unless `p_as_admin`. Duplicate names raise 23505 from the index. Inserts the allergen rows in the same call. `security definer`; `revoke execute … from public, anon, authenticated`, then `grant execute … to service_role`.
- Produces (TS):
  - `ok<T>(body: T, status = 200): Response` → `{ ok: true, ...body }`.
  - `fail(error: string, status: number): Response` → `{ ok: false, error, message: MESSAGES[error] }`.
  - `fromDbError(e: PostgrestError): Response`. The mapping:
    - A raised message in `entries_closed | voting_closed | device_limit | not_owner` → 403 (`device_limit` → 409).
    - `23505` → 409: `pot_taken` when the constraint/message names `pot_number`, otherwise `name_taken`.
    - `23514` → 400 `invalid`.
    - `23503` (a chili deleted or unknown) → 400 `invalid`. It must not be a 5xx, or `postJson` retries it.
    - Anything else → 500 `server_error`.
  - `MESSAGES`:
    - `name_taken`: "That name is already taken. Try another."
    - `pot_taken`: "That pot number is already in use."
    - `device_limit`: "You've already added 3 chilis from this phone."
    - `entries_closed`: "Entries are closed."
    - `voting_closed`: "Voting is closed."
    - `not_owner`: "You can only edit chilis added from this phone."
    - `invalid`: "Something's not right with that entry."
    - `server_error`: "Something went wrong. Try again."
    - `unauthorized`: "Wrong passcode."
  - `chiliInput` (zod):
    ```ts
    { deviceId: string().min(1), name: string().trim().min(2).max(40), cook: string().trim().max(40).optional(),
      description: string().trim().max(200).optional(), allergens: array(enum(ALLERGEN_IDS)).optional(), noAllergens: literal(true).optional() }
    ```
    With `.refine`: exactly one of a non-empty `allergens` or `noAllergens: true`.
  - `POST /api/chili` → 201 `{ ok: true, potNumber: number }`.
  - Test helpers: `resetDb(): Promise<void>` (deletes from ballots, chili_tags, chili_allergens, chilis; resets the event to the seed; local DB only, so it refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` is localhost); `setEvent(p: Partial<{status; reveal_at; entries_open}>)`; `call(handler, body, headers?) → { status, json }`. Test device IDs use the `test-` prefix.

- [ ] **Step 1: Write failing pgTAP tests** for `create_chili`:
  - Returns increasing pot numbers.
  - Inserts the allergen rows.
  - The 4th call from one device → `throws_ok(..., 'device_limit')`.
  - `'Red Hot'` after `'red hot'` → `'23505'`.
  - With `entries_open = false` → `'entries_closed'`.
  - `p_as_admin = true` bypasses both the limit and the closed entries.
  - As `anon`: calling `create_chili(...)` → `throws_ok(..., '42501')`.
- [ ] **Step 2:** `npx supabase test db`. Expected: FAIL. Write the migration, then run again. Expected: PASS.
- [ ] **Step 3a: Write failing unit tests** in `tests/unit/http.test.ts`: `fromDbError` maps each raised message (`entries_closed`, `voting_closed`, `not_owner` → 403; `device_limit` → 409), `23505` on `pot_number` → `pot_taken` and otherwise `name_taken`, `23514`/`23503` → 400 `invalid`, and anything else → 500. Later layers rely on this instead of re-testing each 403 over HTTP.
- [ ] **Step 3: Write failing integration tests** in `chili.test.ts`:
  - A valid body → 201 with `potNumber >= 1`.
  - Neither `allergens` nor `noAllergens` → 400.
  - Both set → 400.
  - A 1-char name → 400.
  - A duplicate name → 409 `name_taken` with `message` "That name is already taken. Try another."
  - Entries closed → 403 `entries_closed`.
- [ ] **Step 4:** Implement `http.ts`, `schemas.ts` and the route (`noAllergens` → `p_allergens = '{}'`). `npm run test:integration`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add create_chili and POST /api/chili"`

### Task 2.2: Walkthrough UI and `postJson`

**Files:**
- Create: `src/lib/post-json.ts`, `src/lib/wizard.ts`, `src/app/add/page.tsx`, `src/components/add/{Wizard,StepName,StepDescription,StepAllergens,StepReview,Success}.tsx`, `src/components/AllergenDisclaimer.tsx`
- Modify: `src/app/page.tsx` (shows the "Bringing a chili? Add it" link only when `entriesOpen` and the phase isn't `revealed`)
- Test: `tests/unit/post-json.test.ts`, `tests/unit/wizard.test.ts`, `tests/unit/add-flow.test.tsx`

**Interfaces:**
- Produces:
  - `postJson<T>(url: string, body: unknown, opts?: { retries?: number; delayMs?: number }): Promise<ApiResult<T>>`. Default 3 retries with `delayMs * attempt` backoff. Retries only on a thrown fetch or a 5xx. A network failure after the retries returns `{ ok: false, error: 'network', message: "No connection. We'll keep trying." }`.
  - `WizardState = { step: 1|2|3|4; name: string; cook: string; description: string; allergens: string[]; noAllergens: boolean }`.
  - `WizardAction = { type: 'next' } | { type: 'back' } | { type: 'goto'; step } | { type: 'set'; field; value } | { type: 'toggleAllergen'; id } | { type: 'toggleNone' } | { type: 'load'; state }`.
  - `wizardReducer(s, a): WizardState`.
  - `canAdvance(s): boolean`.
  - `toPayload(s, deviceId)`, which matches `chiliInput`.
  - `AllergenDisclaimer` renders the exact disclaimer copy.

- [ ] **Step 1: Write failing tests:**
  - `post-json`: fetch rejects 3 times, then resolves 201 → `ok: true` after 4 calls. A 409 → no retry (1 call), and the server's `ApiResult` is returned. Rejects 4 times → `error: 'network'`.
  - `wizard`:
    - `back` keeps `name`.
    - `canAdvance` at step 1 is false for `'A'` and true for `'Ab'`.
    - At step 3, `canAdvance` is false with nothing ticked.
    - `toggleNone` clears `allergens`, and `toggleAllergen` is ignored while `noAllergens` is set.
    - `canAdvance` is true after `toggleNone`.
  - `add-flow` (RTL, mocked `postJson` → `{ ok: true, potNumber: 7 }`):
    - Shows "Step 1 of 4".
    - Fill the name → Next → Skip → tick Milk → Next → the review shows "Milk" and the disclaimer.
    - "Add my chili" → shows the accessible name "Pot 7" and "Write this on your table card".
    - A 409 response shows the server `message` on step 1, in `chili` red, linked via `aria-describedby` to the name field.
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. The description step shows a live `n/200` counter. Allergen labels come from `fetchAllergens()`. While posting, the "Add my chili" button reads "Adding…" and is disabled. Back and Next sit in the sticky bottom bar. The progress indicator is the "Step N of 4" text plus a 4-segment bar. The success screen is mostly the `PotNumber` at `size="hero"`.
- [ ] **Step 4:** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the 4-step add-a-chili walkthrough"`. Then run the per-layer loop.

---

## Layer 3: chili list (PR A, closes #3)

### Task 3.1: Live updates plumbing

**Files:**
- Create: `supabase/migrations/20261025000300_live.sql`, `src/lib/live.ts`
- Test: `supabase/tests/database/03_live.test.sql`, `tests/unit/live.test.ts`

**Interfaces:**
- Produces (SQL): `notify_live()`, a statement-level trigger function running `realtime.send(jsonb_build_object('table', <topic>), 'changed', 'live', false)`. Triggers on `event` → `'event'`, `chilis` and `chili_allergens` → `'chilis'`, `chili_tags` → `'chili_tags'`, `ballots` → `'ballots'`. This replaces the PRD's Realtime publication: anon `postgres_changes` on RLS-hidden tables would either deliver nothing or leak `cook`/`device_id`.
- Produces (TS):
  - `type LiveTopic = 'event' | 'chilis' | 'chili_tags' | 'ballots'`.
  - `subscribeLive(onChange: (t: LiveTopic) => void): () => void`. One shared `browserClient().channel('live')` broadcast subscription, reference-counted.
  - `useLive<T>(topics: LiveTopic[], fetcher: () => Promise<T>, intervalMs = 10_000): { data: T | undefined; error: unknown; refresh: () => void }`. Fetches on mount, on a matching ping, on each interval tick, and on `visibilitychange` to `visible` (a phone waking from sleep). Drops stale responses.

- [ ] **Step 1: Write failing tests:**
  - pgTAP: `has_trigger` for each of the 5 tables.
  - Unit, with mocked `subscribeLive` and fake timers:
    - The fetcher is called once on mount.
    - A `'chilis'` ping → called again; a `'ballots'` ping is ignored when the topics are `['chilis']`.
    - After advancing 10 000 ms → called again.
    - Dispatching `visibilitychange` with `document.visibilityState = 'visible'` → called again (Review Focus 7).
    - Unmount → unsubscribed, the interval cleared and the visibility listener removed.
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add broadcast-from-database live updates with polling fallback"`

### Task 3.2: Chili list and detail

**Files:**
- Create: `src/lib/chilis.ts`, `src/components/{ChiliCard,AllergenBadges,ChiliList,ChiliDetail}.tsx`, `src/components/Home.tsx`, `src/app/chili/[id]/page.tsx`
- Modify: `src/app/page.tsx` (renders `<Home/>`)
- Test: `tests/unit/chili-card.test.tsx`, `tests/unit/chili-detail.test.tsx`

**Interfaces:**
- Produces:
  - `fetchChilis(): Promise<PublicChili[]>` via `rpc('get_chilis')`, ordered by `pot_number`.
  - `fetchChili(id: string): Promise<PublicChili | null>`.
  - `ChiliCard({ chili, allergens: RefItem[], topTags?: { label: string; count: number }[] })`, which links to `/chili/[id]`.
  - `Home()` is a client component: `useLive(['event'], fetchEvent)` + `useLive(['chilis'], fetchChilis)`, rendering the event header, `ChiliList` and the sticky bottom bar with the add link. Layers 5 and 7 extend it.
  - Layout per Visual design: the row is `PotNumber | name, badges, top tags`, with `rule` hairlines between rows and no cards or shadows.

- [ ] **Step 1: Write failing tests:**
  - `ChiliCard`:
    - Shows the accessible name "Pot 3" and the chili name.
    - Shows an "Eggs" badge for `allergenIds: ['eggs']`.
    - Doesn't show the cook text even when `cook: 'Ann'` is passed (the list never renders cook before reveal).
    - The link has class `min-h-[72px]`.
  - `ChiliList` with no chilis shows "No chilis yet. Bringing one? Add it." The "Add it" part links to `/add` only when entries are open.
  - `ChiliDetail` shows the description, all allergen labels, the exact disclaimer, and a "Back to all chilis" link to `/`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Manual check.** In two browser windows against local Supabase, insert a chili via SQL. It appears in the other window in < 2 s.
- [ ] **Step 4: Commit.** `git commit -m "Add live chili list and detail view"`. Run the per-layer loop, then the per-PR loop for PR A and the **merge checkpoint**.

---

## Layer 4: tags (PR B, closes #5)

### Task 4.1: `set_tag` and `/api/tag`

**Files:**
- Create: `supabase/migrations/20261025000400_tags.sql`, `src/app/api/tag/route.ts`
- Modify: `src/lib/schemas.ts`
- Test: `supabase/tests/database/04_tags.test.sql`, `tests/integration/tag.test.ts`

**Interfaces:**
- Produces:
  - `set_tag(p_chili_id uuid, p_tag_id text, p_device_id text, p_on boolean) returns void`. Raises `'voting_closed'` unless `voting_open()`. Insert uses `on conflict do nothing`; delete is a no-op if the row is absent. Service-role only (revoke from `public, anon, authenticated`).
  - `tagInput = { chiliId: uuid, tagId: enum(TAG_IDS), deviceId: string().min(1), on: boolean }`.
  - `POST /api/tag` → `{ ok: true }`.

- [ ] **Step 1: Write failing tests:**
  - pgTAP:
    - Two `set_tag(..., true)` calls from the same device → `get_tag_counts()` count = 1.
    - A second device → 2.
    - `set_tag(..., false)` → 1.
    - Status `setup` → `throws_ok(..., 'voting_closed')`.
    - As `anon`: calling `set_tag(...)` → `'42501'`.
  - Integration: on → 200 `{ ok: true }`; an unknown `tagId` → 400. (Counts and `voting_closed` are pgTAP's job.)
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add set_tag and POST /api/tag"`

### Task 4.2: Tag UI

**Files:**
- Create: `src/lib/tags.ts`, `src/components/TagButtons.tsx`
- Modify: `src/components/ChiliDetail.tsx`, `src/components/ChiliList.tsx`
- Test: `tests/unit/tags.test.ts`, `tests/unit/tag-buttons.test.tsx`

**Interfaces:**
- Produces:
  - `fetchTagCounts(): Promise<TagCount[]>` via `rpc('get_tag_counts')`.
  - `topTags(counts: TagCount[], chiliId: string, tags: RefItem[], n = 3): { id; label; count }[]`, sorted by count desc, then tag `sort`.
  - Own taps live in localStorage under `chili.myTags` (as `${chiliId}:${tagId}`), so the toggle state survives a reload. Known gap, accepted: if localStorage is cleared but the cookie keeps the device ID, pressed state is lost. The server stays idempotent either way.

- [ ] **Step 1: Write failing tests:**
  - `topTags` returns the top 3 in the right order, breaking a count tie by `sort`.
  - `TagButtons`:
    - Tapping "Smoky" calls `postJson('/api/tag', {..., on: true})`, shows the count +1 immediately, `aria-pressed="true"` and a leading ✓ (readable without color).
    - Tapping again sends `on: false`.
    - A failed post reverts the count.
    - Buttons are disabled when the phase isn't `'voting'`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement (the list and detail use `useLive(['chili_tags'], fetchTagCounts)`), then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add live tag toggles and top tags on the list"`. Run the per-layer loop.

---

## Layer 5: ballot (PR B, closes #6)

### Task 5.1: `submit_ballot`, `/api/ballot`, `/api/ballot/mine`

**Files:**
- Create: `supabase/migrations/20261025000500_ballot.sql`, `src/app/api/ballot/route.ts`, `src/app/api/ballot/mine/route.ts`
- Modify: `src/lib/schemas.ts`
- Test: `supabase/tests/database/05_ballot.test.sql`, `tests/integration/ballot.test.ts`

**Interfaces:**
- Produces:
  - `submit_ballot(p_device_id text, p_first uuid, p_second uuid, p_third uuid) returns void`. Raises `'voting_closed'` unless `voting_open()`; upserts on `device_id` and sets `updated_at = now()`. Service-role only (revoke from `public, anon, authenticated`).
  - `ballotInput = { deviceId, picks: array(uuid).length(3).refine(distinct) }`.
  - `POST /api/ballot` → `{ ok: true }`.
  - `POST /api/ballot/mine { deviceId }` → `{ ok: true, picks: [string|null, string|null, string|null] | null }`.

- [ ] **Step 1: Write failing tests:**
  - pgTAP:
    - Submitting twice from the same device → `ballot_count() = 1`, with the second picks stored.
    - Voting closed → `'voting_closed'`.
    - Deleting the chili in `second_id` → that ballot still exists with `second_id` null and `first_id` intact (Review Focus 3).
    - As `anon`: calling `submit_ballot(...)` → `'42501'`.
  - Integration:
    - Duplicate picks → 400.
    - 2 picks → 400.
    - A pick naming a deleted chili → 400 `invalid` (not 500, so it isn't retried).
    - Valid → 200.
    - `/mine` returns the latest picks, and `picks: null` for an unknown device.
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add submit_ballot and ballot routes"`

### Task 5.2: Ballot screen

**Files:**
- Create: `src/lib/ballot.ts`, `src/components/Ballot.tsx`, `src/app/ballot/page.tsx`
- Test: `tests/unit/ballot.test.ts`, `tests/unit/ballot-screen.test.tsx`

**Interfaces:**
- Produces:
  - `type Picks = [string | null, string | null, string | null]`.
  - `setPick(p: Picks, rank: 0|1|2, chiliId: string): Picks`. Picking a chili already held at another rank moves it there and clears the old rank.
  - `isComplete(p): boolean`.
  - `savePending(p)`, `loadPending(): Picks | null` and `clearPending()`, all under localStorage key `chili.pendingBallot`.

- [ ] **Step 1: Write failing tests:**
  - `setPick([a,null,null], 1, a)` → `[null,a,null]`.
  - `isComplete` is false until all 3 are set.
  - `Ballot` screen. Each chili row has a `1st | 2nd | 3rd` segmented control (`aria-pressed`, each segment ≥ 48 px), and a sticky summary shows the three picks:
    - Tapping "2nd" on pot 4, then "2nd" on pot 9, leaves only pot 9 pressed for 2nd.
    - "Save my picks" is disabled with 2 picks.
    - On save:
      - The pending ballot is saved.
      - It's cleared after `{ ok: true }`.
      - The confirmation shows "Picks saved" and the three names.
    - On mount with a pending ballot, it resubmits.
    - On mount, it loads `/api/ballot/mine` and pre-selects. The button then reads "Update my picks".
    - Phase `setup` → "Voting opens when the host starts it." and no controls. Phase `revealed`, or `voting_closed` → "Voting is closed. Results at {time}."
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add ranked ballot screen with pending-ballot retry"`

### Task 5.3: Countdown and home ballot count

**Files:**
- Create: `src/components/Countdown.tsx`
- Modify: `src/components/Home.tsx`, `src/components/Ballot.tsx`, `src/lib/event.ts` (adds `fetchBallotCount(): Promise<number>`)
- Test: `tests/unit/countdown.test.tsx`

**Interfaces:**
- Produces: `Countdown({ revealAt: string | null, offsetMs: number })`. It renders `H:MM:SS` or `M:SS`, "Reveal time not set" when null, and "Revealing…" at ≤ 0.

- [ ] **Step 1: Write failing tests** (fake timers):
  - `revealAt` is 90 s after server time and `offsetMs = -600_000` (phone 10 min fast) → shows "1:30" (Review Focus 1).
  - `revealAt: null` → "Reveal time not set" (Review Focus 2).
  - `Home` in phase `voting` shows a "Vote for your top 3" link to `/ballot` in the sticky bottom bar. In `setup` it's absent.
- [ ] **Step 2:** Run. Expected: FAIL. Implement:
  - The Home header shows "`n` ballots in" via `useLive(['ballots'], fetchBallotCount)` plus the countdown.
  - The sticky bar gets the vote link, filled `enamel`, above the add link.
  - The ballot confirmation shows the countdown.

  Run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add server-time countdown and live ballot count"`. Run the per-layer loop.

---

## Layer 6: admin (PR B, closes #7)

### Task 6.1: Admin auth and admin routes

**Files:**
- Create: `supabase/migrations/20261025000600_admin.sql`, `src/lib/admin-auth.ts`, `src/app/api/admin/state/route.ts`, `src/app/api/admin/chili/route.ts`, `src/app/api/admin/event/route.ts`
- Test: `supabase/tests/database/06_admin.test.sql`, `tests/integration/admin.test.ts`

**Interfaces:**
- Produces:
  - `requireAdmin(req: Request): Response | null`. Returns null if header `x-admin-passcode` matches `process.env.ADMIN_PASSCODE` (`crypto.timingSafeEqual` on equal-length buffers). Otherwise returns `fail('unauthorized', 401)`. It also fails when the env var is unset.
  - `admin_update_chili(p_chili_id uuid, p_name text, p_cook text, p_description text, p_allergens text[], p_pot_number int) returns void`. Null args are left unchanged; a non-null `p_allergens` replaces the set.
  - `admin_delete_chili(p_chili_id uuid) returns void`.
  - Both admin functions: service-role only (revoke from `public, anon, authenticated`). Add `supabase/tests/database/06_admin.test.sql`, asserting `'42501'` for each one as `anon`.
  - `POST /api/admin/state {}` → `{ ok, event: EventState, chilis: (PublicChili & { cook: string | null })[], ballotCount: number }`. Cook is included; there are no standings fields.
  - `POST /api/admin/chili { action: 'create' | 'update' | 'delete', ... }`. `create` calls `create_chili(..., p_as_admin => true)` with device `'admin'`.
  - `POST /api/admin/event { status?: 'setup'|'voting', entriesOpen?: boolean, revealAt?: string | null, revealNow?: true }`. `revealNow` sets `reveal_at = now()`, which is "close voting early".

- [ ] **Step 1: Write failing integration tests:**
  - Every admin route returns 401 with no header and with a wrong header. With `ADMIN_PASSCODE` unset, it returns 401 even with a header.
  - `create` works while entries are closed.
  - `update` changing the pot number to a taken one → 409 `pot_taken`.
  - `delete` removes the chili.
  - `event { revealAt }` sets it.
  - `revealNow` → `get_results` returns rows.
  - `state` JSON has no `points` or `rank` keys anywhere.
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add passcode-gated admin routes"`

### Task 6.2: Admin page

**Files:**
- Create: `src/app/admin/page.tsx`, `src/components/admin/{AdminGate,AdminChilis,AdminEvent,AdminQr}.tsx`
- Test: `tests/unit/admin-gate.test.tsx`

**Interfaces:**
- Consumes: the admin routes. The passcode is held in sessionStorage `chili.adminPasscode` and sent as `x-admin-passcode`.
- Produces: `AdminQr({ url })`, which renders `QRCode.toDataURL(url, { width: 512 })` (install `qrcode`, `@types/qrcode`).

- [ ] **Step 1: Write failing tests:**
  - `AdminGate` shows a passcode field.
  - A 401 from `/api/admin/state` shows "Wrong passcode." and doesn't store the passcode.
  - A 200 stores it and renders its children.
- [ ] **Step 2:** Run. Expected: FAIL. Implement:
  - The chili table has inline edit (name, cook, pot #, description, allergens), delete with `confirm()`, and an add form.
  - Event controls: entries toggle, status Setup/Voting, a `datetime-local` reveal time (converted to ISO), and "Reveal now".
  - A warning when setting Voting with no reveal time.
  - The live ballot count via `useLive(['ballots','chilis','event'])`.
  - The QR code for `NEXT_PUBLIC_APP_URL`, with a "Print QR code" button (`window.print()`). An `@media print` stylesheet hides everything except the event name and the QR code (at least 12 cm wide). This is first on the design cut list.
  
  Run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add admin page with event controls and QR code"`. Run the per-layer loop.

---

## Layer 7: reveal (PR B, closes #8)

### Task 7.1: Results correctness and hard cutoff

**Files:**
- Create (only if a test exposes a `get_results` bug): `supabase/migrations/20261025000700_results_fix.sql`. Never edit the init migration; it's on `main` after the first checkpoint.
- Test: `supabase/tests/database/07_reveal.test.sql`

- [ ] **Step 1: Write failing tests:**
  - pgTAP hand count, with chilis A, B, C, D and ballots (A,B,C), (B,A,D), (A,C,B), (C,A,B), (B,C,A), after reveal:
    - A: points 11, firsts 2, rank 1.
    - B: points 10, firsts 2, rank 2.
    - C: points 8, firsts 1, rank 3.
    - D: points 1, rank 4.
  - pgTAP ties, with ballots (P,X,Q), (Y,Q,X): P and Y rank 1 (3 points, 1 first each); Q and X rank 3 (3 points, 0 firsts, 1 second each).
  - pgTAP, after `reveal_at = now() - 1s`: `create_chili`, `set_tag` and `submit_ballot` each throw (`entries_closed` / `voting_closed`). The 403 mapping is already covered by `http.test.ts`.
- [ ] **Step 2:** `npx supabase test db`. If everything already passes, the tests are the deliverable. Otherwise fix it via a migration until they pass.
- [ ] **Step 3: Commit.** `git commit -m "Pin scoring, ties and reveal cutoff with tests"`

### Task 7.2: Results screen and auto-switch

**Files:**
- Create: `src/components/Results.tsx`, `src/components/Ribbon.tsx`, `src/lib/results.ts`
- Modify: `src/components/Home.tsx`
- Test: `tests/unit/results.test.tsx`, `tests/unit/home-reveal.test.tsx`

**Interfaces:**
- Produces: `fetchResults(): Promise<ResultRow[]>` (`rpc('get_results')`). `Results({ rows, topTags })` lists every chili by rank, showing the `PotNumber`, name, points, firsts, cook and top tags. Equal ranks show "T-1st" etc.
- `Ribbon({ rank })` is a CSS rosette with the rank text printed on it, styled per Visual design (no emoji). The top 3 get one. On first render the ribbons drop in from 3rd to 1st, about 150 ms apart; under `prefers-reduced-motion: reduce` they appear without animation. This is the app's only animation, and second on the design cut list.
- `Home` arms a `setTimeout` for `Date.parse(revealAt) - serverNow(offset)` (re-armed whenever `revealAt` changes), and also re-evaluates the phase on every event refresh. When revealed, it renders `Results`. If `fetchResults()` returns `[]` while there are chilis, it retries every 1 s for up to 10 s.

- [ ] **Step 1: Write failing tests:**
  - `Results` shows "1st" text inside the ribbon (readable without color), the cook name, and "T-1st" for tied ranks. No medal emoji appear in the output.
  - `Home` (fake timers, mocked fetchers, `revealAt` 3 s out):
    - Shows the list.
    - After advancing 3 000 ms, shows `Results` without a reload.
    - A live event refresh moving `revealAt` 60 s later re-arms the timer, so the list is still showing at +3 s (Review Focus 5).
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add results screen with automatic reveal switch"`. Run the per-layer loop, then the per-PR loop for PR B. This is the **cut line**: merge PR B now if time is short.

---

## Layer 8: cook edit (PR C, closes #4)

### Task 8.1: Edit own chili

**Files:**
- Create: `supabase/migrations/20261025000800_update_chili.sql`, `src/app/api/chili/mine/route.ts`, `src/app/api/chili/update/route.ts`
- Modify: `src/lib/schemas.ts`, `src/lib/wizard.ts` (`fromChili`), `src/components/add/Wizard.tsx` (edit mode via `/add?edit=<id>`), `src/components/Home.tsx` ("Your chilis" links)
- Test: `supabase/tests/database/08_update_chili.test.sql`, `tests/integration/chili-edit.test.ts`, `tests/unit/wizard.test.ts`

**Interfaces:**
- Produces:
  - `update_chili(p_device_id text, p_chili_id uuid, p_name text, p_cook text, p_description text, p_allergens text[]) returns void`. Raises `'not_owner'` when `owner_device_id <> p_device_id`, and `'entries_closed'` when `now() >= reveal_at`. Replaces the allergen set. Service-role only (revoke from `public, anon, authenticated`).
  - `POST /api/chili/mine { deviceId }` → `{ ok, chilis: (PublicChili & { cook: string | null })[] }`.
  - `POST /api/chili/update`: `chiliInput` plus `chiliId: uuid`.
  - `fromChili(c): WizardState`, which starts at step 4 (review).

- [ ] **Step 1: Write failing tests:**
  - pgTAP: another device → `'not_owner'`; after reveal → `'entries_closed'`; the owner can update and the allergens are replaced; as `anon` → `'42501'`.
  - Integration: `/mine` returns only this device's chilis, cook included; `/update` from the owner → 200.
  - Unit: `fromChili` with `allergenIds: []` → `noAllergens: true`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement, then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Let cooks edit their own chili until reveal"`. Run the per-layer loop.

---

## Layer 9: tag moderation (PR C, closes #10)

### Task 9.1: Admin tag moderation

**Files:**
- Create: `src/app/api/admin/tags/route.ts`, `src/components/admin/AdminTags.tsx`
- Modify: `src/app/api/admin/state/route.ts` (adds `tagActivity`), `src/app/admin/page.tsx`
- Test: `tests/integration/admin-tags.test.ts`

**Interfaces:**
- Produces:
  - `state.tagActivity: { chiliId; tagId; deviceId; createdAt }[]`, the newest 100 rows.
  - `POST /api/admin/tags { chiliId, tagId, deviceId? }`. With `deviceId` it deletes that one row; without it, it clears that tag from the chili. Passcode-gated.

- [ ] **Step 1: Write failing integration tests:**
  - 401 without the passcode.
  - With `deviceId`, only that row is deleted (the count goes from 2 to 1).
  - Without `deviceId`, the count goes to 0.
  - `state.tagActivity` lists the rows.
- [ ] **Step 2:** Run. Expected: FAIL. Implement (removals stream via the existing `chili_tags` trigger), then run again. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add admin tag moderation"`. Run the per-layer loop, then the per-PR loop for PR C and the final **merge checkpoint**.

---

## After the stack

- [ ] Hand off issue #9 to Joel. It covers:
  - The PRD acceptance checklist on two phones over cellular.
  - First-load JS < 200 KB (DevTools → Network, JS transferred on `/`).
  - Clearing test data **without touching real entries**, because cooks have been adding chilis since the first checkpoint:
    - `delete from chili_tags where device_id like 'test-%'`
    - `delete from ballots where device_id like 'test-%'`
    - `delete from chilis where name like 'TEST %' or owner_device_id like 'test-%'` (`chili_allergens` cascades)
    - Never truncate the tables or reset the `pot_number` identity after the first checkpoint; real cooks have already written their pot numbers on table cards.
