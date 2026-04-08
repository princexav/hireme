import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueueCard } from '@/components/QueueCard'
import type { Job } from '@/lib/supabase/types'

const mockJob: Job = {
  id: 'job-1',
  user_id: 'user-1',
  title: 'Senior Frontend Engineer',
  company: 'Acme Corp',
  url: 'https://example.com/job/1',
  jd_text: 'React TypeScript required',
  match_score: 82,
  match_reasons: ['Strong React match', 'TypeScript aligned', 'Remote-friendly'],
  status: 'queued',
  notes: '',
  created_at: new Date().toISOString(),
}

describe('QueueCard', () => {
  it('renders job title, company, and match score', () => {
    render(<QueueCard job={mockJob} onSend={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('82% match')).toBeInTheDocument()
  })

  it('calls onSend when Send button clicked', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined)
    render(<QueueCard job={mockJob} onSend={onSend} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('job-1')
  })

  it('calls onSkip when Skip button clicked', () => {
    const onSkip = vi.fn().mockResolvedValue(undefined)
    render(<QueueCard job={mockJob} onSend={vi.fn()} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalledWith('job-1')
  })
})
