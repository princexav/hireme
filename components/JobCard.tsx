import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Job } from '@/lib/supabase/types'

type Props = { job: Job }

export function JobCard({ job }: Props) {
  const scoreColor =
    job.match_score >= 70 ? 'bg-green-100 text-green-800' :
    job.match_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-600'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm">{job.title}</h3>
            <p className="text-xs text-muted-foreground">{job.company}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${scoreColor}`}>
            {job.match_score}% match
          </span>
        </div>
        <ul className="space-y-1">
          {job.match_reasons.map((reason, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="text-green-500 shrink-0">✓</span>
              {reason}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 pt-1">
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-xs underline text-primary">View listing</a>
          {job.status === 'queued' && (
            <Badge variant="outline" className="text-xs">In queue</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
