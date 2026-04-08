import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatSidebar } from '@/components/ChatSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if profile exists — redirect to onboarding if not
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Allow onboarding page through without profile check
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Nav */}
      <nav className="w-48 border-r bg-muted/40 flex flex-col p-4 gap-2 shrink-0">
        <span className="font-bold text-lg mb-4">HireMe</span>
        <Link href="/search" className="text-sm hover:text-primary">Find Jobs</Link>
        <Link href="/queue" className="text-sm hover:text-primary">Apply Queue</Link>
        <Link href="/tracker" className="text-sm hover:text-primary">Tracker</Link>
        <div className="mt-auto">
          <Link href="/onboarding" className="text-xs text-muted-foreground hover:text-primary">
            Update Resume
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

      {/* Right Chat Sidebar */}
      <ChatSidebar />
    </div>
  )
}
