'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { postJson } from '@/lib/post-json'
import type { ApiResult } from '@/lib/types'

const KEY = 'chili.adminPasscode'

type AdminPost = <T>(url: string, body: unknown) => Promise<ApiResult<T>>
const Ctx = createContext<AdminPost | null>(null)

export function useAdminPost(): AdminPost {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAdminPost needs AdminGate')
  return ctx
}

const read = () => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [passcode, setPasscode] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const check = useCallback(async (code: string) => {
    setPending(true)
    const res = await postJson('/api/admin/state', {}, { headers: { 'x-admin-passcode': code } })
    setPending(false)
    if (!res.ok) {
      try {
        sessionStorage.removeItem(KEY)
      } catch {}
      setError(res.message)
      return
    }
    try {
      sessionStorage.setItem(KEY, code)
    } catch {}
    setError('')
    setPasscode(code)
  }, [])

  useEffect(() => {
    const saved = read()
    // restore a saved passcode after mount (sessionStorage is client-only)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) void check(saved)
  }, [check])

  const post = useCallback<AdminPost>(
    (url, body) => postJson(url, body, { headers: { 'x-admin-passcode': passcode ?? '' } }),
    [passcode],
  )

  if (passcode === null) {
    return (
      <form
        className="mx-auto w-full max-w-md p-4"
        onSubmit={(e) => {
          e.preventDefault()
          void check(input)
        }}
      >
        <h1 className="text-[28px] font-semibold">Admin</h1>
        <label htmlFor="passcode" className="mt-4 block">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="mt-1 min-h-12 w-full rounded border border-rule px-3"
        />
        {error && (
          <p role="alert" className="mt-2 text-chili">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !input}
          className="mt-4 min-h-12 rounded bg-enamel px-6 font-semibold text-plate disabled:opacity-60"
        >
          {pending ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    )
  }
  return <Ctx.Provider value={post}>{children}</Ctx.Provider>
}
