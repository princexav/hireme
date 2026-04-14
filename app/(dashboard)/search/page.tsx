'use client'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/useProfile'
import { useJobs } from '@/hooks/useJobs'
import { JobCard } from '@/components/JobCard'
import { PreferencesForm } from '@/components/PreferencesForm'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import type { Preferences } from '@/lib/supabase/types'

export default function SearchPage() {
  const { profile, isLoading: profileLoading, mutate: mutateProfile } = useProfile()
  const { jobs, mutate, isLoading: jobsLoading } = useJobs()
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const recentJobs = jobs
    .slice()
    .sort((a, b) => b.match_score - a.match_score)

  async function handleSearch(prefsOverride?: Partial<Preferences>) {
    if (!profile) return
    setSearching(true)
    setError('')
    try {
      const preferences = prefsOverride ?? profile.preferences
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences,
          extractedSkills: profile.extracted_skills,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'jsearch_ratelimit') {
          toast.error('Rate limit reached', { description: 'Too many searches — wait a moment and try again.' })
        } else if (data.error === 'jsearch_auth') {
          toast.error('Search unavailable', { description: 'JSearch API key invalid. Check JSEARCH_API_KEY in .env.local.' })
        } else {
          setError('Search failed — try again')
        }
        return
      }
      await mutate()
    } finally {
      setSearching(false)
    }
  }

  async function handlePreferencesSave(prefs: Preferences) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const merged = { ...(profile?.preferences ?? {}), ...prefs }
    await supabase.from('profiles').update({ preferences: merged }).eq('user_id', user.id)
    await mutateProfile()
    setSheetOpen(false)
    await handleSearch(prefs)
  }

  if (profileLoading || jobsLoading) {
    return <div className="text-[#64748b] text-sm">Loading…</div>
  }

  // No profile — setup banner
  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="bg-[#0f172a] rounded-xl p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-lg mb-1">Get started with HireMe</h2>
            <p className="text-white/60 text-sm">Upload your resume and set your preferences to find AI-matched jobs in seconds.</p>
          </div>
          <Button asChild className="bg-white text-[#0f172a] hover:bg-[#f1f5f9] font-semibold shrink-0">
            <Link href="/onboarding">Get Started →</Link>
          </Button>
        </div>
        {/* Placeholder cards */}
        <div className="space-y-3 opacity-30 pointer-events-none select-none">
          {[92, 78, 65].map(score => (
            <div key={score} className="bg-white border border-[#e2e8f0] rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="h-4 bg-[#e2e8f0] rounded w-48 mb-2" />
                  <div className="h-3 bg-[#e2e8f0] rounded w-32" />
                </div>
                <span className="text-sm font-bold text-[#16a34a]">{score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Find Jobs</h1>
          {profile.preferences?.role && (
            <p className="text-sm text-[#64748b] mt-0.5">
              {profile.preferences.role} · {profile.preferences.location}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="border-[#e2e8f0] text-[#64748b]">
                ⚙ Edit Search
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Search Preferences</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <PreferencesForm
                  initial={profile.preferences}
                  onSave={handlePreferencesSave}
                />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            onClick={() => handleSearch()}
            disabled={searching}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
          >
            {searching ? 'Searching…' : 'Find Jobs'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="text-xs text-red-500 mt-0.5">Check your internet connection or try again in a moment.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleSearch()} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}

      {searching && (
        <div className="space-y-3">
          <p className="text-sm text-[#64748b] animate-pulse">AI is scoring jobs…</p>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#e2e8f0] rounded w-2/3" />
                  <div className="h-3 bg-[#e2e8f0] rounded w-1/3" />
                </div>
                <div className="h-6 w-12 bg-[#e2e8f0] rounded-lg ml-3 shrink-0" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#e2e8f0] rounded w-full" />
                <div className="h-3 bg-[#e2e8f0] rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && recentJobs.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[#64748b]">
            {recentJobs.length} jobs found · <span className="text-[#16a34a] font-medium">{recentJobs.filter(j => j.match_score >= 70).length} added to queue</span>
          </p>
          {recentJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!searching && recentJobs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-[#0f172a] font-semibold mb-1">No jobs found yet</p>
          <p className="text-[#64748b] text-sm mb-6">Click Find Jobs to search for roles matching your profile.</p>
          <Button onClick={() => handleSearch()} disabled={searching} className="bg-[#0f172a] hover:bg-[#1e293b] text-white">
            Find Jobs Now
          </Button>
        </div>
      )}
    </div>
  )
}
