import { useJobs } from '@/hooks/useJobs'

export function useQueue() {
  const { jobs, isLoading, mutate } = useJobs()
  const queue = jobs.filter(j => j.status === 'queued')

  async function sendJob(id: string) {
    await fetch(`/api/jobs/${id}/send`, { method: 'POST' })
    await mutate()
  }

  async function skipJob(id: string) {
    await fetch(`/api/jobs/${id}/skip`, { method: 'POST' })
    await mutate()
  }

  return { queue, isLoading, sendJob, skipJob }
}
