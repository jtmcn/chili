export type EventStatus = 'setup' | 'voting' | 'revealed'
export type Phase = EventStatus

export interface EventState {
  name: string
  status: EventStatus
  revealAt: string | null
  entriesOpen: boolean
  serverNow: string
}

export interface PublicChili {
  id: string
  potNumber: number
  name: string
  description: string | null
  cook: string | null
  allergenIds: string[]
  photoPath: string | null
}

export interface RefItem {
  id: string
  label: string
  sort: number
}

export interface TagCount {
  chiliId: string
  tagId: string
  count: number
}

export interface ResultRow {
  chiliId: string
  potNumber: number
  name: string
  cook: string | null
  points: number
  firsts: number
  seconds: number
  thirds: number
  rank: number
  photoPath?: string | null
}

export type ApiResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string; message: string }
