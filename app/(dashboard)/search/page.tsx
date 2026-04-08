'use client'
import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useJobs } from '@/hooks/useJobs'
import { JobCard } from '@/components/JobCard'
import { Button } from '@/components/ui/button'

export default function SearchPage() {
  const { profile } = useProfile()
  const { jobs, mutate } = useJobs()
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const recentJobs = jobs.filter(j =>
    Date.now() - new Date(j.created_at).getTime() < 1000 * 60 * 60 * 24
  )

  async function handleSearch() {
    if (!profile) { setError('Upload your resume first'); return }
    setSearching(true)
    setError('')
    const res = await fetch('/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: profile.preferences,
        resumeText: profile.raw_resume_text,
      }),
    })
    if (!res.ok) { setError('Search failed — try again'); setSearching(false); return }
    await mutate()
    setSearching(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Find Jobs</h1>
          {profile?.preferences?.role && (
            <p className="text-sm text-muted-foreground">
              Searching for: {profile.preferences.role} · {profile.preferences.location}
            </p>
          )}
        </div>
        <Button onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching…' : 'Find Jobs'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {recentJobs.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {recentJobs.length} jobs found · {recentJobs.filter(j => j.match_score >= 70).length} added to queue
          </p>
          {recentJobs.sort((a, b) => b.match_score - a.match_score).map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>No jobs yet. Hit &quot;Find Jobs&quot; to search.</p>
        </div>
      )}
    </div>
  )
}
