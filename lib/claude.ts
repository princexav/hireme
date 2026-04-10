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

  const jobsToScore = rawSearchResults.slice(0, 20)
  const jobList = jobsToScore
    .map((r, i) => `${i}. ${r.title} at ${r.company} (${r.location})\n${r.snippet}`)
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
  ats_keywords: string[]
  original_score: number
  tailored_score: number
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
      content: `You are an ATS optimization expert. Execute these four steps in order, then return a single JSON object.

STEP 1 — Extract ATS keywords
Identify the 10–15 most critical keywords and phrases an ATS would scan for in this JD. Include: required tools/technologies, job title variants, certifications, key methodologies. Be exact — use the JD's own phrasing.

STEP 2 — Score the original resume
Semantically score the ORIGINAL resume against the extracted keywords (0–100). A keyword is "present" if the resume demonstrates that skill — even if phrased differently (e.g. "AWS" matches "Amazon Web Services"). Be honest; do not inflate.

STEP 3 — Tailor the resume
Rewrite the resume to naturally integrate any missing keywords from Step 1. Rules:
- NEVER invent skills or experience the candidate does not have
- Reformulate real experience using JD vocabulary (e.g. "built data pipelines" → "designed and deployed ETL pipelines in Airflow" if the JD uses those terms and the candidate has the underlying experience)
- Reorder the Skills section to lead with JD-matching skills
- Inject missing keywords into relevant Experience bullets where truthfully applicable
- Keep all dates, companies, titles, and facts unchanged

STEP 4 — Score the tailored resume
Semantically score the TAILORED resume against the same keywords (0–100). This score must be higher than Step 2's score — if it isn't, revise Step 3.

Return ONLY this JSON (no prose, no code fences):
{
  "ats_keywords": string[],
  "original_score": number,
  "tailored_score": number,
  "tailored_text": string,
  "changes": string[]
}
where changes is max 5 bullet points describing what was reformulated and why.

JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME:
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
    system: `You are a sharp, honest job search advisor — not a hype machine.

Philosophy:
- Quality over quantity. Discourage applying to poor-fit roles.
- Never invent skills or experience the candidate doesn't have.
- Give specific, actionable advice. Avoid corporate platitudes.
- When asked about fit, cite concrete evidence from the JD and the candidate's background.
- For interview prep, use the STAR+R format (Situation, Task, Action, Result, Reflection).
- For salary questions, give a realistic range based on role, location, and experience level.

What you can help with:
- "Why is this a good fit?" — analyse the match honestly, including gaps
- "Help me prep for an interview" — generate STAR+R stories specific to this role
- "What should I ask the interviewer?" — suggest sharp, informed questions from the JD
- "How should I negotiate salary?" — give tactical framing based on their match score
- "Should I apply?" — give an honest recommendation based on fit

Context about the candidate and selected job:
${params.context}`,
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
