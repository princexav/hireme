'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { ResumePDF } from '@/components/ResumePDF'

// PDFDownloadLink uses browser-only download/blob APIs — must be client-only.
// ResumePDF is kept as a static import so @react-pdf/renderer's internal PDF
// renderer receives a concrete component (not a lazy wrapper), which it requires.
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
)

type Props = {
  jobId: string
  jobTitle?: string
  onClose: () => void
}

type ATSResult = {
  keywords: string[]
  originalScore: number
  tailoredScore: number
}

const PHASES = [
  { max: 20, label: 'Extracting ATS keywords from Job Description…', ms: 300  },
  { max: 50, label: 'Semantically scoring your current resume…',      ms: 430  },
  { max: 90, label: 'AI is tailoring and rewriting your experience…', ms: 500  },
  { max: 99, label: 'Formatting PDF and finalizing…',                 ms: 1000 },
]

function getPhaseIndex(p: number): number {
  const idx = PHASES.findIndex(phase => p < phase.max)
  return idx === -1 ? PHASES.length - 1 : idx
}

function getPhaseMs(p: number): number {
  return PHASES[getPhaseIndex(p)].ms
}

export function ResumeEditor({ jobId, jobTitle, onClose }: Props) {
  const [tailored, setTailored] = useState('')
  const [changes, setChanges] = useState<string[]>([])
  const [ats, setAts] = useState<ATSResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const progressRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount: check DB for an existing tailored resume. If cached, show it
  // immediately. If not, auto-start the AI tailoring.
  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createClient()
      const { data } = await supabase
        .from('resumes')
        .select('*')
        .eq('job_id', jobId)
        .single()
      if (cancelled) return
      if (data?.tailored_text) {
        try {
          const parsed = JSON.parse(data.tailored_text)
          setTailored(JSON.stringify(parsed, null, 2))
        } catch {
          setTailored(data.tailored_text)
        }
        setChanges(data.changes ?? [])
        if (data.original_ats_score != null && data.tailored_ats_score != null) {
          setAts({
            keywords:      data.ats_keywords ?? [],
            originalScore: data.original_ats_score,
            tailoredScore: data.tailored_ats_score,
          })
        }
        setLoaded(true)
      } else {
        loadTailored()
      }
    }
    init()
    return () => {
      cancelled = true
      stopTimer()
    }
  }, [jobId])

  function stopTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function startProgress() {
    stopTimer()
    progressRef.current = 1
    setProgress(1)

    function tick() {
      const current = progressRef.current
      if (current >= 99) return
      const next = current + 1
      progressRef.current = next
      setProgress(next)
      timerRef.current = setTimeout(tick, getPhaseMs(next))
    }

    timerRef.current = setTimeout(tick, getPhaseMs(1))
  }

  async function loadTailored() {
    setError('')
    startProgress()
    try {
      const res = await fetch(`/api/jobs/${jobId}/tailor`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        stopTimer()
        setProgress(100)
        try {
          const parsed = JSON.parse(data.tailored_text)
          setTailored(JSON.stringify(parsed, null, 2))
        } catch {
          setTailored(data.tailored_text)
        }
        setChanges(data.changes ?? [])
        if (data.original_ats_score != null && data.tailored_ats_score != null) {
          setAts({
            keywords:      data.ats_keywords ?? [],
            originalScore: data.original_ats_score,
            tailoredScore: data.tailored_ats_score,
          })
        }
        setTimeout(() => {
          setProgress(0)
          progressRef.current = 0
          setLoaded(true)
        }, 800)
      } else {
        stopTimer()
        progressRef.current = 0
        setProgress(0)
        setError('Failed to tailor resume — try again')
      }
    } catch {
      stopTimer()
      progressRef.current = 0
      setProgress(0)
      setError('Network error — try again')
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(tailored)
  }

  const filename = jobTitle
    ? `Resume_${jobTitle.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`
    : 'Tailored_Resume.pdf'

  return (
    <div className="space-y-4">
      {!loaded ? (
        <>
          {progress > 0 ? (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="space-y-2">
                {PHASES.map((phase, i) => {
                  const activeIdx = getPhaseIndex(progress)
                  const isDone = i < activeIdx
                  const isActive = i === activeIdx
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isDone   ? 'bg-green-500' :
                        isActive ? 'bg-blue-500'  :
                                   'bg-[#e2e8f0]'
                      }`} />
                      <span className={`text-xs ${
                        isDone   ? 'line-through text-muted-foreground' :
                        isActive ? 'font-semibold text-[#0f172a]'       :
                                   'text-[#94a3b8]'
                      }`}>
                        {phase.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <Button disabled className="w-full opacity-70">
                Tailoring… please wait
              </Button>
            </div>
          ) : (
            <Button onClick={loadTailored} className="w-full">
              Tailor Resume for This Job
            </Button>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      ) : (
        <>
          {ats && (
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#94a3b8]">{ats.originalScore}</p>
                  <p className="text-xs text-[#94a3b8]">Original</p>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-[#16a34a] text-lg font-bold">
                    +{ats.tailoredScore - ats.originalScore} pts
                  </div>
                  <div className="w-full h-px bg-[#e2e8f0] relative">
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#e2e8f0]">▶</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#16a34a]">{ats.tailoredScore}</p>
                  <p className="text-xs text-[#16a34a]">Tailored</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] mb-1.5">ATS keywords targeted</p>
                <div className="flex flex-wrap gap-1.5">
                  {ats.keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#6366f1] border border-[#c7d2fe]">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
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
            readOnly
            rows={20}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" className="flex-1">
              Copy to Clipboard
            </Button>
            <PDFDownloadLink
              document={<ResumePDF text={tailored} jobTitle={jobTitle} />}
              fileName={filename}
            >
              {({ loading: pdfLoading }) => (
                <Button disabled={pdfLoading} className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white">
                  {pdfLoading ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>
            <Button variant="outline" onClick={onClose}>Done</Button>
          </div>
        </>
      )}
    </div>
  )
}
