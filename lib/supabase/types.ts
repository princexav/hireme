// 'suggested' = auto-found by search, not yet acted on (safe to replace on re-search)
// 'saved'     = manually saved by user (preserved across re-searches)
// 'queued'    = auto-queued for application (match_score >= 70)
export type JobStatus = 'suggested' | 'saved' | 'queued' | 'applied' | 'interview' | 'offer' | 'rejected'

export const STATUS_RANK: Record<JobStatus, number> = {
  suggested:  1,
  queued:     2,
  saved:      3,
  applied:    4,
  interview:  5,
  offer:      6,
  rejected:  100,
}

export type Preferences = {
  role: string
  location: string
  salary_min: number
  salary_max: number
  remote: 'remote' | 'hybrid' | 'onsite' | 'any'
  date_posted: 'month' | 'week' | '3days' | 'today'
}

export type Profile = {
  user_id: string
  raw_resume_text: string
  extracted_skills: string[]
  preferences: Partial<Preferences>
  updated_at: string
}

export type Job = {
  id: string
  user_id: string
  title: string
  company: string
  location: string | null
  url: string
  jd_text: string
  match_score: number
  match_reasons: string[]
  status: JobStatus
  notes: string
  salary_min: number | null
  salary_max: number | null
  applied_at: string | null
  created_at: string
  posted_at: string | null
}

export type Resume = {
  id: string
  job_id: string
  user_id: string
  tailored_text: string
  ats_keywords: string[]
  original_ats_score: number | null
  tailored_ats_score: number | null
  changes: string[]
  pdf_url: string | null
  created_at: string
}
