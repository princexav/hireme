import Anthropic from '@anthropic-ai/sdk'
import type { Preferences } from '@/lib/supabase/types'

// Lazy singleton — created once on first use, reuses HTTP connection pool across requests
let _anthropic: Anthropic | null = null
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

function parseJSON<T>(text: string): T {
  // Strip markdown code fences (handles leading whitespace too)
  const cleaned = text.replace(/^\s*```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`Claude returned non-JSON response: ${cleaned.slice(0, 200)}`)
  }
}

// ─── Profile Extraction ──────────────────────────────────────────────────────

export type ExtractedProfile = {
  skills: string[]
  titles: string[]
  years_experience: number
  summary: string
}

export async function extractProfile(resumeText: string): Promise<ExtractedProfile> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract a structured profile from this resume. Return ONLY valid JSON matching this shape:
{"skills": string[], "titles": string[], "years_experience": number, "summary": string}

Resume:
${resumeText}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseJSON<ExtractedProfile>(text)
}

// ─── Job Search Scoring ───────────────────────────────────────────────────────

export type SearchResult = {
  title: string
  url: string
  snippet: string
}

export type ScoredJob = {
  title: string
  company: string
  url: string
  jd_text: string
  match_score: number
  match_reasons: string[]
}

export async function searchJobs(params: {
  resumeText: string
  preferences: Partial<Preferences>
  rawSearchResults: SearchResult[]
}): Promise<ScoredJob[]> {
  const { resumeText, preferences, rawSearchResults } = params

  const prefSummary = [
    preferences.role && `role=${preferences.role}`,
    preferences.location && `location=${preferences.location}`,
    (preferences.salary_min || preferences.salary_max) &&
      `salary=${preferences.salary_min ?? '?'}-${preferences.salary_max ?? '?'}`,
    preferences.remote && `remote=${preferences.remote}`,
  ]
    .filter(Boolean)
    .join(', ')

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a job matching assistant. Given a candidate's resume and job search results, score each job for fit (0-100) and explain why in 3 bullet points.

Return ONLY a JSON array matching this shape:
[{"title": string, "company": string, "url": string, "jd_text": string, "match_score": number, "match_reasons": string[3]}]

Only include jobs with match_score >= 50. Sort by match_score descending.

Candidate Resume:
${resumeText}

Candidate Preferences: ${prefSummary || 'not specified'}

Search Results:
${rawSearchResults.map((r, i) => `${i + 1}. ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n')}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const result = parseJSON<ScoredJob[]>(text)
  return Array.isArray(result) ? result : []
}

// ─── Resume Tailoring ─────────────────────────────────────────────────────────

export type TailoredResume = {
  tailored_text: string
  changes: string[]
}

export async function tailorResume(params: {
  originalResume: string
  jobDescription: string
}): Promise<TailoredResume> {
  const { originalResume, jobDescription } = params

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Tailor this resume for the job description below. Rules:
- Do NOT invent experience or skills that aren't in the original
- Reorder skills to put matching ones first
- Mirror language from the job description where the candidate has matching experience
- Keep all factual content accurate
- Return ONLY valid JSON: {"tailored_text": string, "changes": string[]}
  where changes is a list of what you changed and why (max 5 items)

Job Description:
${jobDescription}

Original Resume:
${originalResume}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseJSON<TailoredResume>(text)
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function* streamChat(params: {
  messages: ChatMessage[]
  context: string
}): AsyncGenerator<string> {
  const stream = getClient().messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a job search assistant. Help the user with their job applications.
Context about the user: ${params.context}`,
    messages: params.messages,
  })

  try {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text
      }
    }
  } catch (err) {
    // Re-throw as typed error so the API route can handle it cleanly
    throw new Error(`Stream interrupted: ${(err as Error).message}`)
  }
}
