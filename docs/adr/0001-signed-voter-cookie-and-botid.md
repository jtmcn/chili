# 1. Signed voter cookie and BotID on ballots

Date: 2026-10-26

## Status

Accepted. Narrows the PRD's "cheating is out of scope beyond the device ID" (`docs/prd.md`).

## Context

`/api/ballot` trusted the `deviceId` in the request body, and the database keeps one ballot per ID. A script that sent a fresh `crypto.randomUUID()` with each POST got one counted ballot per request. That is much worse than the private-window re-vote the PRD accepted.

## Decision

- **Server-issued voter ID.** `src/proxy.ts` sets an httpOnly `chili_voter` cookie on page loads. The cookie holds `<uuid>.<HMAC-SHA256(uuid, VOTER_SECRET)>`. The ballot routes ignore the request body's `deviceId` and use only a cookie that verifies. API routes never issue a cookie, so a script has to load a page to get each new voter ID.
- **BotID on `POST /api/ballot`.** Requests that BotID classes as bots get a 403. This blocks scripts that fetch fresh cookies in a loop without a real browser.
- **Ballots vs. guests check.** The admin page compares the ballot count with a host-entered "Guests expected" and warns when the count goes over.

## Consequences

- `VOTER_SECRET` must be set in production. Without it, ballots fail with 401, by design. Rotating it invalidates every voter ID, and voters lose access to their saved ballots.
- Off Vercel (`next start` locally), BotID throws because there's no OIDC token, so use `next dev` locally.
- Tags, chili entries and photos still use the client `deviceId`. Tag counts can still be inflated by a script. That's a lower-stakes target, left for later.
- One-time ballot codes, which would truly enforce one person, one vote, were rejected because they add friction to voting.
