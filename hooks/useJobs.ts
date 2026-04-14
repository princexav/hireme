import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import type { Job } from '@/lib/supabase/types'

export function useJobs() {
  const { data: user } = useUser()
  const { data, error, isLoading, mutate } = useSWR(
    user ? `jobs-${user.id}` : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user!.id)
        .order('match_score', { ascending: false })
      return (data ?? []) as Job[]
    },
  )
  return { jobs: data ?? [], error, isLoading, mutate }
}
