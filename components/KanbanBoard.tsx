'use client'
import { createClient } from '@/lib/supabase/client'
import { KanbanColumn } from '@/components/KanbanColumn'
import { useJobs } from '@/hooks/useJobs'
import type { Job, JobStatus } from '@/lib/supabase/types'

const VISIBLE_COLUMNS: JobStatus[] = ['applied', 'interview', 'offer', 'rejected']

export function KanbanBoard() {
  const { jobs, mutate } = useJobs()

  async function handleStatusChange(jobId: string, status: JobStatus) {
    const supabase = createClient()
    await supabase.from('jobs').update({ status }).eq('id', jobId)
    await mutate()
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
