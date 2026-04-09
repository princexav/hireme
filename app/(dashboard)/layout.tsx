import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatSidebar } from '@/components/ChatSidebar'

const NAV_ITEMS = [
  { href: '/search', label: 'Find Jobs', icon: '🔍' },
  { href: '/queue', label: 'Apply Queue', icon: '📋' },
  { href: '/tracker', label: 'Tracker', icon: '📊' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/'

  const [profileResult, queueResult] = await Promise.all([
    supabase.from('profiles').select('user_id').eq('user_id', user.id).single(),
    supabase.from('jobs').select('id').eq('user_id', user.id).eq('status', 'queued'),
  ])

  if (!profileResult.data && pathname !== '/onboarding') {
    redirect('/onboarding')
  }

  const queueCount = queueResult.data?.length ?? 0

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {/* Icon Nav */}
      <nav className="w-14 bg-[#0f172a] flex flex-col items-center py-4 gap-1 shrink-0">
        <Link href="/search" className="mb-4">
          <span className="text-white font-black text-lg tracking-tight">H</span>
        </Link>

        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors
                ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.href === '/queue' && queueCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#6366f1] text-white text-[9px] font-bold
                  rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {queueCount > 99 ? '99+' : queueCount}
                </span>
              )}
            </Link>
          )
        })}

        <div className="mt-auto">
          <Link
            href="/onboarding"
            title="Update Resume"
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors
              ${pathname === '/onboarding' ? 'bg-white/15' : 'hover:bg-white/10'}`}
          >
            <span className="text-lg">📄</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto p-8">
          {children}
        </div>
      </main>

      {/* Collapsible Chat Sidebar */}
      <ChatSidebar />
    </div>
  )
}
