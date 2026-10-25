import { describe, expect, it } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'
import { fail, fromDbError, ok } from '@/lib/http'

const err = (code: string, message = '', details = ''): PostgrestError =>
  ({ code, message, details, hint: '', name: 'PostgrestError' }) as PostgrestError

describe('fromDbError', () => {
  it.each([
    ['entries_closed', 403],
    ['voting_closed', 403],
    ['not_owner', 403],
    ['device_limit', 409],
  ])('maps raised %s to %i', async (msg, status) => {
    const res = fromDbError(err('P0001', msg))
    expect(res.status).toBe(status)
    expect(await res.json()).toMatchObject({ ok: false, error: msg })
  })

  it('maps 23505 on pot_number to pot_taken', async () => {
    const res = fromDbError(err('23505', 'duplicate key value violates unique constraint "chilis_pot_number_key"', 'Key (pot_number)=(1) already exists.'))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('pot_taken')
  })

  it('maps other 23505 to name_taken with message', async () => {
    const res = fromDbError(err('23505', 'duplicate key value violates unique constraint "chilis_name_ci"'))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'name_taken', message: 'That name is already taken. Try another.' })
  })

  it.each(['23514', '23503'])('maps %s to 400 invalid', async (code) => {
    const res = fromDbError(err(code))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid')
  })

  it('maps anything else to 500', async () => {
    const res = fromDbError(err('XX000', 'boom'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('server_error')
  })
})

describe('ok/fail', () => {
  it('ok spreads body', async () => {
    const res = ok({ potNumber: 3 }, 201)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, potNumber: 3 })
  })
  it('fail includes message', async () => {
    expect(await fail('unauthorized', 401).json()).toEqual({ ok: false, error: 'unauthorized', message: 'Wrong passcode.' })
  })
})
