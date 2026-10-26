import { afterAll, vi } from 'vitest'
import { resetDb } from './helpers'

// BotID needs a live Vercel request; ballot.test.ts overrides per test.
vi.mock('botid/server', () => ({
  checkBotId: vi.fn(async () => ({ isHuman: true, isBot: false, isVerifiedBot: false, bypassed: false })),
}))
process.env.VOTER_SECRET ||= 'test-secret'

// Leave the DB empty so pgTAP runs after integration don't collide with test rows.
afterAll(resetDb)
