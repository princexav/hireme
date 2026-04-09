import type { SupabaseClient } from '@supabase/supabase-js'
import type { Preferences, Job, JobStatus } from '@/lib/supabase/types'
import { STATUS_RANK } from '@/lib/supabase/types'
import type { SearchResult } from '@/lib/claude'
import { searchJobs } from '@/lib/claude'

// ── Public types ───────────────────────────────────────────────────────────────

export type PipelineError = 'jsearch_auth' | 'jsearch_ratelimit' | 'jsearch_unavailable'

export type PipelineResult =
  | { ok: true;  jobs: Job[] }
  | { ok: false; error: PipelineError }

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
}

async function fetchJSearchResults(
  role: string,
  location: string,
  salaryMin?: number,
): Promise<{ results: SearchResult[]; error: PipelineError | null }> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) return { results: [], error: null }

  const isRemote = location.toLowerCase() === 'remote'
  const query = isRemote ? `${role} remote` : `${role} in ${location}`

  const headers = {
    'x-rapidapi-host': 'jsearch.p.rapidapi.com',
    'x-rapidapi-key': apiKey,
  }

  const [r1, r2] = await Promise.all([
    fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&country=us&date_posted=all`, { headers }),
    fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=2&num_pages=1&country=us&date_posted=all`, { headers }),
  ])

  for (const r of [r1, r2]) {
    if (r.status === 401 || r.status === 403) return { results: [], error: 'jsearch_auth' }
    if (r.status === 429) return { results: [], error: 'jsearch_ratelimit' }
  }

  const [d1, d2] = await Promise.all([
    r1.ok ? r1.json().catch(() => ({ data: [] })) : { data: [] },
    r2.ok ? r2.json().catch(() => ({ data: [] })) : { data: [] },
  ])

  let raw: JSearchJob[] = [...(d1.data ?? []), ...(d2.data ?? [])]

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
        snippet:    (j.job_description ?? '').slice(0, 200),
        company:    j.employer_name   ?? '',
        location:   loc,
        salary_min: j.job_min_salary,
        salary_max: j.job_max_salary,
      }
    }),
    error: null,
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
  const role      = preferences.role      ?? ''
  const location  = preferences.location  ?? ''
  const salaryMin = preferences.salary_min ?? 0

  // Step 1: Fetch from JSearch
  const { results: rawResults, error: fetchError } = await fetchJSearchResults(role, location, salaryMin)
  if (fetchError) return { ok: false, error: fetchError }

  // Step 2: Filter seen jobs (30-day suppression)
  const seenUrls      = await fetchSeenUrls(userId, supabase)
  const unseenResults = filterSeenJobs(rawResults, seenUrls)

  // Step 3: Deduplication — exact key first, then fuzzy company+title
  const exactSeen = new Set<string>()
  const exactDeduped = unseenResults.filter(r => {
    const key = `${r.company.toLowerCase()}|${r.title.toLowerCase()}|${r.location.toLowerCase()}`
    if (exactSeen.has(key)) return false
    exactSeen.add(key)
    return true
  })
  const deduped = fuzzyDedup(exactDeduped)

  // Pre-Claude heuristic: keep only titles containing a word from the target role
  const roleWords = role.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const relevant  = roleWords.length > 0
    ? deduped.filter(r => roleWords.some(w => r.title.toLowerCase().includes(w)))
    : deduped
  const topResults = relevant.slice(0, 20)

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
