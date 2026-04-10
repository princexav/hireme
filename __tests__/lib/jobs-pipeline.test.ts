import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  wordsOver3,
  isDuplicateJob,
  fuzzyDedup,
  filterSeenJobs,
  selectStatusForInsert,
} from '@/lib/jobs-pipeline'
import { STATUS_RANK } from '@/lib/supabase/types'

// ── wordsOver3 ────────────────────────────────────────────────────────────────

describe('wordsOver3', () => {
  it('returns words longer than 3 characters, lowercased', () => {
    expect(wordsOver3('Senior DevOps Engineer')).toEqual(['senior', 'devops', 'engineer'])
  })

  it('excludes words with 3 or fewer characters', () => {
    expect(wordsOver3('AI ML Dev Engineer')).toEqual(['engineer'])
  })

  it('handles punctuation and extra whitespace', () => {
    expect(wordsOver3('Full-Stack, Engineer')).toEqual(['full', 'stack', 'engineer'])
  })
})

// ── isDuplicateJob ────────────────────────────────────────────────────────────

describe('isDuplicateJob', () => {
  it('returns false when companies differ', () => {
    expect(isDuplicateJob(
      { company: 'Acme', title: 'Senior DevOps Engineer' },
      { company: 'Globex', title: 'Senior DevOps Engineer' },
    )).toBe(false)
  })

  it('returns true when same company and ≥2 title words overlap', () => {
    expect(isDuplicateJob(
      { company: 'Acme', title: 'Software Engineer' },
      { company: 'Acme', title: 'Senior Software Engineer' },
    )).toBe(true)
  })

  it('returns false when same company but fewer than 2 title words overlap', () => {
    expect(isDuplicateJob(
      { company: 'Acme', title: 'Backend Engineer' },
      { company: 'Acme', title: 'Frontend Designer' },
    )).toBe(false)
  })

  it('is case-insensitive for company matching', () => {
    expect(isDuplicateJob(
      { company: 'ACME Corp', title: 'Frontend Engineer' },
      { company: 'acme corp', title: 'Senior Frontend Engineer' },
    )).toBe(true)
  })
})

// ── fuzzyDedup ────────────────────────────────────────────────────────────────

describe('fuzzyDedup', () => {
  it('keeps both jobs when companies differ even with identical titles', () => {
    const jobs = [
      { company: 'Acme',   title: 'Senior DevOps Engineer', snippet: 'a' },
      { company: 'Globex', title: 'Senior DevOps Engineer', snippet: 'b' },
    ]
    expect(fuzzyDedup(jobs)).toHaveLength(2)
  })

  it('collapses duplicates at the same company, keeping longer snippet', () => {
    const jobs = [
      { company: 'Acme', title: 'Software Engineer',        snippet: 'short' },
      { company: 'Acme', title: 'Senior Software Engineer', snippet: 'much longer snippet here' },
    ]
    const result = fuzzyDedup(jobs)
    expect(result).toHaveLength(1)
    expect(result[0].snippet).toBe('much longer snippet here')
  })

  it('keeps distinct roles at the same company', () => {
    const jobs = [
      { company: 'Acme', title: 'Backend Engineer',  snippet: 'a' },
      { company: 'Acme', title: 'Frontend Designer', snippet: 'b' },
    ]
    expect(fuzzyDedup(jobs)).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(fuzzyDedup([])).toEqual([])
  })
})

// ── filterSeenJobs ────────────────────────────────────────────────────────────

describe('filterSeenJobs', () => {
  it('removes jobs whose URLs are in the seen set', () => {
    const seenUrls = new Set(['https://example.com/job/1'])
    const jobs = [
      { url: 'https://example.com/job/1', title: 'Engineer', company: 'Acme',  location: 'Remote', snippet: '' },
      { url: 'https://example.com/job/2', title: 'Designer', company: 'Beta',  location: 'NYC',    snippet: '' },
    ]
    const result = filterSeenJobs(jobs, seenUrls)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com/job/2')
  })

  it('returns all jobs when seen set is empty', () => {
    const jobs = [
      { url: 'https://example.com/job/1', title: 'Engineer', company: 'Acme', location: 'Remote', snippet: '' },
    ]
    expect(filterSeenJobs(jobs, new Set())).toHaveLength(1)
  })

  it('returns empty array when all jobs are seen', () => {
    const seenUrls = new Set(['https://example.com/job/1'])
    const jobs = [
      { url: 'https://example.com/job/1', title: 'Engineer', company: 'Acme', location: 'Remote', snippet: '' },
    ]
    expect(filterSeenJobs(jobs, seenUrls)).toHaveLength(0)
  })
})

// ── selectStatusForInsert ─────────────────────────────────────────────────────

describe('selectStatusForInsert', () => {
  it('returns incoming status when no existing status', () => {
    expect(selectStatusForInsert('suggested', undefined)).toBe('suggested')
  })

  it('preserves existing status when it has higher rank', () => {
    expect(selectStatusForInsert('suggested', 'applied')).toBe('applied')
  })

  it('uses incoming status when it has higher rank than existing', () => {
    expect(selectStatusForInsert('applied', 'suggested')).toBe('applied')
  })

  it('preserves existing status on equal rank', () => {
    expect(selectStatusForInsert('suggested', 'suggested')).toBe('suggested')
  })

  it('never downgrades interview to queued', () => {
    expect(selectStatusForInsert('queued', 'interview')).toBe('interview')
  })

  it('never downgrades offer to anything lower', () => {
    const lowerStatuses = ['suggested', 'queued', 'saved', 'applied', 'interview'] as const
    for (const s of lowerStatuses) {
      expect(selectStatusForInsert(s, 'offer')).toBe('offer')
    }
  })
})

// ── STATUS_RANK sanity ────────────────────────────────────────────────────────

describe('STATUS_RANK', () => {
  it('has rejected as the highest rank (terminal state)', () => {
    const maxNonRejected = Math.max(
      STATUS_RANK.suggested,
      STATUS_RANK.queued,
      STATUS_RANK.saved,
      STATUS_RANK.applied,
      STATUS_RANK.interview,
      STATUS_RANK.offer,
    )
    expect(STATUS_RANK.rejected).toBeGreaterThan(maxNonRejected)
  })

  it('has offer ranked higher than interview', () => {
    expect(STATUS_RANK.offer).toBeGreaterThan(STATUS_RANK.interview)
  })
})

describe('fetchAdzunaResults country mapping', () => {
  beforeEach(() => {
    vi.stubEnv('ADZUNA_APP_ID', 'test-id')
    vi.stubEnv('ADZUNA_APP_KEY', 'test-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uses gb country code for London location', async () => {
    const { fetchAdzunaCountry } = await import('@/lib/jobs-pipeline')
    expect(fetchAdzunaCountry('London')).toBe('gb')
  })

  it('uses au country code for Sydney location', async () => {
    const { fetchAdzunaCountry } = await import('@/lib/jobs-pipeline')
    expect(fetchAdzunaCountry('Sydney')).toBe('au')
  })

  it('uses ca country code for Toronto location', async () => {
    const { fetchAdzunaCountry } = await import('@/lib/jobs-pipeline')
    expect(fetchAdzunaCountry('Toronto')).toBe('ca')
  })

  it('defaults to us country code', async () => {
    const { fetchAdzunaCountry } = await import('@/lib/jobs-pipeline')
    expect(fetchAdzunaCountry('New York')).toBe('us')
    expect(fetchAdzunaCountry('')).toBe('us')
    expect(fetchAdzunaCountry('remote')).toBe('us')
  })
})

describe('adzunaMaxDaysOld', () => {
  it('maps date_posted values to max_days_old numbers', async () => {
    const { adzunaMaxDaysOld } = await import('@/lib/jobs-pipeline')
    expect(adzunaMaxDaysOld('today')).toBe(1)
    expect(adzunaMaxDaysOld('3days')).toBe(3)
    expect(adzunaMaxDaysOld('week')).toBe(7)
    expect(adzunaMaxDaysOld('month')).toBe(30)
    expect(adzunaMaxDaysOld('unknown')).toBe(30)
  })
})
