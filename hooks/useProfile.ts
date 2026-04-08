import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

async function fetchProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data
}

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('profile', fetchProfile)
  return { profile: data ?? null, error, isLoading, mutate }
}
