import { describe, it, expect } from 'vitest'
import { detectJobSource } from '@/lib/utils'

describe('detectJobSource', () => {
  // ATS sources
  it('identifies Greenhouse board URLs', () => {
    const result = detectJobSource('https://boards.greenhouse.io/acme/jobs/1234')
    expect(result).toEqual({ name: 'Greenhouse', type: 'ats' })
  })

  it('identifies company-subdomain Greenhouse URLs', () => {
    const result = detectJobSource('https://acme.greenhouse.io/jobs/1234')
    expect(result).toEqual({ name: 'Greenhouse', type: 'ats' })
  })

  it('identifies Lever URLs', () => {
    const result = detectJobSource('https://jobs.lever.co/acme/abc-123')
    expect(result).toEqual({ name: 'Lever', type: 'ats' })
  })

  it('identifies Ashby URLs', () => {
    const result = detectJobSource('https://jobs.ashbyhq.com/acme/role')
    expect(result).toEqual({ name: 'Ashby', type: 'ats' })
  })

  it('identifies Workday URLs', () => {
    const result = detectJobSource('https://acme.myworkdayjobs.com/en-US/jobs')
    expect(result).toEqual({ name: 'Workday', type: 'ats' })
  })

  it('identifies iCIMS URLs', () => {
    const result = detectJobSource('https://acme.icims.com/jobs/1234/job')
    expect(result).toEqual({ name: 'iCIMS', type: 'ats' })
  })

  it('identifies SmartRecruiters URLs', () => {
    const result = detectJobSource('https://jobs.smartrecruiters.com/Acme/role')
    expect(result).toEqual({ name: 'SmartRecruiters', type: 'ats' })
  })

  // Aggregator sources
  it('identifies LinkedIn URLs', () => {
    const result = detectJobSource('https://www.linkedin.com/jobs/view/1234')
    expect(result).toEqual({ name: 'LinkedIn', type: 'aggregator' })
  })

  it('identifies Indeed URLs', () => {
    const result = detectJobSource('https://www.indeed.com/viewjob?jk=abc')
    expect(result).toEqual({ name: 'Indeed', type: 'aggregator' })
  })

  it('identifies ZipRecruiter URLs', () => {
    const result = detectJobSource('https://www.ziprecruiter.com/jobs/acme/role')
    expect(result).toEqual({ name: 'ZipRecruiter', type: 'aggregator' })
  })

  it('identifies Glassdoor URLs', () => {
    const result = detectJobSource('https://www.glassdoor.com/job-listing/role-acme-JV_IC1234.htm')
    expect(result).toEqual({ name: 'Glassdoor', type: 'aggregator' })
  })

  it('identifies Dice URLs', () => {
    const result = detectJobSource('https://www.dice.com/jobs/detail/abc123')
    expect(result).toEqual({ name: 'Dice', type: 'aggregator' })
  })

  it('identifies Wellfound (angel.co) URLs', () => {
    const result = detectJobSource('https://angel.co/company/acme/jobs/123')
    expect(result).toEqual({ name: 'Wellfound', type: 'aggregator' })
  })

  it('identifies Built In URLs', () => {
    const result = detectJobSource('https://builtin.com/job/acme/role/123')
    expect(result).toEqual({ name: 'Built In', type: 'aggregator' })
  })

  // Unknown / fallback
  it('returns unknown for a generic company careers page', () => {
    const result = detectJobSource('https://acme.com/careers/role')
    expect(result).toEqual({ name: 'Unknown', type: 'unknown' })
  })

  it('returns unknown for a malformed URL', () => {
    const result = detectJobSource('not-a-url')
    expect(result).toEqual({ name: 'Unknown', type: 'unknown' })
  })

  it('returns unknown for an empty string', () => {
    const result = detectJobSource('')
    expect(result).toEqual({ name: 'Unknown', type: 'unknown' })
  })

  // www stripping
  it('strips www prefix before matching', () => {
    const result = detectJobSource('https://www.dice.com/jobs/detail/abc')
    expect(result.type).toBe('aggregator')
  })
})
