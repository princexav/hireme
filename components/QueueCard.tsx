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
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{job.title}</h3>
              <p className="text-sm text-muted-foreground">{job.company}</p>
            </div>
            <span className="text-sm font-bold text-green-600 shrink-0">
              {job.match_score}% match
            </span>
          </div>

          <ul className="space-y-1">
            {job.match_reasons.map((r, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-green-500 shrink-0">✓</span> {r}
              </li>
            ))}
          </ul>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSend} disabled={sending} className="flex-1">
              {sending ? 'Opening…' : 'Send'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)} className="flex-1">
              Edit Resume
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSkip} disabled={skipping}>
              {skipping ? '…' : 'Skip'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tailored Resume — {job.title} at {job.company}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ResumeEditor jobId={job.id} onClose={() => setSheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
