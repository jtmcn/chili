import type { ApiResult } from '@/lib/types'

const NETWORK: ApiResult<never> = { ok: false, error: 'network', message: "No connection. We'll keep trying." }
const SERVER_ERROR: ApiResult<never> = { ok: false, error: 'server_error', message: 'Something went wrong. Try again.' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Retries only thrown fetches and 5xx; any 4xx is the server's final answer.
export async function postJson<T>(
  url: string,
  body: unknown,
  opts: { retries?: number; delayMs?: number; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const { retries = 3, delayMs = 500, headers } = opts
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(delayMs * attempt)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      })
      if (res.status >= 500 && attempt < retries) continue
      // non-JSON body (proxy error page) is final, not retried
      return (await res.json().catch(() => SERVER_ERROR)) as ApiResult<T>
    } catch {
      // fall through to retry
    }
  }
  return NETWORK
}
