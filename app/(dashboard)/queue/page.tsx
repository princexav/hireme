'use client'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { useQueue } from '@/hooks/useQueue'
import { QueueCard } from '@/components/QueueCard'

export default function QueuePage() {
  const { queue, isLoading, sendJob, skipJob } = useQueue()

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Apply Queue</h1>
        <p className="text-sm text-[#64748b]">
          {queue.length} {queue.length === 1 ? 'job' : 'jobs'} ready — tailor your resume and apply
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-muted rounded-xl p-3 mb-4">
            <FileText size={48} className="text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-[#0f172a] tracking-tight mb-2">
            Your queue is empty
          </h2>
          <p className="text-sm text-[#64748b] max-w-xs mb-6 leading-relaxed">
            Jobs you select from the search page will appear here so you can tailor your resume and track your applications.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-md hover:bg-[#1e293b] transition-colors"
          >
            Find Jobs
          </Link>
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
