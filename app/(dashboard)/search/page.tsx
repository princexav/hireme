'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import { useJobs } from '@/hooks/useJobs'
import { JobCard } from '@/components/JobCard'
import { Button } from '@/components/ui/button'

export default function SearchPage() {
  const { profile, isLoading: profileLoading } = useProfile()
  const { jobs, mutate } = useJobs()
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const recentJobs = jobs.filter(j =>
    Date.now() - new Date(j.created_at).getTime() < 1000 * 60 * 60 * 24
  )

  async function handleSearch() {
    if (!profile) return
    setSearching(true)
    setError('')
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: profile.preferences,
          resumeText: profile.raw_resume_text,
        }),
      })
      if (!res.ok) { setError('Search failed — try again'); return }
      await mutate()
    } finally {
      setSearching(false)
    }
  }

  if (profileLoading) {
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
          <Link href="/onboarding">
            <Button className="bg-white text-[#0f172a] hover:bg-[#f1f5f9] font-semibold shrink-0">
              Get Started →
            </Button>
          </Link>
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
        <Button
          onClick={handleSearch}
          disabled={searching}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
        >
          {searching ? 'Searching…' : 'Find Jobs'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {recentJobs.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[#64748b]">
            {recentJobs.length} jobs found · <span className="text-[#16a34a] font-medium">{recentJobs.filter(j => j.match_score >= 70).length} added to queue</span>
          </p>
          {recentJobs.sort((a, b) => b.match_score - a.match_score).map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-[#0f172a] font-semibold mb-1">No jobs found yet</p>
          <p className="text-[#64748b] text-sm mb-6">Click Find Jobs to search for roles matching your profile.</p>
          <Button onClick={handleSearch} disabled={searching} className="bg-[#0f172a] hover:bg-[#1e293b] text-white">
            {searching ? 'Searching…' : 'Find Jobs Now'}
          </Button>
        </div>
      )}
    </div>
  )
}
