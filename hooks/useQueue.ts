import { toast } from 'sonner'
import { useJobs } from '@/hooks/useJobs'

export function useQueue() {
  const { jobs, isLoading, mutate } = useJobs()
  const queue = jobs.filter(j => j.status === 'queued')

  async function sendJob(id: string) {
    const optimistic = jobs.filter(j => j.id !== id)
    try {
      await mutate(
        fetch(`/api/jobs/${id}/send`, { method: 'POST' }).then(() => undefined),
        { optimisticData: optimistic, rollbackOnError: true, revalidate: true },
      )
    } catch {
      toast.error('Failed to send job. Please try again.')
    }
  }

  async function skipJob(id: string) {
    const optimistic = jobs.filter(j => j.id !== id)
    try {
      await mutate(
        fetch(`/api/jobs/${id}/skip`, { method: 'POST' }).then(() => undefined),
        { optimisticData: optimistic, rollbackOnError: true, revalidate: true },
      )
    } catch {
      toast.error('Failed to skip job. Please try again.')
    }
  }

  return { queue, isLoading, sendJob, skipJob }
}
