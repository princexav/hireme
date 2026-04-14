'use client'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { KanbanColumn } from '@/components/KanbanColumn'
import { useJobs } from '@/hooks/useJobs'
import type { Job, JobStatus } from '@/lib/supabase/types'

const VISIBLE_COLUMNS: JobStatus[] = ['applied', 'interview', 'offer', 'rejected']

export function KanbanBoard() {
  const { jobs, mutate } = useJobs()

  async function handleStatusChange(jobId: string, status: JobStatus) {
    const job = jobs.find((j: Job) => j.id === jobId)
    if (job && status === 'applied' && job.match_score < 50) {
      toast.warning(`Low match score (${job.match_score}%)`, {
        description: 'This role may not be a strong fit. Consider focusing on higher-match opportunities.',
      })
    }
    try {
      const supabase = createClient()
      const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId)
      if (error) throw new Error(error.message)
      await mutate()
    } catch (err) {
      toast.error('Failed to update status', {
        description: (err as Error).message,
      })
    }
  }

  const byStatus = (status: JobStatus) => jobs.filter((j: Job) => j.status === status)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {VISIBLE_COLUMNS.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          jobs={byStatus(status)}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  )
}
