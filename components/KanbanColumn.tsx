import type { Job, JobStatus } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'

const COLUMN_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  queued: 'In Queue',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

type Props = {
  status: JobStatus
  jobs: Job[]
  onStatusChange: (jobId: string, status: JobStatus) => Promise<void>
}

export function KanbanColumn({ status, jobs, onStatusChange }: Props) {
  const NEXT: Partial<Record<JobStatus, JobStatus>> = {
    applied: 'interview',
    interview: 'offer',
  }
  const nextStatus = NEXT[status]

  return (
    <div className="min-w-[200px] flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {jobs.length}
        </span>
      </div>

      {jobs.map(job => (
        <Card key={job.id} className="cursor-default">
          <CardContent className="p-3 space-y-1">
            <p className="text-sm font-medium leading-tight">{job.title}</p>
            <p className="text-xs text-muted-foreground">{job.company}</p>
            <div className="flex gap-1 pt-1 flex-wrap">
              {nextStatus && (
                <button
                  onClick={() => onStatusChange(job.id, nextStatus)}
                  className="text-xs underline text-primary">
                  → {COLUMN_LABELS[nextStatus]}
                </button>
              )}
              <button
                onClick={() => onStatusChange(job.id, 'rejected')}
                className="text-xs text-muted-foreground underline">
                Reject
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
