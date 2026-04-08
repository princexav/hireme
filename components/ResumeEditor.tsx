'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  jobId: string
  onClose: () => void
}

export function ResumeEditor({ jobId, onClose }: Props) {
  const [tailored, setTailored] = useState('')
  const [changes, setChanges] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  async function loadTailored() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/jobs/${jobId}/tailor`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setTailored(data.tailored_text)
        setChanges(data.changes)
        setLoaded(true)
      } else {
        setError('Failed to tailor resume — try again')
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(tailored)
  }

  return (
    <div className="space-y-4">
      {!loaded ? (
        <>
          <Button onClick={loadTailored} disabled={loading} className="w-full">
            {loading ? 'Tailoring resume…' : 'Tailor Resume for This Job'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">What changed:</p>
            <ul className="space-y-1">
              {changes.map((c, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-blue-500 shrink-0">→</span> {c}
                </li>
              ))}
            </ul>
          </div>
          <Textarea
            value={tailored}
            onChange={e => setTailored(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} className="flex-1">Copy to Clipboard</Button>
            <Button variant="outline" onClick={onClose}>Done</Button>
          </div>
        </>
      )}
    </div>
  )
}
