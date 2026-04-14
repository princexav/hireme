'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      title="Sign out"
      className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10 text-white/60 hover:text-white"
    >
      <span className="text-lg">↪</span>
    </button>
  )
}
