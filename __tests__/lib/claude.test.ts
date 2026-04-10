import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
      stream: vi.fn(),
    },
  })),
}))

import Anthropic from '@anthropic-ai/sdk'
import { extractProfile, searchJobs, tailorResume } from '@/lib/claude'

const mockCreate = vi.fn()
beforeEach(() => {
  vi.mocked(Anthropic).mockImplementation(class {
    messages = { create: mockCreate, stream: vi.fn() }
  } as never)
  mockCreate.mockReset()
})

describe('extractProfile', () => {
  it('returns parsed profile from resume text', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        skills: ['TypeScript', 'React'],
        titles: ['Frontend Engineer'],
        years_experience: 4,
        summary: 'Frontend engineer with 4 years experience',
      }) }],
    })

    const result = await extractProfile('John Doe\nFrontend Engineer\nReact, TypeScript')
    expect(result.skills).toContain('TypeScript')
    expect(result.titles).toContain('Frontend Engineer')
    expect(result.years_experience).toBe(4)
  })
})

describe('searchJobs', () => {
  it('returns array of job results with match scores', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify([
        {
          index: 0,
          match_score: 82,
          match_reasons: ['Strong React experience', 'TypeScript match', 'Remote-friendly'],
        },
      ]) }],
    })

    const jobs = await searchJobs({
      extractedSkills: ['React', 'TypeScript'],
      preferences: { role: 'Frontend Engineer', location: 'Lagos', salary_min: 50000, salary_max: 120000, remote: 'remote' },
      rawSearchResults: [{ title: 'Frontend Engineer at Acme', url: 'https://example.com/job/1', snippet: 'React developer needed', company: 'Acme', location: 'Lagos' }],
    })

    expect(jobs).toHaveLength(1)
    expect(jobs[0].match_score).toBe(82)
    expect(jobs[0].match_reasons).toHaveLength(3)
  })

  it('passes full snippet text to Claude without truncation', async () => {
    const longSnippet = 'x'.repeat(500)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    })

    await searchJobs({
      extractedSkills: ['React'],
      preferences: { role: 'Engineer', location: 'Remote', salary_min: 0, salary_max: 0, remote: 'remote', date_posted: 'month' },
      rawSearchResults: [{ title: 'Engineer', url: 'https://example.com', snippet: longSnippet, company: 'Acme', location: 'Remote' }],
    })

    const calledWith = mockCreate.mock.calls[0][0]
    expect(calledWith.messages[0].content).toContain(longSnippet)
  })
})

describe('tailorResume', () => {
  it('returns tailored text, ATS scores, keywords, and change summary', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        ats_keywords: ['React', 'TypeScript', 'component architecture'],
        original_score: 42,
        tailored_score: 88,
        tailored_text: 'Tailored resume here',
        changes: ['Added React keyword in skills section', 'Moved TypeScript to top of skills'],
      }) }],
    })

    const result = await tailorResume({
      originalResume: 'John Doe\nSkills: JS, TS',
      jobDescription: 'Looking for React/TypeScript expert',
    })

    expect(result.tailored_text).toBe('Tailored resume here')
    expect(result.changes).toHaveLength(2)
    expect(result.ats_keywords).toContain('React')
    expect(result.original_score).toBe(42)
    expect(result.tailored_score).toBe(88)
    expect(result.tailored_score).toBeGreaterThan(result.original_score)
  })
})
