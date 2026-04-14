'use client'
import { useJobs } from '@/hooks/useJobs'
import type { Job } from '@/lib/supabase/types'

const STAT_COLUMNS = [
  { status: 'applied',   label: 'Applied',   color: 'text-[#6366f1]' },
  { status: 'interview', label: 'Interview',  color: 'text-[#0891b2]' },
  { status: 'offer',     label: 'Offers',     color: 'text-[#16a34a]' },
  { status: 'rejected',  label: 'Rejected',   color: 'text-[#94a3b8]' },
]

export function TrackerStats() {
  const { jobs } = useJobs()
  const tracked = jobs.filter((j: Job) => ['applied', 'interview', 'offer', 'rejected'].includes(j.status))
  const avgScore = tracked.length > 0
    ? Math.round(tracked.reduce((s: number, j: Job) => s + j.match_score, 0) / tracked.length)
    : null

  return (
    <div className="flex flex-wrap items-center gap-6 px-5 py-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
      <div>
        <p className="text-2xl font-bold text-[#0f172a]">{tracked.length}</p>
        <p className="text-xs text-[#64748b] mt-0.5">Total applications</p>
      </div>

      <div className="w-px h-8 bg-[#e2e8f0] hidden sm:block" />

      {STAT_COLUMNS.map(({ status, label, color }) => (
        <div key={status}>
          <p className={`text-2xl font-bold ${color}`}>
            {jobs.filter((j: Job) => j.status === status).length}
          </p>
          <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
        </div>
      ))}

      {avgScore !== null && (
        <>
          <div className="w-px h-8 bg-[#e2e8f0] hidden sm:block" />
          <div>
            <p className="text-2xl font-bold text-[#0f172a]">{avgScore}%</p>
            <p className="text-xs text-[#64748b] mt-0.5">Avg match score</p>
          </div>
        </>
      )}
    </div>
  )
}
