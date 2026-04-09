import type { Job, JobStatus } from '@/lib/supabase/types'

const COLUMN_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  queued: 'In Queue',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

const COLUMN_COLORS: Partial<Record<JobStatus, string>> = {
  applied: 'bg-[#eff6ff] text-[#3b82f6]',
  interview: 'bg-[#f0fdf4] text-[#16a34a]',
  offer: 'bg-[#fefce8] text-[#ca8a04]',
  rejected: 'bg-[#fef2f2] text-[#ef4444]',
}

const NEXT: Partial<Record<JobStatus, JobStatus>> = {
  applied: 'interview',
  interview: 'offer',
}

type Props = {
  status: JobStatus
  jobs: Job[]
  onStatusChange: (jobId: string, status: JobStatus) => Promise<void>
}

export function KanbanColumn({ status, jobs, onStatusChange }: Props) {
  const nextStatus = NEXT[status]
  const colorClass = COLUMN_COLORS[status] ?? 'bg-[#f1f5f9] text-[#64748b]'

  return (
    <div className="min-w-[220px] flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-sm font-bold text-[#0f172a] tracking-tight">{COLUMN_LABELS[status]}</h3>
        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${colorClass}`}>
          {jobs.length}
        </span>
      </div>

      {jobs.length === 0 && (
        <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-4 text-center">
          <p className="text-xs text-[#94a3b8]">No applications yet</p>
        </div>
      )}

      {jobs.map(job => (
        <div key={job.id} className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm">
          <p className="text-sm font-semibold text-[#0f172a] leading-tight mb-0.5">{job.title}</p>
          <p className="text-xs text-[#64748b] mb-2">{job.company}</p>
          <div className="flex gap-2 flex-wrap">
            {nextStatus && (
              <button
                type="button"
                onClick={() => onStatusChange(job.id, nextStatus)}
                className="text-xs font-medium text-[#6366f1] hover:text-[#4f46e5] transition-colors">
                Move to {COLUMN_LABELS[nextStatus]} →
              </button>
            )}
            <button
              type="button"
              onClick={() => onStatusChange(job.id, 'rejected')}
              className="text-xs text-[#94a3b8] hover:text-[#ef4444] transition-colors">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
