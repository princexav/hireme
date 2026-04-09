import { Card, CardContent } from '@/components/ui/card'
import type { Job } from '@/lib/supabase/types'

type Props = { job: Job }

export function JobCard({ job }: Props) {
  const scoreColor =
    job.match_score >= 70 ? 'text-[#16a34a]' :
    job.match_score >= 50 ? 'text-[#d97706]' :
    'text-[#94a3b8]'

  const scoreBg =
    job.match_score >= 70 ? 'bg-[#f0fdf4] border-[#bbf7d0]' :
    job.match_score >= 50 ? 'bg-[#fffbeb] border-[#fde68a]' :
    'bg-[#f8fafc] border-[#e2e8f0]'

  return (
    <Card className="border-[#e2e8f0] hover:shadow-sm transition-shadow rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#0f172a] text-sm leading-tight truncate">{job.title}</h3>
            <p className="text-xs text-[#64748b] mt-0.5">{job.company}</p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg border ${scoreColor} ${scoreBg}`}>
            {job.match_score}%
          </span>
        </div>
        <ul className="space-y-1 mb-3">
          {job.match_reasons.map((reason, i) => (
            <li key={i} className="text-xs text-[#64748b] flex gap-1.5 items-start">
              <span className="text-[#16a34a] shrink-0 mt-px">✓</span>
              {reason}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 pt-1 border-t border-[#f1f5f9]">
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-xs font-medium text-[#0f172a] underline underline-offset-2 hover:text-[#6366f1]">
            View listing ↗
          </a>
          {job.status === 'queued' && (
            <span className="text-xs text-[#6366f1] font-medium bg-[#eef2ff] px-2 py-0.5 rounded-full">
              In queue
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
