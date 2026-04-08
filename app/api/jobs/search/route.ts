import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchJobs } from '@/lib/claude'

async function fetchSearchResults(query: string) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      { headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.web?.results ?? []).map((r: { title: string; url: string; description: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? '',
    }))
  } catch {
    return []
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { preferences, resumeText } = body
  if (!preferences || !resumeText) {
    return NextResponse.json({ error: 'preferences and resumeText required' }, { status: 400 })
  }

  const queries = [
    `"${preferences.role ?? ''}" jobs ${preferences.location ?? ''} ${preferences.remote === 'remote' ? 'remote' : ''}`,
    `"${preferences.role ?? ''}" hiring ${preferences.location ?? ''} ${new Date().getFullYear()}`,
    `"${preferences.role ?? ''}" job opening ${preferences.location ?? ''} apply now`,
  ]

  const allResults = (await Promise.all(queries.map(fetchSearchResults))).flat()
  const seen = new Set<string>()
  const uniqueResults = allResults.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })

  try {
    const scoredJobs = await searchJobs({ resumeText, preferences, rawSearchResults: uniqueResults })

    const toInsert = scoredJobs.map(job => {
      const clampedScore = Math.min(100, Math.max(0, job.match_score))
      return {
        user_id: user.id,
        title: job.title,
        company: job.company,
        url: job.url,
        jd_text: job.jd_text,
        match_score: clampedScore,
        match_reasons: job.match_reasons,
        status: clampedScore >= 70 ? 'queued' : 'saved',
      }
    })

    if (toInsert.length === 0) return NextResponse.json([])

    const { data: inserted, error } = await supabase
      .from('jobs')
      .insert(toInsert)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(inserted)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
