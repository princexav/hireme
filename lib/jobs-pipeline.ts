import type { SupabaseClient } from '@supabase/supabase-js'
import type { Preferences, Job, JobStatus } from '@/lib/supabase/types'
import { STATUS_RANK } from '@/lib/supabase/types'
import type { SearchResult } from '@/lib/claude'
import { searchJobs, expandQueryVariants } from '@/lib/claude'

// ── Public types ───────────────────────────────────────────────────────────────

export type PipelineError = 'jsearch_auth' | 'jsearch_ratelimit' | 'jsearch_unavailable'

export type PipelineResult =
  | { ok: true;  jobs: Job[] }
  | { ok: false; error: PipelineError }

// ── Internal types ─────────────────────────────────────────────────────────────

type TaggedResult = SearchResult & { _source: 'jsearch' | 'adzuna' }

export function sortJSearchFirst(jobs: TaggedResult[]): TaggedResult[] {
  return [...jobs].sort((a, b) => {
    if (a._source === b._source) return 0
    return a._source === 'jsearch' ? -1 : 1
  })
}

// ── JSearch fetch ──────────────────────────────────────────────────────────────

type JSearchJob = {
  job_title: string
  employer_name: string
  job_apply_link: string
  job_description?: string
  job_city?: string
  job_state?: string
  job_country?: string
  job_is_remote?: boolean
  job_min_salary?: number
  job_max_salary?: number
  job_posted_at_datetime_utc?: string
}

async function fetchJSearchResults(params: {
  role: string
  location: string
  remote: string
  datePosted: string
  salaryMin?: number
}): Promise<{ results: SearchResult[]; error: PipelineError | null }> {
  const { role, location, remote, datePosted, salaryMin } = params
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) return { results: [], error: null }

  const isRemote = remote === 'remote' || location.toLowerCase() === 'remote'
  const query = isRemote ? `${role} remote` : `${role} in ${location}`

  const headers = {
    'x-rapidapi-host': 'jsearch.p.rapidapi.com',
    'x-rapidapi-key': apiKey,
  }

  const base = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&country=us&date_posted=${datePosted}`

  const responses = await Promise.all([1, 2, 3, 4].map(page =>
    fetch(`${base}&page=${page}`, { headers })
  ))

  for (const r of responses) {
    if (r.status === 401 || r.status === 403) return { results: [], error: 'jsearch_auth' }
    if (r.status === 429) return { results: [], error: 'jsearch_ratelimit' }
  }

  const pages = await Promise.all(
    responses.map(r => r.ok ? r.json().catch(() => ({ data: [] })) : { data: [] })
  )

  let raw: JSearchJob[] = pages.flatMap(p => p.data ?? [])

  if (salaryMin && salaryMin > 0) {
    raw = raw.filter(j => !j.job_min_salary || j.job_min_salary >= salaryMin)
  }

  return {
    results: raw.map(j => {
      const city  = j.job_city  ?? ''
      const state = j.job_state ?? ''
      const loc   = j.job_is_remote
        ? 'Remote'
        : [city, state].filter(Boolean).join(', ') || j.job_country || ''
      return {
        title:      j.job_title       ?? '',
        url:        j.job_apply_link  ?? '',
        snippet:    j.job_description ?? '',
        company:    j.employer_name   ?? '',
        location:   loc,
        salary_min: j.job_min_salary,
        salary_max: j.job_max_salary,
        postedAt:   j.job_posted_at_datetime_utc ?? undefined,
      }
    }),
    error: null,
  }
}

// ── Adzuna fetch ───────────────────────────────────────────────────────────────

export function fetchAdzunaCountry(location: string): string {
  const l = location.toLowerCase()
  if (/uk|london|england|scotland|wales/.test(l)) return 'gb'
  if (/australia|sydney|melbourne/.test(l)) return 'au'
  if (/canada|toronto|vancouver/.test(l)) return 'ca'
  return 'us'
}

export function adzunaMaxDaysOld(datePosted: string): number {
  const map: Record<string, number> = { today: 1, '3days': 3, week: 7, month: 30 }
  return map[datePosted] ?? 30
}

type AdzunaJob = {
  title: string
  company: { display_name: string }
  description: string
  location: { display_name: string }
  salary_min?: number
  salary_max?: number
  redirect_url: string
  created?: string
}

async function fetchAdzunaResults(params: {
  variant: string
  location: string
  remote: string
  datePosted: string
}): Promise<SearchResult[]> {
  const appId  = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  const { variant, location, remote, datePosted } = params
  const isRemote = remote === 'remote' || location.toLowerCase() === 'remote'
  const country  = fetchAdzunaCountry(location)
  const what     = isRemote ? `${variant} remote` : variant
  const maxDays  = adzunaMaxDaysOld(datePosted)

  const qs = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: '50',
    what:             what,
    max_days_old:     String(maxDays),
    sort_by:          'date',
  })
  if (!isRemote && location) qs.set('where', location)

  try {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${qs.toString()}`,
      { headers: { 'Content-Type': 'application/json' } },
    )
    if (!res.ok) return []
    const data = await res.json().catch(() => ({ results: [] }))
    return (data.results ?? []).map((j: AdzunaJob) => ({
      title:      j.title                    ?? '',
      url:        j.redirect_url             ?? '',
      snippet:    j.description              ?? '',
      company:    j.company?.display_name    ?? '',
      location:   j.location?.display_name  ?? '',
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      postedAt:   j.created ?? undefined,
    }))
  } catch {
    return []
  }
}

// ── Seen jobs ──────────────────────────────────────────────────────────────────

export async function fetchSeenUrls(userId: string, supabase: SupabaseClient): Promise<Set<string>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('seen_jobs')
    .select('job_url')
    .eq('user_id', userId)
    .gt('seen_at', thirtyDaysAgo)
  return new Set((data ?? []).map((r: { job_url: string }) => r.job_url))
}

export function filterSeenJobs(jobs: SearchResult[], seenUrls: Set<string>): SearchResult[] {
  return jobs.filter(j => !seenUrls.has(j.url))
}

async function upsertSeenJobs(userId: string, urls: string[], supabase: SupabaseClient): Promise<void> {
  try {
    await supabase
      .from('seen_jobs')
      .upsert(
        urls.map(job_url => ({ user_id: userId, job_url })),
        { onConflict: 'user_id,job_url' },
      )
  } catch {
    // Non-critical — failure must not fail the search response
  }
}

// ── Fuzzy deduplication ────────────────────────────────────────────────────────

export function wordsOver3(str: string): string[] {
  return str.toLowerCase().split(/\W+/).filter(w => w.length > 3)
}

export function isDuplicateJob(
  a: { company: string; title: string },
  b: { company: string; title: string },
): boolean {
  if (a.company.toLowerCase() !== b.company.toLowerCase()) return false
  const wa = new Set(wordsOver3(a.title))
  const wb = wordsOver3(b.title)
  return wb.filter(w => wa.has(w)).length >= 2
}

export function fuzzyDedup<T extends { company: string; title: string; snippet: string }>(jobs: T[]): T[] {
  const result: T[] = []
  for (const job of jobs) {
    const dupIdx = result.findIndex(r => isDuplicateJob(r, job))
    if (dupIdx === -1) {
      result.push(job)
    } else if (job.snippet.length > result[dupIdx].snippet.length) {
      result[dupIdx] = job
    }
  }
  return result
}

// ── Status rank protection ─────────────────────────────────────────────────────

export function selectStatusForInsert(
  incomingStatus: JobStatus,
  existingStatus: JobStatus | undefined,
): JobStatus {
  if (!existingStatus) return incomingStatus
  return STATUS_RANK[existingStatus] >= STATUS_RANK[incomingStatus]
    ? existingStatus
    : incomingStatus
}

// ── Main pipeline ──────────────────────────────────────────────────────────────

export async function processJobSearch(params: {
  userId: string
  preferences: Partial<Preferences>
  extractedSkills: string[]
  supabase: SupabaseClient
}): Promise<PipelineResult> {
  const { userId, preferences, extractedSkills, supabase } = params
  const role       = preferences.role        ?? ''
  const location   = preferences.location    ?? ''
  const remote     = preferences.remote      ?? 'any'
  const salaryMin  = preferences.salary_min  ?? 0
  const datePosted = preferences.date_posted ?? 'month'

  // Step 0: Expand role into semantic variants (degrades to [role] on failure)
  const variants = await expandQueryVariants(role)

  // Step 1: Fetch JSearch (base query, 4 pages) + Adzuna (all variants, 1 page each) in parallel
  const [jsearchResult, ...adzunaPages] = await Promise.all([
    fetchJSearchResults({ role, location, remote, datePosted, salaryMin }),
    ...variants.map(v => fetchAdzunaResults({ variant: v, location, remote, datePosted })),
  ])

  if (jsearchResult.error) return { ok: false, error: jsearchResult.error }

  const tagged: TaggedResult[] = [
    ...jsearchResult.results.map(r => ({ ...r, _source: 'jsearch' as const })),
    ...adzunaPages.flat().map(r => ({ ...r, _source: 'adzuna' as const })),
  ]

  // Step 2: Filter seen jobs (30-day suppression)
  const seenUrls     = await fetchSeenUrls(userId, supabase)
  const unseenTagged = tagged.filter(j => !seenUrls.has(j.url))

  // Step 3: Deduplication — exact key first, then fuzzy company+title
  const exactSeen = new Set<string>()
  const exactDeduped = unseenTagged.filter(r => {
    const key = `${r.company.toLowerCase()}|${r.title.toLowerCase()}|${r.location.toLowerCase()}`
    if (exactSeen.has(key)) return false
    exactSeen.add(key)
    return true
  })
  const deduped = fuzzyDedup(exactDeduped)

  // Sort JSearch (full JD) before Adzuna (snippets), then slice to Haiku output-token budget
  const topResults: SearchResult[] = sortJSearchFirst(deduped)
    .slice(0, 20)
    .map(({ _source, ...r }) => r)

  if (topResults.length === 0) return { ok: true, jobs: [] }

  // Step 4: Archetype-aware Claude Haiku scoring
  const scoredJobs = await searchJobs({ extractedSkills, preferences, rawSearchResults: topResults })

  if (scoredJobs.length === 0) return { ok: true, jobs: [] }

  // Step 5: Fetch existing job statuses for rank protection
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('url, status')
    .eq('user_id', userId)

  const existingByUrl = new Map<string, JobStatus>(
    (existingJobs ?? []).map((j: { url: string; status: JobStatus }) => [j.url, j.status])
  )

  const toInsert = scoredJobs.map(job => {
    const clampedScore           = Math.min(100, Math.max(0, job.match_score))
    const incomingStatus: JobStatus = clampedScore >= 70 ? 'queued' : 'suggested'
    const finalStatus            = selectStatusForInsert(incomingStatus, existingByUrl.get(job.url))
    return {
      user_id:       userId,
      title:         job.title,
      company:       job.company,
      location:      job.location ?? null,
      url:           job.url,
      jd_text:       job.jd_text,
      match_score:   clampedScore,
      match_reasons: job.match_reasons,
      salary_min:    job.salary_min  != null ? Math.round(job.salary_min)  : null,
      salary_max:    job.salary_max  != null ? Math.round(job.salary_max)  : null,
      posted_at:     job.postedAt ?? null,
      status:        finalStatus,
    }
  })

  const { data: inserted, error: insertError } = await supabase
    .from('jobs')
    .insert(toInsert)
    .select()

  if (insertError) throw new Error(insertError.message)

  // Delete old suggested jobs not in this result set
  await supabase
    .from('jobs')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'suggested')
    .not('id', 'in', `(${inserted!.map((j: { id: string }) => `'${j.id}'`).join(',')})`)

  // Step 6: Record seen jobs (errors silently caught inside upsertSeenJobs)
  await upsertSeenJobs(userId, scoredJobs.map(j => j.url), supabase)

  return { ok: true, jobs: inserted! }
}
