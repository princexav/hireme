'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Preferences } from '@/lib/supabase/types'

type Props = {
  initial?: Partial<Preferences>
  onSave: (prefs: Preferences) => Promise<void>
}

export function PreferencesForm({ initial, onSave }: Props) {
  const [role, setRole] = useState(initial?.role ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [salaryMin, setSalaryMin] = useState(initial?.salary_min ?? 0)
  const [salaryMax, setSalaryMax] = useState(initial?.salary_max ?? 0)
  const [remote, setRemote] = useState<Preferences['remote']>(initial?.remote ?? 'any')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSave({ role, location, salary_min: salaryMin, salary_max: salaryMax, remote })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Target Role</Label>
        <Input value={role} onChange={e => setRole(e.target.value)}
          placeholder="e.g. Product Manager, Frontend Engineer" required />
      </div>
      <div className="space-y-1">
        <Label>Location</Label>
        <Input value={location} onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Lagos, London, or Remote" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Min Salary ($/yr)</Label>
          <Input type="number" value={salaryMin}
            onChange={e => setSalaryMin(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Max Salary ($/yr)</Label>
          <Input type="number" value={salaryMax}
            onChange={e => setSalaryMax(Number(e.target.value))} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Work Preference</Label>
        <div className="flex gap-2">
          {(['any', 'remote', 'hybrid', 'onsite'] as const).map(opt => (
            <button key={opt} type="button"
              onClick={() => setRemote(opt)}
              className={`px-3 py-1.5 rounded-full text-sm border capitalize
                ${remote === opt ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving…' : 'Save Preferences'}
      </Button>
    </form>
  )
}
