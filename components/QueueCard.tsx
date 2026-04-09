'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ResumeEditor } from '@/components/ResumeEditor'
import type { Job } from '@/lib/supabase/types'

type Props = {
  job: Job
  onSend: (id: string) => Promise<void>
  onSkip: (id: string) => Promise<void>
}

export function QueueCard({ job, onSend, onSkip }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [skipping, setSkipping] = useState(false)

  async function handleSend() {
    setSending(true)
    window.open?.(job.url, '_blank')
    await onSend(job.id)
    setSending(false)
  }

  async function handleSkip() {
    setSkipping(true)
    await onSkip(job.id)
    setSkipping(false)
  }

  return (
    <>
      <Card className="border-[#e2e8f0] rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-[#0f172a]">{job.title}</h3>
              <p className="text-sm text-[#64748b]">{job.company}</p>
            </div>
            <span className="shrink-0 text-lg font-black text-[#16a34a]">
              {job.match_score}% match
            </span>
          </div>

          <ul className="space-y-1.5 mb-4">
            {job.match_reasons.map((r, i) => (
              <li key={i} className="text-sm text-[#64748b] flex gap-2 items-start">
                <span className="text-[#16a34a] shrink-0 mt-px">✓</span> {r}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white"
            >
              {sending ? 'Opening…' : 'Send Application →'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSheetOpen(true)}
              className="border-[#e2e8f0] text-[#0f172a]"
            >
              Edit Resume
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="text-sm text-[#94a3b8] hover:text-[#64748b] px-2 transition-colors"
            >
              {skipping ? '…' : 'Skip'}
            </button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[#0f172a]">
              Tailored Resume — {job.title} at {job.company}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ResumeEditor jobId={job.id} onClose={() => setSheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
