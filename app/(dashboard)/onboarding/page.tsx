'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { extractTextFromResume } from '@/lib/resume-parser'
import { PreferencesForm } from '@/components/PreferencesForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Preferences } from '@/lib/supabase/types'

type Step = 'resume' | 'preferences'

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('resume')
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const text = await extractTextFromResume(file)
      setResumeText(text)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResumeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resumeText) { setError('Please upload a resume first'); return }
    setLoading(true)
    const formData = new FormData()
    formData.append('resumeText', resumeText)
    const res = await fetch('/api/profile/extract', { method: 'POST', body: formData })
    if (!res.ok) { setError('Failed to extract profile'); setLoading(false); return }
    setLoading(false)
    setStep('preferences')
  }

  async function handlePreferencesSave(prefs: Preferences) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles')
      .update({ preferences: prefs })
      .eq('user_id', user.id)
    router.push('/search')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            {step === 'resume' ? 'Upload your resume' : 'Set your preferences'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'resume' ? (
            <form onSubmit={handleResumeSubmit} className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                <p className="text-muted-foreground">
                  {resumeText ? '✓ Resume loaded — click to change' : 'Click to upload PDF or DOCX'}
                </p>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload} className="hidden" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !resumeText}>
                {loading ? 'Extracting profile…' : 'Continue'}
              </Button>
            </form>
          ) : (
            <PreferencesForm onSave={handlePreferencesSave} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
