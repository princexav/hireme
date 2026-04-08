import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/supabase/types'

async function fetchJobs(): Promise<Job[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export function useJobs() {
  const { data, error, isLoading, mutate } = useSWR('jobs', fetchJobs)
  return { jobs: data ?? [], error, isLoading, mutate }
}
