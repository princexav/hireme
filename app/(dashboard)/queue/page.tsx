'use client'
import { useQueue } from '@/hooks/useQueue'
import { QueueCard } from '@/components/QueueCard'

export default function QueuePage() {
  const { queue, isLoading, sendJob, skipJob } = useQueue()

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apply Queue</h1>
        <p className="text-sm text-muted-foreground">
          {queue.length} jobs ready · resumes tailored · review and send in 30 seconds each
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Queue is empty. Search for jobs to fill it.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(job => (
            <QueueCard key={job.id} job={job} onSend={sendJob} onSkip={skipJob} />
          ))}
        </div>
      )}
    </div>
  )
}
