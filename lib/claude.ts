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
  company: string
  location: string
  salary_min?: number
  salary_max?: number
}

export type ScoredJob = {
  title: string
  company: string
  location: string
  url: string
  jd_text: string
  match_score: number
  match_reasons: string[]
  salary_min?: number
  salary_max?: number
}

type JobScore = {
  index: number
  match_score: number
  match_reasons: [string, string, string]
}

export async function searchJobs(params: {
  extractedSkills: string[]
  preferences: Partial<Preferences>
  rawSearchResults: SearchResult[]
}): Promise<ScoredJob[]> {
  const { extractedSkills, preferences, rawSearchResults } = params
  if (rawSearchResults.length === 0) return []

  const prefSummary = [
    preferences.role && `role=${preferences.role}`,
    preferences.location && `location=${preferences.location}`,
    (preferences.salary_min || preferences.salary_max) &&
      `salary=${preferences.salary_min ?? '?'}-${preferences.salary_max ?? '?'}`,
    preferences.remote && `remote=${preferences.remote}`,
  ].filter(Boolean).join(', ')

  // Cap at 20 jobs, trim snippets to 200 chars to keep prompt fast
  const jobsToScore = rawSearchResults.slice(0, 20)
  const jobList = jobsToScore
    .map((r, i) => `${i}. ${r.title} at ${r.company} (${r.location})\n${r.snippet.slice(0, 200)}`)
    .join('\n\n')

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Score each job for fit against the candidate's skills and preferences.

First, classify each job into a subtype based on the candidate's target role. Examples:
- role="AI Engineer" → subtypes: platform / agentic / mlops / generalist
- role="Backend Engineer" → subtypes: API / platform / distributed-systems / generalist
- role="Product Manager" → subtypes: growth / platform / technical-pm / generalist
Use the detected subtype to weight your scoring — emphasize the skills and responsibilities most relevant to that subtype when assigning match_score.

Return ONLY a JSON array for jobs with match_score >= 50, sorted descending:
[{"index": number, "match_score": number, "match_reasons": [string, string, string]}]

Rules:
- match_score is 0-100. Only include jobs scoring >= 50.
- Each match_reason is one specific sentence explaining fit.
- If a job snippet is too short or generic to determine fit, assign match_score 0 (exclude it).
- Do not hallucinate requirements or company culture not present in the snippet.

Candidate Preferences: ${prefSummary || 'not specified'}
Candidate Skills: ${extractedSkills.join(', ')}

Jobs:
${jobList}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const scores = parseJSON<JobScore[]>(text)
  if (!Array.isArray(scores)) return []

  return scores
    .filter(s => s.index >= 0 && s.index < rawSearchResults.length)
    .map(s => {
      const src = rawSearchResults[s.index]
      return {
        title: src.title,
        company: src.company,
        location: src.location,
        url: src.url,
        jd_text: src.snippet,
        match_score: s.match_score,
        match_reasons: s.match_reasons,
        salary_min: src.salary_min,
        salary_max: src.salary_max,
      }
    })
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
