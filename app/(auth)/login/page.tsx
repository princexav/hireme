'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    window.location.href = '/search'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4">
      {/* Wordmark */}
      <div className="mb-6 text-center">
        <span className="text-3xl font-black text-[#0f172a] tracking-tighter">HireMe</span>
        <p className="text-sm text-[#64748b] mt-1">AI-powered job search, built for you</p>
      </div>

      <div className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-2xl p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight mb-6">Sign in</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#0f172a]">Email</label>
            <Input id="email" type="email" autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="border-[#e2e8f0] h-10" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#0f172a]">Password</label>
            <Input id="password" type="password" autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="border-[#e2e8f0] h-10" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white h-11" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-sm text-center text-[#64748b]">
            No account? <Link href="/signup" className="text-[#0f172a] font-medium underline">Sign up free</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
