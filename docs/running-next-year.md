# Running the cook-off again

## A week before

1. Push migrations to prod: `npx supabase link --project-ref ivvzfqqkhftoyowanhck`, then `npx supabase db push`.
2. Get prod env vars: `vercel env pull .env.production.local --environment=production` (or copy `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into that file by hand; it's gitignored).
3. `npm run event -- check`: fails if prod is missing a grant that local hides, which is what broke prod on 2026-10-25.
4. In `/admin`, under **Archive**, tap **Archive this year** to save last year's results and photos to `/history`. If it warns that photos didn't copy, tap **Re-check photos**. Check `/history/<year>` looks right.
5. `npm run event -- reset --name "Overlook Chili Cook-Off"`: dry run that prints what would be wiped. Re-run with `--yes` to wipe chilis, votes, tags and live photos, restart pot numbers at 1, and put the event in Setup. It refuses until the event and its photos are archived; `--force` skips that, e.g. for clearing test data.
6. Run the PRD acceptance checklist on two real phones on cellular data. It was skipped in 2026 (#9).

## On the day

- Merge nothing once cooks start adding chilis. In 2026 three deploys landed during entries and voting.
- From `/admin`: set the reveal time, open entries, print the QR code. Close entries once every pot is on the table.
- Cooks fix their own entries from the home screen (**Your chili → Edit**) until reveal; the host only deletes true duplicates, which leaves a gap in pot numbers.
- Allergens are self-reported. In 2026, 4 of 5 chilis said "none", including a mole, so ask cooks about nuts, sesame and flour at check-in.
