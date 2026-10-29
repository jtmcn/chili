import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/keepalive/route'

const get = (headers: Record<string, string> = {}) => GET(new Request('http://localhost/api/keepalive', { headers }))

describe('keepalive', () => {
  beforeEach(() => { process.env.CRON_SECRET = 'test-cron' })
  afterEach(() => { delete process.env.CRON_SECRET })

  it('200 with the cron bearer token', async () => {
    const r = await get({ authorization: 'Bearer test-cron' })
    expect(r.status).toBe(200)
  })
  it('401 with no header or a wrong token', async () => {
    expect((await get()).status).toBe(401)
    expect((await get({ authorization: 'Bearer nope' })).status).toBe(401)
  })
  it('401 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    expect((await get({ authorization: 'Bearer ' })).status).toBe(401)
  })
})
