import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tailorResume } from '@/lib/claude'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [jobResult, profileResult, existingResume] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).eq('user_id', user.id).single(),
    supabase.from('profiles').select('raw_resume_text').eq('user_id', user.id).single(),
    supabase.from('resumes').select('*').eq('job_id', jobId).eq('user_id', user.id).single(),
  ])

  if (jobResult.error || !jobResult.data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: 'Profile not found — upload resume first' }, { status: 404 })
  }

  // Idempotency: return cached resume only if it's valid JSON (new format).
  // Legacy Markdown strings fail JSON.parse → treated as cache miss → re-tailor.
  if (existingResume.data?.tailored_text) {
    try {
      JSON.parse(existingResume.data.tailored_text)
      return NextResponse.json(existingResume.data)
    } catch {
      // Legacy Markdown cache — fall through to re-tailor
    }
  }

  try {
    const tailored = await tailorResume({
      originalResume: profileResult.data.raw_resume_text,
      jobDescription: jobResult.data.jd_text,
    })

    const { data, error } = await supabase
      .from('resumes')
      .upsert({
        job_id: jobId,
        user_id: user.id,
        tailored_text:      tailored.tailored_text,
        ats_keywords:       tailored.ats_keywords,
        original_ats_score: tailored.original_score,
        tailored_ats_score: tailored.tailored_score,
        changes:            tailored.changes,
      }, { onConflict: 'job_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
