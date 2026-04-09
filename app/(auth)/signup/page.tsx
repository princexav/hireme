'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    // If session is null, email confirmation is required
    if (!data.session) { setCheckEmail(true); return }
    window.location.href = '/onboarding'
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4">
        <div className="mb-6 text-center">
          <span className="text-3xl font-black text-[#0f172a] tracking-tighter">HireMe</span>
          <p className="text-sm text-[#64748b] mt-1">AI-powered job search, built for you</p>
        </div>
        <div className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight mb-4">Check your email</h1>
          <p className="text-sm text-[#64748b]">
            We sent a confirmation link to <strong className="text-[#0f172a]">{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Link href="/login" className="mt-4 block text-sm text-center text-[#0f172a] font-medium underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4">
      <div className="mb-6 text-center">
        <span className="text-3xl font-black text-[#0f172a] tracking-tighter">HireMe</span>
        <p className="text-sm text-[#64748b] mt-1">AI-powered job search, built for you</p>
      </div>

      <div className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-2xl p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight mb-6">Create your account</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#0f172a]">Email</label>
            <Input id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email"
              className="border-[#e2e8f0] h-10" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#0f172a]">Password <span className="text-[#94a3b8] font-normal">(min 8 chars)</span></label>
            <Input id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete="new-password"
              className="border-[#e2e8f0] h-10" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white h-11" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-sm text-center text-[#64748b]">
            Have an account? <Link href="/login" className="text-[#0f172a] font-medium underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
