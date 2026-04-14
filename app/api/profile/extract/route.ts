import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractProfile } from '@/lib/claude'
import { extractTextFromResume } from '@/lib/resume-parser'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()

  // Accept either a raw file upload or pre-parsed text
  let resumeText = formData.get('resumeText') as string | null
  const file = formData.get('file') as File | null

  if (file) {
    resumeText = await extractTextFromResume(file)
  }

  if (!resumeText) return NextResponse.json({ error: 'file or resumeText required' }, { status: 400 })

  try {
    const profile = await extractProfile(resumeText)

    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      raw_resume_text: resumeText,
      extracted_skills: profile.skills,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id', ignoreDuplicates: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(profile)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
