export type JobStatus = 'saved' | 'queued' | 'applied' | 'interview' | 'offer' | 'rejected'

export type Preferences = {
  role: string
  location: string
  salary_min: number
  salary_max: number
  remote: 'remote' | 'hybrid' | 'onsite' | 'any'
}

export type Profile = {
  id: string
  user_id: string
  raw_resume_text: string
  extracted_skills: string[]
  preferences: Preferences
  updated_at: string
}

export type Job = {
  id: string
  user_id: string
  title: string
  company: string
  url: string
  jd_text: string
  match_score: number
  match_reasons: string[]
  status: JobStatus
  notes: string
  created_at: string
}

export type Resume = {
  id: string
  job_id: string
  user_id: string
  tailored_text: string
  pdf_url: string | null
  created_at: string
}
