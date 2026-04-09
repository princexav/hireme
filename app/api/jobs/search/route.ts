import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processJobSearch } from '@/lib/jobs-pipeline'

export const maxDuration = 60

const ERROR_STATUS: Record<string, number> = {
  jsearch_auth:        502,
  jsearch_ratelimit:   429,
  jsearch_unavailable: 502,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { preferences, extractedSkills } = body
  if (!preferences || !Array.isArray(extractedSkills)) {
    return NextResponse.json(
      { error: 'preferences and extractedSkills required' },
      { status: 400 },
    )
  }

  try {
    const result = await processJobSearch({
      userId: user.id,
      preferences,
      extractedSkills,
      supabase,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: ERROR_STATUS[result.error] ?? 500 },
      )
    }

    return NextResponse.json(result.jobs)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
