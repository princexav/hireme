import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STATUS_RANK } from '@/lib/supabase/types'
import type { JobStatus } from '@/lib/supabase/types'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Rank protection: never downgrade a job that's already at interview, offer, etc.
  if (STATUS_RANK[job.status as JobStatus] >= STATUS_RANK['applied']) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'applied', applied_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
