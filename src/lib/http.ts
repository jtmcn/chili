import type { PostgrestError } from '@supabase/supabase-js'

export const MESSAGES: Record<string, string> = {
  name_taken: 'That name is already taken. Try another.',
  pot_taken: 'That pot number is already in use.',
  device_limit: "You've already added 3 chilis from this phone.",
  entries_closed: 'Entries are closed.',
  voting_closed: 'Voting is closed.',
  not_owner: 'You can only edit chilis added from this phone.',
  invalid: "Something's not right with that entry.",
  server_error: 'Something went wrong. Try again.',
  unauthorized: 'Wrong passcode.',
}

export function ok<T extends object>(body: T, status = 200): Response {
  return Response.json({ ok: true, ...body }, { status })
}

export function fail(error: string, status: number): Response {
  return Response.json({ ok: false, error, message: MESSAGES[error] }, { status })
}

const RAISED: Record<string, number> = {
  entries_closed: 403,
  voting_closed: 403,
  not_owner: 403,
  device_limit: 409,
}

export function fromDbError(e: PostgrestError): Response {
  if (e.message in RAISED) return fail(e.message, RAISED[e.message])
  if (e.code === '23505') {
    const pot = `${e.message} ${e.details ?? ''}`.includes('pot_number')
    return fail(pot ? 'pot_taken' : 'name_taken', 409)
  }
  // 23503: chili deleted/unknown; 4xx so postJson doesn't retry
  if (e.code === '23514' || e.code === '23503') return fail('invalid', 400)
  return fail('server_error', 500)
}
