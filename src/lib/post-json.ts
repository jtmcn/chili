import type { ApiResult } from '@/lib/types'

const NETWORK: ApiResult<never> = { ok: false, error: 'network', message: "No connection. We'll keep trying." }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Retries only thrown fetches and 5xx; any 4xx is the server's final answer.
export async function postJson<T>(
  url: string,
  body: unknown,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<ApiResult<T>> {
  const { retries = 3, delayMs = 500 } = opts
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(delayMs * attempt)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status >= 500 && attempt < retries) continue
      return (await res.json()) as ApiResult<T>
    } catch {
      // fall through to retry
    }
  }
  return NETWORK
}
