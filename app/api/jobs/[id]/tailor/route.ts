import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tailorResume } from '@/lib/claude'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [jobResult, profileResult] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).eq('user_id', user.id).single(),
    supabase.from('profiles').select('raw_resume_text').eq('user_id', user.id).single(),
  ])

  if (jobResult.error || !jobResult.data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: 'Profile not found — upload resume first' }, { status: 404 })
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
        tailored_text: tailored.tailored_text,
      }, { onConflict: 'job_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, changes: tailored.changes })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
