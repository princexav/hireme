import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractProfile } from '@/lib/claude'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const resumeText = formData.get('resumeText') as string
  if (!resumeText) return NextResponse.json({ error: 'resumeText required' }, { status: 400 })

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
