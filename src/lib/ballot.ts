export type Picks = [string | null, string | null, string | null]

const KEY = 'chili.pendingBallot'

export function setPick(p: Picks, rank: 0 | 1 | 2, chiliId: string): Picks {
  const next = p.map((id) => (id === chiliId ? null : id)) as Picks
  next[rank] = chiliId
  return next
}

export function isComplete(p: Picks): boolean {
  return p.every((id) => id !== null)
}

export function savePending(p: Picks) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}

export function loadPending(): Picks | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return Array.isArray(v) && v.length === 3 ? (v as Picks) : null
  } catch {
    return null
  }
}

export function clearPending() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
