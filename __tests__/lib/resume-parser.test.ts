import { describe, it, expect } from 'vitest'
import { extractTextFromResume } from '@/lib/resume-parser'

describe('extractTextFromResume', () => {
  it('returns text unchanged when input is plain text', async () => {
    const blob = new Blob(['John Doe\nSoftware Engineer'], { type: 'text/plain' })
    const file = new File([blob], 'resume.txt', { type: 'text/plain' })
    const result = await extractTextFromResume(file)
    expect(result).toContain('John Doe')
    expect(result).toContain('Software Engineer')
  })

  it('throws on unsupported file type', async () => {
    const file = new File(['data'], 'resume.xyz', { type: 'application/xyz' })
    await expect(extractTextFromResume(file)).rejects.toThrow('Unsupported file type')
  })
})
