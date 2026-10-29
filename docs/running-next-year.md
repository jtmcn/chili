# Running the cook-off again

## Between events

Supabase is on the free plan, which pauses a project after 7 idle days and only restores it from the dashboard for 90 days. A daily Vercel Cron hits `/api/keepalive` to prevent that. Nothing alerts if it fails, so every 2–3 months:

- In Vercel, under **Settings → Cron Jobs**, check that recent runs returned 200. For a 500, the cause is in runtime logs under `keepalive`.
- In Supabase, check that the project shows Active, not Paused.
- `CRON_SECRET` must stay set in Vercel production. Changing it only takes effect after a redeploy.

## A week before

1. Push migrations to prod: `npx supabase link --project-ref ivvzfqqkhftoyowanhck`, then `npx supabase db push`.
2. Get prod env vars: `vercel env pull .env.production.local --environment=production` (or copy `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into that file by hand; it's gitignored).
3. Make sure `VOTER_SECRET` is set in Vercel production (`openssl rand -base64 32`). Without it no one can vote. Changing it drops everyone's saved ballot, so don't rotate it during voting.
4. `npm run event -- check`: fails if prod is missing a grant that local hides, which is what broke prod on 2026-10-25.
5. In `/admin`, under **Archive**, tap **Archive this year** to save last year's results and photos to `/history`. If it warns that photos didn't copy, tap **Re-check photos**. Check `/history/<year>` looks right.
6. `npm run event -- reset --name "Overlook Chili Cook-Off"`: dry run that prints what would be wiped. Re-run with `--yes` to wipe chilis, ballots, tags and live photos, restart pot numbers at 1, and put the event in Setup. It refuses until the event and its photos are archived; `--force` skips that, e.g. for clearing test data.
7. Run the PRD acceptance checklist on two real phones on cellular data. It was skipped in 2026 (#9).

## On the day

- Merge nothing once cooks start adding chilis. In 2026 three deploys landed while entries were open and during voting.
- From `/admin`: set the reveal time, open entries, print the QR code, and enter **Guests expected**. If ballots pass that number, the page warns you; close voting early if it looks like stuffing. Close entries once every pot is on the table.
- Cooks fix their own chilis from the home screen (**Your chili → Edit**) until reveal; the host only deletes true duplicates, which leaves a gap in pot numbers.
- Allergens are self-reported. In 2026, 4 of 5 chilis said "none", including a mole, so ask cooks about nuts, sesame and flour at check-in.
