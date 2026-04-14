'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PreferencesForm } from '@/components/PreferencesForm'
import { Button } from '@/components/ui/button'
import type { Preferences } from '@/lib/supabase/types'

type Step = 'resume' | 'preferences'

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('resume')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [prefillPrefs, setPrefillPrefs] = useState<Partial<Preferences> | undefined>(undefined)
  const [isReturning, setIsReturning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadExistingProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data?.preferences) {
        setIsReturning(true)
        setPrefillPrefs(data.preferences as Partial<Preferences>)
      }
    }
    loadExistingProfile()
  }, [])

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeFile(file)
    setError('')
  }

  async function handleResumeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resumeFile) { setError('Please upload a resume first'); return }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', resumeFile)
      const res = await fetch('/api/profile/extract', { method: 'POST', body: formData })
      if (!res.ok) { setError('Failed to extract profile — try again'); return }
      const data = await res.json()
      const extractedRole = data.titles?.[0]
      setPrefillPrefs(prev => ({
        ...prev,
        ...(extractedRole ? { role: extractedRole } : {}),
      }))
      setStep('preferences')
    } finally {
      setLoading(false)
    }
  }

  async function handlePreferencesSave(prefs: Preferences) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ preferences: prefs }).eq('user_id', user.id)
    router.push('/search')
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`flex items-center gap-2 text-sm font-medium ${step === 'resume' ? 'text-[#0f172a]' : 'text-[#16a34a]'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${step === 'resume' ? 'bg-[#0f172a] text-white' : 'bg-[#16a34a] text-white'}`}>
            {step === 'resume' ? '1' : '✓'}
          </span>
          Upload Resume
        </div>
        <div className="flex-1 h-px bg-[#e2e8f0]" />
        <div className={`flex items-center gap-2 text-sm font-medium ${step === 'preferences' ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${step === 'preferences' ? 'bg-[#0f172a] text-white' : 'bg-[#e2e8f0] text-[#94a3b8]'}`}>
            2
          </span>
          Set Preferences
        </div>
      </div>

      {step === 'resume' ? (
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight mb-1">
            {isReturning ? 'Update your resume' : 'Upload your resume'}
          </h1>
          <p className="text-[#64748b] text-sm mb-6">
            {isReturning
              ? "Upload a new resume and we'll re-extract your skills for you to review."
              : "We'll extract your skills and experience automatically using AI."}
          </p>

          <form onSubmit={handleResumeSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={resumeFile ? 'Resume loaded, click to change' : 'Upload resume file'}
              className={`w-full border-2 border-dashed rounded-xl p-10 text-center transition-colors
                ${resumeFile
                  ? 'border-[#16a34a] bg-[#f0fdf4]'
                  : 'border-[#cbd5e1] hover:border-[#0f172a] bg-[#f8fafc]'}`}
            >
              <div className="text-4xl mb-3">{resumeFile ? '✅' : '📄'}</div>
              <p className="font-semibold text-[#0f172a] text-sm mb-1">
                {resumeFile ? 'Resume loaded — click to change' : 'Drop your resume here'}
              </p>
              <p className="text-xs text-[#64748b]">
                {resumeFile ? '' : 'PDF, DOCX, or TXT · up to 10MB'}
              </p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white h-11"
              disabled={loading || !resumeFile}
            >
              {loading ? 'Extracting profile with AI…' : 'Continue →'}
            </Button>
          </form>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight mb-1">
            {isReturning ? 'Confirm your preferences' : 'Set your preferences'}
          </h1>
          <p className="text-[#64748b] text-sm mb-6">
            {isReturning
              ? 'Review your extracted skills and update your preferences if needed.'
              : "Tell us what you're looking for so we can find the best matches."}
          </p>
          <PreferencesForm
            initial={prefillPrefs}
            onSave={handlePreferencesSave}
            submitLabel={isReturning ? 'Save Updates' : undefined}
          />
        </div>
      )}
    </div>
  )
}
