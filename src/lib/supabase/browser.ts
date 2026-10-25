import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

let client: SupabaseClient<Database> | undefined

export function browserClient(): SupabaseClient<Database> {
  // Lazy so `next build` with dummy env never fails at import.
  client ??= createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return client
}
