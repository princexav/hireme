import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import type { Profile } from '@/lib/supabase/types'

export function useProfile() {
  const { data: user } = useUser()
  const { data, error, isLoading, mutate } = useSWR(
    user ? `profile-${user.id}` : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      return data as Profile | null
    },
  )
  return { profile: data ?? null, error, isLoading, mutate }
}
