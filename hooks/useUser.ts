import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

async function fetchUser(): Promise<User | null> {
  const supabase = createClient()
  // getSession reads from localStorage — no network call, no Supabase quota
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export function useUser() {
  return useSWR<User | null>('user', fetchUser)
}
